/*
 * Generates a Voronoi Map using Mapbox, Leaflet, and D3.
 * Author: Nate Lang, inspiration from Chris Zetter
*/

voronoiMap = (map, url, initialSelections) => {
  const pointTypes = d3.map();
  let pointSet = [];
  let lastPoint;

  let voronoi = d3.geom.voronoi()
    .x(pt => { return pt.x; })
    .y(pt => { return pt.y; });

  const selectPoint = function () {
    d3.selectAll('.selected').classed('selected', false);

    let cell = d3.select(this);
    let point = cell.datum();

    lastPoint = point;
    cell.classed('selected', true);

    d3.select('#selected h1')
      .html('')
      .append('a')
      .text(point.name)
      .attr('href', point.url)
      .attr('target', '_blank')
  }

  const drawPointTypeSelection = () => {
    showHide('#selections')
    let checkboxOptions = d3.select('#toggles').selectAll('input')
      .data(pointTypes.values())
      .enter().append("label");

    checkboxOptions.append("input")
      .attr('type', 'checkbox')
      .property('checked', function (d) {
        return initialSelections === undefined || initialSelections.has(d.type)
      })
      .attr("value", function (d) { return d.type; })
      .on("change", drawWithLoading);

    checkboxOptions.append("span")
      .attr('class', 'key')
      .style('background-color', function (d) { return '#' + d.color; });

    checkboxOptions.append("span")
      .text(function (d) { return d.type; });
  }

  const selectedTypes = () => {
    return d3
      .selectAll('#toggles input[type=checkbox]')[0]
      .filter(el => el.checked)
      .map(el => el.value);
  }

  const pointsFilteredToSelectedTypes = () => {
    let currentSelectedTypes = d3.set(selectedTypes());
    return pointSet.filter(point => currentSelectedTypes.has(point.type));
  }

  const drawWithLoading = e => {
    d3.select('#loading').classed('visible', true);
    if (e && e.type == 'viewreset') {
      d3.select('#overlay').remove();
    }
    setTimeout(function () {
      draw();
      d3.select('#loading').classed('visible', false);
    }, 0);
  }

  const draw = () => {
    d3.select('#overlay').remove();

    let bounds = map.getBounds();
    let topLeft = map.latLngToLayerPoint(bounds.getNorthWest());
    let bottomRight = map.latLngToLayerPoint(bounds.getSouthEast());
    let existing = d3.set();
    let drawLimit = bounds.pad(0.4);

    filteredPoints = pointsFilteredToSelectedTypes().filter(data => {
      let latlng = new L.LatLng(data.latitude, data.longitude);

      if (!drawLimit.contains(latlng)) { return false };

      let point = map.latLngToLayerPoint(latlng);

      key = point.toString();
      if (existing.has(key)) { return false };
      existing.add(key);

      data.x = point.x;
      data.y = point.y;
      return true;
    });

    voronoi(filteredPoints).forEach(data => data.point.cell = data);

    let svg = d3.select(map.getPanes().overlayPane).append("svg")
      .attr('id', 'overlay')
      .attr("class", "leaflet-zoom-hide")
      .style("width", map.getSize().x + 'px')
      .style("height", map.getSize().y + 'px')
      .style("margin-left", topLeft.x + "px")
      .style("margin-top", topLeft.y + "px");

    let g = svg.append("g")
      .attr("transform", "translate(" + (-topLeft.x) + "," + (-topLeft.y) + ")");

    let svgPoints = g.attr("class", "points")
      .selectAll("g")
      .data(filteredPoints)
      .enter().append("g")
      .attr("class", "point");

    let buildPathFromPoint = pt => {
      return "M" + pt.cell.join("L") + "Z";
    }

    svgPoints.append("path")
      .attr("class", "point-cell")
      .attr("d", buildPathFromPoint)
      .on('click', selectPoint)
      .classed("selected", d => lastPoint == d);

    svgPoints.append("circle")
      .attr("transform", d => "translate(" + d.x + "," + d.y + ")")
      .style('fill', d => '#' + d.color)
      .attr("r", 4);
  }

  let mapLayer = {
    onAdd: function (map) {
      map.on('viewreset moveend', drawWithLoading);
      drawWithLoading();
    }
  };

  showHide('#about');

  map.on('ready', function () {
    d3.csv(url, function (csv) {
      pointSet = csv;
      pointSet.forEach(function (point) {
        pointTypes.set(point.type, { type: point.type, color: point.color });
      })
      drawPointTypeSelection();
      map.addLayer(mapLayer);
    })
  });
}

const showHide = (selector) => {
  d3.select(selector).select('.hide').on('click', function () {
    d3.select(selector)
      .classed('visible', false)
      .classed('hidden', true);
  });

  d3.select(selector).select('.show').on('click', function () {
    d3.select(selector)
      .classed('visible', true)
      .classed('hidden', false);
  });
}
