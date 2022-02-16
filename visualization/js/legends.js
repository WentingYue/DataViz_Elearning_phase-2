// Title Discrete Legend Rect
// Creates the colored rectangles for a discrete variables legend
function discreteLegendRect(legends, i, scaledVar) {

    legends
        .append("rect")
        .attr("x", 40)
        .attr("y", 20 + i * 30)
        .attr("width", 8)
        .attr("height", 8)
        .style("fill", scaledVar);
}

// Title Discrete Legend Text
// Creates the text for a discrete variables legend
function discreteLegendText(legends, i, variable) {

    legends
        .append("text")
        .attr("x", 70)
        .attr("y", 25 + i * 30)
        .classed("province-label", true)
        .text(variable)
        .attr("alignment-baseline", "middle");
}

function createLegend(legends, variable, scale) {

    variable.forEach(function (d, i) {
        discreteLegendRect(legends, i, scale(d));
        discreteLegendText(legends, i, d);
    });
}

//Title Render Legends
// Renders the demographic legend
function renderDemoLegends(demoValue) {

    var legends = d3.select('#legend');

    legends.selectAll("rect").remove();
    legends.selectAll("text").remove();

    if (demoValue === "gender") {

        createLegend(legends, gender, genderScale);

    } else if (demoValue === "age") {

        createLegend(legends, age, ageScale);

    } else {
        legends.selectAll("rect").remove();
        legends.selectAll("text").remove();
    }
}
