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

The [[functions]]<!-- @IGNORE PREVIOUS: link --> module provides a set of predicates and
type guard functions.

The [[range]]<!-- @IGNORE PREVIOUS: link --> function provides an enhanced generator
of numerical values.
