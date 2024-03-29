# Changelog

## Release 1.0.8

__date: 2023-09-07__

* __FIX__: Make `.reduce((acc, val) ==> ...)` correctly infer the type of `val`.
* __FIX__: Update to modern Typescript; this may address problems with
  `some`, `concat`, and `repeat`.
* __DOC__: Fix broken internal documentation links.
* Separate ESM exports for submodules (sync, async, events, functions, generators, enhancements, range)

## Release 1.0.7

## Release 1.0.6

__date: 2021-08-26__

* __FIX__: Propagate types and sourcemaps
* __FIX__: Use the right prorotype for Sync.enhance
* __DEV__: Make the `npm run serve` command be more useful.
* __DOC__: Various fixes.

## Release 1.0.5

__date: 2021-08-24__

* Update dev dependencies.
* No code changes.

## Release 1.0.4

__date: 2021-08-24__

* Build using `tsc` to avoid a polyfill that subtly breaks our generators contributed by the rollup plugin.
  An iterator without a `.throw()` method is not the same as an iterator with a `.throw()` method that throws
  an error saying there's no `.throw()` method!

  This should result in faster builds as well.
* `npm run serve` now serves on port 3030 (if available).
* No code changes.

## Release 1.0.3

__date: 2021-08-16__

* Cosmetic change to `toStringTag` of the mixins.

## Release 1.0.2

__date: 2021-08-16__

* [BUGFIX] types weren't being passed on through `Sync.Mixin` and `Async.Mixin`. The constructed class now defines
  all the properties of the base class, and required the same constructor arguments.
* Remove unused types `SyncEnhancedConstructor`, `AsyncEnhancedConstructor`, `Constructor`, `ConstructorType`.
  This should not be a breaking change for anyone.
* Add type `IteratorValue` to extract the type of values being iterated over.

## Release 1.0.1

__date: 2021-08-16__

* Make `Sync.Mixin` and `Async.Mixin` work with abstract classes.

## Release 1.0.0

__date: 2021-08-15__

### New Features

* The enhanced generator types are now exported as `Sync.Generator` and `Async.Generator`.
* The literal types `'sync'` and `'async'` are available as `Sync.type` and `Async.type'.
* `Sync.wrap` and `Async.wrap` take a function returning an iterator and return an iterable object that
   invokes that function, along with the enhanced methods like `map()` and `filter()`, allowing them to be
   treated in a manner similar to an array.

### Incompatible Changes

* [typescript] If you import directly from the `'sync'` or `'async'` modules, the `Sync` or `Async` exported from there
   is no longer the literal type '`sync'` or `'async'`, but rather the `Sync` or `Async.type` or `Async.type`
   instead.

### Other Changes

* Make `Sync` and `Async` exports be namespaces.
* Export `EnhancedGenerator` and `EnhnancedAsyncGenerator` as `Sync.Generator` and `Async.Generator`
* Export the mixins as `Sync.Mixin` and `Async.Mixin`
* Add `Sync.wrap` and `Async.wrap`
* Prune and enhance the documentation.

## Version 0.1.45

__date: 2021-08-13__

* Export new types.

## Version 0.1.46

__date: 2021-08-13__

* Small documentation fix for enhanced iterables.

## Version 0.1.44

__date: 2021-08-13__

* Add mixins for iterable classes.  This allows them to be treated more like `Array`, directly using methods such as
  `.map()` and `.filter()`.

## Version 0.1.43

__date: 2021-07-29__

* Fix an error on return of several generators in certain cases.

## Version 0.1.42

__date: 2021-07-28__

* Fix NPM Scripts.

## Version 0.1.41

__date: 2021-07-24__

* Update dependencies

## Version 0.1.40

__date: 2021-07-11__

* Update Dependencies
* Fix some issues with Async iterators
* Add Futures
* Add missing export of delay() from main package.
* Various documentation presentation fixes.

## Version 0.1.39

__date: 2020-08-30__

* Update to Typescript 4.0.2

## Version 0.1.38

__date: 2020-08-30__

* Add merge and sort operations
* Add eventToGenerator function and related QueueFactory functions.
* Update dev dependencies.
* Reenable Terser

## Version 0.1.37

__date: 2020-07-15__

* Document how to include sub-modules.

## Version 0.1.36

__date: 2020-07-15__

* Split up entry points so you can include subsets.
* Improve documentation.
* Update mermaid and ts-jest (dev dependencies)

## Version 0.1.35

__date: 2020-07-13__

* Initial Release as separate package.
