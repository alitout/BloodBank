import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import Donation from '../models/Donation.js';
import Hospital from '../models/Hospital.js';
import {
    Notification
} from '../models/Notification.js';
import User from '../models/User.js';

const objectId =
    new mongoose.Types.ObjectId();

test(
    'hospital accounts satisfy the User schema',
    () => {
        const hospital = new User({
            uid: 'hospital-test',
            email: 'hospital@example.com',
            phone: '70123456',
            password: 'not-persisted',
            role: 'hospital',
            hospitalName:
                'مستشفى الاختبار',
            hospitalContactName:
                'Ali Test',
            hospitalContactTitle:
                'Coordinator',
            hospitalAddress:
                'Tripoli, Lebanon',
            verifiedByAdmin: true,
        });

        assert.equal(
            hospital.validateSync(),
            undefined
        );
    }
);

test(
    'hospital records use the phoneNumber contract',
    () => {
        const hospital = new Hospital({
            id: 'hospital-record-test',
            name: 'Test Hospital',
            location: 'Tripoli',
            phoneNumber: '06123456',
        });

        assert.equal(
            hospital.validateSync(),
            undefined
        );
    }
);

test(
    'controller notification types satisfy the schema',
    () => {
        const types = [
            'request_available',
            'donation_pending_approval',
            'donation_approved',
            'donation_rejected',
            'donor_assigned',
            'profile_request',
            'request_submitted',
            'request_assigned',
            'profile_update_rejected',
        ];

        for (const type of types) {
            const notification =
                new Notification({
                    donorId: 'donor-test',

                    requestId:
                        type === 'profile_request'
                            ? null
                            : objectId,

                    profileRequestId:
                        type === 'profile_request'
                            ? objectId
                            : null,

                    type,
                    title: 'Test',
                    message: 'Test message',
                });

            assert.equal(
                notification.validateSync(),
                undefined,
                `${type} should be valid`
            );
        }
    }
);

test(
    'donation rejection audit fields exist',
    () => {
        assert.ok(
            Donation.schema.path(
                'rejectedAt'
            )
        );

        assert.ok(
            Donation.schema.path(
                'rejectedBy'
            )
        );
    }
);

test(
    'authentication secrets are excluded by default',
    () => {
        assert.equal(
            User.schema.path('password')
                .options.select,
            false
        );

        assert.equal(
            User.schema.path(
                'refreshTokenHash'
            ).options.select,
            false
        );
    }
);