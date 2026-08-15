import test from "node:test";
import assert from "node:assert/strict";

import Requester from "../models/Requests.js";

const createValidRequest =
    (changes = {}) =>
        new Requester({
            id:
                `transportation-test-${Date.now()}-${Math.random()}`,

            createdByUid:
                "test-donor",

            fname: "Ali",
            fatherName:
                "Mustapha",
            lname: "Tout",

            bloodGenre:
                "whole_blood",

            bloodType: "O+",

            hospital:
                "Test Hospital",

            hospitalSelectionType:
                "registered",

            unitsNeeded: 1,

            date: "2026-08-14",

            ...changes,
        });

test(
    "transportation availability defaults to false",
    () => {
        const request =
            createValidRequest();

        assert.equal(
            request
                .transportationAvailable,
            false
        );

        assert.equal(
            request.validateSync(),
            undefined
        );
    }
);

test(
    "request accepts available transportation",
    () => {
        const request =
            createValidRequest({
                transportationAvailable:
                    true,
            });

        assert.equal(
            request
                .transportationAvailable,
            true
        );

        assert.equal(
            request.validateSync(),
            undefined
        );
    }
);