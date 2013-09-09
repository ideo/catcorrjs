
all: example

# set things up for the working example
example: example/data.json example/d3.min.js example/crossfilter.min.js
example/data.json: example/create_fake_data.py
	python $< > $@
example/d3.min.js:
	curl http://d3js.org/d3.v3.min.js > $@
example/crossfilter.min.js:
	curl https://raw.github.com/square/crossfilter/v1.3.1/crossfilter.min.js > $@
