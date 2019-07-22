var parser = new ol.format.WMTSCapabilities(); /* wird zum Parsen des Metadatentextes verwendet */

let gemeindenFeatureLayer 

function getFeaturesFromJSON(){
    let gemeindenFeatures = []
    gemeindenFeatureLayer = new ol.layer.Vector({
            source: 
                new ol.source.Vector({
                    features:  []
            }),
            opacity: 0.5             
        }); 
    var data;

    fetch("https://sdi.noe.gv.at/at.gv.noe.geoserver/OGD/wfs?request=GetFeature&version=1.1.0&typeName=OGD:KAT_GEM_200&srsName=EPSG:4326&outputFormat=application/json").then(
    function(response) {
        /* Gib die Metadaten als Text in der "Pipe" weiter */
        return response.text();
    }).then(
    function(text) {
        data = JSON.parse(text);
        data = data.features
        for(var i=0;i < data.length; i++){
                //Transform coordinates to EPSG:3857
            for(var x = 0; x < data[i].geometry.coordinates[0].length ; x++){
                data[i].geometry.coordinates[0][x] = ol.proj.fromLonLat(data[i].geometry.coordinates[0][x])
            }
            
            var polygon = new ol.Feature(
                    new ol.geom.Polygon(
                        data[i].geometry.coordinates
                    )
                );
            
            gemeindenFeatures.push(polygon)
        }
        var areas = []
        gemeindenFeatures.forEach(e => {
            areas.push(e.getGeometry().getArea() / 10000)
        })
        let top = Math.max.apply(Math, areas)
        gemeindenFeatures.forEach(e => {
            let wert = Math.round(e.getGeometry().getArea()/1000 * (1000 / top) * 0.255)
            let style = new ol.style.Style({
                fill: new ol.style.Fill({
                            color: 'rgba(' + (255 - wert) + ',' + wert + ',0,0.5)'
                        }),
                stroke: new ol.style.Stroke({
                    color: 'grey'
                })
            });
            e.setStyle(style)
            gemeindenFeatureLayer.getSource().addFeature(e)
        }) 
        gemeindenFeatureLayer.getSource().refresh()           
    })
    
}

/****
 Mit "fetch" werden ueber die unten angefuehrte URL die Metadaten fuer die WMTS Clients geladen.
 URL: https://<host>/WMTS/<version>/WMTSCapabilities.xml
 Die Funktion "fetch" ist eine elegante Art mittels funktionalem Weiterreichens der Ergebnisse den Datenstrom abzuarbeiten.
 Siehe auch:
  https://developers.google.com/web/updates/2015/03/introduction-to-fetch
 ****/
fetch('https://basemap.at/wmts/1.0.0/WMTSCapabilities.xml').then(
    function(response) {
        /* Gib die Metadaten als Text in der "Pipe" weiter */
        return response.text();
    }).then(
    function(text) {
        getFeaturesFromJSON()
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

                gemeindenFeatureLayer
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
});