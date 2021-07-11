/*
 * @module genutils
 * Copyright 2020 by Bob Kerns. Licensed under MIT license.
 *
 * Github: https://github.com/BobKerns/genutils
 */

/**
 * Load the full system with a single import.
 * @packageDocumentation
 * @preferred
 * @module Index
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
    Sync, Async, SyncType
} from './generators';
export {
    Genable, GenUnion, FlatGen, GenType, Reducer
} from './types';

export {
    eventToGenerator, Controller, Queue, QueueFactory,
    QueueUniqueSpec, KeyFn,
    queue1, queueSticky, queueOldest, queueNewest, queueUnique, queueUpdateShallow
} from './events';
export {Future} from './future';
