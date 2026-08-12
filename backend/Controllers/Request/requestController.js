import Requester from '../../models/Requests.js';
import User from '../../models/User.js';
import Donation from '../../models/Donation.js';
import { Notification } from '../../models/Notification.js';
import { assessDonorForRequest, findPlatformEligibleDonorsForRequest, getApprovedDonationHistory, } from "../../services/donorEligibilityService.js";

// Get all blood requests
const getAllRequesters = async (req, res) => {
  try {
    const requesters =
      await Requester.find({}).sort({
        createdAt: -1,
      });

    if (req.user?.role !== "donor") {
      return res.json(requesters);
    }

    const donor = await User.findOne({
      uid: req.user.uid,
      role: "donor",
    });

    if (!donor) {
      return res.status(404).json({
        error: "Donor not found",
      });
    }

    const donations =
      await getApprovedDonationHistory(
        donor.uid
      );

    const enrichedRequests =
      requesters.map((request) => ({
        ...request.toObject(),

        connectionAssessment:
          assessDonorForRequest({
            donor,
            request,
            donations,
          }),
      }));

    return res.json(enrichedRequests);
  } catch (error) {
    console.error(
      "[REQUESTER] Error fetching requests:",
      error.message
    );

    return res.status(500).json({
      error: "Failed to fetch requests",
    });
  }
};

// Create blood request
const createRequester = async (req, res) => {
  try {
    const userUid =
      req.user?.uid;

    if (!userUid) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const {
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
    } = req.body;

    const newRequest =
      await Requester.create({
        id: `req-${Date.now()}`,

        createdByUid:
          userUid,

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

        status:
          "pending",

        approvalStatus:
          "pending",
      });

    // Notify admins — NOT donors.
    const admins =
      await User.find({
        role: "super_admin",
      }).select("uid");

    if (admins.length) {
      await Notification.insertMany(
        admins.map((admin) => ({
          recipientUid:
            admin.uid,

          type:
            "request_submitted",

          requestId:
            newRequest._id,

          title:
            "Blood Request Requires Approval",

          message:
            `${req.user.email || userUid} submitted a new blood request.`,

          read: false,
        }))
      );
    }

    return res.status(201).json({
      message:
        "Blood request submitted for admin approval",

      requester:
        newRequest,
    });

  } catch (error) {
    console.error(
      "[REQUEST] Create:",
      error
    );

    return res.status(500).json({
      error:
        "Failed to submit blood request",
    });
  }
};

const getMyRequests = async (
  req,
  res
) => {
  try {
    const page =
      Math.max(
        Number(req.query.page) || 1,
        1
      );

    const limit =
      Math.min(
        Math.max(
          Number(req.query.limit) || 20,
          1
        ),
        100
      );

    const query = {
      createdByUid:
        req.user.uid,
    };

    const [
      requests,
      total,
    ] =
      await Promise.all([
        Requester.find(query)
          .sort({
            createdAt: -1,
          })
          .skip(
            (page - 1) *
            limit
          )
          .limit(limit)
          .lean(),

        Requester.countDocuments(
          query
        ),
      ]);

    res.json({
      requests,
      total,
      page,
      pages:
        Math.ceil(
          total / limit
        ),
    });

  } catch (error) {
    res.status(500).json({
      error:
        "Failed to fetch your requests",
    });
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
    const adminId = req.user?.uid;

    const unitsToAssign = Number(
      req.body.unitsAssigned ?? 1
    );

    if (!donorId) {
      return res.status(400).json({
        error: 'Donor ID is required'
      });
    }

    if (
      !Number.isInteger(unitsToAssign) ||
      unitsToAssign < 1
    ) {
      return res.status(400).json({
        error:
          'Units assigned must be a positive integer'
      });
    }

    const [request, donor] = await Promise.all([
      Requester.findById(id),
      User.findOne({
        uid: donorId,
        role: 'donor'
      })
    ]);

    if (!request) {
      return res.status(404).json({
        error: 'Blood request not found'
      });
    }

    if (!donor) {
      return res.status(404).json({
        error: 'Donor not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        error: 'Blood request is not active'
      });
    }

    const donations =
      await getApprovedDonationHistory(
        donor.uid
      );

    const connectionAssessment =
      assessDonorForRequest({
        donor,
        request,
        donations,
      });

    if (
      !connectionAssessment.platformEligible
    ) {
      return res.status(409).json({
        error:
          "Donor cannot connect to this request through the platform",

        code:
          connectionAssessment.reasons[0] ||
          "DONOR_NOT_PLATFORM_ELIGIBLE",

        reasons:
          connectionAssessment.reasons,

        nextEligibleDate:
          connectionAssessment
            .nextEligibleDate,
      });
    }

    const alreadyAssigned =
      request.assignedDonors.some(
        (assignment) =>
          assignment.donorUid === donorId
      );

    if (alreadyAssigned) {
      return res.status(409).json({
        error:
          'Donor is already assigned to this request'
      });
    }

    const totalAssigned =
      request.assignedDonors.reduce(
        (total, assignment) =>
          total +
          Number(
            assignment.unitsAssigned || 0
          ),
        0
      );

    if (
      totalAssigned + unitsToAssign >
      request.unitsNeeded
    ) {
      return res.status(400).json({
        error:
          `Only ${Math.max(
            0,
            request.unitsNeeded - totalAssigned
          )} unit(s) remain`
      });
    }

    request.assignedDonors.push({
      donorUid: donorId,
      unitsAssigned: unitsToAssign,
      unitsCompleted: 0,
      assignedAt: new Date()
    });

    request.assignedByAdmin = adminId;
    request.updatedAt = new Date();

    await request.save();

    try {
      await Notification.create({
        donorId: donor.uid,
        adminId: null,
        requestId: request._id,
        type: 'request_assigned',
        title: 'You Were Assigned to a Blood Request',
        message:
          `An administrator assigned you to donate ${unitsToAssign} unit(s) ` +
          `for ${request.fname} ${request.lname}.`,
        read: false,
        actionTaken: false,
        createdAt: new Date()
      });
    } catch (notificationError) {
      console.error(
        '[REQUESTER] Assignment saved, but donor notification failed:',
        notificationError.message
      );
    }

    res.json({
      message:
        'Blood request assigned to donor',
      requester: request
    });
  } catch (error) {
    console.error(
      '[REQUESTER] Error assigning request:',
      error.message
    );

    res.status(500).json({
      error: error.message
    });
  }
};

// Donor self-assigns to a request (new workflow)
const assignSelfToRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const unitsToAssign = Number(req.body.unitsRequested ?? 1);
    const donorId = req.user?.uid; // From auth middleware

    if (!donorId) {
      return res.status(401).json({ error: 'Donor ID not found in token' });
    }
    console.log('[REQUESTER] Donor self-assigning to request:', id, 'Donor:', donorId);
    if (
      !Number.isInteger(unitsToAssign) ||
      unitsToAssign < 1
    ) {
      return res.status(400).json({
        error:
          'Units requested must be a positive integer'
      });
    }
    // Get the request
    const request = await Requester.findById(id);
    if (!request) {
      return res.status(404).json({ error: 'Blood request not found' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({
        error:
          'This blood request is no longer active'
      });
    }

    // Check if donor is already assigned to this request
    const alreadyAssigned = request.assignedDonors?.some(d => d.donorUid === donorId);
    if (alreadyAssigned) {
      return res.status(400).json({ error: 'You are already assigned to this request' });
    }

    // Calculate total units already assigned
    const totalAssigned = request.assignedDonors?.reduce((sum, d) => sum + d.unitsAssigned, 0) || 0;

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
    const donations =
      await getApprovedDonationHistory(
        donorId
      );

    const connectionAssessment =
      assessDonorForRequest({
        donor,
        request,
        donations,
      });

    if (
      !connectionAssessment.platformEligible
    ) {
      const primaryReason =
        connectionAssessment.reasons[0] ||
        "DONOR_NOT_PLATFORM_ELIGIBLE";

      const statusCode = [
        "ACCOUNT_NOT_VERIFIED",
        "ACCOUNT_DEFERRED",
      ].includes(primaryReason)
        ? 403
        : 409;

      return res.status(statusCode).json({
        error:
          "You cannot connect to this request through the platform at this time.",

        code: primaryReason,

        reasons:
          connectionAssessment.reasons,

        nextEligibleDate:
          connectionAssessment
            .nextEligibleDate,

        connectionAssessment,
      });
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
      {
        donorId,
        requestId: request._id,
        type: 'request_available',
      },
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
        adminId: null, // For all admins
        type: 'donor_assigned',
        title: `New Assignment: ${donorInfo?.fname} ${donorInfo?.lname}`,
        message: `Donor ${donorInfo?.fname} ${donorInfo?.lname} has assigned ${unitsToAssign} unit(s) to request for ${request.fname}`,
        requestId: request._id,
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
    const donorId = req.user?.uid;

    if (!donorId) {
      return res.status(401).json({
        error:
          "Donor ID not found in token",
      });
    }

    const donor = await User.findOne({
      uid: donorId,
      role: "donor",
    });

    if (!donor) {
      return res.status(404).json({
        error: "Donor not found",
      });
    }

    const [requests, donations] =
      await Promise.all([
        Requester.find({
          status: "pending",
        }).sort({
          createdAt: -1,
        }),

        getApprovedDonationHistory(
          donorId
        ),
      ]);

    const availableRequests = requests
      .map((request) => {
        const totalAssigned =
          request.assignedDonors?.reduce(
            (total, assignment) =>
              total +
              Number(
                assignment.unitsAssigned ||
                0
              ),
            0
          ) || 0;

        const unitsAvailable =
          request.unitsNeeded -
          totalAssigned;

        const alreadyAssigned =
          request.assignedDonors?.some(
            (assignment) =>
              assignment.donorUid ===
              donorId
          );

        const connectionAssessment =
          assessDonorForRequest({
            donor,
            request,
            donations,
          });

        return {
          ...request.toObject(),

          unitsAssigned:
            totalAssigned,

          unitsAvailable,

          alreadyAssigned:
            Boolean(alreadyAssigned),

          connectionAssessment,
        };
      })
      .filter(
        (request) =>
          request.unitsAvailable > 0 &&
          !request.alreadyAssigned &&
          request.connectionAssessment
            .compatible
      );

    return res.json({
      availableRequests,

      donorBloodType:
        donor.bloodType,

      hospitalScreeningRequired:
        true,
    });
  } catch (error) {
    console.error(
      "[REQUESTER] Available requests error:",
      error.message
    );

    return res.status(500).json({
      error:
        "Failed to fetch available requests",
    });
  }
};
// Get notifications for a donor
const getDonorNotifications = async (req, res) => {
  try {
    const donorId = req.user?.uid; // From auth middleware

    if (!donorId) {
      return res.status(401).json({ error: 'Donor ID not found in token' });
    }

    const donorFilter = {
      donorId,
      adminId: null
    };

    const notifications = await Notification.find(donorFilter)
      .sort({ createdAt: -1 })
      .populate('requestId', 'bloodType hospital unitsNeeded status');

    const unreadCount = await Notification.countDocuments({
      ...donorFilter,
      read: false
    });

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

const findAndNotifyMatchingDonors =
  async (request) => {
    try {
      const matchingDonors =
        await findPlatformEligibleDonorsForRequest(
          request
        );

      if (matchingDonors.length === 0) {
        console.log(
          `[NOTIFICATION] No platform-eligible donors found for request ${request._id}`
        );

        return {
          eligibleDonors: 0,
          notificationsCreated: 0,
        };
      }

      const donorUids =
        matchingDonors.map(
          (donor) => donor.uid
        );

      /*
       * Prevent duplicate notifications if this helper
       * is accidentally called more than once.
       */
      const existingNotifications =
        await Notification.find({
          requestId: request._id,
          donorId: {
            $in: donorUids,
          },
          type: "request_available",
        })
          .select("donorId")
          .lean();

      const alreadyNotified = new Set(
        existingNotifications.map(
          (notification) =>
            notification.donorId
        )
      );

      const notifications =
        matchingDonors
          .filter(
            (donor) =>
              !alreadyNotified.has(donor.uid)
          )
          .map((donor) => ({
            donorId: donor.uid,
            requestId: request._id,
            type: "request_available",

            title:
              "New Potential Donation Request",

            message:
              `A potentially compatible ${request.bloodGenre} request is available at ${request.hospital}. ` +
              `The hospital performs all medical screening and makes the final donation decision.`,

            read: false,
            actionTaken: false,
          }));

      if (notifications.length > 0) {
        await Notification.insertMany(
          notifications
        );
      }

      console.log(
        `[NOTIFICATION] Found ${matchingDonors.length} platform-eligible donors and created ${notifications.length} notifications`
      );

      return {
        eligibleDonors:
          matchingDonors.length,

        notificationsCreated:
          notifications.length,
      };
    } catch (error) {
      console.error(
        "[NOTIFICATION] Matching error:",
        error.message
      );

      throw error;
    }
  };

// Get assigned requests for the authenticated donor
const getAssignedRequests = async (req, res) => {
  try {
    const donorId = req.user?.uid;

    if (!donorId) {
      return res.status(401).json({
        error: 'Donor ID not found in token',
      });
    }

    console.log(
      '[REQUESTER] Fetching assigned requests for donor:',
      donorId
    );

    const assignedRequests = await Requester.find({
      'assignedDonors.donorUid': donorId,
      status: {
        $ne: 'cancelled',
      },
    }).sort({
      'assignedDonors.assignedAt': -1,
    });

    const requestIds = assignedRequests.map(
      request => request._id
    );

    const donationRecords = await Donation.find({
      donorUid: donorId,
      requestId: {
        $in: requestIds,
      },
    })
      .sort({
        updatedAt: -1,
      })
      .lean();

    /*
     * A donor should normally have one donation record
     * per request. Using a Map lets us attach it quickly.
     */
    const donationByRequest = new Map();

    for (const donation of donationRecords) {
      const requestId = donation.requestId?.toString();

      if (
        requestId &&
        !donationByRequest.has(requestId)
      ) {
        donationByRequest.set(
          requestId,
          donation
        );
      }
    }

    const enrichedRequests = assignedRequests
      .map(request => {
        const donorAssignment =
          request.assignedDonors?.find(
            assignment =>
              assignment.donorUid === donorId
          );

        if (!donorAssignment) {
          return null;
        }

        /*
         * Once admin approval completes all assigned units,
         * this request belongs in donation history instead.
         */
        if (
          (donorAssignment.unitsCompleted || 0) >=
          (donorAssignment.unitsAssigned || 0)
        ) {
          return null;
        }

        const donation = donationByRequest.get(
          request._id.toString()
        );

        const confirmationStatus =
          donation?.status || 'not_confirmed';

        const canConfirm = [
          'not_confirmed',
          'pending_confirmation',
          'rejected',
        ].includes(confirmationStatus);

        return {
          ...request.toObject(),

          myAssignment: donorAssignment,

          donation: donation || null,

          confirmationStatus,

          canConfirm,

          waitingForAdmin:
            confirmationStatus ===
            'pending_admin_approval',

          rejected:
            confirmationStatus === 'rejected',

          rejectionReason:
            donation?.rejectionReason || null,
        };
      })
      .filter(Boolean);

    res.json(enrichedRequests);
  } catch (error) {
    console.error(
      '[REQUESTER] Error fetching assigned requests:',
      error.message
    );

    res.status(500).json({
      error: 'Failed to fetch assigned requests',
    });
  }
};


// Get donation history for a donor (completed donations)
const getDonationHistory = async (req, res) => {
  try {
    const donorId = req.user?.uid;

    if (!donorId) {
      return res.status(401).json({
        error: "Donor ID not found in token",
      });
    }

    console.log(
      "[REQUESTER] Fetching donation history for donor:",
      donorId
    );

    const requests = await Requester.find({
      "assignedDonors.donorUid": donorId,
    })
      .sort({
        updatedAt: -1,
      })
      .lean();
    const history = requests
      .map((request) => {
        const donorAssignment =
          request.assignedDonors?.find(
            (assignment) =>
              assignment.donorUid === donorId
          );

        if (
          !donorAssignment ||
          (donorAssignment.unitsCompleted || 0) <= 0
        ) {
          return null;
        }

        return {
          ...request,
          myAssignment: donorAssignment,

          unitsCompleted:
            donorAssignment.unitsCompleted || 0,

          unitsAssigned:
            donorAssignment.unitsAssigned || 0,

          completionDate:
            donorAssignment.completedAt ||
            request.updatedAt ||
            null,

          donationStatus: "approved",
        };
      })
      .filter(Boolean);

    const totalUnits = history.reduce(
      (total, donation) =>
        total +
        (donation.myAssignment?.unitsCompleted || 0),
      0
    );

    res.json({
      history,
      count: totalUnits,
      totalUnits,
      donationCount: totalUnits,
    });
  } catch (error) {
    console.error(
      "[REQUESTER] Error fetching donation history:",
      error.message
    );

    res.status(500).json({
      error: "Failed to fetch donation history",
    });
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

    const request =
      await Requester.findById(id);

    if (!request) {
      return res.status(404).json({
        error:
          "Blood request not found",
      });
    }

    const response = request.toObject();

    if (req.user?.role === "donor") {
      const donor =
        await User.findOne({
          uid: req.user.uid,
          role: "donor",
        });

      if (!donor) {
        return res.status(404).json({
          error: "Donor not found",
        });
      }

      const donations =
        await getApprovedDonationHistory(
          donor.uid
        );

      response.connectionAssessment =
        assessDonorForRequest({
          donor,
          request,
          donations,
        });
    }

    return res.json(response);
  } catch (error) {
    console.error(
      "[REQUESTER] Request details error:",
      error.message
    );

    return res.status(500).json({
      error:
        "Failed to fetch blood request",
    });
  }
};

export default {
  getAllRequesters,
  getRequesterById,
  createRequester,
  getMyRequests,
  updateRequester,
  deleteRequester,
  assignRequestToDonor,
  assignSelfToRequest,
  getAvailableRequests,
  getDonorNotifications,
  markNotificationAsRead,
  findAndNotifyMatchingDonors,
  getAssignedRequests,
  getDonationHistory,
  getAllDonations,
  cancelAssignment
};
