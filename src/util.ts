/*
 * Copyright 2021 by Bob Kerns. Licensed under MIT license.
 *
 * Github: https://github.com/BobKerns/genutils
 */
/**
 * Utilities for implementing or using generators.
 * @module util
 */

/**
 * Delay for the specified number of milliseconds.
 *
 * @param ms
 * @param value
 * @returns
 */
export const delay = (ms: number, value?: any) =>
    new Promise(acc => setTimeout(() => acc(value), ms));