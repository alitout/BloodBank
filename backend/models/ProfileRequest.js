import mongoose from "mongoose";

const profileRequestSchema = new mongoose.Schema(
  {
    uid: {
      type: String,
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
    },
    requestType: {
      type: String,
      enum: ["profile_update", "account_deletion"],
      required: true,
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    reason: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    processedByAdmin: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const ProfileRequest = mongoose.model("ProfileRequest", profileRequestSchema);

export default ProfileRequest;
