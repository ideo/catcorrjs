(function (exports) {
    catcorr.version = "0.2.0";

    exports.catcorr = catcorr;
    function catcorr(div_id, data) {
        var questions = data.questions;
        var responses = data.responses;

        // create the label2index lookup for quickly calculating the
        // x-coordinate on survey answers
        var label2index = {};
        questions.forEach(function (q) {
            label2index[q.number] = {};
            q.choices.forEach(function (choice, j) {
                label2index[q.number][choice] = j;
            });
        });

        // re-cast non-numeric answers into the corresponding number in
        // label2index so that this whole crossfilter bizness works
        responses.forEach(function (r) {
            questions.forEach(function (q) {
                r[q.number] = label2index[q.number][r[q.number]];
            });
        });

        // add the questions text
        questions.forEach(function (q) {
            d3.select(div_id)
                .append("div")
                .attr("id", q.number+"-chart")
                .attr("class", "catcorr chart")
                .append("div")
                .attr("class", "title")
                .text(q.number+'. '+q.text);
        });

        // Various formatters.
        var formatNumber = d3.format(",d");

        // Create the crossfilter for the relevant dimensions and groups.
        var respondents = crossfilter(responses),
        all = respondents.groupAll();
        var dimensions = [];
        var groups = [];
        questions.forEach(function (q, i) {
            dimensions.push(respondents.dimension(function(d){return d[q.number]}));
            groups.push(dimensions[i].group());
        });

        // record the total number of respondents in each group. this is
        // used later to correctly figure out the proportionPath lines
        // below
        groups.forEach(function (g) {
            g.__all__ = g.all().map(function (o) {return o.value});
        });

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
	    yscale.domain([0, d3.max([
		yscale.domain()[1], groups[i].top(1)[0].value
	    ])])

            // create the chart
            chart = barChart(q).dimension(dimensions[i])
                .group(groups[i])
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
	var legend_width=300, legend_height=120;
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
	    .attr("d", ["M",(legend_width-(bar_width-2*bar_gap))/2,",",10,"v",100,"h",bar_width-2*bar_gap,"v",-100].join(""));
	legend_svg.select(".foreground.bar")
	    .attr("d", ["M",(legend_width-(bar_width-2*bar_gap))/2,",",80,"v",30,"h",bar_width-2*bar_gap,"v",-30].join(""));
	legend_svg.select(".all_proportion.all_bar")
	    .attr("d", ["M",(legend_width-(bar_width-2*bar_gap))/2,",",40,"h",bar_width-2*bar_gap, "M", legend_width/2,",",15,"v",44].join(""));

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
	    .attr("height", "3em")
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
		.attr("height", question_types.length*(swatch_w+swatch_gap)+swatch_gap)
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
		    return ["M", legend_width/2-swatch_w/2, ",",
			    swatch_gap+i*(swatch_w+swatch_gap),
			    "h", swatch_w, "v", swatch_w, "h", -swatch_w]
			.join("")
		})
	    color_legend_svg.selectAll()
		.data(question_types).enter()
		.append("text")
		.attr("class", "catcorr legend")
		.attr("x", legend_width/2+swatch_w/2 + bar_gap)
		.attr("y", function (d, i) { 
		    return swatch_gap + i*(swatch_w+swatch_gap) + swatch_w/2
		})
		.attr("dy", "0.35em")
		.text(function (d) { return d});
	}

        // Render the total.
        d3.selectAll("aside.catcorr #total")
            .text(formatNumber(respondents.size()));

        renderAll();

        // Renders the specified chart or list.
        function render(method) {
            d3.select(this).call(method);
        }

        // Whenever the brush moves, re-rendering everything.
        function renderAll() {
            chart.each(render);
            d3.select("aside.catcorr #active").text(formatNumber(all.value()));
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
                            .datum(group.all());

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
		function calc_confidence_intervals() {
		    var N = d3.sum(group.__all__);
		    var n = all.value();

		    // create an array of the probabilities for each
		    // group. alpha is the hyperparameter of the
		    // categorical distribution
		    // http://en.wikipedia.org/wiki/Categorical_distribution
		    var p=[], alpha=1;
		    group.__all__.forEach(function (x) {
			p.push((x + alpha)/(N + alpha*group.__all__.length));
		    });

		    var confidence_intervals = [], bound;
		    p.forEach(function (pp) {
			bound = 1.96*Math.sqrt((pp*(1-pp))/n);
			confidence_intervals.push([
			    n * Math.max(pp-bound, 0), 
			    n * Math.min(pp+bound, 1)
			]);
		    });
		    console.log(confidence_intervals);
		    return confidence_intervals;
		}

		function backer_box(xc) {
		    return "M"+(xc-bar_width/2)+","+(-margin.top)+
			"h"+bar_width+
			"v"+(margin.top+y.range()+margin.bottom)+
			"h"+(-bar_width)+
			"Z";
		}

                function proportionPath(groups) {

		    // remove all significance from before
		    var svg=d3.select(this.parentNode);
		    svg.selectAll(".asterisk").remove();

                    var path = [],
                    i = -1,
                    n = groups.length,
                    g, p, lwr, upr,
                    a = all.value(),
		    confidence_intervals;
		    if (a!=responses.length) {
			var confidence_intervals = calc_confidence_intervals()
		    }
                    while (++i < n) {
                        g = groups[i];
                        p = a/responses.length*group.__all__[i];
                        path.push("M", x(g.key-0.5)+bar_gap, ",", y(p), "h", bar_width-2*bar_gap);
			if (confidence_intervals) {
			    lwr = confidence_intervals[i][0];
			    upr = confidence_intervals[i][1];
			    path.push("M", x(g.key), ",", y(lwr), 
				      "v", y(upr)-y(lwr));

			    // draw an asterisk above this bar
			    if (g.value < lwr || upr < g.value) {
				svg.insert("path", "path.catcorr.all_bar")
				    .attr("class", "catcorr asterisk")
				    .attr("d", backer_box(x(g.key)));
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

                dimension.filterRange(extent);
            });

            brush.on("brushend.chart", function() {
                if (brush.empty()) {
                    var div = d3.select(this.parentNode.parentNode.parentNode);
                    div.select(".title a").style("display", "none");
                    div.select("#clip-" + id + " rect")
                        .attr("x", null)
                        .attr("width", "100%");
                    dimension.filterAll();
                }

		// inspiration from http://bl.ocks.org/mbostock/6232537
		else {
		    if (d3.version < "3.3") return;

		    // this is needed to make sure this doesn't
		    // continuously cascade
		    if (!d3.event.sourceEvent) return; 

		    // transition the brush to a nice place
		    var extent0 = brush.extent();
		    var extent1 = extent0.map(function (v) {return d3.round(v+0.5)-0.5});
		    
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
