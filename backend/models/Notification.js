import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    donorId: {
        type: String,
        required: true,
        indexed: true,
    },
    requestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Request',
        required: true,
    },
    type: {
        type: String,
        enum: [
            'request_available',
            'request_fulfilled',
            'request_cancelled',
            'donation_completed',
            'donation_approved',
            'donation_rejected'
        ],
        default: 'request_available',
    },
    title: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    read: {
        type: Boolean,
        default: false,
        indexed: true,
    },
    donationId: {
        type: String,
        default: null,
    },

    adminId: {
        type: String,
        default: null,
    },

    actionTaken: {
        type: Boolean,
        default: false,
    },

    action: {
        type: String,
        enum: [
            "approved",
            "rejected",
            null,
        ],
        default: null,
    },
    assignedByThisNotification: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        indexed: true
    },
    readAt: {
        type: Date,
        default: null
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },

}, { timestamps: true });

// Index for efficient querying
notificationSchema.index({ donorId: 1, read: 1 });
notificationSchema.index({ donorId: 1, createdAt: -1 });
notificationSchema.index({ requestId: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Notification = mongoose.model('Notifications', notificationSchema);
