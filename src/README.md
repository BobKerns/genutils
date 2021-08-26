# Generator Utilities

Generator utilities that bring array-like operations like map, filter, slice, some, every, and more
to sync and async generators. Instead of producing arrays, these operations produce new generators.

Generators can be enhanced with new methods, or functional programming can be used to construct
operators on generators.

The functional interface is available via the [[Sync.Sync|Sync]]<!-- @IGNORE PREVIOUS: link --> and
[[Async.Async|Async]]<!-- @IGNORE PREVIOUS: link --> namespaces. Each provides the functions defined in the
[[GeneratorOps]]<!-- @IGNORE PREVIOUS: link --> interface.

The functions and methods that take generators also take iterators and iterables, under a common
[[Genable]]<!-- @IGNORE PREVIOUS: link --> type.

To convert a [[Genable]]<!-- @IGNORE PREVIOUS: link --> to an
[[Enhanced]]<!-- @IGNORE PREVIOUS: link -->, use
[[Sync.enhance]]<!-- @IGNORE PREVIOUS: link --> or
[[Async.enhance]]<!-- @IGNORE PREVIOUS: link -->.

## Submodules

The package is split into submodules which can be loaded separately.

* The [[generators]]<!-- @IGNORE PREVIOUS: link --> module provides the enhanced generators.
* The [[functions]]<!-- @IGNORE PREVIOUS: link --> module provides a set of predicates and
type guard functions.
* The [[range]]<!-- @IGNORE PREVIOUS: link --> function provides an enhanced generator
of numerical values.
* The [[events]]<!-- @IGNORE PREVIOUS: link --> module provides the {@link eventToGenerator}
and associated {@link QueueFactory} functions.
* The [[Sync]]<!-- @IGNORE PREVIOUS: link --> module provides the synchronouse enhanced generators.
* The [[Async]]<!-- @IGNORE PREVIOUS: link --> module provides the asynchronouse enhanced generators.
* The [[Future]]<!-- @IGNORE PREVIOUS: link --> module provides {@link Future Futures}.

To import these modules, append the path '/lib/{**esm**,**cjs**,**umd**}/_module_', where:

* **esm** for ECMAscript modules
* **cjs** for Node.js when not using modules
* **umd** for browsers when not using modules.
