# Get all source language directories.
DIRS = $(shell find . -type d -maxdepth 1 -mindepth 1)
BUILD = $(DIRS:%=%/js-build)

all: $(BUILD)
	echo $^

%/js-build: %
	cd $^ && $(MAKE);

clean: $(patsubst %, %-clean, $(DIRS))
%-clean: %
	$(MAKE) -C $^ clean

# Rule to debug variables.
print-%  : ; @echo $* = $($*)
