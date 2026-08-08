import mongoose from 'mongoose';

const donationSchema = new mongoose.Schema(
  {
    donationId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    // Donor's custom UID from User.uid
    donorUid: {
      type: String,
      required: true,
      index: true,
    },

    // MongoDB _id of the blood request
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
      required: true,
      index: true,
    },

    // Number of units assigned to this donor
    unitsAssigned: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    // Number of units actually donated
    unitsCompleted: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        'pending_confirmation',
        'pending_admin_approval',
        'approved',
        'rejected',
        'cancelled',
      ],
      default: 'pending_confirmation',
      index: true,
    },

    // When donor says:
    // "I completed the donation"
    donorCompletedAt: {
      type: Date,
      default: null,
    },

    // When admin approves the completed donation
    adminApprovedAt: {
      type: Date,
      default: null,
    },

    // UID of admin who approved
    adminApprovedBy: {
      type: String,
      default: null,
    },

    // Optional rejection reason
    rejectionReason: {
      type: String,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },

    rejectedBy: {
      type: String,
      default: null,
    },

    // Official donation date
    donationDate: {
      type: Date,
      default: null,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'donations',
  }
);


donationSchema.index(
  { donorUid: 1, requestId: 1 },
  { unique: true }
);

export default mongoose.model('Donation', donationSchema);