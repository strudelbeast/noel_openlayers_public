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

function getLine(points) {
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

window.getRoute = getRoute
window.getLine = getLine
/* export {getRoute,getLine} */