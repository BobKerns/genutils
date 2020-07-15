/*
 * @module genutils
 * Copyright 2020 by Bob Kerns. Licensed under MIT license.
 *
 * Github: https://github.com/BobKerns/genutils
 */

/**
 * This entry point loads synchronous and asynchronous extended generators
 * @packageDocumentation
 * @module generators
 * @preferred
 */

export type {SyncType} from './types';
import {Sync as SyncFoo} from './sync';
import {Async as AsyncFoo} from './async';
const Sync = SyncFoo;
type Sync = 'sync';
const Async = AsyncFoo;
type Async = 'async';
export {Sync, Async};
