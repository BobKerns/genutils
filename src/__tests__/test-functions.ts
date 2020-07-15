/**
 * @module genutils
 * Copyright ©  by Bob Kerns. Licensed under MIT license
 */

/**
 * Test type guards and coercion functions.
 */

import {isFunction, isGenable, isGenerator, isIterable, isIterator} from "../functions";
import {range} from '../range';

describe('Predicates', () => {
    function *nullGen() {}

    test('isGenerator undefined', () =>
        expect(isGenerator(undefined))
            .toBeFalsy());
    test('isGenerator normal', () =>
        expect(isGenerator(nullGen()))
            .toBeTruthy());
    test('isGenerator Mappable', () =>
        expect(isGenerator(range(0, 3)))
            .toBeTruthy());
    test('isGenerator iterable', () =>
        expect(isGenerator([0, 1, 2]))
            .toBeFalsy());
    test('isGenerator iterator', () =>
        expect(isGenerator([0, 1, 2][Symbol.iterator]()))
            .toBeFalsy());

    test('isGenable undefined', () =>
        expect(isGenable(undefined))
            .toBeFalsy());
    test('isGenable Generator', () =>
        expect(isGenable(nullGen()))
            .toBeTruthy());
    test('isGenable Mappable', () =>
        expect(isGenable(range(0, 3)))
            .toBeTruthy());
    test('isGenable Iterable', () =>
        expect(isGenable([0, 1, 2]))
            .toBeTruthy());
    test('isGenable Iterator', () =>
        expect(isGenable([0, 1, 2][Symbol.iterator]()))
            .toBeTruthy());
    test('isGenable Other', () =>
        expect(isGenable(() => 7))
            .toBeFalsy());

    test('isIterator undefined', () =>
        expect(isIterator(undefined))
            .toBeFalsy());
    test('isIterator yes', () =>
        expect(isIterator([][Symbol.iterator]()))
            .toBeTruthy());
    test('isIterator no', () =>
        expect(isIterator([]))
            .toBeFalsy());
    test('isIterator generator', () =>
        expect(isIterator(nullGen()))
            .toBeTruthy());

    test('isIterable undefined', () =>
        expect(isIterable(undefined))
            .toBeFalsy());
    test('isIterable yes', () =>
        expect(isIterable({next() { return {done: true}}} ))
            .toBeFalsy());
    test('isIterable no', () =>
        expect(isIterable([]))
            .toBeTruthy());
    test('isIterable generator', () =>
        expect(isIterable(nullGen()))
            .toBeTruthy());

    test('isFunction undefined', () =>
        expect(isFunction(undefined))
            .toBeFalsy());
    test('isFunction yes', () =>
        expect(isFunction(() => 5))
            .toBeTruthy());
    test('isFunction no', () =>
        expect(isFunction(5))
            .toBeFalsy());

    test('isFunction guard', () => {
        let x: number | ((g: number) => boolean) = _ => true;
        let y: number | ((g: any) => number) = _ => 8;
        // This should be happy
        // noinspection JSUnusedLocalSymbols
        const b: (g: number) => boolean = (isFunction(x) ? x : () => true);
        // This should be a type mismatch
        // @ts-expect-error
        // noinspection JSUnusedLocalSymbols
        const c: (g: number) => boolean = (isFunction(y) ? y : () => true);
    });
});
