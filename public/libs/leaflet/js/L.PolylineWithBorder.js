L.PolylineWithBorder = L.Polyline.extend({
    initialize: function (latlngs, options) {
        L.Polyline.prototype.initialize.call(this, latlngs, options);
        this._borderLayer = new L.Polyline(latlngs);
    },

    beforeAdd: function (map) {
        L.Polyline.prototype.beforeAdd.call(this._borderLayer, map);
        L.Polyline.prototype.beforeAdd.call(this, map);
        this._borderLayer._map = map;
    },

    // @method redraw(): this
    // Redraws the layer. Sometimes useful after you changed the coordinates that the path uses.
    redraw: function () {
        L.Polyline.prototype.redraw.call(this._borderLayer, map);
        return __redraw.call(this, map);
    },

    onAdd: function (map) {
        map = map || this._map;
        L.Polyline.prototype.onAdd.call(this._borderLayer, map);
        L.Polyline.prototype.onAdd.call(this, map);
    },

    onRemove: function (map) {
        map = map || this._map;
        L.Polyline.prototype.onRemove.call(this, map);
        L.Polyline.prototype.onRemove.call(this._borderLayer, map);
    },

    bringToFront: function () {
        L.Polyline.prototype.bringToFront.call(this._borderLayer);
        L.Polyline.prototype.bringToFront.call(this);
    },

    bringToBack: function () {
        L.Polyline.prototype.bringToBack.call(this);
        L.Polyline.prototype.bringToBack.call(this._borderLayer);
    },

    setStyle: function(stl) {
        var style = Object.create(stl);
        L.Polyline.prototype.setStyle.call(this._borderLayer, {
            color: style.color || '#000',
            opacity: style.opacity,
            weight: (style.weight || 1) * 2 + (style.width || 3),
            lineCap: 'square',
            interactive: false
        });
        style.opacity = style.fillOpacity;
        style.color = style.fillColor;
        style.weight = style.width || 3;
        style.lineCap = 'square';
        L.Polyline.prototype.setStyle.call(this, style);
    }
});

L.GeoJSONWithBorder = L.GeoJSON.extend({
    geometryToLayerWithBorder: function(geojson, options) {
        var geometry = geojson.type === 'Feature' ? geojson.geometry : geojson,
            coords = geometry ? geometry.coordinates : null,
            layers = [],
            pointToLayer = options && options.pointToLayer,
            _coordsToLatLng = options && options.coordsToLatLng || L.GeoJSON.coordsToLatLng,
            latlng, latlngs, i, len;

        if (!coords && !geometry) {
            return null;
        }

        switch (geometry.type) {
            case 'Point':
                latlng = _coordsToLatLng(coords);
                return pointToLayer ? pointToLayer(geojson, latlng) : new L.Marker(latlng);

            case 'MultiPoint':
                for (i = 0, len = coords.length; i < len; i++) {
                    latlng = _coordsToLatLng(coords[i]);
                    layers.push(pointToLayer ? pointToLayer(geojson, latlng) : new L.Marker(latlng));
                }
                return new L.FeatureGroup(layers);

            case 'LineString':
            case 'MultiLineString':
                latlngs = L.GeoJSON.coordsToLatLngs(coords, geometry.type === 'LineString' ? 0 : 1, _coordsToLatLng);
                return new L.PolylineWithBorder(latlngs, options);

            case 'Polygon':
            case 'MultiPolygon':
                latlngs = L.GeoJSON.coordsToLatLngs(coords, geometry.type === 'Polygon' ? 1 : 2, _coordsToLatLng);
                return new L.Polygon(latlngs, options);

            case 'GeometryCollection':
                for (i = 0, len = geometry.geometries.length; i < len; i++) {
                    var layer = L.GeoJSON.geometryToLayer({
                        geometry: geometry.geometries[i],
                        type: 'Feature',
                        properties: geojson.properties
                    }, options);

                    if (layer) {
                        layers.push(layer);
                    }
                }
                return new L.FeatureGroup(layers);

            default:
                throw new Error('Invalid GeoJSON object.');
        }
    },

    addData: function (geojson) {
        var features = L.Util.isArray(geojson) ? geojson : geojson.features,
            i, len, feature;

        if (features) {
            for (i = 0, len = features.length; i < len; i++) {
                // only add this if geometry or geometries are set and not null
                feature = features[i];
                if (feature.geometries || feature.geometry || feature.features || feature.coordinates) {
                    this.addData(feature);
                }
            }
            return this;
        }

        var options = this.options;

        if (options.filter && !options.filter(geojson)) { return this; }

        var layer = this.geometryToLayerWithBorder(geojson, options);
        if (!layer) {
            return this;
        }
        layer.feature = L.GeoJSON.asFeature(geojson);

        layer.defaultOptions = layer.options;
        this.resetStyle(layer);

        if (options.onEachFeature) {
            options.onEachFeature(geojson, layer);
        }

        return this.addLayer(layer);
    }
});

L.geoJSONWithBorder = function (geojson, options) {
    return new L.GeoJSONWithBorder(geojson, options);
};
