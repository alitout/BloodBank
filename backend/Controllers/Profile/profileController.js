import ProfileRequest from '../../models/ProfileRequest.js';
import User from '../../models/User.js';
import { Notification } from '../../models/Notification.js';
import { validateDateOfBirth } from "../../utils/dateOfBirth.js";

class ProfileController {
  // Request profile update
  static async requestProfileUpdate(req, res) {
    try {
      const { uid } = req.user;
      const { fname, lname, phone, bloodType, dateOfBirth, biologicalSex, } = req.body;
      const user = await User.findOne({ uid });

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const changes = {};

      if (fname && fname !== user.fname) {
        changes.fname = fname;
      }

      if (lname && lname !== user.lname) {
        changes.lname = lname;
      }

      if (phone && phone !== user.phone) {
        changes.phone = phone;
      }

      if (
        bloodType &&
        bloodType !== user.bloodType
      ) {
        changes.bloodType = bloodType;
      }

      if (
        dateOfBirth !== undefined ||
        biologicalSex !== undefined
      ) {
        if (user.role !== "donor") {
          return res.status(400).json({
            message:
              "Donation eligibility fields are only available for donor accounts",
          });
        }
      }

      if (dateOfBirth !== undefined) {
        const validation =
          validateDateOfBirth(dateOfBirth);

        if (!validation.valid) {
          return res.status(400).json({
            message: validation.error,
            code: validation.code,
          });
        }

        const existingDate =
          user.dateOfBirth
            ? new Date(user.dateOfBirth)
              .toISOString()
              .slice(0, 10)
            : null;

        const requestedDate =
          validation.date
            .toISOString()
            .slice(0, 10);

        if (existingDate !== requestedDate) {
          changes.dateOfBirth =
            validation.date;
        }
      }

      if (biologicalSex !== undefined) {
        const normalizedSex =
          typeof biologicalSex === "string"
            ? biologicalSex
              .trim()
              .toLowerCase()
            : "";

        if (
          !["male", "female"].includes(
            normalizedSex
          )
        ) {
          return res.status(400).json({
            message:
              "Biological sex must be male or female",
            code:
              "INVALID_BIOLOGICAL_SEX",
          });
        }

        if (
          normalizedSex !==
          user.biologicalSex
        ) {
          changes.biologicalSex =
            normalizedSex;
        }
      }

      if (Object.keys(changes).length === 0) {
        return res.status(400).json({
          message: "No changes to request",
        });
      }

      const existingPendingRequest =
        await ProfileRequest.findOne({
          uid,
          requestType: "profile_update",
          status: "pending",
        });

      if (existingPendingRequest) {
        return res.status(409).json({
          message:
            "You already have a pending profile update request",
          code:
            "PROFILE_UPDATE_ALREADY_PENDING",
        });
      }

      const profileRequest =
        new ProfileRequest({
          uid,
          email: user.email,
          requestType: "profile_update",
          changes,
          status: "pending",
        });

      await profileRequest.save();

      await ProfileController.createAdminNotification(
        profileRequest,
        user,
        "profile_update_request"
      );

      return res.status(201).json({
        message:
          "Profile update request submitted successfully",
        profileRequest,
      });
    } catch (error) {
      console.error(
        "Error requesting profile update:",
        error
      );

      return res.status(500).json({
        message:
          "Error submitting profile update request",
      });
    }
  }

  // Request account deletion
  static async requestAccountDeletion(req, res) {
    try {
      const { uid } = req.user; // From JWT token middleware
      const { reason } = req.body;

      // Get user data
      const user = await User.findOne({ uid: uid });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Create account deletion request
      const profileRequest = new ProfileRequest({
        uid: uid,
        email: user.email,
        requestType: 'account_deletion',
        reason: reason || null,
        status: 'pending',
      });

      await profileRequest.save();

      // Create notification for admins
      await ProfileController.createAdminNotification(
        profileRequest,
        user,
        'account_deletion_request'
      );

      res.status(201).json({
        message: 'Account deletion request submitted successfully',
        profileRequest,
      });
    } catch (err) {
      console.error('Error requesting account deletion:', err);
      res.status(500).json({ message: 'Error submitting deletion request', error: err.message });
    }
  }

  // Get all profile requests (admin only)
  static async getProfileRequests(req, res) {
    try {
      const requests = await ProfileRequest.find().sort({ createdAt: -1 });

      res.status(200).json(requests);
    } catch (err) {
      console.error('Error fetching profile requests:', err);
      res.status(500).json({ message: 'Error fetching profile requests', error: err.message });
    }
  }

  // Approve or reject profile request (admin only)
  static async updateProfileRequest(req, res) {
    try {
      const { id } = req.params;
      const { status, rejectionReason } = req.body;
      const { uid: adminID } = req.user; // Admin user ID from JWT

      // Validate status
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      // Find the profile request
      const profileRequest = await ProfileRequest.findById(id);
      if (!profileRequest) {
        return res.status(404).json({ message: 'Profile request not found' });
      }

      if (profileRequest.status !== 'pending') {
        return res.status(409).json({
          message: 'Profile request has already been processed'
        });
      }

      // Update request status
      profileRequest.status = status;
      profileRequest.processedByAdmin = adminID;

      if (status === 'approved') {
        profileRequest.approvedAt = new Date();

        // If it's a profile update, apply the changes to the user
        if (profileRequest.requestType === 'profile_update') {
          const user = await User.findOne({ uid: profileRequest.uid });
          if (user && profileRequest.changes) {
            Object.assign(user, profileRequest.changes);
            // Set user as verified by admin
            user.verifiedByAdmin = true;
            await user.save();
          }
        }

        // If it's an account deletion, delete the user
        if (profileRequest.requestType === 'account_deletion') {
          await User.deleteOne({ uid: profileRequest.uid });
        }
      } else if (status === 'rejected') {
        profileRequest.rejectedAt = new Date();
        profileRequest.rejectionReason =
          rejectionReason || null;

        if (
          profileRequest.requestType ===
          'profile_update'
        ) {
          await User.updateOne(
            {
              uid: profileRequest.uid
            },
            {
              $set: {
                verifiedByAdmin: true,
                updatedAt: new Date()
              }
            }
          );
        }
      }

      await profileRequest.save();

      await Notification.updateMany(
        {
          profileRequestId:
            profileRequest._id,

          type:
            "profile_request",

          actionTaken: {
            $ne: true,
          },
        },
        {
          $set: {
            read: true,
            readAt: new Date(),
            actionTaken: true,
            action: status,
          },
        }
      );

      if (
        status === 'rejected' &&
        profileRequest.requestType === 'profile_update'
      ) {
        await Notification.create({
          donorId: profileRequest.uid,
          adminId: null,
          profileRequestId: profileRequest._id,
          type: 'profile_update_rejected',
          title: 'Profile Update Rejected',
          message: rejectionReason
            ? `Your profile update request was rejected. Reason: ${rejectionReason}`
            : 'Your profile update request was rejected by an administrator.',
          read: false,
          actionTaken: false,
          createdAt: new Date()
        });
      }
      await Notification.updateMany(
        {
          profileRequestId: profileRequest._id,
          type: 'profile_request'
        },
        {
          $set: {
            read: true,
            readAt: new Date(),
            actionTaken: true,
            action: status
          }
        }
      );

      res.status(200).json({
        message: `Profile request ${status} successfully`,
        profileRequest,
      });
    } catch (err) {
      console.error('Error updating profile request:', err);
      res.status(500).json({ message: 'Error updating profile request', error: err.message });
    }
  }

  // Helper method to create admin notifications
  static async createAdminNotification(profileRequest, user, notificationType) {
    try {
      // Get all admin users
      const admins = await User.find({ role: 'super_admin' });

      if (admins.length === 0) return;

      // Create notification for each admin
      const notificationPromises = admins.map((admin) => {
        let title, message;

        if (notificationType === 'profile_update_request') {
          title = 'Profile Update Request';
          message = `User ${user.fname} ${user.lname} has requested profile changes. Changes: ${Object.keys(profileRequest.changes).join(', ')}`;
        } else if (notificationType === 'account_deletion_request') {
          title = 'Account Deletion Request';
          message = `User ${user.fname} ${user.lname} has requested account deletion. Reason: ${profileRequest.reason || 'Not provided'}`;
        }

        return new Notification({
          donorId: null,
          adminId: admin.uid,
          profileRequestId: profileRequest._id,
          type: 'profile_request',
          title,
          message,
          read: false,
          actionTaken: false,
        });
      });

      await Promise.all(notificationPromises.map((notification) => notification.save()));
    } catch (err) {
      console.error('Error creating admin notification:', err);
    }
  }
}

export default ProfileController;
