// network graph
var width_network = window.innerWidth;
var height_network = window.innerHeight;

var canvas = d3.select("#network").append("canvas")
    .attr("width", width_network + "px")
    .attr("height", height_network + "px")
    .node();

var context = canvas.getContext("2d");

var detachedContainer = document.createElement("custom");

var dataContainer = d3.select(detachedContainer);

var simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(function (d) {
        return d.id;
    }))
    .force("charge", d3.forceManyBody().strength(-6))
    .force("collide", d3.forceCollide().strength(0.2).radius(0.5))
    .force("center", d3.forceCenter(width_network / 2 - 150, height_network / 2 - 50))

var transform = d3.zoomIdentity;

//cartogram graph
var cartogram = d3.select("#cartogram").append("svg")
geograph = cartogram.append('g');

var width_carto = 300
height_carto = 350
radius = 130;

cartogram.attr('width', width_carto).attr('height', height_carto);
geograph.attr('transform', 'translate(' + [0, 30] + ')');

// Create the geographic projection
var projection = d3.geoMercator()
    .scale(width_carto * 3)
    .translate([-30, 880]);

// Configure the path generator
var pathGenerator = d3.geoPath()
    .projection(projection);

//tree graph
var treegraph = d3.select('#tree').append('svg')
positiontree = treegraph.append('g');

var width_tree = 300
height_tree = 350;

treegraph.attr('width', width_tree).attr('height', height_tree);
positiontree.attr("transform", "translate(" + (width_tree / 2) + "," + (height_tree / 2 + 20) + ")");

let gender = ["male", "sex"];
let age = ["18-29", "30-39", "40-49", "50-59", "60-69", "70+"];

let genderScale = d3.scaleOrdinal()
    .domain(gender)
    .range(["rgb(196, 71, 255)", "rgb(255, 253, 41)"]);

let sexScale = d3.scaleOrdinal()
    .domain(["M", "F"])
    .range(["rgb(196, 71, 255, .3)", "rgb(255, 253, 41, .3)"]);

let ageScale = d3.scaleOrdinal()
    .domain(age)
    .range(["rgba(155, 93, 229, 1)", "rgba(241, 91, 181, 1)", "rgba(254, 228, 64, 1)", 
            "rgba(0, 187, 249, 1)", "rgba(0, 245, 212, 1)", "rgba(192, 192, 192, 1)"]);

// loader settings
var opts = {
    lines: 9, // The number of lines to draw
    length: 5, // The length of each line
    width: 4, // The line thickness
    radius: 10, // The radius of the inner circle
    color: '#666666', // #rgb or #rrggbb or array of colors
    speed: 1.9, // Rounds per second
    trail: 40, // Afterglow percentage
    className: 'spinner', // The CSS class to assign to the spinner
};

var target = document.getElementById("network");
var spinner = new Spinner(opts).spin(target);

// load data
d3.queue()
    .defer(d3.json, "./data/proto_data.json")
    .defer(d3.json, "./cartogram/data/regions.json")
    .defer(d3.csv, "./data/tree.csv")
    .await(function (error, graphdata, geodata, treedata) {

        if (error) throw error;

        spinner.stop()

        // graph
        var g, store;
        var degree, selfScore;
        var minDegree, maxDegree;
        var degreeList, scoreList, levelList, degreeData;
        var tempLevel;
        var node, link, newNode, newLink, exitNode, exitLink;

        var threshold_a = 700;
        var threshold_b = 100;

        var radius_a = 0.004;
        var radius_b = 0.013;
        var radius_c = 0.03;

        g = graphdata;
        store = $.extend(true, {}, graphdata);

        initGraph();

        function initGraph() {

            link = dataContainer.selectAll("custom.line");
            node = dataContainer.selectAll("custom.circle");

            // update selections
            link = link.data(g.links, function (d) {
                return d.id;
            })
            node = node.data(g.nodes, function (d) {
                return d.id;
            })

            console.log("updateNode:", node);
            console.log("updateLink:", link);

            // exit selections
            exitNode = node.exit();
            exitNode.transition()
                .duration(1700)
                .attr('r', 0)
                .attr('alpha', 0)
                .remove();

            link.exit().remove();

            // update links and nodes
            newLink = link.enter().append("custom").attr("class", "line");
            newNode = node.enter().append("custom").attr("class", "circle");

            newNode.transition()
                .duration(1000)
                .attr('r', function (d) {
                    return d.degree * 0.1;
                });

            // update + enter
            link = link.merge(newLink);
            node = node.merge(newNode);

            simulation
                .nodes(g.nodes)
                .on("tick", ticked);

            simulation.force("link")
                .links(g.links);

            if ($('#simulation:checkbox').is(':checked')) {
                simulation.alphaDecay(.001).velocityDecay(0.6).alpha(0.4).alphaTarget(0).restart();
                // setTimeout(function () {
                //     simulation.restart();
                // }, 500);
            } else {
                simulation.alpha(0.5).alphaTarget(0).restart();
            }

            // simulation.force("collide").strength(0.2).radius(function (d) {
            //     return d.degree * 0.005;
            // }

            // calculate degree and score simultaneously
            degreeList = [];
            scoreList = [];
            levelList = [];

            link.each(function (edge, i) {
                // console.log(edge.target);
                degreeList.push(edge.target.id);
                levelList.push(edge.source.position.toString());
                scoreList.push({
                    "key": edge.target.id,
                    "selfScore": edge.self_score,
                    "validScore": edge.valid_score
                })
            })

            tempLevel = uniqueArray(levelList);

            // console.log("tempLevel:", tempLevel);
            // console.log("finalLink:", link);
            // console.log("degreelist:", degreeList);

            degreeData = aggregate(degreeList);
            var aggregateSelfscore = aggregateScore(scoreList, "selfScore");
            var aggregateValidscore = aggregateScore(scoreList, "validScore");

            degree = Object.keys(degreeData).map(key => ({
                id: key,
                weight: degreeData[key]
            }));

            selfScore = Object.keys(aggregateSelfscore).map(key => ({
                id: key,
                self_score: aggregateSelfscore[key] / degreeData[key]
            }));

            validScore = Object.keys(aggregateValidscore).map(key => ({
                id: key,
                valid_score: aggregateValidscore[key] / degreeData[key]
            }))

            // console.log("degreeData:", degreeData);
            minDegree = Math.min.apply(null, degree.map(item => item.weight));
            maxDegree = Math.max.apply(null, degree.map(item => item.weight));
            // console.log("minDegree:", minDegree);

            degree.forEach(function (d) {
                d.norWeight = normalize(d.weight, maxDegree, minDegree);
            });

            // console.log("degreeList: ", degreeList);
            // console.log("degree:", degree);


            // var newDegree = degree.find(o => o.id === node.id);
            // console.log("node.id:", link.target.id)
            simulation.force('collide', d3.forceCollide(function (d) {
                if (maxDegree > threshold_a) {
                    if (d.domain === "Y") {
                        var newDegree = degree.find(o => o.id === d.id);
                        return newDegree.weight * radius_a;
                    } else {
                        return d.degree * radius_a;
                    }
                } else {
                    if (d.domain === "Y") {
                        // console.log(d.id);
                        var newDegree = degree.find(o => o.id === d.id);
                        return newDegree.weight * radius_c;
                    } else {
                        return d.degree * radius_c;
                    }
                }
            }));

            // create zooming
            function zoomed() {
                transform = d3.event.transform;
                ticked();
            }

            d3.select(canvas)
                .call(d3.drag().subject(dragsubject).on("start", dragstarted).on("drag", dragged).on("end", dragended))
                .call(d3.zoom().scaleExtent([1 / 10, 8]).on("zoom", zoomed))

        }

        function ticked() {

            // console.log(nodes);
            // var nodes = dataContainer.selectAll('custom.circle');
            // var links = dataContainer.selectAll('custom.line');

            // set font based on degree
            function getFont(val) {
                var size = Math.log(val.weight);
                return (size * 1.5 | 0) + "px roboto";
            }

            // draw nodes and edges
            context.save();
            context.clearRect(0, 0, width_network, height_network);
            context.translate(transform.x, transform.y)
            context.scale(transform.k, transform.k)

            var demoValue = $('#group').val();
            $('#group').change(function () {
                demoValue = $(this).val();
                renderDemoLegends(demoValue);
            });

            for (const circle of g.nodes) {

                context.beginPath();
                drawNode(circle);

                if (circle.domain) {

                    var newDegree = degree.find(o => o.id === circle.id);
                    var maxDegree = Math.max.apply(null, degree.map(item => item.weight))

                    context.fillStyle = "rgba(200, 200, 200, 1)";
                    if (maxDegree > threshold_a) {
                        context.arc(circle.x, circle.y, newDegree.weight * radius_a, 0, 2 * Math.PI);
                    } else if (threshold_a > maxDegree > threshold_b) {
                        context.arc(circle.x, circle.y, newDegree.weight * radius_b, 0, 2 * Math.PI);
                    } else {
                        context.arc(circle.x, circle.y, newDegree.weight * radius_c, 0, 2 * Math.PI);
                    }
                    context.fill();

                } else {
                    context.arc(circle.x, circle.y, 1, 0, 2 * Math.PI);
                    context.fillStyle = "rgba(255, 255, 255, 0.2)";
                    context.fill();
                }
            }

            if ($('#simulation:checkbox').is(':checked')) {
                newNode.each(function (d) {
                    context.fillStyle = "rgba(66, 245, 90, 1)";
                    context.fill();
                    context.beginPath();
                    drawNode(d);
                    // var radius = d3.select(this).attr('r');
                    context.arc(d.x, d.y, 1, 0, 2 * Math.PI);
                });
                exitNode.each(function (d) {
                    context.fillStyle = "rgba(10, 171, 179, 1)";
                    context.fill();
                    context.beginPath();
                    drawNode(d);
                    var radius = d3.select(this).attr('r');
                    context.arc(d.x, d.y, radius, 0, 2 * Math.PI);
                })
            }

            //add draw conditions for tooltips
            if (closeNode && demoValue === 'default' && !score && !positionClick) {
                context.beginPath();
                // drawNode(closeNode);

                for (const edge of g.links) {
                    var newDegree = degree.find(o => o.id === edge.target.id);
                    var maxDegree = Math.max.apply(null, degree.map(item => item.weight));
                    // if mouse over domain
                    if (edge.target.id == closeNode.id) {
                        context.beginPath();

                        drawLink(edge);
                        context.strokeStyle = "rgba(10, 171, 179, 0.5)";
                        context.lineWidth = 0.05;
                        context.stroke();

                        drawNode(edge.source);
                        context.arc(edge.source.x, edge.source.y, 1, 0, 2 * Math.PI);
                        context.fillStyle = "rgba(10, 171, 179, 1)";
                        context.fill();
                    }
                    // if mouse over employee
                    else if (edge.source.id == closeNode.id) {
                        context.beginPath();

                        drawLink(edge);
                        context.strokeStyle = "rgba(10, 171, 179, 0.5)";
                        context.lineWidth = 0.5;
                        context.stroke();
                        // console.log("edge:", edge);

                        drawNode(edge.target);
                        if (maxDegree > threshold_a) {
                            context.arc(edge.target.x, edge.target.y, newDegree.weight * radius_a, 0, 2 * Math.PI);
                            context.font = 5 * (edge.self_score + edge.valid_score) / 2 + "px roboto";
                        } else if (threshold_a > maxDegree > threshold_b) {
                            context.arc(edge.target.x, edge.target.y, newDegree.weight * radius_b, 0, 2 * Math.PI);
                            context.font = 2.5 * (edge.self_score + edge.valid_score) / 2 + "px roboto";
                        } else {
                            context.arc(edge.target.x, edge.target.y, newDegree.weight * radius_c, 0, 2 * Math.PI);
                            context.font = 1.5 * (edge.self_score + edge.valid_score) / 2 + "px roboto";
                        }
                        context.fillStyle = "rgba(10, 171, 179, 1)";
                        context.fill();

                        context.fillStyle = "rgba(240, 240, 240, 1)";
                        context.fillText((edge.target.id + " " + ((edge.self_score + edge.valid_score) / 2).toFixed(2)), edge.target.x + 2, edge.target.y + 2);
                    }
                }

                // console.log("closeNode:", closeNode);

                if (closeNode.domain) {

                    var newDegree = degree.find(o => o.id === closeNode.id);
                    var maxDegree = Math.max.apply(null, degree.map(item => item.weight));

                    drawNode(closeNode);
                    if (maxDegree > threshold_a) {
                        context.arc(closeNode.x, closeNode.y, newDegree.weight * radius_a, 0, 2 * Math.PI);
                    } else if (threshold_a > maxDegree > threshold_b) {
                        context.arc(closeNode.x, closeNode.y, newDegree.weight * radius_b, 0, 2 * Math.PI);
                    } else {
                        context.arc(closeNode.x, closeNode.y, newDegree.weight * radius_c, 0, 2 * Math.PI);
                    }
                    context.fillStyle = "rgba(10, 171, 179, 1)";
                    context.fill();

                    context.fillStyle = "rgba(240, 240, 240, 1)";
                    context.font = getFont(newDegree);
                    context.fillText(closeNode.id, closeNode.x + 2, closeNode.y + 2);

                } else {

                    drawNode(closeNode);
                    context.arc(closeNode.x, closeNode.y, 1, 0, 2 * Math.PI);
                    context.fillStyle = "rgba(10, 171, 179, 1)";
                    context.fill();

                    context.fillStyle = "rgba(255, 255, 255, 1)";
                    context.font = "10px roboto";
                    context.fillText(closeNode.id, closeNode.x + 2, closeNode.y + 2);
                }
            }

            //add draw conditions based on group filter
            if (demoValue === "gender") {

                for (const circle of g.nodes) {

                    context.beginPath();
                    drawNode(circle);

                    var newDegree = degree.find(o => o.id === circle.id);
                    var maxDegree = Math.max.apply(null, degree.map(item => item.weight));

                    if (!circle.domain) {

                        context.fillStyle = sexScale(circle.sex);
                        context.arc(circle.x, circle.y, 1, 0, 2 * Math.PI);
                        context.fill();

                    } else {

                        if (maxDegree > threshold_a) {
                            context.arc(circle.x, circle.y, newDegree.weight * radius_a, 0, 2 * Math.PI);
                        } else if (threshold_a > maxDegree > threshold_b) {
                            context.arc(circle.x, circle.y, newDegree.weight * radius_b, 0, 2 * Math.PI);
                        } else {
                            context.arc(circle.x, circle.y, newDegree.weight * radius_c, 0, 2 * Math.PI);
                        }

                        context.fill();
                        context.fillStyle = "rgba(240, 240, 240, 0.8)";
                        context.font = getFont(newDegree);
                        context.fillText(circle.id, circle.x + 2, circle.y + 2);
                    }
                }
            }

            if (demoValue === "age") {

                for (const circle of g.nodes) {

                    context.beginPath();
                    drawNode(circle);

                    var newDegree = degree.find(o => o.id === circle.id);
                    var maxDegree = Math.max.apply(null, degree.map(item => item.weight));

                    if (!circle.domain) {

                        context.fillStyle = ageScale(circle.age_groups);
                        context.arc(circle.x, circle.y, 1, 0, 2 * Math.PI);
                        context.fill();

                    } else {

                        if (maxDegree > threshold_a) {
                            context.arc(circle.x, circle.y, newDegree.weight * radius_a, 0, 2 * Math.PI);
                        } else if (threshold_a > maxDegree > threshold_b) {
                            context.arc(circle.x, circle.y, newDegree.weight * radius_b, 0, 2 * Math.PI);
                        } else {
                            context.arc(circle.x, circle.y, newDegree.weight * radius_c, 0, 2 * Math.PI);
                        }

                        context.fill();
                        context.fillStyle = "rgba(240, 240, 240, 0.8)";
                        context.font = getFont(newDegree);
                        context.fillText(circle.id, circle.x + 2, circle.y + 2);
                    }
                }
            }

            if (score) {
                for (const circle of g.nodes) {
                    if (circle.domain) {

                        var newDegree = degree.find(o => o.id === circle.id);
                        var maxDegree = Math.max.apply(null, degree.map(item => item.weight));

                        var newSelfscore = selfScore.find(o => o.id === circle.id);
                        // var newValidscore = validScore.find(o => o.id === node.id);
                        context.beginPath();
                        drawNode(circle);

                        if (maxDegree > threshold_a) {
                            context.arc(circle.x, circle.y, newDegree.weight * radius_a, 0, 2 * Math.PI);
                        } else if (threshold_a > maxDegree > threshold_b) {
                            context.arc(circle.x, circle.y, newDegree.weight * radius_b, 0, 2 * Math.PI);
                        } else {
                            context.arc(circle.x, circle.y, newDegree.weight * radius_c, 0, 2 * Math.PI);
                        }
                        context.fillStyle = 'rgb(' + Math.floor(255 - 50 * newSelfscore.self_score) + ', ' +
                            Math.floor(255 - 28.2 * newSelfscore.self_score) + ', ' +
                            Math.floor(255 - 24.2 * newSelfscore.self_score) + ')';
                        context.fill();

                        context.fillStyle = "rgba(240, 240, 240, 1)";
                        context.font = getFont(newDegree);
                        context.fillText(circle.id + " " + newSelfscore.self_score.toFixed(2), circle.x + 2, circle.y + 2);

                        // console.log(newSelfscore);

                    }
                }
            }

            if (positionLevel) {
                context.beginPath();
                for (const circle of g.nodes) {
                    drawNode(circle);
                    if (!circle.domain && circle.position == positionLevel) {
                        context.arc(circle.x, circle.y, 1.5, 0, 2 * Math.PI);
                        context.fillStyle = "rgba(10, 171, 179, 1)";
                        context.fill();

                        context.fillStyle = "rgba(255, 255, 255, 1)";
                        context.font = "10px roboto";
                        context.fillText(circle.id, circle.x + 5, circle.y + 2);
                    }
                }
            }

            if (positionClick) {
                context.beginPath();
                for (const circle of g.nodes) {
                    if (!circle.domain && circle.position == positionClick) {
                        drawNode(circle);
                        context.arc(circle.x, circle.y, 1.5, 0, 2 * Math.PI);
                        context.fillStyle = "rgba(235, 64, 52, 1)";
                        context.fill();

                        context.fillStyle = "rgba(255, 255, 255, 0.5)";
                        context.font = "10px roboto";
                        context.fillText(circle.id, circle.x + 5, circle.y + 2);

                    }
                }
            }

            if (closeNode && positionClick && demoValue === 'default') {
                context.beginPath();
                // drawNode(closeNode);

                for (const edge of g.links) {
                    var newDegree = degree.find(o => o.id === edge.target.id);
                    var maxDegree = Math.max.apply(null, degree.map(item => item.weight));
                    // if mouse over domain
                    if (edge.target.id == closeNode.id && edge.source.position == positionClick) {
                        context.beginPath();

                        drawLink(edge);
                        context.strokeStyle = "rgba(235, 64, 52, 0.5)";
                        context.lineWidth = 1;
                        context.stroke();

                        drawNode(edge.source);
                        context.arc(edge.source.x, edge.source.y, 1, 0, 2 * Math.PI);
                        context.fillStyle = "rgba(235, 64, 52, 1)";
                        context.fill();

                        drawNode(edge.target);
                        if (maxDegree > threshold_a) {
                            context.arc(edge.target.x, edge.target.y, newDegree.weight * radius_a, 0, 2 * Math.PI);
                        } else if (threshold_a > maxDegree > threshold_b) {
                            context.arc(edge.target.x, edge.target.y, newDegree.weight * radius_b, 0, 2 * Math.PI);
                        } else {
                            context.arc(edge.target.x, edge.target.y, newDegree.weight * radius_c, 0, 2 * Math.PI);
                        }
                        context.fillStyle = "rgba(235, 64, 52, 1)";
                        context.fill();

                        context.fillStyle = "rgba(240, 240, 240, 1)";
                        context.font = "10px roboto";
                        context.fillText(edge.target.id, edge.target.x + 2, edge.target.y + 2);

                        context.fillStyle = "rgba(235, 64, 52, 1)";
                        context.font = "10px roboto";
                        context.fillText((edge.source.id + " " + ((edge.self_score + edge.valid_score) / 2).toFixed(2)), edge.source.x + 5, edge.source.y + 2);
                    }
                    // if mouse over employee
                    if (edge.source.id == closeNode.id && edge.source.position == positionClick) {
                        context.beginPath();

                        drawLink(edge);
                        context.strokeStyle = "rgba(235, 64, 52, 0.5)";
                        context.lineWidth = 1;
                        context.stroke();

                        drawNode(edge.source);
                        context.arc(edge.source.x, edge.source.y, 1, 0, 2 * Math.PI);
                        context.fillStyle = "rgba(235, 64, 52, 1)";
                        context.fill();

                        context.fillStyle = "rgba(240, 240, 240, 1)";
                        context.font = "10px roboto";
                        context.fillText(edge.source.id, edge.source.x + 5, edge.source.y + 2);

                        drawNode(edge.target);
                        if (maxDegree > threshold_a) {
                            context.arc(edge.target.x, edge.target.y, newDegree.weight * radius_a, 0, 2 * Math.PI);
                        } else if (threshold_a > maxDegree > threshold_b) {
                            context.arc(edge.target.x, edge.target.y, newDegree.weight * radius_b, 0, 2 * Math.PI);
                        } else {
                            context.arc(edge.target.x, edge.target.y, newDegree.weight * radius_c, 0, 2 * Math.PI);
                        }
                        context.fillStyle = "rgba(235, 64, 52, 1)";
                        context.fill();

                        context.fillStyle = "rgba(240, 240, 240, 1)";
                        context.font = "8px roboto";
                        context.fillText((edge.target.id + " " + ((edge.self_score + edge.valid_score) / 2).toFixed(2)), edge.target.x + 2, edge.target.y + 2);
                    }
                }
            }

            context.restore();
        }

        //add tooltips for nodes
        var closeNode;
        d3.select(canvas).on("mousemove", function () {
            var p = d3.mouse(this);
            // console.log(p);
            var pZoom = transform.invert(p);
            closeNode = simulation.find(pZoom[0], pZoom[1]);
        });
        d3.select(canvas).on("mouseout", function () {
            closeNode = NaN;
        })

        function dragsubject() {
            var i,
                x = transform.invertX(d3.event.x),
                y = transform.invertY(d3.event.y),
                dx,
                dy;
            for (i = g.nodes.length - 1; i >= 0; --i) {
                node = g.nodes[i];
                dx = x - node.x;
                dy = y - node.y;

                if (dx * dx + dy * dy < 5 * 5) {
                    node.x = transform.applyX(node.x);
                    node.y = transform.applyY(node.y);

                    return node;
                }
            }
        }

        // drag functions
        function dragstarted() {
            if (!d3.event.active) simulation.alphaTarget(0.3).restart();
            d3.event.subject.fx = transform.invertX(d3.event.x);
            d3.event.subject.fy = transform.invertY(d3.event.y);
        }

        function dragged() {
            d3.event.subject.fx = transform.invertX(d3.event.x);
            d3.event.subject.fy = transform.invertY(d3.event.y);
        }

        function dragended() {
            if (!d3.event.active) simulation.alphaTarget(0);
            d3.event.subject.fx = null;
            d3.event.subject.fy = null;
        }

        context.restore();

        // apply score
        var score;
        var legendScore = d3.select('#legendScore');
        var defs = legendScore.append("defs");
        var linearGradient = defs.append("linearGradient")
            .attr("id", "linear-gradient")

        $('#score:checkbox').change(function () {
            if (this.checked) {
                score = 1;
                console.log("checked");

                linearGradient
                    .attr('x1', "0%")
                    .attr('y1', '0%')
                    .attr('x2', '100%')
                    .attr('y2', '0%')

                linearGradient.append("stop")
                    .attr("offset", "0%")
                    .attr("stop-color", "#ffffff")

                linearGradient.append("stop")
                    .attr('offset', "100%")
                    .attr('stop-color', '#057286')

                legendScore.append('rect')
                    .attr("x", 40).attr("y", 20)
                    .attr('width', 110).attr('height', 15)
                    .style('fill', 'url(#linear-gradient)')

                legendScore.append("text").attr("x", 40).attr("y", 40)
                    .classed("province-label", true)
                    .text("0")
                    .attr("alignment-baseline", "before-edge")

                legendScore.append("text").attr("x", 140).attr("y", 40)
                    .classed("province-label", true)
                    .text("5")
                    .attr("alignment-baseline", "before-edge")

            } else {
                score = null;
                legendScore.selectAll("rect").remove();
                legendScore.selectAll("text").remove();
            }
        })

        // cartogram graph
        // var geojson = topojson.feature(data, data.objects.provinces).features;
        var geojson = topojson.feature(geodata, geodata.objects.regions).features;
        // console.log(geojson);

        // Compute the projected centroid, area and length of the side
        // of the squares.
        geojson.forEach(function (d) {
            d.centroid = projection(d3.geoCentroid(d));
            d.x0 = d.centroid[0];
            d.y0 = d.centroid[1];
            d.area = d3.geoPath().projection(projection).area(d);
            d.r = Math.sqrt(d.area);
        });

        // Sort the features by projected area
        geojson.sort(function (a, b) {
            return b.area - a.area;
        });

        var provinces = geograph.selectAll('path.province')
            .data(geojson)
            .enter()
            .append('path')
            .classed('province', true)
            .attr('d', pathGenerator);

        provinces.exit().remove();

        // console.log("degree:", degree);

        // Circles
        var prin_name = d3.select('#position-1');
        var circles = geograph.selectAll('circle.province')
            .data(geojson)
            .enter()
            .append('circle')
            .classed('province', true);

        // console.log("geojson:", geojson);
        // console.log("g.nodes", g.nodes);

        var regionList = [];
        g.nodes.forEach(function (d, i) {
            // console.log(edge.target);
            regionList.push(d.region);
        })

        var uniqueRegion = regionList.filter((v, i, a) => a.indexOf(v) === i);

        // console.log("uniqueRegion:", uniqueRegion);

        circles
            .attr('cx', function (d) {
                if (uniqueRegion.includes(d.properties.reg_name)) {
                    return d.centroid[0] - d.r / 2 + 10;
                }
            })
            .attr('cy', function (d) {
                if (uniqueRegion.includes(d.properties.reg_name)) {
                    return d.centroid[1] - d.r / 2 + 10;
                }
            })
            .attr('r', function (d) {
                if (uniqueRegion.includes(d.properties.reg_name)) {
                    return d.r / 2 - 2;
                }
            });

        // labels
        var labels = geograph.selectAll('text')
            .data(geojson)
            .enter()
            .append('text')
            .classed('txt_province', true)
        labels
            .attr('x', function (d) {
                if (uniqueRegion.includes(d.properties.reg_name)) {
                    return d.x0 - d.r / 2 + 10;
                }
            })
            .attr('y', function (d) {
                if (uniqueRegion.includes(d.properties.reg_name)) {
                    return d.y0 - d.r / 2 + 10;
                }
            })
            // .text(d=>d.properties.prov_name)
            .text(function (d) {
                if (uniqueRegion.includes(d.properties.reg_name)) {
                    return d.properties.reg_name;
                }
            })

        // create a force simulation and add forces to it
        // new force simulation creation	
        var simulationGeo = d3.forceSimulation()
            .velocityDecay(0.5)
            .force("cx", d3.forceX().x(d => d.x0).strength(0.7))
            .force("cy", d3.forceY().y(d => d.y0).strength(0.7))
            .force("x", d3.forceX().x(d => d.x0).strength(0.7))
            .force("y", d3.forceY().y(d => d.y0).strength(0.7))
            // .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(function (d) {
                // return d.r/2;
                return d.r / 1.8;
            }))
            .force('charge', d3.forceManyBody().strength(3)) //make nodes repulse away from each other
            .stop();

        // Apply these forces to the nodes and update their positions.
        // Once the force algorithm is happy with positions ('alpha' value is low enough), simulations will stop.
        simulationGeo
            .nodes(geojson)
            .on("tick", function (d) {
                circles
                    .attr("cx", function (d) {
                        return d.x;
                    })
                    .attr("cy", function (d) {
                        return d.y;
                    })
                labels
                    .attr("x", function (d) {
                        return d.x;
                    })
                    .attr("y", function (d) {
                        return d.y;
                    })
            });
        simulationGeo.alpha(0.8).restart();

        // add filter for the network data
        var filterReg, filterNewReg;

        // add mouseover effects on region circle
        circles.on('mouseover', function (d) {
                // Highlight on mouse over
                d3.select(this).classed('highlighted', true);
                // console.log(this);
                prin_name.append('text')
                    .classed('province-label', true)
                    .attr('x', 0)
                    .attr('y', 0)
                    .text(d.properties.reg_name);

                filterReg = d.properties.reg_name;
            })
            .on('mouseout', function (d) {
                d3.select(this).classed('highlighted', false);
                prin_name.selectAll('text.province-label').remove();

                filterReg = null;
            });

        circles.exit().remove();

        // filter network nodes
        function filterData() {
            var domainList = [];
            var links = [];

            // filter link
            g.links.forEach(function (d, i) {
                if (d.source.region === filterReg) {
                    links.push(d);
                }
            })

            g.links = links;

            // find corresponding domains
            links.forEach(function (d, i) {
                domainList.push(d.target.id);
            })

            domainList = domainList.filter((v, i, a) => a.indexOf(v) === i);

            // update nodes
            store.nodes.forEach(function (d, i) {
                if (!d.domain && d.region !== filterReg) {
                    g.nodes.forEach(function (n, i) {
                        if (d.id === n.id) {
                            g.nodes.splice(i, 1);
                        }
                    })
                } else if (d.domain && !domainList.includes(d.id)) {
                    console.log(d.id);
                    g.nodes.forEach(function (n, i) {
                        if (d.id === n.id) {
                            g.nodes.splice(i, 1);
                        }
                    })
                }
            })

            initGraph();
        }

        // filter org tree
        function filterTree() {
            // console.log("tempLevel:", tempLevel);
            storeTree = [];
            treedata.forEach(function (row) {
                var datarow = [];
                row.taxonomy = row.parent.split(',');
                row.taxonomy.forEach(function (key, i) {
                    newKey = key.replace(/\s/g, '');
                    if (tempLevel.includes(newKey.toString())) {
                        datarow.push(key);

                    }
                })
                if (datarow.length != 0) {
                    storeTree.push(datarow);
                }
            })

            console.log("storeTree:", storeTree);

            storeTree.forEach(function (row) {
                row.taxonomy = row;
            })

            updateTree(burrow(storeTree)); // update tree
        }

        // display filter region
        var region_selected = d3.select('.selectedRegion');

        region_selected.append('text')
            .classed('.selected-label', true)
            .text("selected region: all");

        // toggle filter by event
        circles.on('click', function (d) {

            region_selected.text("selected region: " + d.properties.reg_name);

            if (!filterNewReg) {

                filterNewReg = filterReg; // record current region name
                filterData();
                filterTree();


            } else if (filterNewReg && filterNewReg !== filterReg) {
                // reset to have all nodes
                g.links = [];
                g.nodes = [];

                store.links.forEach(function (d, i) {
                    g.links.push($.extend(true, {}, d));
                });

                store.nodes.forEach(function (d) {
                    g.nodes.push($.extend(true, {}, d));
                })

                console.log("g.nodes:", g.nodes);

                initGraph();

                // filter by new region name
                filterNewReg = filterReg; // record current region name

                filterData(); // filter network data
                filterTree(); // filter tree data

            }
        })

        // reset network data
        var allCircles = d3.selectAll("circle");

        function equalToEventTarget() {
            return this == d3.event.target;
        }

        cartogram.on("click", function (d) {
            var outside = allCircles.filter(equalToEventTarget).empty();
            if (outside) {

                region_selected.text("selected region: all");

                g.links = [];
                g.nodes = [];

                store.links.forEach(function (d, i) {
                    // g.nodes.splice(d,1)
                    g.links.push($.extend(true, {}, d));
                });

                store.nodes.forEach(function (d) {
                    // g.links.splice(d,1)
                    g.nodes.push($.extend(true, {}, d));
                })

                // console.log("g.nodes:", g.nodes);

                initGraph();

                // reset tree to rootdata
                filterTree();
            }
        })


        // tree graph
        var positionLevel; // set variable when hovering level
        var positionClick;

        // create d3 tree
        var tree = d3.tree()
            .size([2 * Math.PI, 120])
            .separation(function (a, b) {
                return (a.parent == b.parent ? 1 : 2) / a.depth;
            });

        // build tree data from csv
        var burrow = function (table) {
            // create nested object
            var obj = {};
            table.forEach(function (row) {
                // start at root
                var layer = obj;

                // create children as nested objects
                row.taxonomy.forEach(function (key) {
                    layer[key] = key in layer ? layer[key] : {};
                    layer = layer[key];
                });
            });

            // recursively create children array
            var descend = function (obj, depth) {
                var arr = [];
                var depth = depth || 0;
                for (var k in obj) {
                    var child = {
                        name: k,
                        depth: depth,
                        children: descend(obj[k], depth + 1)
                    };
                    arr.push(child);
                }
                return arr;
            };

            // use descend to create nested children arrys
            return {
                name: "root",
                children: descend(obj, 1),
                depth: 0
            }
        };

        // prune data by current tempLevel
        treedata.forEach(function (row) {
            row.taxonomy = row.parent.split(",");
        });

        // rootdata = burrow(treedata); // create burrow for csv data
        var storeTree; // create temporal tree data

        // updateTree(rootdata); // initual setup
        filterTree();

        // add text display for position
        var tree_name = d3.select('#position-2');
        var position_selected = d3.select('.selectedPosition');

        position_selected.append('text')
            .classed('.selected-label', true)
            .text("selected position: all");

        // tree update
        function updateTree(data) {

            console.log("datatree:", data);

            var root = tree(d3.hierarchy(data));

            var link = positiontree.selectAll("path")
                .data(root.links(), function (d) {
                    return d;
                })

            var node = positiontree.selectAll("g")
                .data(root.descendants(), function (d) {
                    return d;
                })

            // console.log("treeLink", link);
            // console.log("treeNode", node);

            // exit selections
            link.exit().remove();
            node.exit().remove();

            // enter new links and nodes
            var newLink = link.enter().append("path")
                .attr("class", "treelink")
                .attr("d", d3.linkRadial()
                    .angle(function (d) {
                        return d.x;
                    })
                    .radius(function (d) {
                        return d.y;
                    }))
                .style("stroke-width", function (d) {
                    return 0.2;
                });

            var newNode = node.enter().append("g")
                .attr("class", function (d) {
                    return "node" + (d.children ? "tree--internal" : "tree--leaf");
                })
                .attr("transform", function (d) {
                    return "translate(" + radialPoint(d.x, d.y) + ")";
                })

            // console.log("newtreeLink:", newLink);
            // console.log("newtreeNode:", newNode);

            // update + enter
            link = link.merge(newLink);
            node = node.merge(newNode)

            node.append("circle")
                .attr("r", 6)
                .attr("fill", "#fff")
                .style('opacity', 0);

            console.log("treeNode", node);

            node.append("circle")
                .attr("r", 1)
                .attr("fill", function (d) {
                    if (closeNode) {
                        if (closeNode.position == d.data.name.trim()) {
                            return "#78fff2";
                        }
                    } else {
                        return "#fff";
                    }
                })
                .style('opacity', 1);

            // Highlight on mouse over
            var treeNode = positiontree.selectAll("g");

            treeNode.on('mouseover', function (d) {
                    console.log("mouseover:", "true");
                    d3.select(this).classed('treehighlighted', true)
                    tree_name.append('text')
                        .classed('province-label', true)
                        .attr('dx', 5 + "px")
                        .attr('dy', 5 + "px")
                        .text(`${d.data.name}`);

                    positionLevel = d.data.name;
                    console.log("positionLevel", positionLevel);
                })
                .on('mouseout', function (d) {
                    positionLevel = null;
                    d3.select(this).classed('treehighlighted', false);
                    tree_name.selectAll('text.province-label').remove();
                });

            treeNode.on('click', function (d) {
                position_selected.text("selected position: " + d.data.name);
                positionClick = d.data.name;
            });

            // click outside org chart
            var treeCircle = positiontree.selectAll("circle")
            treegraph.on("click", function (d) {
                var outside = treeCircle.filter(equalToEventTarget).empty();
                if (outside) {
                    positionClick = null;
                    console.log("outside");

                    position_selected.text("selected position: all");
                    tree_name.selectAll('text.province-label').remove();
                }
            })

        }

        // simulation
        $('#simulation:checkbox').change(function () {
            if (this.checked) {
                $("#tree").css("visibility", "hidden");
                $("#cartogram").css("visibility", "hidden");
                $('.simulationButton').show();
            } else {
                $("#tree").css("visibility", "visible");
                $("#cartogram").css("visibility", "visible");
                $('.simulationButton').hide();
            }
        })

        // add fake data
        $('#Add').click(function () {
            var fakeNodes = [];
            var fakeID = [];
            var elementID = [];
            var fakeLinks = [];
            var amountToGrab = document.getElementById("nodeInput").value;

            console.log("amountToGrab:", amountToGrab);

            //extract nodes data
            var filterNodes = store.nodes.filter(d => d.region == filterNewReg);

            filterNodes.forEach(function (d, i) {
                fakeID.push(d.id);
            })

            for (var i = 0; i < amountToGrab; ++i) {
                var random = Math.floor(Math.random() * fakeID.length);
                elementID.push(fakeID.splice(random, 1)[0]);
            }

            // console.log("fakeID:", fakeID);
            // console.log("elementID:", elementID);

            filterNodes.forEach(function (d, i) {
                if (elementID.includes(d.id)) {
                    d.id = "new" + d.id;
                    fakeNodes.push($.extend(true, {}, d));
                }
            });

            store.links.forEach(function (d, i) {
                if (elementID.includes(d.source)) {
                    d.source = "new" + d.source;
                    fakeLinks.push($.extend(true, {}, d));
                }
            });

            console.log("fakeNode:", fakeNodes);
            console.log("fakeLinks:", fakeLinks);

            // add fake nodes and links
            fakeNodes.forEach(function (d, i) {
                d.x = 0;
                d.y = 400;
                d.vx = d.vy = 0;
                g.nodes.push(d);
            });
            fakeLinks.forEach(function (d, i) {
                g.links.push(d);
            });

            initGraph();
        })

        // remove data
        $('#Remove').click(function () {
            var fakeNodes = [];
            var fakeID = [];
            var elementID = [];
            var fakeLinks = [];
            var amountToGrab = document.getElementById("nodeOutput").value;

            console.log("amountToGrab:", amountToGrab);

            //extract nodes data
            g.nodes.forEach(function (d, i) {
                if (!d.domain) {
                    fakeID.push(d.id);
                }
            })

            for (var i = 0; i < amountToGrab; ++i) {
                var random = Math.floor(Math.random() * fakeID.length);
                elementID.push(fakeID.splice(random, 1)[0]);
            }

            g.links.forEach(function (d, i) {
                if (!elementID.includes(d.source.id)) {
                    fakeLinks.push(d);
                }
            });
            g.links = fakeLinks;

            g.nodes.forEach(function (d, i) {
                if (!elementID.includes(d.id)) {
                    fakeNodes.push(d);
                }
            });
            g.nodes = fakeNodes;

            // update nodes

            initGraph();
        })

    })