SOURCES = $(wildcard benchmark-files/*)
OUTPUT = $(SOURCES:benchmark-files/%.ml=js-build/%.js)

all: $(OUTPUT)

lib/js/benchmark-files/%.js: benchmark-files/%.ml
	bsb

js-build:
	mkdir -p js-build/

js-build/%.js: lib/js/benchmark-files/%.js js-build
	browserify $< -o $@

clean:
	rm -rf lib js-build
