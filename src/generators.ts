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

/**
 * Factory for synchronous generator operators. See [[GeneratorOps]] for details.
 */
const Sync = SyncFoo;
/**
 * Selector type to select the types for synchronous generators.
 */
type Sync = 'sync';

/**
 * Factory for asynchronous generator operators. See [[GeneratorOps]] for details.
 */
const Async = AsyncFoo;
/**
 * Selector type to select the types for ssynchronous generators.
 */
type Async = 'async';
export {Sync, Async};
