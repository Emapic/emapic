//
// Emapic panel
//

$('html body').append("<!-- sidebarPanel ----------------------------------------------------->\n" +
"<div id='sidebarPanel'>\n"+
"<div id='titlesidebarPanel'></div>" +
"<div id='indivData'></div>\n" +
"<div id='navContainer'></div>\n" +
"<div id='closesidebarPanel'></div>\n" +
"</div>");

var emapic = emapic || {};

(function(emapic) {

    var titlesidebarPanel = $('#titlesidebarPanel'),
    closesidebarPanel = $('#closesidebarPanel'),
    navContainer = $('#navContainer'),
    sidebarPanel,
    titlesidebarPanelHtml = "<h3>" + emapic.utils.getI18n('js_see_answers', 'Ver respuestas') + "</h3>\n",
    closesidebarPanelHtml = "<button type='button' title='" + emapic.utils.getI18n('js_close_panel', 'Cerrar') + "' onclick='emapic.sidebarPanelClose();'><span class='glyphicon glyphicon-chevron-right'></span></button>",
    navHtml = "<button id='FirstButton' title='" + emapic.utils.getI18n('js_go_first', 'Ir al primero') + "' class='btn btn-default btn-xs' onclick='emapic.modules.panel.goToFirst();'><span class='glyphicon glyphicon-fast-backward'></span></button>\n" +
    "<button id='PrevButton' title='" + emapic.utils.getI18n('js_go_previous', 'Ir al anterior') + "' class='btn btn-default btn-xs' onclick='emapic.modules.panel.goToPrevious();'><span class='glyphicon glyphicon-step-backward'></span></button>\n" +
    "<input type='text' id='CurrentFeatureNumber' maxlength='7'></input><label>/</label><label id='TotalFeatures'></label>\n" +
    "<button id='NextButton' title='" + emapic.utils.getI18n('js_go_next', 'Ir al siguiente') + "' class='btn btn-default btn-xs' onclick='emapic.modules.panel.goToNext();'><span class='glyphicon glyphicon-step-forward'></span></button>\n" +
    "<button id='LastButton' title='" + emapic.utils.getI18n('js_go_last', 'Ir al último') + "' class='btn btn-default btn-xs' onclick='emapic.modules.panel.goToLast();'><span class='glyphicon glyphicon-fast-forward'></span></button>\n",
    currentFeature,
    currentIcon = null,
    nrLayers,
    selectedLayerNr,
    layers;

    emapic.modules = emapic.modules || {};
    emapic.modules.panel = emapic.modules.panel || {};

    emapic.disableIndivLayerExclusiveComponents = emapic.utils.overrideFunction(emapic.disableIndivLayerExclusiveComponents, null, function() {
        sidebarPanel.hide();
        currentFeature = null;
        currentIcon = null;
    });

    emapic.enableIndivLayerExclusiveComponents = emapic.utils.overrideFunction(emapic.enableIndivLayerExclusiveComponents, null, function() {
        sidebarPanel.hide();
        currentFeature = null;
        currentIcon = null;
    });

    emapic.initializeMap = emapic.utils.overrideFunction(emapic.initializeMap, null, function() {
        sidebarPanel = L.control.sidebar('sidebarPanel', {
            position: 'right',
            autoPan: false,
            closeButton: false
        });
        bodysidebarPanel();
        emapic.map.addControl(sidebarPanel);
        $('#CurrentFeatureNumber').keydown(featureNumberKeydown);
    });

    function bodysidebarPanel() {
        titlesidebarPanel.html(titlesidebarPanelHtml);
        navContainer.html(navHtml);
        closesidebarPanel.html(closesidebarPanelHtml);
    }

    emapic.sidebarPanelClose = emapic.utils.overrideFunction(emapic.sidebarPanelClose, null, function() {
        sidebarPanel.hide();
    });

    emapic.modules.panel.updateData = function(number) {
        currentFeature = number;
        var currentFeatureInput = $('#CurrentFeatureNumber');
        $('#TotalFeatures').text(nrLayers);
        currentFeatureInput.attr("size", (nrLayers.toString().length < 3) ? 3 : nrLayers.toString().length);
        currentFeatureInput.attr("maxlength", nrLayers.toString().length);
        currentFeatureInput.val(currentFeature + 1);
        $('#PrevButton').prop('disabled', currentFeature === 0);
        $('#NextButton').prop('disabled', currentFeature === (nrLayers - 1));
        $("#indivData").html(emapic.getPopupHtml(layers[number].feature.properties));
        if (!(emapic.map.getBounds().contains(layers[number].getLatLng()))) {
            emapic.map.setView(layers[number].getLatLng());
        }
    };

    emapic.modules.panel.getColorPanelSelect = function(number) {
        layers[number].setIcon(
            L.divIcon({
                className: 'svg-marker',
                html: emapic.utils.getGlyphiconMarkerIconHtml (null, emapic.getIconColor(layers[number].feature.properties),0.5,7),
                iconAnchor: [16.5, 45]
            })
        );
    };

    emapic.modules.panel.getColorPanelUnselect = function(number) {
        layers[number].setIcon(
            L.divIcon({
                className: 'svg-marker',
                html: emapic.utils.getGlyphiconMarkerIconHtml (null, emapic.getIconColor(layers[number].feature.properties),0.5,7),
                iconAnchor: [16.5, 45]
            })
        );
        if (currentIcon !== null) {
            currentIcon.setIcon(
                L.divIcon({
                    className: 'circle-icon',
                    html: emapic.getIconHtml(currentIcon.feature.properties)
                })
            );
        }
        currentIcon = layers[number];
    };

    emapic.modules.panel.goToRegister = function(number) {
        if (currentFeature !== number) {
            emapic.modules.panel.getColorPanelUnselect(number);
        }
        emapic.modules.panel.getColorPanelSelect(number);
        emapic.modules.panel.updateData(number);
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

    emapic.indivVotesLayerOnEachFeature = emapic.utils.overrideFunction(emapic.indivVotesLayerOnEachFeature, null, function(data) {
        data.layer.unbindPopup();
        data.layer.on('click', function() {
            layers = emapic.getIndivVotesLayerLeafletLayers();
            nrLayers = layers.length;
            selectedLayerNr = null;
            for (var i = 0; i < nrLayers; i++) {
                if (layers[i].feature === data.feature) {
                    selectedLayerNr = i;
                    break;
                }
            }
            if (selectedLayerNr === null) {
                console.error("Can't find layer for panel.");
                return;
            }
            emapic.modules.panel.goToRegister(selectedLayerNr);
            emapic.sidebarPanelClose();
            sidebarPanel.show();
        });
    });

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
