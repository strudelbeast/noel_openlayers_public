var poiLayer = new ol.layer.Vector({
    source: new ol.source.Vector({
        features: []
    }),
    opacity: 1
})

function getPointsOfInterest(poiRequest) {
    poiLayer.getSource().clear()
    let url = "https://adrab.noel.gv.at/Search/SearchPOI?query=" + encodeURIComponent(poiRequest) + "&crs=0"
    let data
    fetch(url).then(response => {
        return response.text()
    }).then(text => {
        data = JSON.parse(text)
        let poiFeatures = []
        data.forEach(e => {
            let feature = new ol.Feature({
                geometry: new ol.geom.Point(
                    [e.x_coordinate, e.y_coordinate]
                ),
                name: e.title,
                id: e.id,
                description: e.description
            })

            poiFeatures.push(feature)
        })
        poiLayer.getSource().addFeatures(poiFeatures)
    })
}
window.getPointsOfInterest = getPointsOfInterest

var parser = new ol.format.WMTSCapabilities(); /* wird zum Parsen des Metadatentextes verwendet */

/****
 Mit "fetch" werden ueber die unten angefuehrte URL die Metadaten fuer die WMTS Clients geladen.
 URL: https://<host>/WMTS/<version>/WMTSCapabilities.xml
 Die Funktion "fetch" ist eine elegante Art mittels funktionalem Weiterreichens der Ergebnisse den Datenstrom abzuarbeiten.
 Siehe auch:
  https://developers.google.com/web/updates/2015/03/introduction-to-fetch
 ****/
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

                    poiLayer
                ],
                target: 'map',
                view: new ol.View({
                    /* Transformation der Koordinaten von EPSG:4326 auf EPSG:3857, da nur dieses Format gilt */
                    center: ol.proj.fromLonLat(
                        // Landhausplatz
                        [15.6334778, 48.2009155]
                    ),
                    zoom: 8,
                    minZoom: 0,
                    maxZoom: 19
                })
            });
            var popup = new ol.Overlay.Popup();
            map.addOverlay(popup);
            map.on('pointermove', function (evt) {
                var feature = map.forEachFeatureAtPixel(map.getPixelFromCoordinate(evt.coordinate),
                    function (feature, layer) {
                        return feature;
                    });
                if (feature) {
                    var el = document.createElement("div");
                    var title = document.createElement("h4");
                    var detail = document.createElement("p");
                    var id = document.createElement("small");
                    title.innerHTML = feature.get("name");
                    el.appendChild(title);
                    detail.innerHTML = feature.get("description");
                    el.appendChild(detail);
                    id.innerHTML = feature.get("id")
                    el.append(id)
                    popup.show(evt.coordinate, el);
                } else {
                    popup.hide();
                }
            });
        });