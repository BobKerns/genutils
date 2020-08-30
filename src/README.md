# Generator Utilities

Generator utilities that bring array-like operations like map, filter, slice, some, every, and more
to sync and async generators. Instead of producing arrays, these operations produce new generators.

Generators can be enhanced with new methods, or functional programming can be used to construct
operators on generators.

The functional interface is available via the [[Sync]]<!-- @IGNORE PREVIOUS: link --> and
[[Async]]<!-- @IGNORE PREVIOUS: link --> factories. Each implements the
[[GeneratorOps]]<!-- @IGNORE PREVIOUS: link --> interface.

The functions and methods that take generators also take iterators and iterables, under a common
[[Genable]]<!-- @IGNORE PREVIOUS: link --> type.

To convert a [[Genable]]<!-- @IGNORE PREVIOUS: link --> to an
[[Enhanced]]<!-- @IGNORE PREVIOUS: link -->, use the
[[GeneratorOps.enhance]]<!-- @IGNORE PREVIOUS: link -->
method on [[Sync]]<!-- @IGNORE PREVIOUS: link --> or [[Async]]<!-- @IGNORE PREVIOUS: link -->.

## Submodules
The package is split into submodules which can be loaded separately.

* The [[generators]]<!-- @IGNORE PREVIOUS: link --> module provides the enhanced generators.
* The [[functions]]<!-- @IGNORE PREVIOUS: link --> module provides a set of predicates and
type guard functions.
* The [[range]]<!-- @IGNORE PREVIOUS: link --> function provides an enhanced generator
of numerical values.
* The [[events]]<!-- @IGNORE PREVIOUS: link --> module provides the {@link eventToGenerator}
and associated {@link QueueFactory} functions.

To import these modules, append the path '/lib/{*esm*,*cjs*,*umd*}/_module_', where
* `esm` for ECMAscript modules
* `cjs` for Node.js when not using modules
* `umd` for browsers when not using modules.

