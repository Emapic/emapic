//
// Clustering code
//

var emapic = emapic || {};

(function(emapic) {

    var clusteringActive = true,
        clusteringButtonId = 'clustering-control-activate',
        clusteringButtonsHtml = "<a id='" + clusteringButtonId + "' title='" + emapic.utils.getI18n('js_disable_clustering', 'Desactivar clustering') + "' href='javascript:void(0)' onclick='emapic.modules.clustering.toggle()'><img src='/images/icon-clustering.png' style='width: 16px; height: 16px;'/></a>",
        pieCenter = {x: 21.0, y: 21.0},
        pieRadius = 19.0,
        currentSpiderfied = null;

    emapic.modules = emapic.modules || {};
    emapic.modules.clustering = emapic.modules.clustering || {};

    emapic.showMarker = emapic.utils.overrideFunction(emapic.showMarker, null, function(dumb, marker) {
        if (clusteringActive) {
            var parent = emapic.indivVotesLayer.getVisibleParent(marker);
            if (parent.spiderfy) {
                parent.spiderfy();
                currentSpiderfied = parent;
            } else if (currentSpiderfied && currentSpiderfied.getAllChildMarkers().indexOf(marker) === -1) {
                currentSpiderfied.unspiderfy();
                currentSpiderfied = null;
            }
        }
        return marker;
    });

    emapic.loadIndivVotesLayer = emapic.utils.overrideFunction(emapic.loadIndivVotesLayer, null, function(markers) {
        if (!clusteringActive && !emapic.indivVotesLayer.enableClustering) {
            return markers;
        }
        emapic.indivVotesLayer = new L.MarkerClusterGroup({
            iconCreateFunction: function(cluster) {
                var markers = cluster.getAllChildMarkers();
                return new L.DivIcon({ className: 'marker-cluster-svg', iconSize: L.point(pieCenter.x * 2, pieCenter.y * 2),
                    html: getClusterIcon(emapic.modules.clustering.getClusterColors(markers), markers.length)
                });
            }
        });
        emapic.indivVotesLayer.addLayer(markers);
        emapic.indivVotesLayer.on('add', function(ev) {
            // We remove and later readd the markers in order to avoid the
            // unclustering animation on loading
            emapic.indivVotesLayer.removeLayer(markers);
            if (!clusteringActive) {
                emapic.indivVotesLayer.disableClustering();
            }
            emapic.indivVotesLayer.addLayer(markers);
        });
        return emapic.indivVotesLayer;
    });

    emapic.modules.clustering.getClusterColors = function(markers) {
        var colors = {};
        for (var i = 0, iLen = markers.length; i < iLen; i++) {
            var color = emapic.getIconColor(markers[i].feature.properties);
            if (!(color in colors)) {
                colors[color] = 0;
            }
            colors[color]++;
        }
        var colorsOrdered = [];
        for (var color in colors) {
            colorsOrdered.push({
                color: color,
                votes: colors[color]
            });
        }
        colorsOrdered.sort(function(a, b) {
            return b.votes - a.votes;
        });
        return colorsOrdered;
    };

    emapic.modules.clustering.isActive = function() {
        return clusteringActive;
    };

    emapic.modules.clustering.toggle = function() {
        clusteringActive = !clusteringActive;
        emapic.toggleButton(emapic.modules.clustering.getButton());
        if (emapic.indivVotesLayer.enableClustering) {
            clusteringActive ? emapic.indivVotesLayer.enableClustering() : emapic.indivVotesLayer.disableClustering();
        } else {
            // There are some instances where it's preferrable to handle layer
            // reloading manually and we simply don't use markercluster.freezable
            emapic.updateIndivVotesLayer();
        }
    };

    emapic.modules.clustering.activate = function() {
        if (!emapic.modules.clustering.isActive()) {
            emapic.modules.clustering.toggle();
        }
    };

    emapic.modules.clustering.deactivate = function() {
        if (emapic.modules.clustering.isActive()) {
            emapic.modules.clustering.toggle();
        }
    };

    emapic.modules.clustering.getButton = function() {
        return $('#' + clusteringButtonId);
    }

    emapic.addViewsControls = emapic.utils.overrideFunction(emapic.addViewsControls, null, function() {
        var groupingViewsControl = L.control({position: 'topleft'});
        groupingViewsControl.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'views-control leaflet-bar');
            this._div.innerHTML = clusteringButtonsHtml;
            return this._div;
        };
        groupingViewsControl.addTo(emapic.map);
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

    function getSVGPie(colors, total, text) {
        var htmlStart = '<svg width="' + (pieCenter.x*2) + 'px" height="' + (pieCenter.y*2) + 'px" xmlns="http://www.w3.org/2000/svg" version="1.1" onmouseover="$(this).children(\'circle\').attr(\'stroke-width\', \'2\');" onmouseout="$(this).children(\'circle\').attr(\'stroke-width\', \'0\');">',
            htmlEnd = text + '</svg>',
            html = '',
            previousAngle = 0,
            previousPoint = resolveToPoint(previousAngle);
        html += '<circle cx="' + pieCenter.x + '" cy="' + pieCenter.y + '" r="' + (pieRadius + 1) + '" stroke="black" stroke-width="1"/>';
        for (var i = 0, iLen = colors.length; i<iLen; i++) {
            var color = colors[i].color,
                votes = colors[i].votes;
            if (votes === total) {
                html += '<circle cx="' + pieCenter.x + '" cy="' + pieCenter.y + '" r="' + pieRadius + '" fill="' + color + '" stroke="black" stroke-width="0"/>';
                break;
            }
            if (votes > 0) {
                angle_dif = (360 * votes / total);
                angle = previousAngle + angle_dif;
                next_point = resolveToPoint(angle);
                html += '<path d="M' + pieCenter.x + ',' + pieCenter.y + ' L' + previousPoint.x + ',' + previousPoint.y + ' A' + pieRadius + ',' + pieRadius + ' 0 ' + (angle_dif > 180 ? '1' : '0') + ',1 ' + next_point.x + ',' + next_point.y + ' z" fill="' + color + '" />';
                previousPoint = next_point;
                previousAngle = angle;
            }
        }
        return htmlStart + html + htmlEnd;
    }

    function getClusterIcon(colors, total) {
        text = '<text x="' + pieCenter.x + '" y="27" font-family="Verdana" font-weight="bold" fill="#FFFFFF" stroke="#000000" stroke-width="0.7" font-size="17" style="text-anchor: middle;">' + total + '</text>';
        return getSVGPie(colors, total, text);
    }

})(emapic);
