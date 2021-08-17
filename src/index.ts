/*
 * Copyright 2021 by Bob Kerns. Licensed under MIT license.
 *
 * Github: https://github.com/BobKerns/genutils
 */
/**
 * Load the full system with a single import.
 * @packageDocumentation
 * @preferred
 * @module genutils
 */

export {
    isIterable, isIterator, toIterable, toIterator, toIterableIterator,
    toGenerator, isGenerator, isGenable, isIterableIterator,
    isAsyncIterable, isAsyncIterator, toAsyncIterable, toAsyncIterator, toAsyncIterableIterator,
    toAsyncGenerator, isAsyncGenerator, isAsyncGenable, isAsyncIterableIterator,
    doCatch
} from './functions';
export {range} from './range';
export {
    SyncType
} from './generators';
export type {
    Genable, GenUnion, FlatGen, GenType, Reducer,
    Constructor, IteratorValue as IteratorType
} from './types';

export {
    eventToGenerator, Controller, Queue, QueueFactory,
    QueueUniqueSpec, KeyFn,
    queue1, queueSticky, queueOldest, queueNewest, queueUnique, queueUpdateShallow
} from './events';
export {Future} from './future';
export {delay} from './util';
export type {IEnhancements} from './ienhancement';
export * from './sync-mixin';
export * from './async-mixin';

export { EnhancedGenerator } from './sync-impl';
export { EnhancedAsyncGenerator } from './async-impl';

export { Sync } from './sync';
export { Async } from './async';
