//
// Open modal with data in tabular format
//

var emapic = emapic || {};

(function(emapic) {

    var openDataTableModalBtnHtml = "<a id='open-data-table' title='" + emapic.utils.getI18n('js_open_data_table', 'Ver tabla con los datos') + "' href='javascript:void(0)'><span class='glyphicon glyphicon-list-alt'></span></a>",
        dataTableClass = 'has-data-tables';

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
        }).then(emapic.modules.dataTable.updateDataTableHtmlPromise);
    };

    emapic.modules.dataTable.updateDataTableHtmlPromise = function(html) {
        var promise = $.Deferred();
        try {
            if (DataTable) {
                $('#data-table-modal .modal-body').addClass(dataTableClass).html(html);
                $('#data-table-modal .modal-body table thead .no-sorting').attr('data-dt-order', 'disable');
                DataTable.datetime(emapic.utils.getI18n('js_datatables_date_time_format', 'DD/MM/YYYY HH:mm:ss'));
                new DataTable('#data-table-modal .modal-body table', {
                    pageLength: 10,
                    lengthMenu: [5, 10, 25, 50, 100],
                    language: {
                        url: emapic.utils.getI18n('js_datatables_i18n_url', 'https://cdn.datatables.net/plug-ins/2.3.1/i18n/es-ES.json'),
                    },
                    initComplete: function() {
                        // Add a small delay to make sure DataTables
                        // has finished adjusting the columns as well
                        setTimeout(promise.resolve, 200);
                    }
                });
            } else {
                $('#data-table-modal .modal-body .table-container').removeClass(dataTableClass).html(html);
                promise.resolve();
            }
        } catch (error) {
            promise.reject();
        }
        return promise;
    };

    emapic.modules.dataTable.getHTMLTableURL = function() {
        return emapic.getExportFilteredURL('html');
    };

})(emapic);
