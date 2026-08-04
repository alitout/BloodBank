import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    donorId: {
        type: String,
        required: true,
        indexed: true,
        description: "UID of the donor receiving the notification"
    },
    requestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Request',
        required: true,
        description: "Reference to the blood request"
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
        description: "Type of notification"
    },
    title: {
        type: String,
        required: true,
        description: "Notification title"
    },
    message: {
        type: String,
        required: true,
        description: "Notification message"
    },
    read: {
        type: Boolean,
        default: false,
        indexed: true,
        description: "Whether the donor has read this notification"
    },
    actionTaken: {
        type: Boolean,
        default: false,
        description: "Whether donor has assigned themselves or ignored"
    },
    assignedByThisNotification: {
        type: Boolean,
        default: false,
        description: "Whether this notification resulted in assignment"
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
        description: "When this notification expires (auto-delete)"
    }
}, { timestamps: true });

// Index for efficient querying
notificationSchema.index({ donorId: 1, read: 1 });
notificationSchema.index({ donorId: 1, createdAt: -1 });
notificationSchema.index({ requestId: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Notification = mongoose.model('Notifications', notificationSchema);
