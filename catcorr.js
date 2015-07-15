(function (exports) {
    catcorr.version = "0.2.0";

    function get_matching_responses(responses) {
	// this is the intersection of all people matching responses
	// across all selected dimensions
	var result = responses;
	var selected_questions = questions
	    .filter(function (q) {return q.has_selection()});
	selected_questions.forEach(function (q, i) {
	    result = result.filter(function (response) {
		return q.response_matches_selected_choices(response);
	    })
	})
	return result;
    }

    function init_groups(questions, responses) {
	var groups = questions
	    .map(function(question){
		var answers = responses
		    .map(function(r) { return r[question.number]; });
		var counts = multi_count(answers);
		return make_group(counts, question);
	    });

	groups.update = function (responses) {
 	    var matching_responses = get_matching_responses(responses);


	    groups.forEach(function(group){
		var answers = matching_responses
		    .map(function(r){ 
			return r[group.question.number];})
		var counts = multi_count(answers);
		group.all.forEach(function (o, k) {
		    o.value = counts[k] || 0;
		})
	    });
	}
	return groups
    }

    function histogram_matching_responses(responses) {
	// A
	// get_histograms function which takes responses and generates a
	// object question.number: its histogram for those
	// responses.
	// question.number : [{key:choice, value: count},...]
	// question.number : [{choice:"Male", count:20},...]
	
	// to initialize catcorr, we'll call
	// get_histograms(everybody), In particular,
	// get_matching_responses(responses) should just work when no
	// dimensions are selected.
 	var matching_responses = get_matching_responses(responses);
	var groups = questions
	    .map(function(question){
		var answers = matching_responses
		    .map(function(r) { return r[question.number]; });
		var counts = multi_count(answers);
		return make_group(counts, question);
	    });
	return groups;
    }

    function make_group(counts, question){
	var out = {"counts":counts};
	var to_object = function(v,k){return {key:+k,
					      value:v};}
	out.all = _.map(out.counts, to_object);
	out.__all__ = question.__all__;
	out.top = function(){ 
	    return d3.max(_.values(this.counts));
	    // return the top response
	}
	out.all.value = function(){
	    return d3.sum(out.all, function(o){return o.value});
	}
	out.question = question;
	return out;
    }
    
    function has_selection(){
	// question needs to bind has_selection method
	// question needs to maintain state of whether or not it has a
	// selection on it
	// question needs to remember which choices have been selected
	return this.selected_choices.length > 0;
    }

    function response_matches_selected_choices(response){
	// question needs response_matches_selected_choices method which
	// looks into that response and sees if it has choices that match
	// this question's selected choices.
	var person_choices = response[this.number];
	var selected = this.selected_choices;
	if (typeof(person_choices) === "number") {
	    return _.contains(selected, 
			      person_choices);
	} else {
	    return _.any(person_choices, 
			 function (person_choice){
			     return _.contains(selected,
					       person_choice)
			 });
	}
    }

    exports.catcorr = catcorr;
    function catcorr(div_id, data, callback) {
	// callback is called after charts are rendered.


	// #########################
	// debugging --global
	questions = data.questions;
        responses = data.responses;

        // create the label2index lookup for quickly calculating the
        // x-coordinate on survey answers

	// debugging so this is global
        label2index = {};

        questions.forEach(function (q) {
	    // add additional functions questions here
	    q.has_selection = has_selection;
	    q.selected_choices = [];
	    q.response_matches_selected_choices = response_matches_selected_choices;
            label2index[q.number] = {};
            q.choices.forEach(function (choice, j) {
                label2index[q.number][choice] = j;
            });
        });

        // re-cast non-numeric answers into the corresponding number in
        // label2index so that this whole crossfilter bizness works

	// NOTE: This changes the underlying data passed in. In
	// particular, if some choices are missing from questions,
	// then those values in responses will get erased.
        responses.forEach(function (r) {
            questions.forEach(function (q) {
                var choice = r[q.number];
		if (typeof(choice) === "string"){
		    r[q.number] = label2index[q.number][choice];
		} else if (choice) {
		    r[q.number] = choice.map(function(c){
			return label2index[q.number][c];});
		}
            });
        });

        // add the questions text
        questions.forEach(function (q) {
            d3.select(div_id)
                .append("div")
                .attr("id", q.number+"-chart")
                .attr("class", "catcorr chart " + q.type)
                .append("div")
                .attr("class", "title")
                .text(q.number+'. '+q.text);
        });

        // Various formatters.
        var formatNumber = d3.format(",d");

	// q = data.questions[32];
	// respondents = crossfilter(data.responses);
	// respondents.groupAll();
	// respondents.dimension(function(d){return d[q.number]}).group().all()

        // Create the crossfilter for the relevant dimensions and groups.
        // var respondents = crossfilter(responses),
        // all = respondents.groupAll();
        catcorr.groups = [];

        questions.forEach(function (q, i) {
	    // console.log(i);
	    // responses_to_that_question = respondents.dimension(function(d){
	    // 	return d[q.number]});

	    // SWITCH
            // dimensions.push(responses_to_that_question);
            // groups.push(dimensions[i].group());

	    var answers = responses.map(function(r){
		return r[q.number]});
	    var counts = multi_count(answers);
	    q.__all__ = _.values(counts);
        });
	// SWITCH
	// make the groups for the first time
	catcorr.groups = init_groups(questions, responses);
	catcorr.groups.update(responses)
	

        // record the total number of respondents in each group. this is
        // used later to correctly figure out the proportionPath lines
        // below

	// SWITCH
        // groups.forEach(function (g) {
        //     g.__all__ = g.all().map(function (o) {return o.value});
        // });

        // create a chart for each dimension
        var xscales = [], xscale;
	var yscale = d3.scale.linear().range([100,0]);
	var tooltips = [], tooltip;
        var charts = [], chart;
        var bar_width = 80;
	var bar_gap = 3;
        questions.forEach(function (q, i) {

            // get the labels for this axis
            var labels = {};
            q.choices.forEach(function (choice, c) {
                labels[c] = choice;
            });

	    // initialize the tooltips if d3.tip is included
	    if (d3.tip) {
		tooltip = d3.tip()
		    .attr('class', 'd3-tip')
		    .direction('s')
		    .html(function (d) {return "awesome " + d});
		tooltips.push(tooltip);
	    }

            // create the scale
            var a=0, b=q.choices.length-1;
            xscale = d3.scale.linear()
                .domain([-0.5, b+0.5])
                .rangeRound([0, bar_width*((b-a)+1)])
            xscale.labels = labels;
            xscales.push(xscale);

            // update the yscale to have the maximal possible domain
            // so that heights (and areas) on each of the charts mean
            // the same thing

	    // #########################
	    // debugging
	    // console.log(q,i);
	    // #########################

	    yscale.domain([0, d3.max([
		yscale.domain()[1], catcorr.groups[i].top(1) // [0].value
	    ])])

            // create the chart
            chart = barChart(q)
                .group(catcorr.groups[i])
                .x(xscale);
            charts.push(chart);

        });

        // Given our array of charts, which we assume are in the same
        // order as the .chart elements in the DOM, bind the charts to
        // the DOM and render them.  We also listen to the chart's
        // brush events to update the display.
        var chart = d3.selectAll(".catcorr.chart")
            .data(charts)
            .each(function(chart) {
                chart.on("brush", renderAll)
                    .on("brushend", renderAll);
            });

        // add an <aside> element that displays fraction of elements
        // currently selected
        var legend = d3.select(div_id)
            .append("aside")
            .attr("id", "legend")
            .attr("class", "catcorr")
            .html("<div style='clear:both;margin-top:20px'></div>"+
		  "<span id='active'>-</span> "+
		  "<span>/</span> <span id='total'>-</span> <br/> selected respondents");
	var legend_width=200, legend_height=120;
	var legend_svg = legend.insert("svg", "div")
            .attr("width", legend_width)
            .attr("height", legend_height)
            .append("g")
            .attr("transform", "translate(0,0)");

	// add a clear div at the bottom as temporary fix for #18
	d3.select(div_id)
	    .append("div")
	    .style("clear", "both");

	// draw the bars on the legend
	legend_svg.selectAll(".bar")
            .data(["all_background", "background", "foreground",
                   "all_proportion"])
            .enter().append("path")
            .attr("class", function(d, i) {
                if (i===0){
                    return "catcorr "+d+" all_bar outcome";
                }
                else if(i===3) {
                    return "catcorr "+d+" all_bar outcome";
                }
                return "catcorr "+d+" bar outcome";
            });
	legend_svg.select(".all_background.all_bar")
	    .attr("d", ["M",
			(legend_width-(bar_width-2*bar_gap))/2,
			",",10,"v",100,"h",bar_width-2*bar_gap,
			"v",-100].join(""));
	legend_svg.select(".foreground.bar")
	    .attr("d", ["M",
			(legend_width-(bar_width-2*bar_gap))/2,
			",",80,"v",30,"h",bar_width-2*bar_gap,
			"v",-30].join(""));
	legend_svg.select(".all_proportion.all_bar")
	    .attr("d", ["M",
			(legend_width-(bar_width-2*bar_gap))/2,
			",",40,"h",bar_width-2*bar_gap, 
			"M", legend_width/2,",",15,"v",44].join(""));

	// display all respondents label
	legend_svg.append("foreignObject")
	    .attr("class", "catcorr legend")
	    .attr("width", (legend_width-bar_width)/2)
	    .attr("height", "3em")
	    .attr("x", legend_width/2+bar_width/2+bar_gap)
	    .attr("y", 0)
	    .text("all respondents");
	legend_svg.append("path")
	    .attr("class", "catcorr legend")
	    .attr("d", ["M",legend_width/2+bar_width/2,",",7,
			"h",-15,"l",-7,",",7].join(""));

	// display selected respondents label
	legend_svg.append("foreignObject")
	    .attr("class", "catcorr legend")
	    .attr("width", (legend_width-bar_width)/2)
	    .attr("height", "3em")
	    .attr("x", legend_width/2+bar_width/2+bar_gap)
	    .attr("y", 106)
	    .text("selected respondents");
	legend_svg.append("path")
	    .attr("class", "catcorr legend")
	    .attr("d", ["M",legend_width/2+bar_width/2,",",113,
			"h",-15,"l",-7,",",-7].join(""));

	// display expected selected respondents label
	legend_svg.append("foreignObject")
	    .attr("class", "catcorr legend")
	    .attr("width", (legend_width-bar_width)/2)
	    .attr("height", "5em")
	    .attr("x", legend_width/2+bar_width/2+bar_gap)
	    .attr("y", 35)
	    .text("expected number of selected respondents");
	legend_svg.append("path")
	    .attr("class", "catcorr legend")
	    .attr("d", ["M",legend_width/2+bar_width/2,",",47,
			"h",-15,"l",-7,",",-7].join(""));

	// display variation in expected selected respondents label
	legend_svg.append("foreignObject")
	    .attr("class", "catcorr legend right")
	    .attr("width", (legend_width-bar_width)/2-20)
	    .attr("height", "5em")
	    .attr("x", 0)
	    .attr("y", 12)
	    .attr("text-align", "right")
	    .text("variation in expected number of selected respondents");
	legend_svg.append("path")
	    .attr("class", "catcorr legend")
	    .attr("d", ["M",legend_width/2-bar_width/2-18,",",36,
			"h",15,"v",22,"h",42,
			"M",legend_width/2-bar_width/2-3,",",36,
			"v",-22,"h",42].join(""));

	// if there are more than one type of question, render a
	// legend for the colors
	var question_types = d3.set();
	questions.forEach(function (q) {
	    question_types.add(q.type);
	});
	question_types = question_types.values();
	if (question_types.length>1) {
	    var swatch_w = 20, swatch_gap=5;
	    legend.insert("div", "svg")
		.style("clear", "both")
	    var color_legend_svg = legend.insert("svg", "div")
		.attr("width", legend_width)
		.attr("height", 
		      question_types.length*(swatch_w+swatch_gap)+swatch_gap)
		.style("margin-bottom", 20)
		.append("g")
		.attr("transform", "translate(0,0)");
	    
	    color_legend_svg.selectAll()
		.data(question_types).enter()
		.append("path")
		.attr("class", function (d) {
		    return "catcorr foreground bar "+d
		})
		.attr("d", function (d, i) {
		    return ["M", swatch_w/2, ",",
			    swatch_gap+i*(swatch_w+swatch_gap),
			    "h", swatch_w, "v", swatch_w, "h", -swatch_w]
			.join("")
		})
	    color_legend_svg.selectAll()
		.data(question_types).enter()
		.append("text")
		.attr("class", "catcorr legend")
		.attr("x", swatch_w*2 + bar_gap)
		.attr("y", function (d, i) { 
		    return swatch_gap + i*(swatch_w+swatch_gap) + swatch_w/2
		})
		.attr("dy", "0.35em")
		.text(function (d) { return d});
	}

        // Render the total.
        d3.selectAll("aside.catcorr #total")
            .text(formatNumber(responses.length));

        renderAll();

	if (callback){
	    callback();
	}


        // Renders the specified chart or list.
        function render(method) {
            d3.select(this).call(method);
        }

        // Whenever the brush moves, re-rendering everything.
        function renderAll() {
            chart.each(render);
            d3.select("aside.catcorr #active")
		.text(formatNumber(catcorr.groups[0].all.value()));
        }

        window.filter = function(filters) {
            filters.forEach(function(d, i) { charts[i].filter(d); });
            renderAll();
        };

        window.reset = function(i) {
            charts[i].filter(null);
            renderAll();
        };

        function barChart(question) {
            if (!barChart.id) barChart.id = 0;

            var margin = {top: 10, right: 10, bottom: 20, left: 10},
            x,
            y = yscale,
	    tooltip = tooltips[barChart.id],
            id = barChart.id++,
            axis = d3.svg.axis().orient("bottom").tickSize(6,0,0),
            brush = d3.svg.brush(),
            dimension,
            group,
            round;

	    the_brush = brush;

            function chart(div) {
                var width = d3.max(x.range()),
                height = d3.max(y.range());

                // create ticks at these particular values
                axis.tickValues(d3.range(0,d3.keys(x.labels).length));

                div.each(function() {
                    var div = d3.select(this),
                    g = div.select("g");

                    // Create the skeletal chart.
                    if (g.empty()) {
                        div.select(".title").append("a")
                            .attr("href", "javascript:reset(" + id + ")")
                            .attr("class", "catcorr reset")
                            .text("reset")
                            .style("display", "none");

                        g = div.append("svg")
                            .attr("width", width + margin.left + margin.right)
                            .attr("height", height + margin.top + margin.bottom)
                            .append("g")
                            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			// create a hatching pattern for displaying the brush
			// http://stackoverflow.com/a/14500054/564709
			var pattern = div.select("svg")
			    .insert("pattern", "g")
			    .attr("id", "diagonalHatch")
			    .attr("patternUnits", "userSpaceOnUse")
			    .attr("width", 10)
			    .attr("height", 10);
			pattern.append("path")
			    .attr("class", "catcorr hatching")
			    .attr("d", "M-1,1l2,-2M0,10l10,-10M9,11l2,-2");

			// invoke tooltip for this visualization
			if (tooltip) {
			    g.call(tooltip);
			}

                        g.append("clipPath")
                            .attr("id", "clip-" + id)
                            .append("rect")
                            .attr("width", width)
                            .attr("height", height);

                        g.selectAll(".bar")
                            .data(["all_background", "background", "foreground",
                                   "all_proportion"])
                            .enter().append("path")
                            .attr("class", function(d, i) {
                                if (i===0){
                                    return "catcorr "+d+" all_bar "+question.type;
                                }
                                else if(i===3) {
                                    return "catcorr "+d+" all_bar "+question.type;
                                }
                                return "catcorr "+d+" bar "+question.type;
                            })
                            .datum(catcorr.groups[id].all);

                        g.selectAll(".foreground.bar")
                            .attr("clip-path", "url(#clip-" + id + ")");

                        g.append("g")
                            .attr("class", "catcorr axis")
                            .attr("transform", "translate(0," + height + ")")
                            .call(axis);

                        // manipulate the axis label text
                        var labels = g.selectAll("g.axis text")
                            .text(function (d) {
				var n = 20;
				var s = x.labels[d];
				if (s===undefined) {
				    return '';
				}
				else if (s.length > n) {
				    var parts = s.substring(0,n-3).split(" ");
				    s = parts.slice(0,parts.length-1).join(" ");
				    s += "...";
				}
				return s;
			    });
			if (tooltip) {
			    tooltip.html(function (d) {
				return x.labels[d];
			    });
			    labels.on("mouseover", tooltip.show)
				.on("mouseout", tooltip.hide);
			}

                        // Initialize the brush component with pretty
                        // resize handles.
                        var gBrush = g.append("g")
                            .attr("class", "catcorr brush")
                            .call(brush);
                        gBrush.selectAll("rect")
			    .attr("fill", "url(#diagonalHatch)")
                            .attr("height", height);
                        gBrush.selectAll(".resize")
                            .append("path")
                            .attr("d", resizePath);
                    }

                    // this is what actually uses the group data to set
                    // the path. good.
                    g.selectAll(".bar").attr("d", barPath);

                    // only render the .all_bar data once at the beginning
                    g.selectAll(".all_background.all_bar")
                        .attr("d", function (groups, i) {
                            var v = d3.select(this).attr("d");
                            if (v===null) {
                                return barPath(groups, i);
                            }
                            return v;
                        });

                    // render the .all_proportion.all_bar to show the
                    // proportion of selected responses that fall in
                    // this group
		    if (brush.empty()) {
			g.selectAll(".all_proportion.all_bar")
                            .attr("d", proportionPath);
		    }

		    // make sure the asterisk's don't exist on
		    // dimensions that are selected
		    else {
			g.selectAll(".asterisk").remove();
			g.selectAll(".fa").remove();
		    }
                });

                function barPath(groups) {
                    var path = [],
                    i = -1,
                    n = groups.length,
                    d;
                    while (++i < n) {
                        d = groups[i];
                        path.push("M", x(d.key-0.5)+bar_gap, ",",
                                  height, "V", y(d.value), "h",bar_width-2*bar_gap,
                                  "V", height);
                    }
                    return path.join("");
                }

		function calc_confidence_intervals(n_selected) {
		    // this is the number of total number of people
		    var N = responses.length;
		    var k = get_k(responses, group)

		    // create an array of the probabilities for each
		    // group. alpha is the hyperparameter of the
		    // categorical distribution
		    // http://en.wikipedia.org/wiki/Categorical_distribution
		    var p = group.__all__.map(function (x) {
			return calc_p(x, N, k);
		    });
		    var confidence_intervals, bound;
		    var get_bound = function(pp){
			return 1.96*Math.sqrt((pp*(1-pp))/n_selected);
		    }

		    confidence_intervals = p.map(function(pp,i){
			// TODO Think carefully about whether this
			// should be N or n here
			return [
			    n_selected * Math.max(pp - get_bound(pp), 0), 
			    n_selected * Math.min(pp + get_bound(pp), 1)
			];})


		    // debugging probabilities...
		    var pizza = catcorr.debug[group.question.number];
		    if (!pizza){
		    	catcorr.debug[group.question.number] = {};
		    	pizza = catcorr.debug[group.question.number];
		    }
		    pizza["conf"] = {"N":N, "k":k, "p":p,
		    		     "confidence":confidence_intervals};

		    return confidence_intervals;
		}

		function backer_box(xc) {
		    return "M"+(xc-bar_width/2)+","+(-margin.top)+
			"h"+bar_width+
			"v"+(margin.top+y.range()+margin.bottom)+
			"h"+(-bar_width)+
			"Z";
		}

                function proportionPath(answers) {
		    // remove all significance from before
		    var svg = d3.select(this.parentNode);
		    svg.selectAll(".asterisk").remove();
		    svg.selectAll(".fa").remove();

                    var path = [],
                    i = -1,
                    n_answers = answers.length,
                    answer, prob, expected, lwr, upr,
                    n_selected = catcorr.groups[0].all.value(),
		    n_responses = responses.length,
		    n_choices = group.__all__.length,
		    confidence_intervals;

		    fuck = answers;
		    shit = group;

		    if (n_selected!=responses.length) {
			var confidence_intervals = calc_confidence_intervals(n_selected)
		    }

                    while (++i < n_answers) {
                        answer = answers[i];
			n_choices = get_k(responses, group);
                        prob = calc_p(group.__all__[i], n_responses, 
				      n_choices);
			expected = n_selected*prob;
			save_stuff(group, expected, confidence_intervals, 
				   n_selected, prob, answers, i);

                        path.push("M", x(answer.key-0.5)+bar_gap, ",", 
				  y(expected), 
				  "h", bar_width-2*bar_gap);
			if (confidence_intervals) {
			    lwr = confidence_intervals[i][0];
			    upr = confidence_intervals[i][1];
			    path.push("M", x(answer.key), ",", y(lwr), 
				      "v", y(upr)-y(lwr));

			    // draw an asterisk above this bar
			    if (answer.value < lwr || upr < answer.value) {
				// font-awesome arrow-up: "\f062"
				// arrow-down: "\f063"
				// trick from http://stackoverflow.com/questions/14984007/how-do-i-include-a-font-awesome-icon-in-my-svg

				var hi_lo = "\uf062" // high
				if (answer.value < lwr) {
				    hi_lo = "\uf063" // lo;
				}
				svg.insert("path", "path.catcorr.all_bar")
				    .attr("class", "catcorr asterisk")
				    .attr("d", backer_box(x(answer.key)));
				svg.append("text")
				    .attr("font-size","70px")
				    .attr("x",x(answer.key)-margin.left)
				    .attr("y",margin.top+5)
				    .attr("class", "fa")
				    .text(hi_lo);
			    }
			}
                    }
                    return path.join("");
                }

                function resizePath(d) {
                    var e = +(d == "e"),
                    x = e ? 1 : -1,
                    y = height / 3;
                    return "M" + (.5 * x) + "," + y
                        + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6)
                        + "V" + (2 * y - 6)
                        + "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y)
                        + "Z"
                        + "M" + (2.5 * x) + "," + (y + 8)
                        + "V" + (2 * y - 8)
                        + "M" + (4.5 * x) + "," + (y + 8)
                        + "V" + (2 * y - 8);
                }
            }

            brush.on("brushstart.chart", function() {
                var div = d3.select(this.parentNode.parentNode.parentNode);
                div.select(".title a").style("display", null);
            });

            brush.on("brush.chart", function() {
                var g = d3.select(this.parentNode),
                extent = brush.extent();
                if (round) {
                    g.select(".brush")
                        .call(brush.extent(extent = extent.map(round)))
                        .selectAll(".resize")
                        .style("display", null);
                }
                g.select("#clip-" + id + " rect")
                    .attr("x", x(extent[0]))
                    .attr("width", x(extent[1]) - x(extent[0]));
		
		// this is where we tell a question that it has some
		// selected options
		questions[id].selected_choices = extent_to_range(extent);

		// remake the groups with this selection
		catcorr.groups.update(responses)
		// SWITCH
                // dimension.filterRange(extent);
            });

            brush.on("brushend.chart", function() {
                if (brush.empty()) {
                    var div = d3.select(this.parentNode
					.parentNode
					.parentNode);
                    div.select(".title a").style("display", "none");
                    div.select("#clip-" + id + " rect")
                        .attr("x", null)
                        .attr("width", "100%");

		    // this is where we tell a question that it does
		    // not have any selections
		    questions[id].selected_choices = [];

		    // remake all the groups with these selections
		    catcorr.groups.update(responses)
		    // SWITCH
                    // dimension.filterAll();
                }

		// this is for animating the brush selection
		// inspiration from http://bl.ocks.org/mbostock/6232537
		else {
		    if (d3.version < "3.3") return;

		    // this is needed to make sure this doesn't
		    // continuously cascade
		    if (!d3.event.sourceEvent) return; 

		    // transition the brush to a nice place
		    var extent0 = brush.extent();
		    var extent1 = extent0.map(function (v) 
					      {return d3.round(v+0.5)-0.5});
		    
		    // if empty when rounded, use floor & ceil instead
		    if (extent1[0] >= extent1[1]) {
		    	extent1[0] = Math.floor(extent0[0]+0.5)-0.5;
		    	extent1[1] = Math.ceil(extent0[1]+0.5)-0.5;
		    }
		    
		    d3.select(this).transition()
		    	.call(brush.extent(extent1))
		    	.call(brush.event);
		}


            });

            // jasondavies fanciness. binding methods to this function
            chart.margin = function(_) {
                if (!arguments.length) return margin;
                margin = _;
                return chart;
            };
            chart.x = function(_) {
                if (!arguments.length) return x;
                x = _;
                axis.scale(x);
                brush.x(x);
                return chart;
            };
            chart.y = function(_) {
                if (!arguments.length) return y;
                y = _;
                return chart;
            };
            chart.dimension = function(_) {
                if (!arguments.length) return dimension;
                dimension = _;
                return chart;
            };
            chart.filter = function(_) {
                if (_) {
                    brush.extent(_);
                    dimension.filterRange(_);
                } else {
                    brush.clear();
                    dimension.filterAll();
                }
                return chart;
            };
            chart.group = function(_) {
                if (!arguments.length) return group;
                group = _;
                return chart;
            };
            chart.round = function(_) {
                if (!arguments.length) return round;
                round = _;
                return chart;
            };

            return d3.rebind(chart, brush, "on");
        }
    };
})(this)

function extent_to_range(extent){
    // takes something like [-.5, 2.5] --> [0,1,2]
    var a = extent[0] + .5 , b = extent[1];
    return _.range(a, b)
}

function ravel(iterables){
    var out = [];
    iterables.forEach(
	function(iterable){
	    iterable.forEach(
		function(thing){ out.push(thing) })});
    return out;
}

function multi_count(answers){
    // counts all the singletons in a list of lists or in a list
    if (typeof(answers[0]) === "object"){
	// answers is a list of lists so ravel it into a long list of singletons
	answers = ravel(answers);
    }
    // count singletons
    return _.countBy(answers);
}

function get_k(responses,group){
    var k = group.__all__.length;
    if (typeof(responses[0][group.question.number])==="object"){
    	k = 2;
    }
    return k;
}

// previous versions simulated a random process 250
// times to estimate the 95% confidence
// intervals. This was all well and good, but the
// simulations were not exact and caused the interface
// to flicker (which is pretty confusing for
// users). This approach uses an approximation to
// estimate the 95% confidence interval, but because
// it is an exact solution it avoids the flickering
// problem
// http://stats.stackexchange.com/a/19142/31771
function calc_p(n_people_who_chose_this, 
		n_total_responses, 
		n_choices) {
    // in multichoice case, n_total_responses is
    // really the number of total checked boxes. We
    // probably care more about number of people who
    // chose this vs people who didnt -- which in the
    // multichoice case is != n_total_responses.
    
    var pseudocount = 1;
    return ((n_people_who_chose_this + pseudocount) / 
	    (n_total_responses + pseudocount*n_choices));
}

catcorr.debug = {}
function save_stuff(group, expected, confidence_intervals, N, p, answers, i){
    var number = group.question.number;
    if (confidence_intervals){
	var c = confidence_intervals[i];
	catcorr.debug[number][i] = [expected, c, N, p, group, answers, i];
    }
}

function assert(){
    // select "male"
    var germany = catcorr.debug.S2[0];
    var expected = germany[0]
    var bounds = germany[1]
    console.assert(Math.abs((bounds[0] - 62.78)) < .01)
    console.assert(Math.abs((bounds[1] - 92.71)) < .01)
    console.assert(Math.abs(expected - 77.75)<.01)
}
