var parser = new ol.format.WMTSCapabilities(); /* wird zum Parsen des Metadatentextes verwendet */

fetch('https://basemap.at/wmts/1.0.0/WMTSCapabilities.xml').then(
    function (response) {
        /* Gib die Metadaten als Text in der "Pipe" weiter */
        return response.text();
    }).then(
        function (text) {

            /* Lese die Metadaten und lege das Ergebnis in einer Hilfsvariablen ab */
            var result = parser.read(text);

            var options = ol.source.WMTS.optionsFromCapabilities(
                result, {
                    layer: 'geolandbasemap',
                    matrixSet: 'EPSG:3857'
                });

            var pointFeature = new ol.Feature({
                geometry: new ol.geom.Point(
                    // Transformation der Koordinaten von EPSG:4326 auf EPSG:3857, da nur dieses Format gilt
                    ol.proj.fromLonLat(
                        [15.6334778, 48.2009155]
                    )
                )
            });

            var map = new ol.Map({
                layers: [

                    new ol.layer.Tile({
                        source: new ol.source.OSM(),
                        opacity: 0.7
                    }),

                    new ol.layer.Tile({
                        source: new ol.source.WMTS((options)),
                        opacity: 1
                    }),

                    new ol.layer.Vector({
                        source:
                            new ol.source.Vector({
                                features: [pointFeature]
                            }),
                        opacity: 1
                    })

                ],
                target: 'map',
                view: new ol.View({
                    center: pointFeature.getGeometry().getCoordinates(),
                    zoom: 15,
                    minZoom: 0,
                    maxZoom: 19
                })
            });

            let hover = [];
            const outElement = document.getElementById("out")
            map.on('pointermove', function (e) {
                hover = [];
                map.forEachFeatureAtPixel(e.pixel, f => {
                    hover.push(ol.proj.toLonLat(f.getGeometry().getCoordinates()))
                });
                outElement.innerHTML = ""
                hover.forEach(i => {
                    outElement.innerHTML += i + '<br>'
                })

            });

        });

