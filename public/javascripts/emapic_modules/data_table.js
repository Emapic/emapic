//
// Open modal with data in tabular format
//

var emapic = emapic || {};

(function(emapic) {

    var openDataTableModalBtnHtml = "<a id='open-data-table' title='" + emapic.utils.getI18n('js_open_data_table', 'Ver tabla con los datos') + "' href='javascript:void(0)'><span class='glyphicon glyphicon-list-alt'></span></a>",
        dataTableClass = 'has-data-tables',
        resultsTable;

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
                resultsTable = new DataTable('#data-table-modal .modal-body table', {
                    pageLength: 10,
                    lengthMenu: [5, 10, 25, 50, 100],
                    language: {
                        url: emapic.utils.getI18n('js_datatables_i18n_url', 'https://cdn.datatables.net/plug-ins/2.3.1/i18n/es-ES.json'),
                    },
                    order: [[1, 'desc']],
                    layout: {
                        topEnd: {
                            buttons: [
                                {
                                    extend: 'selectedSingle',
                                    text: emapic.utils.getI18n('js_datatables_btn_see_response', 'Ver respuesta seleccionada en el mapa'),
                                    action: function (e, dt, button, config) {
                                        var marker = emapic.getIndivVotesLayerLeafletLayers().filter(function(lyr) {
                                            return lyr.feature.properties.id === parseInt(dt.row({ selected: true }).id())
                                        });
                                        if (marker) {
                                            $('#data-table-modal').modal('hide');
                                            emapic.indivVotesLayerFeatureUnselected();
                                            emapic.zoomAndClickOnMarker(marker[0]);
                                        }
                                    }
                                }
                            ],
                            search: true
                        }
                    },
                    responsive: true,
                    select: {
                        items: 'row',
                        style: 'single',
                        info: false
                    },
                    rowId: function(a) {
                        return a[0];
                    },
                    initComplete: function(settings) {
                        var api = new $.fn.dataTable.Api(settings),
                            hideIdColumnFn = function() {
                                api.column('.id-cell').visible(false);
                                api.off('responsive-resize', hideIdColumnFn);
                            };

                        hideIdColumnFn();

                        // Add a small delay to make sure DataTables
                        // has finished adjusting the columns as well
                        setTimeout(function() {

                            // When hiding the first column while using complex headers
                            // and the responsive extension, we must make sure the
                            // columns' width has been previously computed, so we
                            // hide the id column again after the first resize process
                            api.on('responsive-resize', hideIdColumnFn);

                            promise.resolve();
                        }, 250);
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
