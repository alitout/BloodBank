import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    uid: {
        type: String,
        unique: true,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['donor', 'super_admin'],
        required: true
    },

    // Donor-specific fields
    fname: {
        type: String,
        required: function () { return this.role === 'donor'; }
    },
    lname: {
        type: String,
        required: function () { return this.role === 'donor'; }
    },
    bloodType: {
        type: String,
        enum: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
        required: function () { return this.role === 'donor'; }
    },
    lastDonationDate: {
        type: Date,
        default: null
    },
    donationCount: {
        type: Number,
        default: 0,
        required: function () { return this.role === 'donor'; }
    },
    status: {
        type: String,
        enum: ['eligible', 'cool-down', 'deferred'],
        default: 'eligible',
        required: function () { return this.role === 'donor'; }
    },

    // Super Admin fields
    superAdminFName: {
        type: String,
        required: function () { return this.role === 'super_admin'; }
    },
    superAdminLName: {
        type: String,
        required: function () { return this.role === 'super_admin'; }
    },

    // Common fields
    verifiedByAdmin: {
        type: Boolean,
        default: false
    },
    refreshTokenHash: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { collection: 'users' });

export default mongoose.model('User', userSchema);
