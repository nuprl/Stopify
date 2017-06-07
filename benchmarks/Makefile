# Get all source language directories.
DIRS = $(shell find . -type d -maxdepth 1 -mindepth 1)
BUILD = $(DIRS:%=%/js-build)
CLEANDIRS = $(DIRS:%=%-clean)
CPSFILE = "./cps-Makefile"

all: build cps

build: $(BUILD) $(BUILD:%=%/cps-makefile)

# Compile all source language programs to javascript.
%/js-build: %
	$(MAKE) --ignore-errors -C $^

# Add makefiles for compile file using stopify
%/js-build/cps-makefile: %/js-build/
	cp $(CPSFILE) $^

# Compile all source languages using cps
cps: $(BUILD:%=%/cps)

# Run cps-Makefile.
%/js-build/cps:  %/js-build/cps-makefile
	$(MAKE) -C $(patsubst %/cps, %, $@) -f cps-Makefile

# Rules for cleanup
clean: $(CLEANDIRS)
%-clean: %
	$(MAKE) -C $^ clean

# Rule to debug variables.
print-%  : ; @echo $* = $($*)
