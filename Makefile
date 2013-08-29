

all: example

# set things up for the working example
example: example/data.json
example/data.json: example/create_fake_data.py
	python $< > $@
