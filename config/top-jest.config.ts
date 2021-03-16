/*
 * Copyright © 2019. Licensed under MIT license.
 */

// noinspection JSUnusedGlobalSymbols
export default {
    preset: 'ts-jest',
    testMatch: [
        "**/__tests__/test-*.ts"
    ],
    rootDir: "src",
    "maxConcurrency": 10
};
