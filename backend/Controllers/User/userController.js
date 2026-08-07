import User from '../../models/User.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { sanitizeEmail, sanitizePhone, sanitizeName, sanitizeBloodType, validatePasswordStrength } from '../../middleware/securityMiddleware.js';

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      uid: user.uid,
      email: user.email,
      role: user.role,
    },
    env.JWT_SECRET,
    {
      expiresIn: env.ACCESS_TOKEN_EXPIRES_IN,
    }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      uid: user.uid,
      tokenVersion: Date.now(),
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
    }
  );
};

const hashRefreshToken = (refreshToken) => {
  return crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');
};

const generateTokens = (user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    accessToken,
    refreshToken,
    refreshTokenHash: hashRefreshToken(refreshToken),
  };
};

/**
 * Hash password with bcrypt
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12); // Increased from 10 to 12
  return await bcrypt.hash(password, salt);
};

/**
 * Compare password with hash
 */
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

const getAllAccounts = async (req, res) => {
  try {
    // User must be verified via middleware (verifyAdminToken)
    const accounts = await User.find({})
      .select('-password -refreshToken')
      .limit(1000); // Prevent massive data leaks

    res.json(accounts);
  } catch (error) {
    console.error('❌ Error fetching accounts:', error.message);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
};

const registerDonor = async (req, res) => {
  try {
    const { email, fname, lname, phone, bloodType, password, passwordConfirmation } = req.body;

    // ✅ VALIDATION: Check all required fields
    if (!email || !fname || !lname || !phone || !bloodType || !password || !passwordConfirmation) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // ✅ VALIDATION: Passwords match
    if (password !== passwordConfirmation) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // ✅ VALIDATION: Password strength (12+ chars, mixed case, numbers, symbols)
    try {
      validatePasswordStrength(password);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    // ✅ SANITIZATION: Email, phone, names
    let sanitizedEmail, sanitizedPhone, sanitizedFname, sanitizedLname, sanitizedBloodType;
    try {
      sanitizedEmail = sanitizeEmail(email);
      sanitizedPhone = sanitizePhone(phone);
      sanitizedFname = sanitizeName(fname);
      sanitizedLname = sanitizeName(lname);
      sanitizedBloodType = sanitizeBloodType(bloodType);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    // ✅ CHECK DUPLICATES: Use parameterized queries (Mongoose does this automatically)
    const existingEmail = await User.findOne({ email: sanitizedEmail });
    const existingPhone = await User.findOne({ phone: sanitizedPhone });

    if (existingEmail) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    if (existingPhone) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    // ✅ HASH PASSWORD
    const hashedPassword = await hashPassword(password);

    // ✅ CREATE USER
    const newUser = new User({
      uid: `user-${Date.now()}`,
      email: sanitizedEmail,
      fname: sanitizedFname,
      lname: sanitizedLname,
      phone: sanitizedPhone,
      password: hashedPassword,
      role: 'donor',
      bloodType: sanitizedBloodType,
      verifiedByAdmin: false,
      createdAt: new Date()
    });

    await newUser.save();

    // ✅ GENERATE TOKENS
    const {
      accessToken,
      refreshToken,
      refreshTokenHash
    } = generateTokens(newUser);

    newUser.refreshTokenHash = refreshTokenHash;

    await newUser.save();

    res.status(201).json({
      message: 'Donor registered successfully. Awaiting admin verification.',
      user: {
        uid: newUser.uid,
        email: newUser.email,
        fname: newUser.fname,
        lname: newUser.lname,
        role: newUser.role,
        phone: newUser.phone,
        bloodType: newUser.bloodType,
        verifiedByAdmin: false
      },
      accessToken,
      refreshToken,
      verificationPending: true
    });
  } catch (error) {
    console.error('❌ Registration error:', error.message);
    res.status(500).json({ error: 'Registration failed' });
  }
};

const loginUser = async (req, res) => {
  try {
    console.log('🔑 [AUTH] Login attempt:', { email: req.body.email ? req.body.email.substring(0, 5) + '...' : 'none', phone: req.body.phone ? 'provided' : 'none' });

    const { email, phone, password } = req.body;

    // ✅ VALIDATION: Requires email OR phone, and password
    if (!password || (!email && !phone)) {
      console.warn('⚠️ [AUTH] Missing credentials');
      return res.status(400).json({ error: 'Email/phone and password are required' });
    }

    let user;
    if (email) {
      try {
        const sanitizedEmail = sanitizeEmail(email);
        console.log('🔍 [AUTH] Searching for user by email');
        user = await User.findOne({ email: sanitizedEmail });
      } catch (err) {
        // Invalid email format - generic response
        console.warn('⚠️ [AUTH] Invalid email format:', err.message);
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    } else if (phone) {
      try {
        const sanitizedPhone = sanitizePhone(phone);
        console.log('🔍 [AUTH] Searching for user by phone');
        user = await User.findOne({ phone: sanitizedPhone });
      } catch (err) {
        // Invalid phone format - generic response
        console.warn('⚠️ [AUTH] Invalid phone format:', err.message);
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    }

    if (!user) {
      // Generic response to prevent user enumeration
      console.warn('⚠️ [AUTH] User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // ✅ PASSWORD VERIFICATION
    console.log('🔐 [AUTH] Verifying password');
    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) {
      console.warn('⚠️ [AUTH] Password mismatch');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // ✅ GENERATE TOKENS
    console.log('🎫 [AUTH] Generating tokens');
    const {
      accessToken,
      refreshToken,
      refreshTokenHash
    } = generateTokens(user);

    user.refreshTokenHash = refreshTokenHash;
    user.lastLogin = new Date();

    await user.save();

    console.log('✅ [AUTH] Login successful for user:', user.uid);

    // Build user response based on role
    const userResponse = {
      uid: user.uid,
      email: user.email,
      role: user.role,
      phone: user.phone,
      verifiedByAdmin: user.verifiedByAdmin,
    };

    // Add role-specific fields
    if (user.role === "donor") {
      userResponse.fname = user.fname;
      userResponse.lname = user.lname;
      userResponse.bloodType = user.bloodType;
      userResponse.status = user.status;
      userResponse.donationCount = user.donationCount || 0;
      userResponse.lastDonationDate = user.lastDonationDate || null;
      userResponse.nextEligibleDate = user.nextEligibleDate || null;
    } else if (user.role === 'super_admin') {
      userResponse.fname = user.superAdminFName;
      userResponse.lname = user.superAdminLName;
    }

    res.json({
      message: 'Login successful',
      user: userResponse,
      accessToken,
      refreshToken,
      verificationStatus:
        user.role === 'donor'
          ? user.verifiedByAdmin
            ? 'verified'
            : 'pending'
          : 'verified'
    });
  } catch (error) {
    console.error('❌ [AUTH] Login error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ error: 'Login failed' });
  }
};

const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token required',
        code: 'NO_REFRESH_TOKEN',
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(
        refreshToken,
        env.JWT_REFRESH_SECRET
      );
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Refresh token expired',
          code: 'REFRESH_TOKEN_EXPIRED',
        });
      }

      return res.status(401).json({
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN',
      });
    }

    const user = await User.findOne({
      uid: decoded.uid,
    });

    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    const incomingRefreshTokenHash =
      hashRefreshToken(refreshToken);

    if (
      !user.refreshTokenHash ||
      user.refreshTokenHash !== incomingRefreshTokenHash
    ) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        code: 'REFRESH_TOKEN_MISMATCH',
      });
    }

    // Generate a completely new token pair
    const {
      accessToken,
      refreshToken: newRefreshToken,
      refreshTokenHash: newRefreshTokenHash
    } = generateTokens(user);

    // Rotate refresh token
    user.refreshTokenHash = newRefreshTokenHash;

    await user.save();

    return res.json({
      accessToken,
      refreshToken: newRefreshToken,
    });

  } catch (error) {
    console.error(
      '❌ Token refresh error:',
      error.message
    );

    return res.status(500).json({
      error: 'Token refresh failed',
      code: 'REFRESH_FAILED',
    });
  }
};

const createDonorByAdmin = async (req, res) => {
  try {
    // ✅ USER MUST BE AUTHENTICATED AS ADMIN (verified by middleware)
    const adminuid = req.user.uid;
    const adminRole = req.user.role;

    if (adminRole !== 'super_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { email, fname, lname, phone, password, bloodType } = req.body;

    // ✅ VALIDATION
    if (!email || !fname || !lname || !phone || !password || !bloodType) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // ✅ PASSWORD STRENGTH
    try {
      validatePasswordStrength(password);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    // ✅ SANITIZE INPUTS
    let sanitizedEmail, sanitizedPhone, sanitizedFname, sanitizedLname, sanitizedBloodType;
    try {
      sanitizedEmail = sanitizeEmail(email);
      sanitizedPhone = sanitizePhone(phone);
      sanitizedFname = sanitizeName(fname);
      sanitizedLname = sanitizeName(lname);
      sanitizedBloodType = sanitizeBloodType(bloodType);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    // ✅ CHECK DUPLICATES
    const existingEmail = await User.findOne({ email: sanitizedEmail });
    const existingPhone = await User.findOne({ phone: sanitizedPhone });

    if (existingEmail || existingPhone) {
      return res.status(400).json({ error: 'Email or phone already exists' });
    }

    // ✅ HASH PASSWORD
    const hashedPassword = await hashPassword(password);

    // ✅ CREATE DONOR
    const newDonor = new User({
      uid: `user-${Date.now()}`,
      email: sanitizedEmail,
      fname: sanitizedFname,
      lname: sanitizedLname,
      phone: sanitizedPhone,
      password: hashedPassword,
      role: 'donor',
      bloodType: sanitizedBloodType,
      verifiedByAdmin: true,
      createdBy: adminuid,
      createdAt: new Date()
    });

    await newDonor.save();

    // ✅ LOG ADMIN ACTION (audit trail)
    console.log(`✅ [AUDIT] Admin ${adminuid} created donor ${newDonor.uid}`);

    res.status(201).json({
      message: 'Donor created successfully',
      user: {
        uid: newDonor.uid,
        email: newDonor.email,
        fname: newDonor.fname,
        lname: newDonor.lname,
        role: newDonor.role,
        phone: newDonor.phone,
        bloodType: newDonor.bloodType,
      }
    });
  } catch (error) {
    console.error('❌ Error creating donor:', error.message);
    res.status(500).json({ error: 'Failed to create donor' });
  }
};

const verifyDonor = async (req, res) => {
  try {
    // ✅ USER MUST BE AUTHENTICATED AS ADMIN

    const { uid } = req.params;

    // ✅ VALIDATE UID (basic format check)
    if (!uid || typeof uid !== 'string' || uid.length > 50) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // ✅ FIND AND UPDATE USER
    const user = await User.findOneAndUpdate(
      { uid, role: 'donor' },
      {
        verifiedByAdmin: true,
        verifiedAt: new Date(),
        verifiedBy: req.user.uid
      },
      { new: true }
    ).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({ error: 'Donor not found' });
    }

    // ✅ LOG ADMIN ACTION
    console.log(`✅ [AUDIT] Admin ${req.user.uid} verified donor ${uid}`);

    res.json({ message: 'Donor verified successfully', user });
  } catch (error) {
    console.error('❌ Error verifying donor:', error.message);
    res.status(500).json({ error: 'Failed to verify donor' });
  }
};

const updateUserByAdmin = async (req, res) => {
  try {
    // ✅ USER MUST BE AUTHENTICATED AS ADMIN

    const { uid } = req.params;
    const { email, phone, role, fname, lname } = req.body;

    // ✅ VALIDATE UID
    if (!uid || typeof uid !== 'string' || uid.length > 50) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // ✅ SANITIZE INPUTS
    const updateData = {};
    try {
      if (email) updateData.email = sanitizeEmail(email);
      if (phone) updateData.phone = sanitizePhone(phone);
      if (fname) updateData.fname = sanitizeName(fname);
      if (lname) updateData.lname = sanitizeName(lname);
      if (role && ['donor', 'hospital', 'super_admin'].includes(role)) updateData.role = role;
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    updateData.updatedAt = new Date();
    updateData.updatedBy = req.user.uid;

    // ✅ UPDATE USER
    const user = await User.findOneAndUpdate(
      { uid },
      updateData,
      { new: true }
    ).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // ✅ LOG ADMIN ACTION
    console.log(`✅ [AUDIT] Admin ${req.user.uid} updated user ${uid}`);

    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('❌ Error updating user:', error.message);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

const deleteUserByAdmin = async (req, res) => {
  try {
    // ✅ USER MUST BE AUTHENTICATED AS ADMIN

    const { uid } = req.params;

    // ✅ VALIDATE UID
    if (!uid || typeof uid !== 'string' || uid.length > 50) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // ✅ PREVENT DELETING SELF
    if (uid === req.user.uid) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // ✅ DELETE USER
    const user = await User.findOneAndDelete({ uid });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // ✅ LOG ADMIN ACTION
    console.log(`✅ [AUDIT] Admin ${req.user.uid} deleted user ${uid}`);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting user:', error.message);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// Create Super Admin by Admin (UPDATED - Uses req.user from token)
const createSuperAdminByAdmin = async (req, res) => {
  try {
    // ✅ USER MUST BE AUTHENTICATED AS ADMIN

    const { email, phone, password, superAdminFName, superAdminLName } = req.body;

    // ✅ VALIDATION
    if (!email || !phone || !password || !superAdminFName || !superAdminLName) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // ✅ PASSWORD STRENGTH
    try {
      validatePasswordStrength(password);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    // ✅ SANITIZE INPUTS
    let sanitizedEmail, sanitizedPhone, sanitizedFname, sanitizedLname;
    try {
      sanitizedEmail = sanitizeEmail(email);
      sanitizedPhone = sanitizePhone(phone);
      sanitizedFname = sanitizeName(superAdminFName);
      sanitizedLname = sanitizeName(superAdminLName);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    // ✅ CHECK DUPLICATES
    const existingEmail = await User.findOne({ email: sanitizedEmail });
    const existingPhone = await User.findOne({ phone: sanitizedPhone });

    if (existingEmail || existingPhone) {
      return res.status(400).json({ error: 'Email or phone already exists' });
    }

    // ✅ HASH PASSWORD
    const hashedPassword = await hashPassword(password);

    // ✅ CREATE SUPER ADMIN
    const newSuperAdmin = new User({
      uid: `user-${Date.now()}`,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      password: hashedPassword,
      role: 'super_admin',
      superAdminFName: sanitizedFname,
      superAdminLName: sanitizedLname,
      verifiedByAdmin: true,
      createdBy: req.user.uid,
      createdAt: new Date()
    });

    await newSuperAdmin.save();

    // ✅ LOG ADMIN ACTION
    console.log(`✅ [AUDIT] Admin ${req.user.uid} created super admin ${newSuperAdmin.uid}`);

    res.status(201).json({
      message: 'Super Admin created successfully',
      user: {
        uid: newSuperAdmin.uid,
        email: newSuperAdmin.email,
        role: newSuperAdmin.role,
        phone: newSuperAdmin.phone,
        superAdminFName: newSuperAdmin.superAdminFName,
        superAdminLName: newSuperAdmin.superAdminLName
      }
    });
  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
    res.status(500).json({ error: 'Failed to create super admin' });
  }
};

// Create Hospital by Admin (UPDATED - Uses req.user from token)
const createHospitalByAdmin = async (req, res) => {
  try {
    // ✅ USER MUST BE AUTHENTICATED AS ADMIN

    const { email, phone, password, hospitalName, hospitalContactName, hospitalContactTitle, hospitalAddress } = req.body;

    // ✅ VALIDATION
    if (!email || !phone || !password || !hospitalName || !hospitalContactName || !hospitalContactTitle || !hospitalAddress) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // ✅ PASSWORD STRENGTH
    try {
      validatePasswordStrength(password);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    // ✅ SANITIZE INPUTS
    let sanitizedEmail, sanitizedPhone, sanitizedHospitalName, sanitizedContactName, sanitizedAddress;
    try {
      sanitizedEmail = sanitizeEmail(email);
      sanitizedPhone = sanitizePhone(phone);
      sanitizedHospitalName = sanitizeName(hospitalName);
      sanitizedContactName = sanitizeName(hospitalContactName);
      sanitizedAddress = sanitizeName(hospitalAddress); // Basic sanitization
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    // ✅ CHECK DUPLICATES
    const existingEmail = await User.findOne({ email: sanitizedEmail });
    const existingPhone = await User.findOne({ phone: sanitizedPhone });

    if (existingEmail || existingPhone) {
      return res.status(400).json({ error: 'Email or phone already exists' });
    }

    // ✅ HASH PASSWORD
    const hashedPassword = await hashPassword(password);

    // ✅ CREATE HOSPITAL USER
    const newHospital = new User({
      uid: `user-${Date.now()}`,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      password: hashedPassword,
      role: 'hospital',
      hospitalName: sanitizedHospitalName,
      hospitalContactName: sanitizedContactName,
      hospitalContactTitle: hospitalContactTitle, // Already sanitized by middleware
      hospitalAddress: sanitizedAddress,
      verifiedByAdmin: true,
      createdBy: req.user.uid,
      createdAt: new Date()
    });

    await newHospital.save();

    // ✅ LOG ADMIN ACTION
    console.log(`✅ [AUDIT] Admin ${req.user.uid} created hospital ${newHospital.uid}`);

    res.status(201).json({
      message: 'Hospital user created successfully',
      user: {
        uid: newHospital.uid,
        email: newHospital.email,
        role: newHospital.role,
        phone: newHospital.phone,
        hospitalName: newHospital.hospitalName,
        hospitalContactName: newHospital.hospitalContactName,
        hospitalContactTitle: newHospital.hospitalContactTitle,
        hospitalAddress: newHospital.hospitalAddress
      }
    });
  } catch (error) {
    console.error('❌ Error creating hospital:', error.message);
    res.status(500).json({ error: 'Failed to create hospital' });
  }
};

// Get Pending Users (UPDATED - Uses req.user from token, no query params)
const getPendingUsers = async (req, res) => {
  try {
    // ✅ USER MUST BE AUTHENTICATED AS ADMIN

    const pending = await User.find({ verifiedByAdmin: false })
      .select('-password -refreshToken')
      .limit(1000);

    res.json(pending);
  } catch (error) {
    console.error('❌ Error fetching pending users:', error.message);
    res.status(500).json({ error: 'Failed to fetch pending users' });
  }
};

// Logout User
const logoutUser = async (req, res) => {
  try {
    const uid = req.user.uid;

    const user = await User.findOne({
      uid: uid
    });

    if (user) {
      user.refreshTokenHash = null;
      user.lastLogout = new Date();

      await user.save();
    }

    res.json({
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error(
      '❌ Logout error:',
      error.message
    );

    res.status(500).json({
      error: 'Logout failed'
    });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const user = await User.findOne({
      uid,
    }).select(
      "-password -refreshToken -refreshTokenHash"
    );

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    /*
     * Repair donor cooldown status.
     */
    if (user.role === "donor") {
      const now = new Date();

      const nextEligibleDate =
        user.nextEligibleDate
          ? new Date(user.nextEligibleDate)
          : null;

      const hasValidNextEligibleDate =
        nextEligibleDate &&
        !Number.isNaN(
          nextEligibleDate.getTime()
        );

      /*
       * Cooldown expired:
       * restore eligibility.
       */
      if (
        user.status === "cool-down" &&
        hasValidNextEligibleDate &&
        now >= nextEligibleDate
      ) {
        user.status = "eligible";
        user.nextEligibleDate = null;
        user.updatedAt = now;

        await user.save();
      }

      /*
       * Invalid state:
       * status says cooldown but there is no valid date.
       *
       * Restore eligibility instead of leaving the
       * donor permanently blocked.
       */
      if (
        user.status === "cool-down" &&
        !hasValidNextEligibleDate
      ) {
        console.warn(
          `[AUTH] Repairing invalid cooldown for donor ${user.uid}: missing or invalid nextEligibleDate`
        );

        user.status = "eligible";
        user.nextEligibleDate = null;
        user.updatedAt = now;

        await user.save();
      }
    }

    console.log(
      "[AUTH] Current user profile:",
      {
        uid: user.uid,
        status: user.status,
        lastDonationDate:
          user.lastDonationDate,
        nextEligibleDate:
          user.nextEligibleDate,
        donationCount:
          user.donationCount,
      }
    );

    res.json({
      user: {
        uid: user.uid,
        email: user.email,
        phone: user.phone,
        role: user.role,

        fname: user.fname,
        lname: user.lname,
        bloodType: user.bloodType,

        status: user.status,

        donationCount:
          user.donationCount || 0,

        lastDonationDate:
          user.lastDonationDate || null,

        nextEligibleDate:
          user.nextEligibleDate || null,

        verifiedByAdmin:
          Boolean(user.verifiedByAdmin),

        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error(
      "[AUTH] Get current user error:",
      error
    );

    res.status(500).json({
      error:
        "Failed to fetch current user profile",
    });
  }
};

// Export all controllers
export default {
  getAllAccounts,
  registerDonor,
  getCurrentUser,
  loginUser,
  refreshAccessToken,
  createDonorByAdmin,
  verifyDonor,
  updateUserByAdmin,
  deleteUserByAdmin,
  createSuperAdminByAdmin,
  createHospitalByAdmin,
  getPendingUsers,
  logoutUser,
};
