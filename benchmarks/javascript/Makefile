CC = cp
BDIR=./benchmark-files
SRCS = $(wildcard $(BDIR)/*.js)
OBJS = $(patsubst $(BDIR)/%,js-build/%,$(SRCS))

all: $(OBJS)

# Compile all scala programs to JS.
js-build/%.js: $(BDIR)/%.js | js-build
	$(CC) $^ $@

js-build:
	mkdir -p js-build

.PHONY: clean
clean:
	rm -rf js-build

# Rule to debug variables.
print-%  : ; @echo $* = $($*)
