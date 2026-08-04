import ProfileRequest from '../../models/ProfileRequest.js';
import User from '../../models/User.js';
import { Notification } from '../../models/Notification.js';

class ProfileController {
  // Request profile update
  static async requestProfileUpdate(req, res) {
    try {
      const { uid } = req.user; // From JWT token middleware
      const { fname, lname, phone, bloodType } = req.body;

      // Get user data
      const user = await User.findOne({ uid: uid });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Create profile update request
      const changes = {};
      if (fname && fname !== user.fname) changes.fname = fname;
      if (lname && lname !== user.lname) changes.lname = lname;
      if (phone && phone !== user.phone) changes.phone = phone;
      if (bloodType && bloodType !== user.bloodType) changes.bloodType = bloodType;

      // Check if there are any changes
      if (Object.keys(changes).length === 0) {
        return res.status(400).json({ message: 'No changes to request' });
      }

      // Create the profile request
      const profileRequest = new ProfileRequest({
        uid: uid,
        email: user.email,
        requestType: 'profile_update',
        changes: changes,
        status: 'pending',
      });

      await profileRequest.save();

      // Set user's verification status to pending (not verified)
      user.verifiedByAdmin = false;
      await user.save();

      // Create notification for admins
      await ProfileController.createAdminNotification(
        profileRequest,
        user,
        'profile_update_request'
      );

      res.status(201).json({
        message: 'Profile update request submitted successfully',
        profileRequest,
      });
    } catch (err) {
      console.error('Error requesting profile update:', err);
      res.status(500).json({ message: 'Error submitting profile update request', error: err.message });
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
        profileRequest.rejectionReason = rejectionReason || null;
      }

      await profileRequest.save();

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
          donorId: admin._id.toString(),
          requestId: profileRequest._id,
          type: 'profile_request',
          title: title,
          message: message,
          read: false,
        });
      });

      await Promise.all(notificationPromises.map((notification) => notification.save()));
    } catch (err) {
      console.error('Error creating admin notification:', err);
    }
  }
}

export default ProfileController;
