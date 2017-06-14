# Stopify Benchmarking Harness
---------
The stopify benchmarking is a work of art, which means that you must be insane
to want to hack on it. The system relies on a lot of `make` hackery to work and
is claimed to "just" work when you add a new language. If this doesn't turn out
to be the case, complain to [@rachitnigam](https://github.com/rachitnigam).

## Dependencies
1. Install [GNU make](https://www.gnu.org/software/make/). The system was built
   with version 3.81 but any version above that should work.
2. Install the language compilers as specified
   [here](https://github.com/plasma-umass/stopify#optional-server-dependencies).
3. Install [Racket](https://racket-lang.org/) and run
   ```
   raco pkg install csv-reading plot
   ```
4. Run `npm run build` and `npm link`. Make sure that the `stopify` executable
   is linked correctly and is available on the path.

## Running the harness
In `<project-root>/benchmarks $`, run:
```
make -j8
make run -j8
```

## Adding a language
In `<project-root>/benchmarks`, add a new folder with the name of the new
language. Everything should be added INSIDE this new folder.

Since we want to build a credible benchmarks, we should keep original and
modifies benchmarks together. To this end, make a folder called
`<project-root>/original` before modifying them.

1. Add all the benchmarks to a folder called `benchmark-files` with the source
   language benchmarks.

2. Add a Makefile that can compiles the source language benchmarks into JS
   files in the `js-builds/`. Each generated file should be standalone
   runnable.

3. Add a `clean` rule to the makefile that cleans up the language directory.

4. (optional) Add a `benchmark` rule to the makefile that runs the benchmarks
   with the source language and produces the file
   `js-builds/native-base-times.csv` with the filename as the first column and
   the time in seconds as the second column.
