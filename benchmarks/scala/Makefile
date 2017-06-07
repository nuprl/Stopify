CC = ./compile.sh
BDIR=./benchmark-files
SRCS = $(wildcard $(BDIR)/*.scala)
OBJS = $(patsubst $(BDIR)/%.scala,js-build/%.js,$(SRCS))

all: dir $(OBJS)

# Compile all scala programs to JS.
%.js:
	$(CC) $(patsubst js-build/%.js,$(BDIR)/%.scala, $@) > $@

dir:
	mkdir -p js-build

.PHONY: clean
clean:
	rm -rf js-build

# Rule to debug variables.
print-%  : ; @echo $* = $($*)
