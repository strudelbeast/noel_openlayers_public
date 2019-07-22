/**
 * Berechnung der Route zwischen zwei Features
 * @param {String} url Url des Services der das Routing durchführt
 * @param {Array<ol.Feature>} points Die Features zwischen denen die Route berechnet werden soll
 * @return {String} Json-String (contains Feature Collection)
 */
async function getRoute(url, points) {
    var returnObj
    var postObject = [{
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": ol.proj.toLonLat(points[0].getGeometry().getCoordinates())
        },
        "properties": null
    }, {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": ol.proj.toLonLat(points[1].getGeometry().getCoordinates())
        },
        "properties": null
    }];
    await fetch(url, {
        method: 'POST',
        headers: {
            "Content-Type": "application/json-patch+json",
            "accept": "text/plain"
        },
        body: JSON.stringify(postObject)
    }).then(response => {
        if(response.status == 500) return null
        return response.json()
    }).then(response => {
        if(response == null) return null
        returnObj = {
            'type': 'FeatureCollection',
            'crs': {
                'type': 'name',
                'properties': {
                    'name': 'EPSG:4326'
                }
            },
            'features': [
                response
            ]
        };
    })
    return returnObj
}

/**
 * Linienberechnung zwischen zwei Features
 * @param {Array<ol.Feature>} points Die Features zwischen denen die Route berechnet werden soll
 * @return {String} Json-String (contains Feature Collection)
 */
function getLine(points) {
    //Features in das richtige Format umwandeln EPSG:3857 => EPSG:4326
    points = points.map(p => ol.proj.toLonLat(p.getGeometry().getCoordinates()))
    return {
        'type': 'FeatureCollection',
        'crs': {
            'type': 'name',
            'properties': {
                'name': 'EPSG:4326'
            }
        },
        'features': [
            (new ol.format.GeoJSON()).writeFeatureObject(
                new ol.Feature({
                    geometry: new ol.geom.LineString(points)
                })
            )
        ]
    }
}

//zur weitergabe an andere Files
window.getRoute = getRoute
window.getLine = getLine