import ProfileRequest from "../models/ProfileRequest.js";

import {
    PROFILE_REQUIREMENTS,
    getMissingProfileFields,
} from "../config/profileRequirements.js";

export const getProfileCompletionStatus =
    async (user) => {
        const requirements =
            PROFILE_REQUIREMENTS[user?.role] || [];

        const missingFields =
            getMissingProfileFields(user);

        const pendingRequest =
            await ProfileRequest.findOne({
                uid: user.uid,
                requestType:
                    "profile_update",
                status: "pending",
            })
                .select(
                    "_id changes status createdAt"
                )
                .lean();

        const pendingFields =
            pendingRequest
                ? Object.keys(
                    pendingRequest.changes || {}
                )
                : [];

        const fieldsRequiringAction =
            missingFields.filter(
                (field) =>
                    !pendingFields.includes(field)
            );

        return {
            complete:
                missingFields.length === 0,

            blocking:
                fieldsRequiringAction.length > 0,

            submissionPending:
                Boolean(pendingRequest),

            missingFields,
            pendingFields,
            fieldsRequiringAction,

            pendingRequestId:
                pendingRequest?._id || null,

            requirements,
        };
    };