/**
 * @module genutils
 * Copyright ©  by Bob Kerns. Licensed under MIT license
 */

/**
 * Test event generator
 */

import {Controller, eventToGenerator, queue1, queueOldest, queueSticky, queueUnique, queueUpdateShallow} from "../events";
import {isAsyncGenerator, isFunction} from "../functions";

const delay = <V extends any>(n: number, v?: V) => new Promise<V | undefined>(resolve => setTimeout( () => resolve(v), n));

describe('Event generator', () => {
    describe('create', () => {
        const [gen, cont] = eventToGenerator();
        test('isAsyncGenerator', () =>
            expect(isAsyncGenerator(gen))
                .toBe(true));
        test('controller.send', () =>
            expect(isFunction(cont.send))
                .toBe(true));
        test('controller.throw', () =>
            expect(isFunction(cont.throw))
                .toBe(true));
        test('controller.end', () =>
            expect(isFunction(cont.end))
                .toBe(true));
        test('controller.clear', () =>
            expect(isFunction(cont.clear))
                .toBe(true));
    });
    describe('run', () => {
        const doValues = async <V>(d: number, c: Controller<V>, ...args: (V | 'end' | 'throw' | 'clear')[]) => {
            for (const v of args) {
                d && await delay(d);
                switch (v) {
                    case 'end':
                        c.end('end');
                        break;
                    case 'throw':
                        c.throw(new Error('c'));
                        break;
                    case 'clear':
                        c.clear();
                        break;
                    default:
                        c.send(v);
                }
            }
        }
        test('waiting', async () => {
            const [gen, cont] = eventToGenerator<number>();
            // Don't wait for values to be queued
            const enq = doValues(10, cont, 0, 5, 7, 'end');
            await expect((await gen.next()).value)
                .toEqual(0);
            await expect((await gen.next()).value)
                .toEqual(5);
            await expect((await gen.next()).value)
                .toEqual(7);
            await expect((await gen.next()))
                .toEqual({done: true, value: 'end'});
            await enq;
        });

        test('queued', async () => {
            const [gen, cont] = eventToGenerator<number>();
            await doValues(0, cont, 0, 5, 7, 'end');
            await expect((await gen.next()).value)
                .toEqual(0);
            await expect((await gen.next()).value)
                .toEqual(5);
            await expect((await gen.next()).value)
                .toEqual(7);
            await expect((await gen.next()))
                .toEqual({done: true, value: 'end'});
        });

        test('clear', async () => {
            const [gen, cont] = eventToGenerator<number>();
            await doValues(0, cont, 1, 6, 8, 'clear', 0, 5, 7, 'end');
            await expect((await gen.next()).value)
                .toEqual(0);
            await expect((await gen.next()).value)
                .toEqual(5);
            await expect((await gen.next()).value)
                .toEqual(7);
            await expect((await gen.next()))
                .toEqual({done: true, value: 'end'});
        });

        test('queued1', async () => {
            const [gen, cont] = eventToGenerator<number>(queue1);
            await doValues(0, cont, 0, 5, 7);
            await expect((await gen.next()).value)
                .toEqual(7);
        });

        test('queuedSticky', async () => {
            const [gen, cont] = eventToGenerator<number>(queueSticky);
            await doValues(0, cont, 0, 5, 7);
            await expect((await gen.next()).value)
                .toEqual(7);
            await expect((await gen.next()).value)
                .toEqual(7);
            await expect((await gen.next()).value)
                .toEqual(7);
        });

        test('queuedOldest', async () => {
            const [gen, cont] = eventToGenerator<number>(queueOldest(2));
            await doValues(0, cont, 0, 5, 7);
            await expect((await gen.next()).value)
                .toEqual(0);
            await expect((await gen.next()).value)
                .toEqual(5);
            const enq = doValues(10, cont, 100);
            await expect((await gen.next()).value)
                .toEqual(100);
            await enq;
        });

        test('queueUnique', async () => {
            const [gen, cont] = eventToGenerator<number>(queueUnique());
            await doValues(0, cont, 0, 5, 5, 7);
            await expect((await gen.next()).value).toBe(0);
            await expect((await gen.next()).value).toBe(5);
            await expect((await gen.next()).value).toBe(7);
            cont.clear();
            await doValues(0, cont, 5, 7);
            await expect((await gen.next()).value).toBe(5);
            await expect((await gen.next()).value).toBe(7);
        });

        describe('queueUpdateShallow', () => {
            test('null init', async () => {
                type Obj = {a: number, b: number};
                const [gen, cont] = eventToGenerator<Partial<Obj>>(queueUpdateShallow<Obj>());
                cont.send({a: 5, b: 7});
                await expect((await gen.next()).value).toEqual({a: 5, b: 7});
            });
            test('init add', async () => {
                type Obj = {a: number, b: number};
                const [gen, cont] = eventToGenerator<Partial<Obj>>(queueUpdateShallow<Obj>({a: 5}));
                cont.send({a: 5, b: 7});
                await expect((await gen.next()).value).toEqual({b: 7});
            });
            test('init change', async () => {
                type Obj = {a: number, b: number};
                const [gen, cont] = eventToGenerator<Partial<Obj>>(queueUpdateShallow<Obj>({a: 5, b: 2}));
                cont.send({a: 5, b: 7});
                await expect((await gen.next()).value).toEqual({b: 7});
            });
            test('init delete', async () => {
                type Obj = {a: number, b: number};
                const [gen, cont] = eventToGenerator<Partial<Obj>>(queueUpdateShallow<Obj>({a: 5, b: 2}));
                cont.send({a: 5});
                await expect((await gen.next()).value).toEqual({b: undefined});
            });
        });

    });
});
