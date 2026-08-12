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
        required: true,
        select: false
    },
    role: {
        type: String,
        enum: ['donor', 'hospital', 'super_admin'],
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
    dateOfBirth: {
        type: Date,
        default: null
    },
    biologicalSex: {
        type: String,
        enum: ['male', 'female'],
        required: false
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
    nextEligibleDate: {
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

    // Hospital account fields
    hospitalName: {
        type: String,
        required: function () {
            return this.role === 'hospital';
        }
    },
    hospitalContactName: {
        type: String,
        required: function () {
            return this.role === 'hospital';
        }
    },
    hospitalContactTitle: {
        type: String,
        required: function () {
            return this.role === 'hospital';
        }
    },
    hospitalAddress: {
        type: String,
        required: function () {
            return this.role === 'hospital';
        }
    },

    // Common fields
    verifiedByAdmin: {
        type: Boolean,
        default: false
    },
    refreshTokenHash: {
        type: String,
        default: null,
        select: false
    },
    createdBy: {
        type: String,
        default: null
    },
    updatedBy: {
        type: String,
        default: null
    },
    verifiedAt: {
        type: Date,
        default: null
    },
    verifiedBy: {
        type: String,
        default: null
    },
    lastLogin: {
        type: Date,
        default: null
    },
    lastLogout: {
        type: Date,
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
