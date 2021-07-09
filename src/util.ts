/**
 * Utilities for implementing or using generators.
 * @module
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