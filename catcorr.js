(function (exports) {
catcorr.version = "0.1.0";

exports.catcorr = catcorr;
function catcorr(div_id, data) {
    var questions = data.questions;
    var responses = data.responses;

    // create the label2index lookup for quickly calculating the
    // x-coordinate on survey answers
    var label2index = {};
    questions.forEach(function (q, i) {
	label2index[q.number] = {};
	q.choices.forEach(function (choice, j) {
	    label2index[q.number][choice] = j;
	});
    });

    // re-cast non-numeric answers into the corresponding number in
    // label2index so that this whole crossfilter bizness works
    responses.forEach(function (r, i) {
	questions.forEach(function (q, j) {
	    r[q.number] = label2index[q.number][r[q.number]];
	});
    });

    // add the questions text 
    questions.forEach(function (q, i) {
    	d3.select(div_id)
    	    .append("div")
    	    .attr("id", q.number+"-chart")
    	    .attr("class", "chart")
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
    groups.forEach(function (g, i) {
    	g.__all__ = g.all().map(function (o) {return o.value});
    });

    // create a chart for each dimension
    var xscales = [], xscale, yscales = [], yscale;
    var charts = [], chart;
    var bar_width = 80,
    tick_label_width=bar_width,
    tick_label_height=20,
    first_pass;
    questions.forEach(function (q, i) {

    	// get the unique values and then sort based on the index
    	var indices = d3.nest()
    	    .key(function(p) {return p[q.number]})
    	    .entries(responses)
    	    .map(function(p) {return Number(p.key)});

    	// get the labels corresponding with these indices
	var reverse_lookup = label2index[q.number];
    	var labels = {};
    	d3.entries(reverse_lookup).forEach(function (o) {
    	    labels[o.value] = o.key;
    	});

    	// create the scale
    	var a=d3.min(indices), b=d3.max(indices);
    	xscale = d3.scale.linear()
            .domain([a-0.5, b+0.5])
            .rangeRound([0, bar_width*((b-a)+1)])
    	xscale.indices = indices;
    	xscale.labels = labels;
    	xscales.push(xscale);
	
    	// only scale the y-axis once
        yscale = d3.scale.linear()
    	    .range([100, 0])
    	    .domain([0, groups[i].top(1)[0].value]);
    	yscales.push(yscale);

    	// create the chart
    	chart = barChart(q).dimension(dimensions[i])
    	    .group(groups[i])
    	    .x(xscale);
    	charts.push(chart);

    });

    // Given our array of charts, which we assume are in the same order as the
    // .chart elements in the DOM, bind the charts to the DOM and render them.
    // We also listen to the chart's brush events to update the display.
    var chart = d3.selectAll(".chart")
    	.data(charts)
    	.each(function(chart) { 
    	    chart.on("brush", renderAll)
    		.on("brushend", renderAll); 
    	});
    
    
    // Render the total.
    d3.selectAll("#total")
    	.text(formatNumber(respondents.size()));
    
    renderAll();
    
    // Renders the specified chart or list.
    function render(method) {
    	d3.select(this).call(method);
    }
    
    // Whenever the brush moves, re-rendering everything.
    function renderAll() {
    	chart.each(render);
    	d3.select("#active").text(formatNumber(all.value()));
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
        y = yscales[barChart.id],
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
    	    axis.tickValues(x.indices);

    	    // // don't rescale the y-axis. can always revert if it
    	    // // becomes too difficult to see actual numbers, but
    	    // // this is necessary in order to display bars for all
    	    // // people.
    	    // y.domain([0, group.top(1)[0].value]);
	    
    	    div.each(function() {
    		var div = d3.select(this),
    		g = div.select("g");

    		// Create the skeletal chart.
    		if (g.empty()) {
    		    div.select(".title").append("a")
    			.attr("href", "javascript:reset(" + id + ")")
    			.attr("class", "reset")
    			.text("reset")
    			.style("display", "none");
		    
    		    g = div.append("svg")
    			.attr("width", width + margin.left + margin.right)
    			.attr("height", height + margin.top + margin.bottom)
    			.append("g")
    			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
		    
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
    				return d + " all_bar " + question.type;
    			    }
    			    else if(i===3) {
    				return d + " all_bar " + question.type;
    			    }
    			    return d + " bar " + question.type; 
    			})
    			.datum(group.all());

    		    g.selectAll(".foreground.bar")
    			.attr("clip-path", "url(#clip-" + id + ")");
		    
    		    g.append("g")
    		    	.attr("class", "axis")
    		    	.attr("transform", "translate(0," + height + ")")
    		    	.call(axis);

    		    // manipulate the axis label text
    		    g.selectAll("g.axis text")
    		    	.text(function (d, i) {
    		    	    var n = 20;
    		    	    var s = x.labels[i];
    		    	    if (s===undefined) {
    		    		return '';
    		    	    }
    		    	    else if (s.length > n) {
    		    	    	var parts = s.substring(0,n-3).split(" ");
    		    	    	s = parts.slice(0,parts.length-1).join(" ");
    		    	    	s += "...";
    		    	    }
    		    	    return s;
    		    	})

    		    // // add tooltip on hover to display the full question
    		    // $("g.axis text").tipsy({
    		    // 	gravity: 'n',
    		    // 	html: true,
    		    // 	title: function() {
    		    // 	    var d=this.__data__;
    		    // 	    return x.labels[d];
    		    // 	}
    		    // });
		    
    		    // Initialize the brush component with pretty
    		    // resize handles.
    		    var gBrush = g.append("g")
    			.attr("class", "brush")
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
    		g.selectAll(".all_background.all_bar").attr("d", function (groups, i) {
    		    var v = d3.select(this).attr("d");
    		    if (v===null) {
    			return barPath(groups, i);
    		    }
    		    return v;
    		});

    		// render the .all_proportion.all_bar to show the proportion of 
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
    		    path.push("M", x(i-0.5)+1, ",", 
    			      height, "V", y(d.value), "h",bar_width-2,
    			      "V", height);
    		}
    		return path.join("");
    	    }

    	    function proportionPath(groups) {
    		var path = [],
    		i = -1,
    		n = groups.length,
    		g, p,
    		a = all.value();
    		while (++i < n) {
    		    g = groups[i];
    		    p = a/responses.length*group.__all__[i];
    		    path.push("M", x(i-0.5), ",", y(p), "h", bar_width);
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