# @stopify/normalize-js

This package implements a semantics-preserving transformation
for JavaScript that is inspired by A Normal Form [^1]. The transformation
guarantees that:

1. All applications are named, unless they are in tail position.
   (A flag can be set to name applications in tail position too.)
2. All loops are *while* loops.
3. All branches are  *if* statements.
4. No declarations are hoisted.
5. All variables are declared before use.
6. No *continue* statements exist.

The transformation does introduce new *break* statements and labelled
statements.


[^1]: Cormac Flanagan, Amr Sabry, Bruce F. Duba, and Matthias Felleisen.
      The Essence of Compiling with Continuations. In Proceedings of
      *ACM SIGPLAN Conference on Programming Language Design and Implementation
      (PLDI)*, 1993.