import mongoose from "mongoose";

import {
    env,
} from "../config/env.js";

import Donation from "../models/Donation.js";
import Request from "../models/Requests.js";

const applyChanges =
    process.argv.includes("--apply");

const missingTypeQuery = {
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

        const donations =
            await Donation.find(
                missingTypeQuery
            )
                .select(
                    "_id donationId requestId donationType"
                )
                .lean();

        if (donations.length === 0) {
            console.log(
                "No donation records require migration."
            );

            return;
        }

        const requestIds = [
            ...new Set(
                donations
                    .map((donation) =>
                        donation.requestId?.toString()
                    )
                    .filter(Boolean)
            ),
        ];

        const requests =
            await Request.find({
                _id: {
                    $in: requestIds,
                },
            })
                .select(
                    "_id bloodGenre"
                )
                .lean();

        const requestTypeById =
            new Map(
                requests.map((request) => [
                    request._id.toString(),
                    request.bloodGenre,
                ])
            );

        const operations = [];
        const unresolved = [];

        for (const donation of donations) {
            const requestId =
                donation.requestId?.toString();

            const donationType =
                requestTypeById.get(
                    requestId
                );

            if (!donationType) {
                unresolved.push({
                    donationId:
                        donation.donationId,

                    requestId:
                        requestId || null,
                });

                continue;
            }

            operations.push({
                updateOne: {
                    filter: {
                        _id: donation._id,

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
                    },

                    update: {
                        $set: {
                            donationType,
                            updatedAt:
                                new Date(),
                        },
                    },
                },
            });
        }

        console.log({
            mode:
                applyChanges
                    ? "apply"
                    : "dry-run",

            recordsFound:
                donations.length,

            recordsResolvable:
                operations.length,

            recordsUnresolved:
                unresolved.length,
        });

        if (
            unresolved.length > 0
        ) {
            console.warn(
                "Unresolved records:",
                unresolved
            );
        }

        if (!applyChanges) {
            console.log(
                "Dry run only. Re-run with --apply to write changes."
            );

            return;
        }

        if (operations.length > 0) {
            const result =
                await Donation.bulkWrite(
                    operations,
                    {
                        ordered: false,
                    }
                );

            console.log({
                matched:
                    result.matchedCount,

                modified:
                    result.modifiedCount,
            });
        }
    } finally {
        await mongoose.disconnect();
    }
};

run().catch((error) => {
    console.error(
        "Donation-type migration failed:",
        error
    );

    process.exitCode = 1;
});