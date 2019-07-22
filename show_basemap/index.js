var parser = new ol.format.WMTSCapabilities(); /* wird zum Parsen des Metadatentextes verwendet */

fetch('https://basemap.at/wmts/1.0.0/WMTSCapabilities.xml').then(
    function(response) {
        /* Gib die Metadaten als Text in der "Pipe" weiter */
        return response.text();
    }).then(
        function(text) {

            /* Lese die Metadaten und lege das Ergebnis in einer Hilfsvariablen ab */
            var result = parser.read(text);

            var options = ol.source.WMTS.optionsFromCapabilities(
                result, {
                    layer: 'geolandbasemap',
                    matrixSet: 'EPSG:3857'
                });

            var map = new ol.Map({
                /* Die Layer werden der Reihe nach angezeigt, wobei "opacity" den Deckungsgrad festlegt */
                layers: [
                    /****
                     Die Source ol.source.OSM() steht auch ohne das Einlesen der WMTS-Options zur Verfügung.
                    Beispiele auf dieser Datenbasis findet man unter der OpenLayers Homepage.
                    Wenn nur Oesterreich angezeigt wird, genuegt die WMTS Source; andernfalls muss auch die
                    OSM Source als Layer eingebunden werden.
                    ****/
                    new ol.layer.Tile({
                        source: new ol.source.OSM(),
                        opacity: 0.7
                    }),
                    /****
                     Basemap Layer der ueber die Options eindeutig adressiert wird.
                    Hier wird mit Landkarten Kacheln (Tile) gearbeitet.
                    ****/

                    new ol.layer.Tile({
                        source: new ol.source.WMTS((options)),
                        opacity: 1
                    }),
                ],
                /* Position wo auf der HTML Seite die Landkarte angezeigt werden soll */
                target: 'map',
                /* Mit der View wird hier die Position auf der Landkarte samt der Zoomstufe festgelegt */
                view: new ol.View({
                    /* Transformation der Koordinaten von EPSG:4326 auf EPSG:3857, da nur dieses Format gilt */
                    center: ol.proj.fromLonLat(
                        // Landhausplatz
                        [15.6334778, 48.2009155]
                    ),
                    zoom: 15,
                    minZoom: 5,
                    maxZoom: 19
                })
            });
        });