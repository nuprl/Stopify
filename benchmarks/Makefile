# Get all transforms.
include transform.mk

# Get all source language directories.
DIRS := $(shell find . -maxdepth 1 -mindepth 1 -type d )

STOPIFYMK = stopify-Makefile
RUNNERMK = runner-Makefile

# Compile all JS source files with stopify
# Name of all the stopify directories
STOPIFY_DIRS := $(foreach tr,$(TRANSFORMS), \
							   $(foreach d, $(DIRS), $d/js-build/$(tr)))

.PHONY: all build clean run
all: $(STOPIFY_DIRS)

# Compile all source language programs to javascript.
BUILD := $(DIRS:%=%/js-build)
%/js-build: %
	$(MAKE) -C $<

# Name of all directories to be built wiht %
TRDIR := $(foreach tr, $(TRANSFORMS), %/js-build/$(tr))

$(TRDIR): %/js-build/stopify-Makefile %/js-build/transform.mk
	$(MAKE) -C $*/js-build -f $(STOPIFYMK)

# Rules for running the benchmarking harness.
RUNFILES := runner-Makefile engines.mk transform.mk
RUNDEP := $(foreach b, $(BUILD), $(foreach r, $(RUNFILES), $b/$r))

run: all $(RUNDEP)
	$(foreach b, $(BUILD), $(MAKE) -C $b -f $(RUNNERMK); )

%/js-build/stopify-Makefile : ./stopify-Makefile %/js-build/transform.mk | %/js-build
	cp $(STOPIFYMK) $@;

%/js-build/transform.mk: ./transform.mk | %/js-build
	cp ./transform.mk $@

%/js-build/engines.mk: ./engines.mk | %/js-build
	cp ./engines.mk $@

%/js-build/plot-helpers.rkt: ./plot-helpers.rkt | %/js-build
	cp ./plot-helpers.rkt $@

%/js-build/compare-transform.rkt: ./compare-transforms.rkt | %/js-build
	cp ./compare-transforms.rkt $@

%/js-build/plot-transform.rkt: ./plot-transform.rkt %/js-build/plot-helpers.rkt | %/js-build
	cp ./plot-transform.rkt $@

%/js-build/runner-Makefile: runner-Makefile %/js-build/engines.mk \
	%/js-build transform.mk %/js-build/plot-helpers.rkt \
	%/js-build/plot-transform.rkt %/js-build/compare-transform.rkt \
	| %/js-build
	cp $(RUNNERMK) $@;

# Rules for cleanup
clean:
	$(foreach d, $(DIRS), $(MAKE) -C $d clean; )

# Rule to debug variables.
print-%  : ; @echo $* = $($*)
