# Get all transforms.
include transform.mk

# Get all source language directories.
DIRS = $(shell find . -type d -maxdepth 1 -mindepth 1)

# Name of all directories to be built.
BUILD = $(DIRS:%=%/js-build)
TRDIR = $(foreach tr, $(TRANSFORMS), %/js-build/$(tr))

# All directories to be cleaned
CLEANDIRS = $(DIRS:%=%-clean)

STOPIFYMK = "./stopify-Makefile"
RUNNER = "./runner.sh"
RUNNERMK = "./runner-Makefile"

.PHONY: all build stopify clean run
all: build stopify

# Compile all source language programs to javascript.
build: $(BUILD) $(BUILD:%=%/stopify-Makefile)
%/js-build: %
	$(MAKE) --ignore-errors -C $<

# Add makefiles for compile file using stopify
%/js-build/stopify-Makefile %/js-build/transform.mk: %/js-build/
	cp $(STOPIFYMK) $^;
	cp transform.mk $^

# Compile all JS source files with stopify
stopify: $(BUILD:%=%/stopify)
%/js-build/stopify $(TRDIR):  %/js-build/stopify-Makefile
	$(MAKE) -C $(patsubst %/stopify, %, $@) -f $(STOPIFYMK)

# Rules for running the benchmarking harness.
RUNFILES = runner.sh runner-Makefile engines.mk transform.mk
RUNCREATE = $(foreach rf, $(RUNFILES), %/js-build/$(rf))
RUNDEP = $(foreach b, $(BUILD), $(foreach r, $(RUNFILES), $b/$r))

run: all $(RUNDEP) $(BUILD:%=%/run)

$(RUNCREATE): %/js-build
	cp $(RUNNER) $(RUNNERMK) engines.mk $<;

%/js-build/run:
	$(MAKE) -C $(patsubst %/run, %, $@) -f $(RUNNERMK)

# Rules for cleanup
clean: $(CLEANDIRS)
%-clean: %
	$(MAKE) -C $^ clean

# Rule to debug variables.
print-%  : ; @echo $* = $($*)
