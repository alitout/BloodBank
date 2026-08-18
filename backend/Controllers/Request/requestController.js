import Requester from '../../models/Requests.js';
import User from '../../models/User.js';
import Donation from '../../models/Donation.js';
import Hospital from "../../models/Hospital.js";
import { Notification } from '../../models/Notification.js';
import { assessDonorForRequest, findPlatformEligibleDonorsForRequest, getApprovedDonationHistory, } from "../../services/donorEligibilityService.js";
import { randomUUID, } from "node:crypto";
import { resolveRequestHospital, } from "../../services/requestHospitalService.js";

const attachRequesterContacts =
  async (requests) => {
    const requestObjects =
      requests.map((request) =>
        typeof request.toObject ===
          "function"
          ? request.toObject()
          : request
      );

    const creatorUids = [
      ...new Set(
        requestObjects
          .map(
            (request) =>
              request.createdByUid
          )
          .filter(Boolean)
      ),
    ];

    if (
      creatorUids.length === 0
    ) {
      return requestObjects;
    }

    const creators =
      await User.find({
        uid: {
          $in:
            creatorUids,
        },
      })
        .select(
          "uid email phone"
        )
        .lean();

    const creatorMap =
      new Map(
        creators.map(
          (creator) => [
            creator.uid,
            creator,
          ]
        )
      );

    return requestObjects.map(
      (request) => {
        const creator =
          creatorMap.get(
            request.createdByUid
          );

        return {
          ...request,

          requesterContact: {
            email:
              creator?.email ||
              null,

            phone:
              creator?.phone ||
              null,
          },
        };
      }
    );
  };

// Get all blood requests
const getAllRequesters =
  async (req, res) => {
    try {
      const requestQuery =
        req.user?.role ===
          "donor"
          ? {
            status:
              "pending",

            approvalStatus:
              "approved",
          }
          : {};

      const requesters =
        await Requester.find(
          requestQuery
        ).sort({
          createdAt: -1,
        });

      /*
       * This must be created before either
       * the admin or donor branch uses it.
       */
      const requestsWithContact =
        await attachRequesterContacts(
          requesters
        );

      if (
        req.user?.role !==
        "donor"
      ) {
        return res.json(
          requestsWithContact
        );
      }

      const donor =
        await User.findOne({
          uid:
            req.user.uid,

          role: "donor",
        });

      if (!donor) {
        return res.status(404).json({
          error:
            "Donor not found",
        });
      }

      const donations =
        await getApprovedDonationHistory(
          donor.uid
        );

      const enrichedRequests =
        requestsWithContact.map(
          (request) => ({
            ...request,

            connectionAssessment:
              assessDonorForRequest({
                donor,
                request,
                donations,
              }),
          })
        );

      return res.json(
        enrichedRequests
      );
    } catch (error) {
      console.error(
        "[REQUESTER] Error fetching requests:",
        error
      );

      return res.status(500).json({
        error:
          "Failed to fetch requests",
      });
    }
  };

// Create blood request
const createRequester =
  async (req, res) => {
    try {
      const userUid =
        req.user?.uid;

      if (!userUid) {
        return res.status(401).json({
          error:
            "Authentication required",
        });
      }

      const {
        fname,
        fatherName,
        lname,
        bloodGenre,
        bloodType,
        unitsNeeded,
        date,
        description,
        relationToPatient,
        transportationAvailable,
      } = req.body;

      if (
        transportationAvailable !==
        undefined &&
        typeof transportationAvailable !==
        "boolean"
      ) {
        return res.status(400).json({
          error:
            "Transportation availability must be a Boolean value.",
          code:
            "INVALID_TRANSPORTATION_AVAILABILITY",
        });
      }

      const hospitalData =
        await resolveRequestHospital(
          req.body
        );

      const newRequest =
        await Requester.create({
          id: `req-${randomUUID()}`,
          createdByUid: userUid,
          fname,
          fatherName,
          lname,
          bloodGenre,
          bloodType,
          ...hospitalData,
          transportationAvailable: transportationAvailable ?? false,
          unitsNeeded,
          date,
          description,
          relationToPatient,
          status: "pending",
          approvalStatus: "pending",
        });

      try {
        const admins =
          await User.find({
            role:
              "super_admin",
          })
            .select("uid")
            .lean();

        if (
          admins.length > 0
        ) {
          await Notification.insertMany(
            admins.map(
              (admin) => ({
                adminId:
                  admin.uid,

                donorId: null,

                type:
                  "request_submitted",

                requestId:
                  newRequest._id,

                title:
                  "Blood Request Requires Approval",

                message:
                  `${req.user.email || userUid} submitted a new blood request.`,

                read: false,

                actionTaken:
                  false,
              })
            )
          );
        }
      } catch (
      notificationError
      ) {
        console.error(
          "[REQUEST] Request created, but admin notification failed:",
          notificationError
        );
      }

      return res
        .status(201)
        .json({
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

      const isClientError =
        error.statusCode === 400 ||
        error.name ===
        "ValidationError";

      const statusCode =
        isClientError
          ? 400
          : 500;

      return res
        .status(statusCode)
        .json({
          error:
            isClientError
              ? error.message
              : "Failed to submit blood request",

          ...(error.code
            ? {
              code:
                error.code,
            }
            : {}),
        });
    }
  };

const getMyRequests =
  async (req, res) => {
    try {
      const userUid =
        req.user?.uid;

      if (!userUid) {
        return res.status(401).json({
          error:
            "Authentication required",
        });
      }

      const page =
        Math.max(
          Number.parseInt(
            req.query.page,
            10
          ) || 1,
          1
        );

      const limit =
        Math.min(
          Math.max(
            Number.parseInt(
              req.query.limit,
              10
            ) || 12,
            1
          ),
          50
        );

      const query = {
        createdByUid:
          userUid,
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

      return res.json({
        requests:
          Array.isArray(requests)
            ? requests
            : [],

        total,
        page,

        pages:
          Math.max(
            1,
            Math.ceil(
              total / limit
            )
          ),
      });
    } catch (error) {
      console.error(
        "[MY REQUESTS] Fetch error:",
        error
      );

      return res.status(500).json({
        error:
          "Failed to fetch your blood requests",
      });
    }
  };

// Update blood request
const updateRequester =
  async (req, res) => {
    try {
      const { id } =
        req.params;

      /*
       * This endpoint must only be accessible
       * through verifyAdminToken.
       */
      const allowedFields = [
        "fname",
        "fatherName",
        "lname",
        "bloodGenre",
        "bloodType",
        "transportationAvailable",
        "unitsNeeded",
        "date",
        "description",
        "relationToPatient",
        "status",
      ];

      const updateData =
        Object.fromEntries(
          Object.entries(
            req.body
          ).filter(([field]) =>
            allowedFields.includes(
              field
            )
          )
        );

      if (
        Object.keys(
          updateData
        ).length === 0
      ) {
        return res.status(400).json({
          error:
            "No valid request fields were provided.",
        });
      }

      if (
        updateData
          .transportationAvailable !==
        undefined &&
        typeof updateData
          .transportationAvailable !==
        "boolean"
      ) {
        return res.status(400).json({
          error:
            "Transportation availability must be a Boolean value.",
        });
      }

      if (
        updateData.unitsNeeded !==
        undefined
      ) {
        const unitsNeeded =
          Number(
            updateData.unitsNeeded
          );

        if (
          !Number.isInteger(
            unitsNeeded
          ) ||
          unitsNeeded < 1 ||
          unitsNeeded > 50
        ) {
          return res.status(400).json({
            error:
              "Units needed must be an integer between 1 and 50.",
          });
        }

        updateData.unitsNeeded =
          unitsNeeded;
      }

      const updatedRequest =
        await Requester.findByIdAndUpdate(
          id,
          {
            $set: {
              ...updateData,

              updatedAt:
                new Date(),
            },
          },
          {
            new: true,
            runValidators: true,
          }
        );

      if (!updatedRequest) {
        return res.status(404).json({
          error:
            "Blood request not found",
        });
      }

      const [
        requestWithContact,
      ] =
        await attachRequesterContacts([
          updatedRequest,
        ]);

      return res.json({
        message:
          "Blood request updated",

        requester:
          requestWithContact,
      });
    } catch (error) {
      console.error(
        "[REQUESTER] Update error:",
        error
      );

      const status =
        error.name ===
          "ValidationError"
          ? 400
          : 500;

      return res.status(status).json({
        error:
          status === 400
            ? error.message
            : "Failed to update blood request",
      });
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

    if (request.approvalStatus !== "approved") {
      return res.status(409).json({
        error: "This blood request is awaiting administrator approval.",
        code: "REQUEST_NOT_APPROVED",
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

    if (!connectionAssessment.platformEligible) {
      return res.status(409).json({
        error: "Donor cannot connect to this request through the platform",

        code: connectionAssessment.reasons[0] || "DONOR_NOT_PLATFORM_ELIGIBLE",

        reasons: connectionAssessment.reasons,

        nextEligibleDate: connectionAssessment.nextEligibleDate,
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

    if (request.approvalStatus !== "approved") {
      return res.status(409).json({
        error: "This blood request is awaiting administrator approval.",
        code: "REQUEST_NOT_APPROVED",
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
    const existingDonation =
      await Donation.findOne({
        donorUid: donorId,
        requestId:
          request._id,
      });

    if (
      existingDonation?.status ===
      "approved"
    ) {
      return res.status(409).json({
        error:
          "An approved donation already exists for this request",
      });
    }

    if (
      existingDonation?.status ===
      "pending_admin_approval"
    ) {
      return res.status(409).json({
        error:
          "A donation for this request is already waiting for administrator approval",
      });
    }

    const assignedAt =
      new Date();

    if (existingDonation) {
      existingDonation.status = "pending_confirmation";
      existingDonation.unitsAssigned = unitsToAssign;
      existingDonation.unitsCompleted = 0;
      existingDonation.donationType = request.bloodGenre;
      existingDonation.donorCompletedAt = null;
      existingDonation.adminApprovedAt = null;
      existingDonation.adminApprovedBy = null;
      existingDonation.donationDate = null;
      existingDonation.rejectionReason = null;
      existingDonation.rejectedAt = null;
      existingDonation.rejectedBy = null;
      existingDonation.updatedAt = assignedAt;
      await existingDonation.save();

      await Notification.updateMany(
        {
          donorId,
          requestId:
            request._id,
          type:
            "donation_rejected",
          actionTaken:
            false,
        },
        {
          $set: {
            read: true,
            readAt:
              assignedAt,
            actionTaken:
              true,
          },
        }
      );
    }
    // Add donor to assignedDonors array
    request.assignedDonors.push({
      donorUid: donorId,
      unitsAssigned: unitsToAssign,
      unitsCompleted: 0,
      assignedAt,
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
      const [
        donorInfo,
        admins,
      ] =
        await Promise.all([
          User.findOne({
            uid:
              donorId,
          })
            .select(
              "fname lname"
            )
            .lean(),

          User.find({
            role:
              "super_admin",
          })
            .select("uid")
            .lean(),
        ]);

      if (
        admins.length > 0
      ) {
        await Notification.insertMany(
          admins.map(
            (admin) => ({
              adminId:
                admin.uid,

              donorId:
                donorId,

              type:
                "donor_assigned",

              title:
                `New Assignment: ${donorInfo?.fname || ""} ${donorInfo?.lname || ""}`.trim(),

              message:
                `Donor ${donorInfo?.fname || ""} ${donorInfo?.lname || ""} connected to the request for ${request.fname} ${request.lname}.`.trim(),

              requestId:
                request._id,

              read: false,

              actionTaken:
                false,
            })
          )
        );
      }
    } catch (
    notificationError
    ) {
      console.error(
        "[REQUESTER] Assignment saved, but admin notification failed:",
        notificationError
      );
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

    const [
      requests,
      donations,
    ] = await Promise.all([
      Requester.find({
        status:
          "pending",

        approvalStatus:
          "approved",
      }).sort({
        createdAt: -1,
      }),

      getApprovedDonationHistory(
        donorId
      ),
    ]);

    const availableRequests = requests.map((request) => {
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

    const availableRequestsWithContact =
      await attachRequesterContacts(
        availableRequests
      );

    return res.json({
      availableRequests: availableRequestsWithContact,

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

    const requestsWithContact =
      await attachRequesterContacts(
        enrichedRequests
      );

    return res.json(requestsWithContact);
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

const cancelAssignment =
  async (req, res) => {
    try {
      const {
        id,
      } = req.params;

      const donorId =
        req.user?.uid;

      if (!donorId) {
        return res.status(401).json({
          error:
            "Donor ID not found in token",
        });
      }

      const request =
        await Requester.findById(
          id
        );

      if (!request) {
        return res.status(404).json({
          error:
            "Blood request not found",
        });
      }

      const donorIndex =
        request.assignedDonors
          ?.findIndex(
            (assignment) =>
              assignment.donorUid ===
              donorId
          );

      if (
        donorIndex === -1 ||
        donorIndex === undefined
      ) {
        return res.status(403).json({
          error:
            "This request is not assigned to you",
        });
      }


      const donation =
        await Donation.findOne({
          donorUid: donorId,
          requestId:
            request._id,
        });


      if (
        donation?.status ===
        "approved"
      ) {
        return res.status(409).json({
          error:
            "An approved donation cannot be cancelled",
        });
      }

      if (
        donation?.status ===
        "pending_admin_approval"
      ) {
        return res.status(409).json({
          error:
            "This donation is waiting for administrator approval and cannot be cancelled",
        });
      }

      const cancelledAt =
        new Date();

      request.assignedDonors.splice(
        donorIndex,
        1
      );


      const totalCompleted =
        request.assignedDonors.reduce(
          (
            total,
            assignment
          ) =>
            total +
            Number(
              assignment.unitsCompleted ||
              0
            ),
          0
        );

      if (
        totalCompleted <
        request.unitsNeeded
      ) {
        request.status =
          "pending";
      }

      request.updatedAt =
        cancelledAt;

      await request.save();


      if (donation) {
        donation.status = "cancelled";
        donation.unitsCompleted = 0;
        donation.donorCompletedAt = null;
        donation.adminApprovedAt = null;
        donation.adminApprovedBy = null;
        donation.donationDate = null;
        donation.updatedAt = cancelledAt;
        await donation.save();
      }

      await Notification.updateMany(
        {
          donorId,
          requestId:
            request._id,
          type:
            "donation_rejected",
          actionTaken:
            false,
        },
        {
          $set: {
            read: true,
            readAt:
              cancelledAt,
            actionTaken:
              true,
          },
        }
      );

      console.log(
        "[REQUESTER] Assignment cancelled:",
        {
          requestId: id,
          donorId,
        }
      );

      return res.json({
        message:
          "Assignment cancelled successfully",
        request,
      });
    } catch (error) {
      console.error(
        "[REQUESTER] Error cancelling assignment:",
        error.message
      );

      return res.status(500).json({
        error:
          "Failed to cancel assignment",
      });
    }
  };

// Get a single blood request by ID
const getRequesterById =
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const request =
        await Requester.findById(
          id
        );

      if (!request) {
        return res.status(404).json({
          error:
            "Blood request not found",
        });
      }

      const isRequestOwner =
        request.createdByUid ===
        req.user?.uid;

      /*
       * This check must happen before
       * returning the response.
       */
      if (
        req.user?.role ===
        "donor" &&
        request.approvalStatus !==
        "approved" &&
        !isRequestOwner
      ) {
        return res.status(404).json({
          error:
            "Blood request not found",
        });
      }

      const [
        responseWithContact,
      ] =
        await attachRequesterContacts([
          request,
        ]);

      const response = {
        ...responseWithContact,
      };

      if (
        req.user?.role ===
        "donor"
      ) {
        const donor =
          await User.findOne({
            uid:
              req.user.uid,

            role:
              "donor",
          });

        if (!donor) {
          return res
            .status(404)
            .json({
              error:
                "Donor not found",
            });
        }

        const donations =
          await getApprovedDonationHistory(
            donor.uid
          );

        response
          .connectionAssessment =
          assessDonorForRequest({
            donor,
            request,
            donations,
          });
      }

      return res.json(
        response
      );
    } catch (error) {
      console.error(
        "[REQUESTER] Request details error:",
        error
      );

      return res.status(500).json({
        error:
          "Failed to fetch blood request",
      });
    }
  };

const getPendingRequestApprovals =
  async (req, res) => {
    try {
      const requests =
        await Requester.find({
          approvalStatus:
            "pending",
        }).sort({
          createdAt: -1,
        });

      const enrichedRequests =
        await attachRequesterContacts(
          requests
        );

      return res.json({
        requests:
          enrichedRequests,

        total:
          enrichedRequests.length,
      });
    } catch (error) {
      console.error(
        "[REQUEST APPROVAL] Fetch:",
        error
      );

      return res.status(500).json({
        error:
          "Failed to load pending blood requests",
      });
    }
  };

const approveRequest =
  async (req, res) => {
    try {
      const request =
        await Requester.findOne({
          _id:
            req.params.id,

          approvalStatus:
            "pending",
        });

      if (!request) {
        return res.status(404).json({
          error:
            "Pending blood request not found",
        });
      }

      if (request.hospitalSelectionType === "other") {
        return res.status(409).json({
          error: "The custom hospital must be reviewed and added or linked before approving this request.",
          code: "CUSTOM_HOSPITAL_REVIEW_REQUIRED",
        });
      }
      request.approvalStatus = "approved";
      request.approvedBy = req.user.uid;
      request.approvedAt = new Date();
      request.rejectedBy = null;
      request.rejectedAt = null;
      request.rejectionReason = null;
      await request.save();

      const notificationResults =
        await Promise.allSettled([
          Notification.updateMany(
            {
              requestId: request._id,
              type: "request_submitted",
            },
            {
              $set: {
                read: true,
                readAt: new Date(),
                actionTaken: true,
                action: "approved",
              },
            }
          ),

          Notification.create({
            donorId: request.createdByUid,
            adminId: null,
            requestId: request._id,
            type: "request_approved",
            title: "Blood Request Approved",
            message: "Your blood request was approved and is now visible to eligible donors.",
            read: false,
            actionTaken: false,
          }),
        ]);

      for (
        const notificationResult
        of notificationResults
      ) {
        if (
          notificationResult.status ===
          "rejected"
        ) {
          console.error(
            "[REQUEST APPROVAL] Notification failed:",
            notificationResult.reason
          );
        }
      }

      let matchingResult = {
        eligibleDonors: 0,
        notificationsCreated: 0,
      };

      try {
        matchingResult =
          await findAndNotifyMatchingDonors(
            request
          );
      } catch (
      matchingError
      ) {
        console.error(
          "[REQUEST APPROVAL] Matching notification failed:",
          matchingError
        );
      }

      return res.json({
        message:
          "Blood request approved",

        requester:
          request,

        matchingResult,
      });

    } catch (error) {
      console.error(
        "[REQUEST APPROVAL] Approve:",
        error
      );

      return res.status(500).json({
        error:
          "Failed to approve blood request",
      });
    }
  };

const rejectRequest =
  async (req, res) => {
    try {
      const rejectionReason =
        typeof req.body
          ?.rejectionReason ===
          "string"
          ? req.body
            .rejectionReason
            .trim()
          : "";

      if (!rejectionReason) {
        return res.status(400).json({
          error:
            "A rejection reason is required.",
        });
      }

      const request =
        await Requester.findOne({
          _id:
            req.params.id,

          approvalStatus:
            "pending",
        });

      if (!request) {
        return res.status(404).json({
          error:
            "Pending blood request not found",
        });
      }

      request.approvalStatus =
        "rejected";

      request.rejectedBy =
        req.user.uid;

      request.rejectedAt =
        new Date();

      request.rejectionReason =
        rejectionReason;

      request.approvedBy =
        null;

      request.approvedAt =
        null;

      await request.save();

      const notificationResults =
        await Promise.allSettled([
          Notification.updateMany(
            {
              requestId: request._id,
              type: "request_submitted",
            },
            {
              $set: {
                read: true,
                readAt: new Date(),
                actionTaken: true,
                action: "rejected",
              },
            }
          ),

          Notification.create({
            donorId: request.createdByUid,
            adminId: null,
            requestId: request._id,
            type: "request_rejected",
            title: "Blood Request Rejected",
            message: `Your blood request was rejected: ${rejectionReason}`,
            read: false,
            actionTaken: false,
          }),
        ]);

      for (
        const notificationResult
        of notificationResults
      ) {
        if (
          notificationResult.status ===
          "rejected"
        ) {
          console.error(
            "[REQUEST REJECTION] Notification failed:",
            notificationResult.reason
          );
        }
      }

      return res.json({
        message:
          "Blood request rejected",

        requester:
          request,
      });
    } catch (error) {
      console.error(
        "[REQUEST APPROVAL] Reject:",
        error
      );

      return res.status(500).json({
        error:
          "Failed to reject blood request",
      });
    }
  };

const registerCustomHospital =
  async (req, res) => {
    try {
      const request =
        await Requester.findById(
          req.params.id
        );

      if (!request) {
        return res.status(404).json({
          error:
            "Blood request not found",
        });
      }

      if (request.hospitalSelectionType !== "other") {
        return res.status(409).json({
          error:
            "This request does not use a custom hospital.",
        });
      }

      const name =
        String(
          req.body.name || ""
        ).trim();

      const location =
        String(
          req.body.location || ""
        ).trim();

      const phoneNumber =
        String(
          req.body.phoneNumber ||
          ""
        ).trim();

      const address =
        String(
          req.body.address || ""
        ).trim();

      if (name.length > 150 || location.length > 150 || phoneNumber.length > 30 || address.length > 300) {
        return res.status(400).json({
          error: "One or more hospital fields exceed the allowed length.",
        });
      }

      if (!name || !location || !phoneNumber || !address) {
        return res.status(400).json({
          error: "Hospital name, location, phone number and address are required.",
        });
      }

      const existingHospital =
        await Hospital.findOne({
          name,
        }).collation({
          locale: "en",
          strength: 2,
        });

      if (existingHospital) {
        return res.status(409).json({
          error:
            "A hospital with this name already exists.",
        });
      }

      const hospital =
        await Hospital.create({
          id: `hosp-${randomUUID()}`,
          name,
          location,
          phoneNumber,
          address,
          verified: true,
          verifiedBy: req.user.uid,
        });

      request.hospital = hospital.name;
      request.hospitalSelectionType = "registered";
      request.hospitalId = hospital._id;
      request.customHospital = null;
      request.updatedAt = new Date();
      await request.save();
      const [requestWithContact,] = await attachRequesterContacts([request,]);

      return res.status(201).json({
        message:
          "Hospital added and linked to the request.",

        hospital,

        requester:
          requestWithContact,
      });
    } catch (error) {
      console.error(
        "[CUSTOM HOSPITAL] Registration:",
        error
      );

      if (error?.code === 11000) {
        return res.status(409).json({
          error:
            "A hospital with this identifier already exists.",
        });
      }

      return res.status(500).json({
        error:
          "Failed to add custom hospital",
      });
    }
  };

export default {
  getAllRequesters,
  getRequesterById,
  createRequester,
  getMyRequests,
  getPendingRequestApprovals,
  approveRequest,
  rejectRequest,
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
  cancelAssignment,
  registerCustomHospital
};
