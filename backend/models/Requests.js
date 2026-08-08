import mongoose from "mongoose";

const pendingEditSchema = new mongoose.Schema(
  {
    changes: { type: mongoose.Schema.Types.Mixed, default: null },
    status: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
    },
    requestedAt: { type: Date, default: null },
    processedAt: { type: Date, default: null },
    processedBy: { type: String, default: null },
    rejectionReason: { type: String, default: null },
  },
  { _id: false }
);

const deletionRequestSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
    },
    requestedAt: { type: Date, default: null },
    processedAt: { type: Date, default: null },
    processedBy: { type: String, default: null },
    reason: { type: String, default: null },
    rejectionReason: { type: String, default: null },
  },
  { _id: false }
);

const assignedDonorSchema = new mongoose.Schema(
  {
    donorUid: { type: String, required: true },
    unitsAssigned: { type: Number, default: 1, min: 1 },
    unitsCompleted: { type: Number, default: 0, min: 0 },
    assignedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
  },
  { _id: false }
);

const requestSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, required: true, index: true },
    createdByUid: { type: String, required: true, index: true },

    fname: { type: String, required: true, trim: true },
    fatherName: { type: String, required: true, trim: true },
    lname: { type: String, required: true, trim: true },

    bloodGenre: {
      type: String,
      enum: ["plasma", "platelets", "whole_blood"],
      required: true,
    },

    bloodType: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      required: true,
      index: true,
    },

    hospital: { type: String, required: true, trim: true },

    unitsNeeded: {
      type: Number,
      required: true,
      min: 1,
      max: 50,
    },

    status: {
      type: String,
      enum: ["pending", "fulfilled", "cancelled"],
      default: "pending",
      index: true,
    },

    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    approvedBy: { type: String, default: null },
    approvedAt: { type: Date, default: null },
    rejectedBy: { type: String, default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },

    date: { type: String, required: true },

    description: {
      type: String,
      maxlength: 1000,
      default: "",
    },

    relationToPatient: {
      type: String,
      maxlength: 200,
      default: "",
    },

    pendingEdit: {
      type: pendingEditSchema,
      default: () => ({}),
    },

    deletionRequest: {
      type: deletionRequestSchema,
      default: () => ({}),
    },

    assignedDonors: {
      type: [assignedDonorSchema],
      default: [],
    },

    assignedByAdmin: { type: String, default: null },
  },
  {
    collection: "requests",
    timestamps: true,
    optimisticConcurrency: true,
  }
);

requestSchema.index({ createdByUid: 1, createdAt: -1 });
requestSchema.index({
  approvalStatus: 1,
  status: 1,
  bloodType: 1,
  createdAt: -1,
});
requestSchema.index({ "assignedDonors.donorUid": 1 });

export default mongoose.model("Request", requestSchema);
