import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      unique: true,
      required: true,
    },

    fname: {
      type: String,
      required: true,
    },

    fatherName: {
      type: String,
      required: true,
    },

    lname: {
      type: String,
      required: true,
    },

    bloodGenre: {
      type: String,
      enum: ['plasma', 'platelets', 'whole_blood'],
      required: true,
    },

    bloodType: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: true,
    },

    hospital: {
      type: String,
      required: true,
    },

    unitsNeeded: {
      type: Number,
      required: true,
      min: 1,
    },

    status: {
      type: String,
      enum: ['pending', 'fulfilled', 'cancelled'],
      default: 'pending',
    },

    date: {
      type: String,
      required: true,
    },

    description: {
      type: String,
    },

    relationToPatient: {
      type: String,
    },

    assignedDonors: [
      {
        donorUid: {
          type: String,
          required: true,
        },

        unitsAssigned: {
          type: Number,
          default: 1,
          min: 1,
        },

        unitsCompleted: {
          type: Number,
          default: 0,
          min: 0,
        },

        assignedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    assignedByAdmin: {
      type: String,
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
    collection: 'requests',
  }
);

export default mongoose.model('Request', requestSchema);