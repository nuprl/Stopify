# Get all source language directories.
DIRS = $(shell find . -type d -maxdepth 1 -mindepth 1)
BUILD = $(DIRS:%=%/js-build)
CLEANDIRS = $(DIRS:%=%-clean)
STOPIFYMK = "./stopify-Makefile"

all: build stopify

build: $(BUILD) $(BUILD:%=%/stopify-makefile)
# Compile all source language programs to javascript.
%/js-build: %
	$(MAKE) --ignore-errors -C $^

# Add makefiles for compile file using stopify
%/js-build/stopify-makefile: %/js-build/
	cp $(STOPIFYMK) $^

# Compile all JS source files with stopify
stopify: $(BUILD:%=%/stopify)
%/js-build/stopify:  %/js-build/stopify-makefile
	$(MAKE) -C $(patsubst %/stopify, %, $@) -f $(STOPIFYMK)

# Rules for cleanup
clean: $(CLEANDIRS)
%-clean: %
	$(MAKE) -C $^ clean

# Rule to debug variables.
print-%  : ; @echo $* = $($*)
