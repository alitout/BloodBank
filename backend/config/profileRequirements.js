export const PROFILE_REQUIREMENTS =
    Object.freeze({
        donor: [
            {
                field: "dateOfBirth",
                type: "date",
                labelKey: "dateOfBirth",
            },
            {
                field: "biologicalSex",
                type: "select",
                labelKey: "biologicalSex",
                options: [
                    {
                        value: "male",
                        labelKey: "male",
                    },
                    {
                        value: "female",
                        labelKey: "female",
                    },
                ],
            },
        ],

        hospital: [],

        super_admin: [],
    });

const isMissingValue = (value) =>
    value === undefined ||
    value === null ||
    value === "";

export const getMissingProfileFields = (
    user
) => {
    const requirements =
        PROFILE_REQUIREMENTS[user?.role] || [];

    return requirements
        .filter((requirement) =>
            isMissingValue(
                user?.[requirement.field]
            )
        )
        .map(
            (requirement) =>
                requirement.field
        );
};