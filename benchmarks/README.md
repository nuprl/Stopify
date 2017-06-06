### Benchmarks
===
To add a new source language to the benchmarking framework, do the following:

1. Create a folder with the languages name.
2. Add a makefile that generates a folder called `js-builds/` that contains
all the JavaScript files to run. Note that each file should be runnable
individually and should handle its own failure logic.
3. Add a `clean` rule to the makefile that cleans up the language directory.
