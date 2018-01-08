/* jshint esversion: 6 */

///////////////////////////////////////////////////////////////////////////////
//// Initial Set Up ///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
// Global variables
const margin = {top: 60, right: 60, bottom: 20, left: 20};
const width = 300 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

const activitesMargin = {top: 60, right: 20, bottom: 20, left: 20};
const acivitesWidth = 350 - margin.left - margin.right;

const chart = d3.select("#chart").append("div").attr("class", "chart-area");
const tooltip = d3.select("#tooltip");

///////////////////////////////////////////////////////////////////////////////
// Scales
const x = d3.scaleLinear().range([0, width]);
const y = d3.scaleBand().range([0, height]);
const color = d3.scaleOrdinal()
		.domain(["Positive", "Negative", "Zero"])
		.range(["#09C675", "#F14864", "#000"]);

///////////////////////////////////////////////////////////////////////////////
//// Load and Process Data ////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

d3.csv("data/APPL.csv", row => ({
	activity: row.Activity,
	key: row["Activity Detail"],
	values: {"2017": +row[2017], "2016": +row[2016], "2015": +row[2015]}
}), (error, rawData) => {
	if (error) throw error;
	const years = [2017, 2016, 2015];

	// Group data by year
	const dataByYear = years.map(year => {
		return rawData.map(d => ({
			activity: d.activity,
			key: d.key,
			value: d.values[year]
		}));
	});

	// Add attributes necessary for waterfall chart
	const data = dataByYear.map(processData);

	// Set domains
	setDomains(data);

	// Render activities list
	renderActivities(data[0], "Apple Inc.");

	// Render waterfall cascade chart for each year
	for (let i = 0; i < years.length; i++) {
		renderChart(data[i], years[i]);
	}
});

function processData(rawData) {
		let cumulative = 0; // Keep track of the next starting position
	const data = [];
	for (let i = 0; i < rawData.length; i++) {
		const obj = {};
		obj.key = rawData[i].key;
		obj.isSummary = /^Total|^Change /.test(obj.key) ? true : false; // Summary rows have different stylings
		obj.value = rawData[i].value;
		obj.start = cumulative;
		cumulative += obj.isSummary ? 0 : obj.value;
		obj.end = cumulative;
		obj.color = obj.value > 0 ? "Positive" : obj.value < 0 ? "Negative" : "Zero";
		data.push(obj);
	}
	return data;
}

function setDomains(data) {
	y.domain(data[0].map(d => d.key));

	x.domain([
		d3.min(data, d => d3.min(d, e => e.start)),
		d3.max(data, d => d3.max(d, e => e.end))
	]); // All charts share the same x scales for easy comparisons
}

	/////////////////////////////////////////////////////////////////////////////
	//// Activities List ////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////

function renderActivities(data, company) {
	/////////////////////////////////////////////////////////////////////////////
	// SVG container
	const g = chart.append("svg")
		.attr("width", acivitesWidth + activitesMargin.left + activitesMargin.right)
		.attr("height", height + activitesMargin.top + activitesMargin.bottom)
	.append("g")
		.attr("transform", `translate(${activitesMargin.left}, ${activitesMargin.top})`);

	/////////////////////////////////////////////////////////////////////////////
	// Chart title
	g.append("text")
			.attr("class", "title")
			.attr("x", 9)
			.attr("y", -margin.top / 1.5)
			.text(company);

	g.append("text")
			.attr("class", "title")
			.attr("x", 9)
			.attr("y", -margin.top / 4)
			.text("Statement of Cash Flows");

	g.append("text")
			.attr("x", 9)
			.attr("y", 0)
			.style("font-weight", "bold")
			.text("in millions of dollars");

	/////////////////////////////////////////////////////////////////////////////
	// Activities List
	g.append("g")
			.attr("class", "y axis activity")
			.call(d3.axisRight(y))
		.selectAll("text")
			.style("font-weight", (d, i) => data[i].isSummary ? "bold" : "");

	// Render horizontal zule
	renderHorizontalRule(g, 9, acivitesWidth + activitesMargin.right);
}

	/////////////////////////////////////////////////////////////////////////////
	//// Waterfall Cascade Chart ////////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////

function renderChart(data, year) {
	/////////////////////////////////////////////////////////////////////////////
	// SVG container
	const g = chart.append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
	.append("g")
		.attr("transform", `translate(${margin.left}, ${margin.top})`)
		.attr("class", `year-${year}`);

	/////////////////////////////////////////////////////////////////////////////
	// Year title
	g.append("text")
			.attr("class", "title")
			.attr("x", width / 2)
			.attr("y", -margin.top / 2)
			.style("text-anchor", "middle")
			.text(year);

	/////////////////////////////////////////////////////////////////////////////
	// Axes
	g.append("g")
			.attr("class", "x axis")
			.call(d3.axisTop(x).ticks(4));

	g.append("g")
			.attr("class", "x axis")
			.attr("transform", `translate(0, ${height})`)
			.call(d3.axisBottom(x).ticks(4));

	g.append("g")
			.attr("class", "y axis")
			.attr("transform", `translate(${x(0)}, 0)`)
			.call(d3.axisLeft(y));
	g.selectAll(".y.axis .tick text").remove();

	/////////////////////////////////////////////////////////////////////////////
	// Waterfall cascade
	const ribbon = g.selectAll(".ribbon")
		.data(data)
		.enter().append("g")
			.attr("class", "ribbon");

	const padding = 0.2; // ribbon width = y scale bandwidth * (1 - padding)

	// Ribbons
	ribbon.append("polygon")
			.attr("class", "polygon")
			.attr("points", d => {
				return [
					[x(d.start), y(d.key)],
					[x(d.end), y(d.key) + y.bandwidth() * padding],
					[x(d.end), y(d.key) + y.bandwidth()],
					[x(d.start), y(d.key) + y.bandwidth() * (1 - padding)]
				].join(" ");
			})
			.style("fill", d => color(d.color));

	// Summary rows background color
	const summaryRows = ["Total Cash Flow From Operating Activities", "Total Cash Flows From Investing Activities",
		"Total Cash Flows From Financing Activities", "Change In Cash and Cash Equivalents"];
	ribbon
		.append("rect")
			.attr("class", "background-rect")
			.attr("x", 0)
			.attr("y", d => y(d.key))
			.attr("width", d => summaryRows.includes(d.key) ? width + margin.right : 0)
			.attr("height", y.bandwidth())
			.style("fill", d => color(d.color))
			.style("opacity", 0.1);

	// Total change in cash flow bar
	const lastData = data[data.length - 1];
	const rect = g.append("rect")
			.attr("class", "change-rect")
			.attr("x", Math.min(x(lastData.value), x(0)))
			.attr("y", y(lastData.key) + y.bandwidth() * padding / 2)
			.attr("width", Math.abs(x(lastData.value) - x(0)))
			.attr("height", y.bandwidth() * (1 - padding))
			.style("fill", lastData.value > 0 ? color("Positive") : color("Negative"));

	// Change value for each activity
	ribbon.append("text")
			.attr("class", "value")
			.attr("x", width + margin.right - 4)
			.attr("y", d => y(d.key) + y.bandwidth() / 2)
			.attr("dy", "0.35em")
			.style("text-anchor", "end")
			.style("fill", d => color(d.color))
			.style("font-weight", d => d.isSummary ? "bold" : "")
			.text(d => d.value);

	// Render horizontal zule
	renderHorizontalRule(g, -margin.left, width + margin.right);

	/////////////////////////////////////////////////////////////////////////////
	// Hover interactions
	// Add invisible bars to capture mouse hover
	ribbon.append("rect")
			.attr("class", "invisible-rect")
			.attr("x", 0)
			.attr("y", d => y(d.key))
			.attr("width", d => width + margin.right)
			.attr("height", y.bandwidth())
			.style("fill", "none")
			.style("pointer-events", "all")
			.style("opacity", 0.1)
			.on("mouseover", mouseover)
			.on("mousemove", mousemove)
			.on("mouseout", mouseout);
}

function renderHorizontalRule(g, x1, x2) {
	const yPos = ["Capital Expenditures", "Dividends Paid", "Change In Cash and Cash Equivalents"]
		.map(y);

	g.selectAll(".line")
		.data(yPos)
		.enter()
		.append("line")
			.attr("class", "line")
			.attr("x1", x1)
			.attr("y1", (d, i) => yPos[i])
			.attr("x2", x2)
			.attr("y2", (d, i) => yPos[i])
			.style("stroke", "#ccc");
}

	/////////////////////////////////////////////////////////////////////////////
	//// Event Listeners ////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////
	// Tooltip
	function mouseover() {
		tooltip
			.transition()
				.style("opacity", 1);
		d3.select(this)
			.style("fill", d => color(d.color));
	}

	function mousemove(d) {
		tooltip
			.style("left", d3.event.pageX + "px")
			.style("top", d3.event.pageY + 10 + "px")
			.style("background-color", "#fff")
			.style("color", d.value > 0 ? color("Positive") : d.value < 0 ? color("Negative") : color("Zero"));
		tooltip.html(`
			<span>${d.key}</span><br>
			<span>${d3.format("+")(d.value)}</span>
		`);
	}

	function mouseout() {
		tooltip
			.transition()
				.style("opacity", 0);
		d3.select(this)
			.style("fill", "none");
	}
