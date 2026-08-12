import test from "node:test";
import assert from "node:assert/strict";

import {
    readdirSync,
    statSync,
} from "node:fs";

import {
    join,
} from "node:path";

import {
    spawnSync,
} from "node:child_process";

const findJavaScriptFiles = (
    directory
) => {
    const files = [];

    for (
        const entry
        of readdirSync(directory)
    ) {
        const absolutePath =
            join(directory, entry);

        const stats =
            statSync(absolutePath);

        if (stats.isDirectory()) {
            files.push(
                ...findJavaScriptFiles(
                    absolutePath
                )
            );

            continue;
        }

        if (entry.endsWith(".js")) {
            files.push(absolutePath);
        }
    }

    return files;
};

test(
    "all backend controllers have valid JavaScript syntax",
    () => {
        const controllerDirectory =
            join(
                process.cwd(),
                "Controllers"
            );

        const controllerFiles =
            findJavaScriptFiles(
                controllerDirectory
            );

        assert.ok(
            controllerFiles.length > 0,
            "No controller files were found"
        );

        for (
            const controllerFile
            of controllerFiles
        ) {
            const result =
                spawnSync(
                    process.execPath,
                    [
                        "--check",
                        controllerFile,
                    ],
                    {
                        encoding: "utf8",
                    }
                );

            assert.equal(
                result.status,
                0,
                [
                    `Syntax error in ${controllerFile}`,
                    result.stderr,
                ].join("\n")
            );
        }
    }
);