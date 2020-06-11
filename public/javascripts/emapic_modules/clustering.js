//
// Clustering code
//

// Add the element to the body in order to preload the image, and then remove it
var img = $("<div style='display: none;'><img src='/images/icon-clustering.png'/></div>");
img.appendTo('content');
img.remove();

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
    emapic.modules.clustering.markerClusterOptions = {};

    emapic.showMarker = emapic.utils.overrideFunction(emapic.showMarker, null, function(dumb, marker) {
        if (clusteringActive) {
            var parent = emapic.indivVotesLayer.getVisibleParent(marker);
            if (parent && parent.spiderfy) {
                parent.spiderfy();
            } else if (currentSpiderfied && currentSpiderfied.getAllChildMarkers().indexOf(marker) === -1) {
                if (currentSpiderfied._map) {
                    currentSpiderfied.unspiderfy();
                }
            }
        }
        return marker;
    });

    emapic.loadIndivVotesLayer = emapic.utils.overrideFunction(emapic.loadIndivVotesLayer, null, function(markers) {
        if (!clusteringActive && !emapic.indivVotesLayer.enableClustering) {
            return markers;
        }
        emapic.indivVotesLayer = new L.MarkerClusterGroup($.extend({
            iconCreateFunction: function(cluster) {
                var markers = cluster.getAllChildMarkers();
                return new L.DivIcon({ className: 'marker-cluster-svg', iconSize: L.point(pieCenter.x * 2, pieCenter.y * 2),
                    html: getClusterIcon(emapic.modules.clustering.getClusterColors(markers), markers.length)
                });
            }
        }, emapic.modules.clustering.markerClusterOptions));
        emapic.indivVotesLayer.addLayer(markers);
        emapic.indivVotesLayer.on('spiderfied', function(ev) {
            currentSpiderfied = ev.cluster;
        });
        emapic.indivVotesLayer.on('unspiderfied', function(ev) {
            currentSpiderfied = null;
        });
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

    function showCurrentMarkersOnce() {
        emapic.indivVotesLayer.off('animationend', showCurrentMarkersOnce);
        // After clustering / unclustering, check if there is a marker to
        // show
        var currentMarkerToShow = emapic.getCurrentMarkerToShow();
        if (currentMarkerToShow) {
            emapic.showMarker(currentMarkerToShow);
        }
    }

    emapic.modules.clustering.toggle = function() {
        clusteringActive = !clusteringActive;
        emapic.toggleButton(emapic.modules.clustering.getButton());
        if (emapic.indivVotesLayer.enableClustering) {
            emapic.indivVotesLayer.on('animationend', showCurrentMarkersOnce);
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
    };

    emapic.disableIndivLayerExclusiveComponents = emapic.utils.overrideFunction(emapic.disableIndivLayerExclusiveComponents, null, function() {
        $('.leaflet-control.clustering-control').addClass('force-disable');
    });

    emapic.enableIndivLayerExclusiveComponents = emapic.utils.overrideFunction(emapic.enableIndivLayerExclusiveComponents, null, function() {
        $('.leaflet-control.clustering-control').removeClass('force-disable');
    });

    emapic.addViewsControls = emapic.utils.overrideFunction(emapic.addViewsControls, null, function() {
        var clusteringControl = L.control({position: 'topleft'});
        clusteringControl.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'clustering-control views-control leaflet-bar');
            this._div.innerHTML = clusteringButtonsHtml;
            return this._div;
        };
        clusteringControl.addTo(emapic.map);
        emapic.utils.handleCtrlBtnEvents('.clustering-control a', clusteringControl);
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
        var htmlStart = '<svg width="' + (pieCenter.x*2) + 'px" height="' + (pieCenter.y*2) + 'px" xmlns="http://www.w3.org/2000/svg" version="1.1" onmouseover="$(this).children(\'circle:first-of-type\').attr(\'stroke-width\', \'2\');" onmouseout="$(this).children(\'circle:first-of-type\').attr(\'stroke-width\', \'0\');">',
            htmlEnd = text + '</svg>',
            html = '',
            previousAngle = 0,
            previousPoint = resolveToPoint(previousAngle);
        html += '<circle cx="' + pieCenter.x + '" cy="' + pieCenter.y + '" r="' + (pieRadius + 1) + '" stroke="black" stroke-width="0"/>';
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
