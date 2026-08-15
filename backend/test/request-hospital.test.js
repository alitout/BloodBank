import test from "node:test";
import assert from "node:assert/strict";

import {
    resolveRequestHospital,
} from "../services/requestHospitalService.js";

test(
    "custom hospital remains attached to the request",
    async () => {
        const result =
            await resolveRequestHospital({
                hospitalSelectionType:
                    "other",

                customHospital: {
                    name:
                        "  Example Hospital  ",

                    address:
                        "  Beirut, Lebanon  ",
                },
            });

        assert.equal(
            result.hospitalSelectionType,
            "other"
        );

        assert.equal(
            result.hospital,
            "Example Hospital"
        );

        assert.equal(
            result.hospitalId,
            null
        );

        assert.deepEqual(
            result.customHospital,
            {
                name:
                    "Example Hospital",

                address:
                    "Beirut, Lebanon",
            }
        );
    }
);

test(
    "custom hospital requires an address",
    async () => {
        await assert.rejects(
            () =>
                resolveRequestHospital({
                    hospitalSelectionType:
                        "other",

                    customHospital: {
                        name:
                            "Example Hospital",

                        address: "",
                    },
                }),

            (error) => {
                assert.equal(
                    error.statusCode,
                    400
                );

                return true;
            }
        );
    }
);

test(
    "invalid hospital selection type is rejected",
    async () => {
        await assert.rejects(
            () =>
                resolveRequestHospital({
                    hospitalSelectionType:
                        "unknown",
                }),

            (error) => {
                assert.equal(
                    error.statusCode,
                    400
                );

                assert.equal(
                    error.code,
                    "INVALID_HOSPITAL_SELECTION"
                );

                return true;
            }
        );
    }
);