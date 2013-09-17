(function (exports) {
    catcorr.version = "0.1.0";

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
	var bar_gap = 2;
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
        d3.select(div_id)
            .append("aside")
            .attr("id", "totals")
            .attr("class", "catcorr")
            .html("you've selected <br/> <span id='active'>-</span> "+
		  "<span>/</span> <span id='total'>-</span> <br/> respondents.")


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
            brushDirty,
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
                            .attr("height", height);
                        gBrush.selectAll(".resize")
                            .append("path")
                            .attr("d", resizePath);
                    }

                    // Only redraw the brush if set externally.
                    if (brushDirty) {
                        brushDirty = false;
                        g.selectAll(".brush")
                            .call(brush);
                        div.select(".title a")
                            .style("display", brush.empty() ? "none" : null);
                        if (brush.empty()) {
                            g.selectAll("#clip-" + id + " rect")
                                .attr("x", 0)
                                .attr("width", width);
                        } else {
                            var extent = brush.extent();
                            g.selectAll("#clip-" + id + " rect")
                                .attr("x", x(extent[0]))
                                .attr("width", x(extent[1]) - x(extent[0]));
                        }
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
                    g.selectAll(".all_proportion.all_bar")
                        .attr("d", proportionPath);

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

		// given that n of the N respondents have been
		// selected, calculate the confidence intervals of the
		// proportion of those n people in each bin.
		function simulate(groups) {
		    var N = d3.sum(group.__all__);
		    var n = all.value();

		    // create an array for bisection for fast
		    // implementation where the array p contains the
		    // cumulative probability of choosing this
		    // element. alpha is the hyperparameter of the
		    // categorical distribution
		    // (http://en.wikipedia.org/wiki/Categorical_distribution)
		    var p=[0], alpha=1, pp;
		    group.__all__.forEach(function (x) {
			pp = (x + alpha)/(N + alpha*group.__all__.length)
			p.push(p[p.length-1]+pp);
		    });
		    p.splice(0,1);
		    p[p.length-1] = 1; // make sure last element is 1

		    // run 1000 simulations to see where these n
		    // responses would likely fall
		    var a, b, trial, x, results=[];
		    for (a=0;a<250;a++) {
			trial = {};
			p.forEach(function (dummy, k) {
			    trial[k] = 0;
			});
			for(b=0;b<n;b++) {
			    trial[d3.bisect(p, Math.random())] += 1;
			}
			results.push(trial);
		    }

		    // calculate the confidence interval for each
		    // grouping
		    var confidence_intervals = [], lwr, upr;
		    p.forEach(function (q, k) {
			var all_ks = [];
			results.forEach(function (trial) {
			    all_ks.push(trial[k]);
			});
			all_ks.sort(d3.ascending);
			lwr = all_ks[Math.floor(all_ks.length*(1-0.95)/2)];
			upr = all_ks[Math.floor(all_ks.length*(1-(1-0.95)/2))];
			confidence_intervals.push([lwr, upr]);
		    });

		    return confidence_intervals;
		}

		function asterisk(xc) {
		    var theta=2*Math.PI/5;
		    var theta0=Math.PI/2;
		    var r=margin.top/4;
		    var o=r;
		    return "M"+xc+","+(-o-r)+
			"L"+(-r*Math.cos(0*theta+theta0)+xc)+","+(-r*Math.sin(0*theta+theta0)-o-r)+
"M"+xc+","+(-o-r)+
			"L"+(-r*Math.cos(1*theta+theta0)+xc)+","+(-r*Math.sin(1*theta+theta0)-o-r)+
			"M"+xc+","+(-o-r)+
			"L"+(-r*Math.cos(2*theta+theta0)+xc)+","+(-r*Math.sin(2*theta+theta0)-o-r)+
			"M"+xc+","+(-o-r)+
			"L"+(-r*Math.cos(3*theta+theta0)+xc)+","+(-r*Math.sin(3*theta+theta0)-o-r)+
			"M"+xc+","+(-o-r)+
			"L"+(-r*Math.cos(4*theta+theta0)+xc)+","+(-r*Math.sin(4*theta+theta0)-o-r);
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
			var confidence_intervals = simulate(groups);
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
                brushDirty = true;
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