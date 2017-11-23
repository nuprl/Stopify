The Stopify Website
====================

The first time, run the following command to check out the Stopify
repository's gh-pages branch into the dist directory:

```
yarn run clone-gh-pages
```

To build:

```
yarn run build
```

To publish:

```
yarn run publish
```

NOTE: The publish script will fail in the remote has been updated. If so, you
need to manually ensure that dist/ is up-to-date. (i.e., `cd dist && git
pull`).
