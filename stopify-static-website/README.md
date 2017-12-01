The Stopify Website
====================

The first time, run the following command to check out the Stopify
repository's gh-pages branch into the dist directory:

```
yarn run clone-gh-pages
```

- To build: `yarn run build`

- To view locally: `yarn run serve-local`. Note that this will use the
  cloud-hosted compiler. There is no way to test a local copy of the compiler
  right now.

- To publish to Github: `yarn run publish`. The publish script will fail if the
  remote has been updated. If so, you need to manually ensure that `dist/` is up-to-date. (i.e., `cd dist && git pull`).
