# Makefile for web developing

HTMLS=$(patsubst jade/%.jade,%.html,$(wildcard jade/*.jade))
STYLESHEETS=$(patsubst sass/%.sass,css/%.css,$(wildcard sass/[^_]*.sass))
JAVASCRIPTS=$(patsubst coffee/%.coffee,js/%.js,$(wildcard coffee/*.coffee))

all: $(HTMLS) $(STYLESHEETS) $(JAVASCRIPTS)

clean:
	rm -f $(HTMLS) $(STYLESHEETS) $(JAVASCRIPTS)

%.html: jade/%.jade
	jade -P < $< > $@

css/%.css: sass/%.sass config.rb $(wildcard sass/_*.sass)
	compass compile $<

js/%.js: coffee/%.coffee
	coffee -o $(dir $@) $<

.PHONY: all clean
