import mongoose from "mongoose";

import {
    env,
} from "../config/env.js";

import User from "../models/User.js";
import ProfileRequest from "../models/ProfileRequest.js";
import Donation from "../models/Donation.js";

const incompleteDonorQuery = {
    role: "donor",

    $or: [
        {
            dateOfBirth: {
                $exists: false,
            },
        },
        {
            dateOfBirth: null,
        },
        {
            biologicalSex: {
                $exists: false,
            },
        },
        {
            biologicalSex: null,
        },
    ],
};

const missingDonationTypeQuery = {
    $or: [
        {
            donationType: {
                $exists: false,
            },
        },
        {
            donationType: null,
        },
    ],
};

const run = async () => {
    try {
        await mongoose.connect(
            env.MONGODB_URI
        );

        const [
            totalDonors,
            incompleteDonors,
            pendingProfileRequests,
            missingDonationTypes,
        ] = await Promise.all([
            User.countDocuments({
                role: "donor",
            }),

            User.countDocuments(
                incompleteDonorQuery
            ),

            ProfileRequest.countDocuments({
                requestType:
                    "profile_update",

                status:
                    "pending",
            }),

            Donation.countDocuments(
                missingDonationTypeQuery
            ),
        ]);

        console.log({
            totalDonors,
            incompleteDonors,
            pendingProfileRequests,
            missingDonationTypes,
            donorMigrationComplete:
                incompleteDonors === 0 &&
                pendingProfileRequests === 0,
        });
    } finally {
        await mongoose.disconnect();
    }
};

run().catch((error) => {
    console.error(
        "Migration report failed:",
        error.message
    );

    process.exitCode = 1;
});