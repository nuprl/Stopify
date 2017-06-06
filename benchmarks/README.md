### Benchmarks

To add a new source language to the benchmarking framework, do the following:

1. Create a folder with the languages name.
2. Add a makefile that generates a folder called `js-builds/` that contains
all the JavaScript files to run. Note that each file should be runnable
individually and should handle its own failure logic.
3. Add a `benchmark` rule to the makefile that runs the benchmarks with the
source language and produces the file `<language-name>-native.csv` with the
filename as the first column and the time in seconds as the second column.
4. Add a `clean` rule to the makefile that cleans up the language directory.

#### File format

The Benchmarking harness produces individual files
`<language-name>-<transform>.csv` with the first column as the name of the
testfile and the second column as time in seconds.
