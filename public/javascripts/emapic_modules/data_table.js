//
// Open modal with data in tabular format
//

var emapic = emapic || {};

(function(emapic) {

    var openDataTableModalBtnHtml = "<a id='open-data-table' title='" + emapic.utils.getI18n('js_open_data_table', 'Ver tabla con los datos') + "' href='javascript:void(0)'><span class='glyphicon glyphicon-list-alt'></span></a>";

    emapic.addViewsControls = emapic.utils.overrideFunction(emapic.addViewsControls, null, function() {
        var openDataTableControl = L.control({position: 'topleft'});
        openDataTableControl.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'data-table-control views-control leaflet-bar');
            this._div.innerHTML = openDataTableModalBtnHtml;
            return this._div;
        };
        openDataTableControl.addTo(emapic.map);
        L.DomEvent.on(document.getElementById('open-data-table'), 'click', function() {
            emapic.modules.dataTable.openDataTableModal();
        });
        emapic.utils.handleCtrlBtnEvents('.data-table-control a', openDataTableControl);
    });

    emapic.modules = emapic.modules || {};
    emapic.modules.dataTable = emapic.modules.dataTable || {};

    emapic.modules.dataTable.openDataTableModal = function() {
        $('.tooltip').tooltip('hide');
        emapic.utils.disableMapInteraction(true, false);
        emapic.modules.dataTable.refreshDataTablePromise()
            .done(function() {
                $('#data-table-modal').modal('show');
            })
            .fail(function() {
                emapic.utils.notifyError('js_error_open_data_table');
            })
            .always(function() {
                emapic.utils.enableMapInteraction();
            });
    };

    emapic.modules.dataTable.refreshDataTablePromise = function() {
        return $.ajax({
            url: emapic.modules.dataTable.getHTMLTableURL()
        }).done(function(html) {
            $('#data-table-modal .modal-body .table-container').html(html);
        });
    };

    emapic.modules.dataTable.getHTMLTableURL = function() {
        return emapic.getExportFilteredURL('html');
    };

})(emapic);
