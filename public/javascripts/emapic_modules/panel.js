//
// Emapic panel
//

var emapic = emapic || {};

(function(emapic) {

    var sidebarHtml = "<!-- sidebarPanel ----------------------------------------------------->\n" +
            "<div id='sidebarPanel'>\n"+
            "<div id='titlesidebarPanel'></div>" +
            "<div id='indivData'></div>\n" +
            "<div id='navContainer'></div>\n" +
            "<div id='closesidebarPanel'></div>\n" +
            "<div id='opensidebarPanel' class='hidden'></div>\n" +
            "</div>",
        titlesidebarPanel,
        closesidebarPanel,
        opensidebarPanel,
        navContainer,
        sidebarPanel,
        closesidebarPanelHtml = "<button type='button' title='" + emapic.utils.getI18n('js_close', 'Cerrar') + "' onclick='emapic.sidebarPanelClose();'><span class='glyphicon glyphicon-chevron-right'></span></button>",
        opensidebarPanelHtml = "<button type='button' title='" + emapic.utils.getI18n('js_open', 'Abrir') + "' onclick='emapic.modules.panel.sidebarPanelReopen();'><span class='glyphicon glyphicon-chevron-left'></span></button>",
        navHtml = "<button id='FirstButton' title='" + emapic.utils.getI18n('js_go_first', 'Ir al primero') + "' class='btn btn-default btn-xs' onclick='emapic.modules.panel.goToFirst();'><span class='glyphicon glyphicon-fast-backward'></span></button>\n" +
            "<button id='PrevButton' title='" + emapic.utils.getI18n('js_go_previous', 'Ir al anterior') + "' class='btn btn-default btn-xs' onclick='emapic.modules.panel.goToPrevious();'><span class='glyphicon glyphicon-step-backward'></span></button>\n" +
            "<input type='text' id='CurrentFeatureNumber' maxlength='7'></input><label>/</label><label id='TotalFeatures'></label>\n" +
            "<button id='NextButton' title='" + emapic.utils.getI18n('js_go_next', 'Ir al siguiente') + "' class='btn btn-default btn-xs' onclick='emapic.modules.panel.goToNext();'><span class='glyphicon glyphicon-step-forward'></span></button>\n" +
            "<button id='LastButton' title='" + emapic.utils.getI18n('js_go_last', 'Ir al último') + "' class='btn btn-default btn-xs' onclick='emapic.modules.panel.goToLast();'><span class='glyphicon glyphicon-fast-forward'></span></button>\n",
        currentFeature = null,
        latestFeature = null,
        oldIcon = null,
        currentMarker = null,
        nrLayers,
        layers;

    emapic.modules = emapic.modules || {};
    emapic.modules.panel = emapic.modules.panel || {};
    emapic.modules.panel.allowReopen = false;

    emapic.disableIndivLayerExclusiveComponents = emapic.utils.overrideFunction(emapic.disableIndivLayerExclusiveComponents, null, function() {
        if (currentFeature !== null) {
            emapic.sidebarPanelClose();
        }
        oldIcon = null;
        currentMarker = null;
    });

    emapic.enableIndivLayerExclusiveComponents = emapic.utils.overrideFunction(emapic.enableIndivLayerExclusiveComponents, null, function() {
        oldIcon = null;
        currentMarker = null;
        if (currentFeature !== null) {
            emapic.sidebarPanelClose();
        }
    });

    emapic.getCurrentMarkerToShow = function() {
        return currentMarker;
    };

    emapic.initializeMap = emapic.utils.overrideFunction(emapic.initializeMap, null, function() {
        $('html body').append(sidebarHtml);
        sidebarPanel = L.control.sidebar('sidebarPanel', {
            position: 'topright',
            autoPan: false,
            closeButton: false
        });
        emapic.map.addControl(sidebarPanel);
        titlesidebarPanel = $('#titlesidebarPanel');
        closesidebarPanel = $('#closesidebarPanel');
        opensidebarPanel = $('#opensidebarPanel');
        navContainer = $('#navContainer');
        bodysidebarPanel();
        $('#CurrentFeatureNumber').keydown(featureNumberKeydown);
    });

    function bodysidebarPanel() {
        navContainer.html(navHtml);
        closesidebarPanel.html(closesidebarPanelHtml);
        opensidebarPanel.html(opensidebarPanelHtml);
    }

    emapic.sidebarPanelClose = emapic.utils.overrideFunction(emapic.sidebarPanelClose, null, function() {
        sidebarPanel.hide();
        emapic.modules.panel.getColorPanelUnselect();
        currentFeature = null;
    });

    emapic.modules.panel.getPanelTitleHTML = function(properties) {
        return "<h3>" + emapic.utils.getI18n('js_see_answers', 'Ver respuestas') + "</h3>\n";
    };

    emapic.modules.panel.updateData = function(number, silent) {
        latestFeature = currentFeature = number;
        var currentFeatureInput = $('#CurrentFeatureNumber');
        $('#TotalFeatures').text(nrLayers);
        currentFeatureInput.attr("size", (nrLayers.toString().length < 3) ? 3 : nrLayers.toString().length);
        currentFeatureInput.attr("maxlength", nrLayers.toString().length);
        currentFeatureInput.val(currentFeature + 1);
        $('#PrevButton').prop('disabled', currentFeature === 0);
        $('#NextButton').prop('disabled', currentFeature === (nrLayers - 1));
        var title = emapic.modules.panel.getPanelTitleHTML(layers[number].feature.properties);
        if (title !== null) {
            titlesidebarPanel.html(title);
            titlesidebarPanel.show();
        } else {
            titlesidebarPanel.hide();
        }
        $("#indivData").html(emapic.getPopupHtml(layers[number].feature.properties));
        if (!silent) {
            emapic.showMarker(layers[number]);
        }
    };

    emapic.modules.panel.getColorPanelSelect = function(number) {
        oldIcon = layers[number].options.icon;
        layers[number].setIcon(emapic.modules.panel.getSelectedIcon(layers[number].feature.properties));
        emapic.indivVotesLayerFeatureSelected(layers[number].feature);
    };

    emapic.modules.panel.getColorPanelUnselect = function() {
        if (currentMarker !== null && oldIcon !== null) {
            currentMarker.setIcon(oldIcon);
            emapic.indivVotesLayerFeatureUnselected(currentMarker.feature);
        }
        currentMarker = null;
        oldIcon = null;
    };

    emapic.modules.panel.getSelectedIcon = function(properties) {
        return L.divIcon({
            className: 'svg-marker',
            html: emapic.utils.getGlyphiconMarkerIconHtml(null, emapic.getIconColor(properties)),
            iconAnchor: [16.5, 45]
        });
    };

    emapic.modules.panel.goToRegister = function(number, silent) {
        if (number !== null && currentFeature !== number) {
            emapic.modules.panel.getColorPanelUnselect();
            currentMarker = layers[number];
            if (emapic.modules.panel.allowReopen) {
                opensidebarPanel.removeClass('hidden');
            }
            emapic.modules.panel.getColorPanelSelect(number);
            emapic.modules.panel.updateData(number, silent);
        }
    };

    emapic.modules.panel.goToFirst =  function () {
        emapic.modules.panel.goToRegister(0);
    };

    emapic.modules.panel.goToLast = function () {
        emapic.modules.panel.goToRegister(layers.length - 1);
    };

    emapic.modules.panel.goToPrevious = function () {
        emapic.modules.panel.goToRegister(currentFeature - 1);
    };

    emapic.modules.panel.goToNext = function () {
        emapic.modules.panel.goToRegister(currentFeature + 1);
    };

    emapic.modules.panel.getDisplayedFeature = function() {
        return currentFeature !== null ? layers[currentFeature].feature : null;
    };

    emapic.modules.panel.getDisplayedFeatureLayer = function() {
        return currentFeature !== null ? layers[currentFeature] : null;
    };

    emapic.modules.panel.sidebarPanelReopen = function() {
        if (latestFeature) {
            emapic.modules.panel.goToRegister(latestFeature, true);
            sidebarPanel.show();
        }
    };

    emapic.indivVotesLayerOnEachFeature = function(data) {
        data.layer.on('click', function(e) {
            layers = emapic.getIndivVotesLayerLeafletLayers();
            nrLayers = layers.length;
            var newFeature = null;
            for (var i = 0; i < nrLayers; i++) {
                if (layers[i].feature === data.feature) {
                    newFeature = i;
                    break;
                }
            }
            if (newFeature === null) {
                console.error("Can't find layer for panel.");
                return;
            }
            if (currentFeature === null) {
                emapic.sidebarPanelClose();
            }
            emapic.modules.panel.goToRegister(newFeature);
            sidebarPanel.show();
        });
        return data;
    };

    function featureNumberKeydown(e) {
        if (emapic.utils.filterKeydownOnlyDigits(e)) {
            var key = e.keyCode || e.which;
            if (key === 13) {
                var valueCurrentNumber = parseInt($("#CurrentFeatureNumber").val(), 10);
                if (valueCurrentNumber <= 0) {
                    valueCurrentNumber = 1;
                } else if (valueCurrentNumber > nrLayers) {
                    valueCurrentNumber = nrLayers;
                }
                emapic.modules.panel.goToRegister(valueCurrentNumber - 1);
            }
        }
    }

}(emapic));
