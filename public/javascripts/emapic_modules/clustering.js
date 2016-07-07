//
// Clustering code
//
var clusteringActive = true;

var clusteringButtonsHtml = "<a id='clustering-control-activate' title='" + getI18n('js_disable_clustering', 'Desactivar clustering') + "' href='javascript:void(0)' onclick='toggleClustering(this)'><img src='/images/icon-clustering.png' style='width: 16px; height: 16px;'/></a>";

var pieCenter = {x: 21.0, y: 21.0};
var pieRadius = 19.0;

var loadIndivVotesLayer = overrideFunction(loadIndivVotesLayer, null, function(markers) {
    if (clusteringActive) {
        if (legend && legend.color) {
            indivVotesLayer = new L.MarkerClusterGroup({
                iconCreateFunction: function(cluster) {
                    var markers = cluster.getAllChildMarkers(),
                        total = markers.length,
                        statusNr = [];
                    for (var i=0, len=legend.color.responses_array.length; i<len; i++) {
                        statusNr.push({
                            value: legend.color.responses_array[i].id,
                            votes: 0
                        });
                    }
                    for (var i = 0; i < total; i++) {
                        for (var j=0, len=statusNr.length; j<len; j++) {
                            if (markers[i].feature.properties[legend.color.question + '.id'] == statusNr[j].value) {
                                statusNr[j].votes++;
                            }
                        }
                    }
                    return new L.DivIcon({ className: 'marker-cluster-svg', iconSize: L.point(pieCenter.x * 2, pieCenter.y * 2),
                        html: getClusterIcon(statusNr, total)
                    });
                }
            });
        } else {
            indivVotesLayer = new L.MarkerClusterGroup({
                iconCreateFunction: function(cluster) {
                    var markers = cluster.getAllChildMarkers(),
                        total = markers.length,
                        statusNr = [{votes: total, value: null}];
                    return new L.DivIcon({ className: 'marker-cluster-svg', iconSize: L.point(pieCenter.x * 2, pieCenter.y * 2),
                        html: getClusterIcon(statusNr, total)
                    });
                }
            });
        }
        indivVotesLayer.addLayer(markers);
        return indivVotesLayer;
    } else {
        return markers;
    }
});

function toggleClustering(element) {
    clusteringActive = !clusteringActive;
    toggleButton(element);
    updateIndivVotesLayer();
}

var addViewsControls = overrideFunction(addViewsControls, null, function() {
    var groupingViewsControl = L.control({position: 'topleft'});
    groupingViewsControl.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'views-control leaflet-bar');
        this._div.innerHTML = clusteringButtonsHtml;
        return this._div;
    };
    groupingViewsControl.addTo(map);
});

function resolveToPoint(deg) {
    var rad = Math.PI * (90 - deg) / 180;
    mX = pieRadius * Math.cos(rad);
    mY = pieRadius * Math.sin(rad);
    if (Math.abs(mX) < 0.00001) {
        mX = 0.0;
    }
    if (Math.abs(mY) < 0.00001) {
        mY = 0.0;
    }
    return {x: pieCenter.x + mX, y: pieCenter.y - mY};
}

function getSVGPie(votes, total, text) {
    var htmlStart = '<svg id="svg" width="' + (pieCenter.x*2) + 'px" height="' + (pieCenter.y*2) + 'px" xmlns="http://www.w3.org/2000/svg" version="1.1" onmouseover="$(this).children(\'circle\').attr(\'stroke-width\', \'2\');" onmouseout="$(this).children(\'circle\').attr(\'stroke-width\', \'0\');">',
        htmlEnd = text + '</svg>',
        html = '',
        previousAngle = 0,
        previousPoint = resolveToPoint(previousAngle);
    html += '<circle cx="' + pieCenter.x + '" cy="' + pieCenter.y + '" r="' + (pieRadius + 1) + '" stroke="black" stroke-width="1"/>';
    for (var i=0, len=votes.length; i<len; i++) {
        if (votes[i].votes == total) {
            var color;
            if (legend && legend.color && legend.color.responses && legend.color.responses[votes[i].value]) {
                color = legend.color.responses[votes[i].value].legend;
            } else {
                color = fallbackColor;
            }
            html += '<circle cx="' + pieCenter.x + '" cy="' + pieCenter.y + '" r="' + pieRadius + '" fill="' + color + '" stroke="black" stroke-width="0"/>';
            break;
        }
        if (votes[i].votes > 0) {
            angle_dif = (360 * votes[i].votes / total);
            angle = previousAngle + angle_dif;
            next_point = resolveToPoint(angle);
            html += '<path d="M' + pieCenter.x + ',' + pieCenter.y + ' L' + previousPoint.x + ',' + previousPoint.y + ' A' + pieRadius + ',' + pieRadius + ' 0 ' + (angle_dif > 180 ? '1' : '0') + ',1 ' + next_point.x + ',' + next_point.y + ' z" fill="' + legend.color.responses[votes[i].value].legend + '" />';
            previousPoint = next_point;
            previousAngle = angle;
        }
    }
    return htmlStart + html + htmlEnd;
}

function getClusterIcon(votes, total) {
    text = '<text x="21" y="27" font-family="Verdana" font-weight="bold" fill="#FFFFFF" stroke="#000000" stroke-width="0.7" font-size="17" style="text-anchor: middle;">' + total + '</text>';
    return getSVGPie(votes, total, text);
}

function getClusterIcon(votes, total) {
    text = '<text x="21" y="27" font-family="Verdana" font-weight="bold" fill="#FFFFFF" stroke="#000000" stroke-width="0.7" font-size="17" style="text-anchor: middle;">' + total + '</text>';
    return getSVGPie(votes, total, text);
}
