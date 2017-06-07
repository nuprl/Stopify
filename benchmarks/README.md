### Requirements
Run `npm run build` and `npm link`. Make sure that `stopify` is linked correctly.

### Benchmarks

To add a new source language to the benchmarking framework, do the following:

1. Create a folder with the language's name. Add all the benchmarks to a folder
called `benchmark-files`. Note the modification rule below before modifying the
the files.
2. Add a makefile that generates a folder called `js-builds/` that contains
all the JavaScript files to run. Note that each file should be runnable
individually and should handle its own failure logic.
3. (optional) Add a `benchmark` rule to the makefile that runs the benchmarks with the
source language and produces the file `<language-name>-native.csv` with the
filename as the first column and the time in seconds as the second column.
4. Add a `clean` rule to the makefile that cleans up the language directory.

#### Modifying benchmark files

In case you have to modify the benchmark files, create a folder called
`original` that contains the original version of the benchmarks.

#### File format

The Benchmarking harness produces individual files
`<language-name>-<transform>.csv` with the first column as the name of the
testfile and the second column as time in seconds.

### Running benchmarking harness
To run the harness: `make -k j4`
To reset all directories `make clean -k j4`
