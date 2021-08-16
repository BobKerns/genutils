/*
 * Copyright 2021 by Bob Kerns. Licensed under MIT license.
 *
 * Github: https://github.com/BobKerns/genutils
 */
/**
 * Enhanced range implementation.
 *
 * @packageDocumentation
 * @module range
 * @preferred
 */

import { Sync } from "./sync";

/**
 * Produce numbers from __start__ to __end__ incremented by __step__.
 * Step may be positive or negative, but not zero.
 *
 * Produces an [[EnhancedGenerator]].
 * @param start (default = 0)
 * @param end   (default = `Number.MAX_SAFE_INTEGER`)
 * @param step  (default = 1)
 */
export const range = (start = 0, end = Number.MAX_SAFE_INTEGER, step = 1): Sync.Generator<number, void, void> => {
    function* range(start = 0, end = Number.MAX_SAFE_INTEGER, step = 1) {
        let x = start;
        if (step > 0) {
            while (x < end) {
                yield x;
                x += step;
            }
        } else if (step < 0) {
            while (x > end) {
                yield x;
                x += step;
            }
        } else {
            throw new Error("Step must not be zero.");
        }
    }
    return Sync.enhance(range(start, end, step));
}
