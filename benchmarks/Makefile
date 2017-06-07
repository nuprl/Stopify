# Get all source language directories.
DIRS = $(shell find . -type d -maxdepth 1 -mindepth 1)
BUILD = $(DIRS:%=%/js-build)
CLEANDIRS = $(DIRS:%=%-clean)

STOPIFYMK = "./stopify-Makefile"
RUNNER = "./runner.sh"
RUNNERMK = "./runner-Makefile"

all: build stopify

# Compile all source language programs to javascript.
build: $(BUILD) $(BUILD:%=%/stopify-Makefile)
%/js-build: %
	$(MAKE) --ignore-errors -C $^

# Add makefiles for compile file using stopify
%/js-build/stopify-Makefile: %/js-build/
	cp $(STOPIFYMK) $^

# Compile all JS source files with stopify
stopify: $(BUILD:%=%/stopify)
%/js-build/stopify:  %/js-build/stopify-Makefile
	$(MAKE) -C $(patsubst %/stopify, %, $@) -f $(STOPIFYMK)

# Rules for running the benchmarking harness.
run: all $(BUILD:%=%/runner.sh) $(BUILD:%=%/runner-Makefile) \
	$(BUILD:%=%/run)

%/js-build/runner.sh: %/js-build
	cp $(RUNNER) $^
%/js-build/runner-Makefile: %/js-build
	cp $(RUNNERMK) $^
%/js-build/run:
	$(MAKE) -C $(patsubst %/run, %, $@) -f $(RUNNERMK)

# Rules for cleanup
clean: $(CLEANDIRS)
%-clean: %
	$(MAKE) -C $^ clean

# Rule to debug variables.
print-%  : ; @echo $* = $($*)
