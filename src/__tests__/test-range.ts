/**
 * @module genutils
 * Copyright ©  by Bob Kerns. Licensed under MIT license
 */

/**
 * Tests for the range function.
 */

import {range} from "../range";

describe('range', () => {
    test('simple',() => expect([...range(0, 5)])
        .toEqual([0, 1, 2, 3, 4]));
    test('asArray',() => expect(range(0, 5).asArray())
        .toEqual([0, 1, 2, 3, 4]));
    test('map',() => expect(range(0, 5).map(n => 2 * n).asArray())
        .toEqual([0, 2, 4, 6, 8]));
    test('filter',() => expect(range(0, 10).filter(n => n % 2 === 1).asArray())
        .toEqual([1, 3, 5, 7, 9]));
    test('some negative',() => expect(range(0, 5).some(n => n == 7))
        .toBeFalsy());
    test('some positive',() => expect(range(0, 5).some(n => n == 3))
        .toBeTruthy());
    test('every negative',() => expect(range(0, 5).every(n => n > 3))
        .toBeFalsy());
    test('every positive',() => expect(range(0, 5).every(n => n < 5))
        .toBeTruthy());
});
