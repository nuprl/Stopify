This package contains a "Google Cloud Function" that runs the Stopify
compiler. There are two unusual features of this package:

1. This package cannot be part of the workspace that holds the rest of the
   Stopify repositories. The `gcloud functions deploy` scripts appears to need
   all `node_modules` in the current directory. To address this, the build
   script uses `rsync` to copy `../stopify` to `./node_modules/stopify`.

2. Cloud Functions run on Node 6. This seems to be okay ...

Configuration
-------------

This is only necessary if you're deploying your own copy of this function.

1. Tweak `config.json`.

2. Run `yarn run init-bucket` to create the Google Cloud Storage bucket
   that will hold compiled programs.

Building
--------

1. `yarn run build` to compile

2. `yarn run deploy` to deploy

Testing
-------

The following command will fetch a stopified program:

```
./bin/test-deployed.sh <language> <filename>
```

NOTE: this script seems to break newlines. If the source language
is newline-sensitive (e.g., Scala), it will not work.
