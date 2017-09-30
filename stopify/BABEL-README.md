## Babel Readme
Babel is the plugin that we are using to write our transformations. It uses
the [visitor pattern][https://en.wikipedia.org/wiki/Visitor_pattern] which
allows us to visit each AST node and apply some transforms. There are
some eccentricities associated with the visitor pattern as well a babel
itself. Document any un-intuitive things that are discorvered about either
here:

### The visitor pattern
- The visitor pattern is different from pattern matching usually seen in
FP languages. Visitors "visit" each node in the AST and apply transforms
on them. These transforms are usually cleaner if done in an imperative style.

- Visitors in babel, unless specified, traverse the AST bottom-up. This means
when thinking about a nested binary expression such as:
```
1 + (2 + 3)
```
The transformation is applied first to `(2 + 3)` and then to `1`.

- Visitors trigger as soon as new node is created. This means that if your
transformation creates a new `BinaryExpression`, the transformation for
`BinaryExpression`s is applied to it instantly. This also means that there
is a high probability of writing infinitely looped transformations, especially
because of the way babel *merges* visitors.


### Babel
#### Merging
In order to be efficient, babel "merges" different visitors into a single one
when they are specified to run together. This means if your `.babelrc` looks
like:
```
plugins: [ './foo.js', './bar.js' ]
```
with both `foo.js` and `bar.js` exporting separate visitors, take all the
visitors and combine them. If there are visitors that are exported by both the
plugins, babel combines them in a sequence from first to last plugins.  This
can have some very unintuitive results when programming with babel.

Consider this: `./foo.js` transforms `BinaryExpression` and creates a new
`LogicalExpression` in the process while `./bar.js` transforms
`BinaryExpression` and creates a new `LogicalExpression` in the process. Now
if `./foo.js` and `./bar.js` are run in sequence, the process terminates but
if they are merged by babel, we get an infinte loop. This is because visitors
are applied as soon as a new node is created, which means when transforming a
`BinaryExpression` we create a new `LogicalExpression` which in turn triggers
its tranform which creates a new `BinaryExpression` which triggers its transform
and so on.

This is a case where two logically distinct files interacted in an unexpected
manner because of the way babel merges transformation

This is a case where two logically distinct files interacted in an unexpected
manner because of the way babel merges transformation.
