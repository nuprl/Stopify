CC = cp
BDIR=./benchmark-files
SRCS = $(wildcard $(BDIR)/*.js)
OBJS = $(patsubst $(BDIR)/%,js-build/%,$(SRCS))

all: dir $(OBJS)

# Compile all scala programs to JS.
js-build/%.js: $(BDIR)/%.js
	$(CC) $^ $@

dir:
	mkdir -p js-build

.PHONY: clean
clean:
	rm -rf js-build

# Rule to debug variables.
print-%  : ; @echo $* = $($*)
