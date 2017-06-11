# Get all transforms.
include transform.mk

# Get all source language directories.
DIRS := $(shell find . -maxdepth 1 -mindepth 1 -type d )

RUNNER = runner.sh
STOPIFYMK = stopify-Makefile
RUNNERMK = runner-Makefile
TRANSFORMMK = transform.mk
ENGINEMK = engines.mk

# Compile all JS source files with stopify
# Name of all the stopify directories
STOPIFY_DIRS := $(foreach tr,$(TRANSFORMS), \
							   $(foreach d, $(DIRS), $d/js-build/$(tr)))

.PHONY: all build stopify clean run
all: $(STOPIFY_DIRS)

# Compile all source language programs to javascript.
BUILD := $(DIRS:%=%/js-build)
%/js-build/: %
	$(MAKE) -C $<

# Name of all directories to be built wiht %
TRDIR := $(foreach tr, $(TRANSFORMS), %/js-build/$(tr))

$(TRDIR): %/js-build/stopify-Makefile %/js-build/transform.mk
	$(MAKE) -C $*/js-build -f $(STOPIFYMK)

# Rules for running the benchmarking harness.
RUNFILES := runner.sh runner-Makefile engines.mk transform.mk
RUNDEP := $(foreach b, $(BUILD), $(foreach r, $(RUNFILES), $b/$r))

run: all $(RUNDEP)
	$(foreach b, $(BUILD), $(MAKE) -C $b -f $(RUNNERMK); )

define cp_TEMPLATE
$(1)/js-build/stopify-Makefile : ./stopify-Makefile $(1)/js-build/transform.mk | $(1)/js-build/
	cp $(STOPIFYMK) $$@;

$(1)/js-build/transform.mk: ./transform.mk | $(1)/js-build/
	cp $(TRANSFORMMK) $$@

$(1)/js-build/runner.sh: ./runner.sh | $(1)/js-build
	cp $(RUNNER) $$@

$(1)/js-build/engines.mk: ./engines.mk | $(1)/js-build
	cp ./engines.mk $$@

$(1)/js-build/runner-Makefile: runner-Makefile $(1)/js-build/engines.mk $(1)/js-build/ transform.mk | $(1)/js-build/
	cp $(RUNNERMK) $$@;
endef

# Build cp rules for each soure language
$(foreach d, $(DIRS), $(eval $(call cp_TEMPLATE,$d)))

# Rules for cleanup
clean:
	$(foreach d, $(DIRS), $(MAKE) -C $d clean; )

# Rule to debug variables.
print-%  : ; @echo $* = $($*)
