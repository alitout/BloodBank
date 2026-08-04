import Requester from '../../models/Requests.js';
import User from '../../models/User.js';
import Donation from '../../models/Donation.js';
import { Notification } from '../../models/Notification.js';

// Get all blood requests
const getAllRequesters = async (req, res) => {
  try {
    //console.log('[REQUESTER] Fetching all blood requests...');
    const requesters = await Requester.find({});
    //console.log(`[REQUESTER] Found ${requesters.length} blood requests`);
    res.json(requesters);
  } catch (error) {
    console.error('[REQUESTER] Error fetching requests:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Create blood request
const createRequester = async (req, res) => {
  try {
    const { fname, fatherName, lname, bloodGenre, bloodType, hospital, unitsNeeded, date, description, relationToPatient } = req.body;
    //console.log('[REQUESTER] Creating blood request:', { fname, lname, bloodType, hospital, unitsNeeded });

    const newRequest = new Requester({
      id: `req-${Date.now()}`,
      fname,
      fatherName,
      lname,
      bloodGenre,
      bloodType,
      hospital,
      unitsNeeded,
      date,
      description,
      relationToPatient,
      status: 'pending'
    });

    await newRequest.save();
    //console.log('[REQUESTER] Blood request created:', newRequest.id);
    
    // Automatically find and notify matching donors
    try {
      await findAndNotifyMatchingDonors(newRequest);
    } catch (notificationError) {
      console.error('[REQUESTER] Error sending notifications:', notificationError.message);
      // Don't fail the request creation if notifications fail
    }
    
    res.status(201).json({ message: 'Blood request created', requester: newRequest });
  } catch (error) {
    console.error('[REQUESTER] Error creating request:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Find matching donors and send notifications
const findAndNotifyMatchingDonors = async (request) => {
  try {
    // Find all donors with matching blood type and eligible status
    const matchingDonors = await User.find({
      role: 'donor',
      bloodType: request.bloodType,
      status: 'eligible'
    });

    console.log(`[NOTIFICATION] Found ${matchingDonors.length} eligible donors for blood type ${request.bloodType}`);

    // Create notifications for each matching donor
    const notifications = matchingDonors.map((donor) => ({
      donorId: donor.uid,
      requestId: request._id,
      type: 'request_available',
      title: `New Blood Request Available`,
      message: `A new ${request.bloodType} blood request is available at ${request.hospital}. Units needed: ${request.unitsNeeded}. Click to view and assign yourself if interested.`,
      read: false,
      actionTaken: false
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      console.log(`[NOTIFICATION] Created ${notifications.length} notifications for request ${request._id}`);
    }
  } catch (error) {
    console.error('[NOTIFICATION] Error in findAndNotifyMatchingDonors:', error.message);
    throw error;
  }
};

// Update blood request
const updateRequester = async (req, res) => {
  try {
    const { id } = req.params;
    //console.log('[REQUESTER] Updating blood request:', id);

    const updatedRequest = await Requester.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    if (!updatedRequest) {
      //console.log('[REQUESTER] Update failed: Request not found');
      return res.status(404).json({ error: 'Blood request not found' });
    }

    //console.log('[REQUESTER] Blood request updated:', id);
    res.json({ message: 'Blood request updated', requester: updatedRequest });
  } catch (error) {
    console.error('[REQUESTER] Error updating request:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Delete blood request
const deleteRequester = async (req, res) => {
  try {
    const { id } = req.params;
    //console.log('[REQUESTER] Deleting blood request:', id);

    const deleted = await Requester.findByIdAndDelete(id);
    if (!deleted) {
      //console.log('[REQUESTER] Delete failed: Request not found');
      return res.status(404).json({ error: 'Blood request not found' });
    }

    //console.log('[REQUESTER] Blood request deleted:', id);
    res.json({ message: 'Blood request deleted', requester: deleted });
  } catch (error) {
    console.error('[REQUESTER] Error deleting request:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Assign blood request to a donor
const assignRequestToDonor = async (req, res) => {
  try {
    const { id } = req.params;
    const { donorId } = req.body;
    const adminId = req.user?.uid; // From auth middleware

    if (!donorId) {
      return res.status(400).json({ error: 'Donor ID is required' });
    }

    console.log('[REQUESTER] Assigning blood request:', id, 'to donor:', donorId);

    const updatedRequest = await Requester.findByIdAndUpdate(
      id,
      {
        assignedTo: donorId,
        assignedAt: new Date(),
        assignedByAdmin: adminId,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updatedRequest) {
      console.log('[REQUESTER] Assignment failed: Request not found');
      return res.status(404).json({ error: 'Blood request not found' });
    }

    console.log('[REQUESTER] Blood request assigned successfully:', id);
    res.json({ message: 'Blood request assigned to donor', requester: updatedRequest });
  } catch (error) {
    console.error('[REQUESTER] Error assigning request:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Donor self-assigns to a request (new workflow)
const assignSelfToRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { unitsRequested } = req.body; // Optional: number of units donor wants to take (default 1)
    const donorId = req.user?.uid; // From auth middleware

    if (!donorId) {
      return res.status(401).json({ error: 'Donor ID not found in token' });
    }

    console.log('[REQUESTER] Donor self-assigning to request:', id, 'Donor:', donorId);

    // Get the request
    const request = await Requester.findById(id);
    if (!request) {
      return res.status(404).json({ error: 'Blood request not found' });
    }

    // Check if donor is already assigned to this request
    const alreadyAssigned = request.assignedDonors?.some(d => d.donorUid === donorId);
    if (alreadyAssigned) {
      return res.status(400).json({ error: 'You are already assigned to this request' });
    }

    // Calculate total units already assigned
    const totalAssigned = request.assignedDonors?.reduce((sum, d) => sum + d.unitsAssigned, 0) || 0;
    const unitsToAssign = unitsRequested || 1;

    // Check if enough units are available
    if (totalAssigned + unitsToAssign > request.unitsNeeded) {
      return res.status(400).json({ 
        error: `Only ${request.unitsNeeded - totalAssigned} unit(s) remaining for this request` 
      });
    }

    // Verify donor has matching blood type
    const donor = await User.findOne({ uid: donorId, role: 'donor' });
    if (!donor) {
      return res.status(404).json({ error: 'Donor not found' });
    }

    if (donor.bloodType !== request.bloodType) {
      return res.status(400).json({ error: 'Your blood type does not match this request' });
    }

    if (donor.status !== 'eligible') {
      return res.status(400).json({ error: 'You are not eligible to donate at this time' });
    }

    // Add donor to assignedDonors array
    request.assignedDonors.push({
      donorUid: donorId,
      unitsAssigned: unitsToAssign,
      unitsCompleted: 0,
      assignedAt: new Date()
    });

    // Update request
    const updatedRequest = await request.save();

    // Mark the notification as actioned
    await Notification.findOneAndUpdate(
      { donorId, requestId: id, type: 'request_available' },
      { 
        read: true, 
        readAt: new Date(),
        actionTaken: true,
        assignedByThisNotification: true 
      }
    );

    // Create notification for admins about new assignment
    try {
      const donorInfo = await User.findOne({ uid: donorId });
      await Notification.create({
        id: `notif-${Date.now()}`,
        adminId: null, // For all admins
        type: 'donor_assigned',
        title: `New Assignment: ${donorInfo?.fname} ${donorInfo?.lname}`,
        message: `Donor ${donorInfo?.fname} ${donorInfo?.lname} has assigned ${unitsToAssign} unit(s) to request for ${request.fname}`,
        requestId: id,
        donorId: donorId,
        read: false,
        createdAt: new Date()
      });
      console.log('[NOTIFICATION] Created admin notification for new assignment');
    } catch (notificationError) {
      console.error('[REQUESTER] Error creating admin notification:', notificationError.message);
      // Don't fail the assignment if notification fails
    }

    console.log('[REQUESTER] Donor self-assigned successfully:', id);
    res.json({ 
      message: 'You have successfully assigned yourself to this request', 
      requester: updatedRequest,
      myAssignment: request.assignedDonors[request.assignedDonors.length - 1]
    });
  } catch (error) {
    console.error('[REQUESTER] Error in self-assignment:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Get all donations (for admin dashboard)
const getAllDonations = async (req, res) => {
  try {
    // Get all requests with completed donations
    const requests = await Requester.find({});
    
    const allDonations = [];
    
    for (const request of requests) {
      if (request.assignedDonors && request.assignedDonors.length > 0) {
        for (const assignment of request.assignedDonors) {
          if (assignment.unitsCompleted > 0) {
            // Get donor info
            const donor = await User.findOne({ uid: assignment.donorUid });
            
            allDonations.push({
              id: `${request.id}-${assignment.donorUid}`,
              requestId: request.id,
              donorUid: assignment.donorUid,
              donorName: donor ? `${donor.fname} ${donor.lname}` : 'Unknown',
              donorBloodType: donor?.bloodType || 'Unknown',
              patientName: `${request.fname} ${request.lname}`,
              patientBloodType: request.bloodType,
              hospital: request.hospital,
              bloodGenre: request.bloodGenre,
              unitsRequested: assignment.unitsAssigned,
              unitsCompleted: assignment.unitsCompleted,
              completionDate: assignment.completedAt || request.updatedAt,
              requestDate: request.date,
              assignedAt: assignment.assignedAt,
              requestStatus: request.status
            });
          }
        }
      }
    }
    
    // Sort by completion date descending
    allDonations.sort((a, b) => new Date(b.completionDate) - new Date(a.completionDate));
    
    res.json(allDonations);
  } catch (error) {
    console.error('[REQUESTER] Error fetching all donations:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Get available requests for a donor (matching blood type)
const getAvailableRequests = async (req, res) => {
  try {
    const donorId = req.user?.uid; // From auth middleware

    if (!donorId) {
      return res.status(401).json({ error: 'Donor ID not found in token' });
    }

    // Get donor's blood type
    const donor = await User.findOne({ uid: donorId, role: 'donor' });
    if (!donor) {
      return res.status(404).json({ error: 'Donor not found' });
    }

    // Find pending requests with matching blood type
    const requests = await Requester.find({
      bloodType: donor.bloodType,
      status: 'pending'
    }).sort({ createdAt: -1 });

    // Filter requests with available units
    const availableRequests = requests.filter(req => {
      const totalAssigned = req.assignedDonors?.reduce((sum, d) => sum + d.unitsAssigned, 0) || 0;
      const unitsAvailable = req.unitsNeeded - totalAssigned;
      return unitsAvailable > 0 && !req.assignedDonors?.some(d => d.donorUid === donorId);
    });

    // Add available units count to each request
    const enrichedRequests = availableRequests.map(req => {
      const totalAssigned = req.assignedDonors?.reduce((sum, d) => sum + d.unitsAssigned, 0) || 0;
      return {
        ...req.toObject(),
        unitsAssigned: totalAssigned,
        unitsAvailable: req.unitsNeeded - totalAssigned
      };
    });

    console.log(`[REQUESTER] Found ${enrichedRequests.length} available requests for donor ${donorId}`);
    res.json({ availableRequests: enrichedRequests, donorBloodType: donor.bloodType });
  } catch (error) {
    console.error('[REQUESTER] Error fetching available requests:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Get notifications for a donor
const getDonorNotifications = async (req, res) => {
  try {
    const donorId = req.user?.uid; // From auth middleware

    if (!donorId) {
      return res.status(401).json({ error: 'Donor ID not found in token' });
    }

    const notifications = await Notification.find({ donorId })
      .sort({ createdAt: -1 })
      .populate('requestId', 'bloodType hospital unitsNeeded status');

    const unreadCount = await Notification.countDocuments({ donorId, read: false });

    console.log(`[NOTIFICATION] Retrieved ${notifications.length} notifications for donor ${donorId}`);
    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('[NOTIFICATION] Error fetching notifications:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Mark notification as read
const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const donorId = req.user?.uid;

    if (!donorId) {
      return res.status(401).json({ error: 'Donor ID not found in token' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, donorId },
      { 
        read: true, 
        readAt: new Date()
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('[NOTIFICATION] Error marking notification as read:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Manually match and notify donors for a specific request
const matchAndNotifyDonors = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.uid; // From auth middleware

    if (!adminId) {
      return res.status(401).json({ error: 'Admin ID not found in token' });
    }

    // Get the request
    const request = await Requester.findById(id);
    if (!request) {
      return res.status(404).json({ error: 'Blood request not found' });
    }

    console.log('[REQUESTER] Admin manually matching donors for request:', id);

    // Find matching donors
    const matchingDonors = await User.find({
      role: 'donor',
      bloodType: request.bloodType,
      status: 'eligible'
    });

    console.log(`[NOTIFICATION] Found ${matchingDonors.length} eligible donors for blood type ${request.bloodType}`);

    // Create notifications for matching donors (skip if they already have a notification for this request)
    const newNotifications = [];
    for (const donor of matchingDonors) {
      const existingNotification = await Notification.findOne({
        donorId: donor.uid,
        requestId: id
      });

      if (!existingNotification) {
        newNotifications.push({
          donorId: donor.uid,
          requestId: request._id,
          type: 'request_available',
          title: `New Blood Request Available`,
          message: `A new ${request.bloodType} blood request is available at ${request.hospital}. Units needed: ${request.unitsNeeded}. Click to view and assign yourself if interested.`,
          read: false,
          actionTaken: false
        });
      }
    }

    if (newNotifications.length > 0) {
      await Notification.insertMany(newNotifications);
      console.log(`[NOTIFICATION] Created ${newNotifications.length} new notifications for request ${id}`);
    }

    res.json({
      message: `Matched and notified ${newNotifications.length} eligible donors`,
      totalEligibleDonors: matchingDonors.length,
      newNotificationsSent: newNotifications.length,
      request: request
    });
  } catch (error) {
    console.error('[REQUESTER] Error matching and notifying donors:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Get assigned requests for a donor
const getAssignedRequests = async (req, res) => {
  try {
    const donorId = req.user?.uid; // From auth middleware

    if (!donorId) {
      return res.status(401).json({ error: 'Donor ID not found in token' });
    }

    console.log('[REQUESTER] Fetching assigned requests for donor:', donorId);

    // Find requests where this donor is in assignedDonors
    const assignedRequests = await Requester.find({
      'assignedDonors.donorUid': donorId,
      status: { $ne: 'cancelled' }
    }).sort({ 'assignedDonors.assignedAt': -1 });

    // Filter to only show active assignments (where donor hasn't completed their units)
    const activeRequests = assignedRequests.filter(req => {
      const donorAssignment = req.assignedDonors.find(d => d.donorUid === donorId);
      // Show if not all units completed by this donor
      return donorAssignment && donorAssignment.unitsCompleted < donorAssignment.unitsAssigned;
    });

    // Map to include only this donor's assignment info
    const enrichedRequests = activeRequests.map(req => {
      const donorAssignment = req.assignedDonors.find(d => d.donorUid === donorId);
      return {
        ...req.toObject(),
        myAssignment: donorAssignment
      };
    });

    res.json(enrichedRequests);
  } catch (error) {
    console.error('[REQUESTER] Error fetching assigned requests:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Complete a donation (donor confirms donation is done)
const completeDonation = async (req, res) => {
  try {
    const { id } = req.params;
    const donorId = req.user?.uid; // From auth middleware

    if (!donorId) {
      return res.status(401).json({ error: 'Donor ID not found in token' });
    }

    console.log('[REQUESTER] Completing donation for request:', id, 'Donor:', donorId);

    // Get the request
    const request = await Requester.findById(id);
    if (!request) {
      return res.status(404).json({ error: 'Blood request not found' });
    }

    // Find donor's assignment
    const donorAssignment = request.assignedDonors?.find(d => d.donorUid === donorId);
    if (!donorAssignment) {
      return res.status(403).json({ error: 'This request is not assigned to you' });
    }

    // Mark all units as completed for this donor
    donorAssignment.unitsCompleted = donorAssignment.unitsAssigned;
    donorAssignment.completedAt = new Date();

    // Update donor's profile
    const donor = await User.findOne({ uid: donorId });
    if (donor) {
      // Increment donation count
      donor.donationCount = (donor.donationCount || 0) + donorAssignment.unitsAssigned;
      
      // Set last donation date to today
      donor.lastDonationDate = new Date();
      
      // Set status to cool-down for 56 days (standard blood donation interval)
      donor.status = 'cool-down';
      
      await donor.save();
      
      console.log('[REQUESTER] Updated donor profile - Donations:', donor.donationCount, 'Status:', donor.status);
    }

    // Check if all units are completed
    const totalCompleted = request.assignedDonors.reduce((sum, d) => sum + d.unitsCompleted, 0);
    if (totalCompleted === request.unitsNeeded) {
      request.status = 'fulfilled';
      console.log('[REQUESTER] Request fulfilled - All units completed:', id);
    }

    request.updatedAt = new Date();
    const updatedRequest = await request.save();

    // Create notification for admins about donation completion
    try {
      const donorInfo = await User.findOne({ uid: donorId });
      await Notification.create({
        id: `notif-${Date.now()}`,
        adminId: null, // For all admins
        type: 'donation_completed',
        title: `Donation Completed: ${donorInfo?.fname} ${donorInfo?.lname}`,
        message: `Donor ${donorInfo?.fname} ${donorInfo?.lname} has completed ${donorAssignment.unitsCompleted} unit(s) for patient ${request.fname}. Request status: ${request.status}`,
        requestId: id,
        donorId: donorId,
        read: false,
        createdAt: new Date()
      });
      console.log('[NOTIFICATION] Created admin notification for donation completion');
    } catch (notificationError) {
      console.error('[REQUESTER] Error creating donation completion notification:', notificationError.message);
      // Don't fail the donation if notification fails
    }

    console.log('[REQUESTER] Donation completed for request:', id);

    res.json({
      message: 'Donation completed successfully',
      request: updatedRequest,
      myAssignment: donorAssignment,
      donationCount: donor?.donationCount,
      status: donor?.status
    });
  } catch (error) {
    console.error('[REQUESTER] Error completing donation:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Get donation history for a donor (completed donations)
const getDonationHistory = async (req, res) => {
  try {
    const donorId = req.user?.uid; // From auth middleware

    if (!donorId) {
      return res.status(401).json({ error: 'Donor ID not found in token' });
    }

    console.log('[REQUESTER] Fetching donation history for donor:', donorId);

    // Find requests where this donor has completed donations
    const allRequests = await Requester.find({
      'assignedDonors.donorUid': donorId
    }).sort({ updatedAt: -1 });

    // Filter to only show completed donations
    const completedDonations = allRequests.filter(req => {
      const donorAssignment = req.assignedDonors.find(d => d.donorUid === donorId);
      return donorAssignment && donorAssignment.unitsCompleted > 0;
    });

    // Map to include only this donor's assignment info
    const enrichedHistory = completedDonations.map(req => {
      const donorAssignment = req.assignedDonors.find(d => d.donorUid === donorId);
      return {
        ...req.toObject(),
        myAssignment: donorAssignment
      };
    });

    res.json(enrichedHistory);
  } catch (error) {
    console.error('[REQUESTER] Error fetching donation history:', error.message);
    res.status(500).json({ error: error.message });
  }
};

const cancelAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const donorId = req.user?.uid; // From auth middleware

    if (!donorId) {
      return res.status(401).json({ error: 'Donor ID not found in token' });
    }

    console.log('[REQUESTER] Cancelling assignment for request:', id, 'Donor:', donorId);

    // Get the request
    const request = await Requester.findById(id);
    if (!request) {
      return res.status(404).json({ error: 'Blood request not found' });
    }

    // Find and remove donor from assignedDonors
    const donorIndex = request.assignedDonors?.findIndex(d => d.donorUid === donorId);
    if (donorIndex === -1 || donorIndex === undefined) {
      return res.status(403).json({ error: 'This request is not assigned to you' });
    }

    request.assignedDonors.splice(donorIndex, 1);

    // If no more donors assigned and request is fulfilled, reset status to pending
    if (request.assignedDonors.length === 0) {
      request.status = 'pending';
    }

    request.updatedAt = new Date();
    const updatedRequest = await request.save();

    console.log('[REQUESTER] Assignment cancelled for request:', id);

    res.json({
      message: 'Assignment cancelled successfully',
      request: updatedRequest
    });
  } catch (error) {
    console.error('[REQUESTER] Error cancelling assignment:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Get a single blood request by ID
const getRequesterById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[REQUESTER] Fetching request by ID:', id);

    const request = await Requester.findById(id);
    if (!request) {
      console.log('[REQUESTER] Request not found:', id);
      return res.status(404).json({ error: 'Blood request not found' });
    }

    console.log('[REQUESTER] Request found:', id);
    res.json(request);
  } catch (error) {
    console.error('[REQUESTER] Error fetching request:', error.message);
    res.status(500).json({ error: error.message });
  }
};

export default {
  getAllRequesters,
  getRequesterById,
  createRequester,
  updateRequester,
  deleteRequester,
  assignRequestToDonor,
  assignSelfToRequest,
  getAvailableRequests,
  getDonorNotifications,
  markNotificationAsRead,
  matchAndNotifyDonors,
  getAssignedRequests,
  getDonationHistory,
  getAllDonations,
  completeDonation,
  cancelAssignment
};
