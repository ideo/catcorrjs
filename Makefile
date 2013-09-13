.PHONY: example all test

all: example catcorr.min.js

test:
	@npm test

# set things up for the working example
example: example/data.json example/d3.min.js example/crossfilter.min.js
example/data.json: example/create_fake_data.py
	python $< > $@
example/d3.min.js:
	curl http://d3js.org/d3.v3.min.js > $@
example/crossfilter.min.js:
	curl https://raw.github.com/square/crossfilter/v1.3.1/crossfilter.min.js > $@

# set up things for compressing
node_modules/uglify-js:
	npm install uglify-js
catcorr.min.js: catcorr.js node_modules/uglify-js 
	@rm -f $@
	node_modules/.bin/uglifyjs $< -c unsafe=true -m -o $@
