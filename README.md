catcorr.js
==========

So, you've designed the perfect survey. You're really going to be able
to quantify exactly what types of people responded this time, aren't
you? Oh yeah, you've got this whole thing figured out: "I'm just going
to cluster those little buggers and this will all make so much more
sense."

And then you try to
[cluster them into groups](http://en.wikipedia.org/wiki/Cluster_analysis).

And you discover, yet again, that there aren't any useful or
meaningful groups. Sad times.

Enter catcorr.js --- short for _cat_egorical _corr_elation --- which
makes it easy to visualize relationships between categorical variables
(*e.g.*, results from a survey). The goal of this tool is not to
identify a finite number of groups of people that summarize your
population as a whole. Rather, the goal of catcorr.js is to make it
possible to quickly visualize the actual data to generate hypotheses
and visually evaluate the data in a useful way. Something like this:

XXXX EMBED SCREENCAST VIDEO HERE

Usage
-----

catcorr.js is built on top of [d3.js](d3js.org) and
[crossfilter.js](http://square.github.io/crossfilter/). The quick way
to get started is to

1. *Setup the html*. Insert a `div` into the body of your webpage and
   be sure to include the d3.js and crossfilter.js dependencies

    ```html
    <div id="example"></div>
    <script src="d3.min.js"></script>
    <script src="crossfilter.min.js"></script>
    ```

2. *Format the json*. Compile your data into a json that holds the
    questions (*e.g.*, the dimensions of your classification) and the
    responses from all of the respondents:

	```javascript
	var data = {
	  questions: [
		{number: 1, type: "outcome", text: "Which came first?", choices: ["chicken", "egg"]},
		{number: 2, type: "outcome", text: "How tall are you?", choices: ["short", "tall"]},
		{number: 3, type: "demographic", text: "Gender", choices: ["male", "female"]},
		{number: 4, type: "demographic", text: "Genus", choices: ["amoeba", "multi-cellular organism"]},
	  ],
	  responses: [
		{1: "chicken", 2: "short", 3: "male", 4: "amoeba"},
		{1: "egg", 2: "tall", 3: "male", 4: "multi-cellular organism"},
		{1: "egg", 2: "tall", 3: "female", 4: "multi-cellular organism"},
		{1: "chicken", 2: "tall", 3: "female", 4: "multi-cellular organism"},
	    // ...
	  ]
	}
	```

3. *catcorr time*. 

	```javascript
	var cc = catcorr("#example", data);
	```

There is also a
[working example](https://github.com/deanmalmgren/catcorrjs/blob/master/example/index.html). To
view it, clone this repository, run `make`, and then open
`example/index.html` in your browser.

