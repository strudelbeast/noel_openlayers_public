/* import menubar from './menu.js';
import { getRoute, getLine } from './way_library';
import 'ol-ext';
import 'regenerator-runtime/runtime' */

var map

const modes = {
    ROUTING: 'routing',
    MANUAL: 'manual',
    DRAG: 'drag',
    BIN: 'bin',
    SPLIT: 'split',
    NOTHING: 'nothing'
}

var pointLayer = new ol.layer.Vector({
    source: new ol.source.Vector({
        features: []
    }),
    opacity: 1
})

var routesLayer = new ol.layer.Vector({
    source: new ol.source.Vector({
        features: []
    }),
    opacity: 1
})

var routes = []
var points = []
var mode = modes.ROUTING
var parser = new ol.format.WMTSCapabilities(); /* wird zum Parsen des Metadatentextes verwendet */

var splitInteraction = new ol.interaction.Split({ sources: routesLayer.getSource() })
routesLayer.getSource().on("aftersplit", (e) => {
    if (routes.length > 0) {
        var index = routes.indexOf(e.original)
        routes = routes.slice(0, index).concat(e.features).concat(routes.slice(index + 1, routes.length))
        var pointFeature = new ol.Feature({
            geometry: new ol.geom.Point(
                e.features[0].getGeometry().getCoordinateAt(1)
            )
        })
        pointFeature.setStyle(points[0].getStyle())
        points = points.slice(0, index + 1).concat(pointFeature).concat(points.slice(index + 1, points.length))
        pointLayer.getSource().addFeature(pointFeature)
    }
})

function createAllDragInteractions() {
    points.forEach(point => {
        addDragEvent(point)
    })
}

function removeAllDragInteractions() {
    let arr = map.getInteractions().getArray()
    let toRemove = []
    //has to be done in two steps!
    //if you remove the element immidiatley the iterator/arr gets overwritten and so only one gets removed
    for (let i = 0; i < arr.length; i++) {
        if (arr[i].features_ != undefined) toRemove.push(arr[i])
    }
    toRemove.forEach(interaction => map.removeInteraction(interaction))
}

function setMode(inMode) {
    switch (inMode) {
        case modes.ROUTING:
            if (mode == modes.DRAG) { removeAllDragInteractions(); splitInteraction.setActive(false) }
            mode = modes.ROUTING
            break;
        case modes.MANUAL:
            if (mode == modes.DRAG) { removeAllDragInteractions(); splitInteraction.setActive(false) }
            mode = modes.MANUAL
            break;
        case modes.DRAG:
            if (mode != modes.DRAG) { createAllDragInteractions(); splitInteraction.setActive(false) }
            mode = modes.DRAG
            break;
        case modes.BIN:
            if (mode == modes.DRAG) { removeAllDragInteractions(); splitInteraction.setActive(false) }
            mode = modes.BIN
            break;
        case modes.SPLIT:
            if (mode == modes.DRAG) removeAllDragInteractions()
            mode = modes.SPLIT
            splitInteraction.setActive(true)
            break;
        case modes.NOTHING:
        default:
            removeAllDragInteractions()
            splitInteraction.setActive(false)
            mode = modes.NOTHING
            break;
    }

}

async function getPrevious(url, dragPointIndex) {
    let featureCollection = routes[dragPointIndex - 1].values_.geometry.flatCoordinates.length > 4 ? await getRoute(url, [points[dragPointIndex - 1], points[dragPointIndex]]) : getLine([points[dragPointIndex - 1], points[dragPointIndex]])
    var returnObj = null
    if (featureCollection) {
        returnObj = (new ol.format.GeoJSON()).readFeatures(
            //feature collection json
            featureCollection,
            {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857'
            }
        )[0]
    }
    return returnObj
}

async function getAfterwards(url, dragPointIndex) {
    let featureCollection = routes[dragPointIndex].values_.geometry.flatCoordinates.length > 4 ? await getRoute(url, [points[dragPointIndex], points[dragPointIndex + 1]]) : getLine([points[dragPointIndex], points[dragPointIndex + 1]])
    var returnObj = null
    if (featureCollection) {
        return (new ol.format.GeoJSON()).readFeatures(
            //feature collection json
            featureCollection,
            {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857'
            }
        )[0]
    }
    return returnObj
}

async function handleTranslation(evt, previous, afterwards, dragPointIndex) {
    var eventFeature
    map.forEachFeatureAtPixel(map.getPixelFromCoordinate(evt.coordinate),
        function (feature) {
            eventFeature = feature
        }
    )
    var url = document.getElementById("Itinero").checked ? "https://ern.noel.gv.at/Routing/SimpleRoute" : "https://ern.noel.gv.at/VAORouting/SimpleRouting"
    points[dragPointIndex] = eventFeature
    if (points.length >= 2) {
        var lineStyle = new ol.style.Style({
            stroke: new ol.style.Stroke({ color: '#ffcc33', width: 3 })
        })
        if (previous || previous == 0) {
            let newRoute = await getPrevious(url, dragPointIndex)
            if (newRoute) {
                if (routesLayer.getSource().hasFeature(routes[previous])) routesLayer.getSource().removeFeature(routes[previous])
                routes[previous] = newRoute
                routes[previous].setStyle(lineStyle)
                routesLayer.getSource().addFeature(routes[previous])
            }
        }
        if (afterwards || afterwards == 0) {
            let newRoute = await getAfterwards(url, dragPointIndex)
            if (newRoute) {
                if (routesLayer.getSource().hasFeature(routes[afterwards])) routesLayer.getSource().removeFeature(routes[afterwards])
                routes[afterwards] = newRoute
                routes[afterwards].setStyle(lineStyle)
                routesLayer.getSource().addFeature(routes[afterwards])
            }
        }
        routesLayer.getSource().refresh()
    }
}

function addDragEvent(point) {
    let translate = new ol.interaction.Translate({
        features: new ol.Collection([point])
    });

    var previous, afterwards
    var dragPointIndex
    translate.on('translatestart', function (evt) {
        dragPointIndex = points.indexOf(evt.features.array_[0])
        if (dragPointIndex == 0) {
            afterwards = dragPointIndex
            previous = null
        } else if (dragPointIndex == routes.length) {
            previous = dragPointIndex - 1
            afterwards = null
        } else {
            previous = dragPointIndex - 1
            afterwards = dragPointIndex
        }
    });
    translate.on('translateend', function (evt) {
        handleTranslation(evt, previous, afterwards, dragPointIndex)
    });
    map.addInteraction(translate);
}

async function handleBin(coordinates) {
    var eventFeature
    var lineStyle = new ol.style.Style({
        stroke: new ol.style.Stroke({ color: '#ffcc33', width: 3 })
    })

    map.forEachFeatureAtPixel(map.getPixelFromCoordinate(coordinates),
        function (feature) {
            eventFeature = feature
        }
    )
    if (points.length == 1) {
        //only one point
        points.pop()
        pointLayer.getSource().clear()
    } else {
        var url = document.getElementById("Itinero").checked ? "https://ern.noel.gv.at/Routing/SimpleRoute" : "https://ern.noel.gv.at/VAORouting/SimpleRouting"
        var delPointIndex = points.indexOf(eventFeature)
        //Delete beginning
        if (delPointIndex == 0) {
            routesLayer.getSource().removeFeature(routes[delPointIndex])
            pointLayer.getSource().removeFeature(points[delPointIndex])
            routes = routes.slice(1, routes.length)
            points = points.slice(1, points.length)
            routesLayer.getSource().refresh()
            pointLayer.getSource().refresh()
            //delete end
        } else if (delPointIndex == points.length - 1) {
            routesLayer.getSource().removeFeature(routes[delPointIndex - 1])
            pointLayer.getSource().removeFeature(points[delPointIndex])
            routes.pop()
            points.pop()
            routesLayer.getSource().refresh()
            pointLayer.getSource().refresh()
        } else {
            let featureCollection = document.getElementById("route").checked ? await getRoute(url, [points[delPointIndex - 1], points[delPointIndex + 1]]) : getLine([points[delPointIndex - 1], points[delPointIndex + 1]])
            //if not routeable => draw line instead
            if (featureCollection == null) {
                featureCollection = getLine([points[delPointIndex - 1], points[delPointIndex + 1]])
            }
            let newFeature = (new ol.format.GeoJSON()).readFeatures(
                //feature collection json
                featureCollection,
                {
                    dataProjection: 'EPSG:4326',
                    featureProjection: 'EPSG:3857'
                }
            )[0]
            newFeature.setStyle(lineStyle)

            //remove old features from map
            pointLayer.getSource().removeFeature(points[delPointIndex])
            routesLayer.getSource().removeFeature(routes[delPointIndex - 1])
            routesLayer.getSource().removeFeature(routes[delPointIndex])
            //remove old features from arrays
            points.splice(delPointIndex, 1)
            routes.splice(delPointIndex - 1, 2)
            //add the new feature in between
            routes = routes.slice(0, delPointIndex - 1).concat(newFeature).concat(routes.slice(delPointIndex - 1, routes.length))
            //add new route
            routesLayer.getSource().addFeature(newFeature)
            routesLayer.getSource().refresh()
            pointLayer.getSource().refresh()
        }
    }
}


async function addPoint(coordinates, byaddress = false) {
    var styleMarker = new ol.style.Style({
        image: new ol.style.Icon({
            scale: .4, anchor: [0.5, 1],
            src: 'https://raw.githubusercontent.com/jonataswalker/map-utils/master/images/marker.png'
        })
    });
    var point = new ol.Feature({
        geometry: new ol.geom.Point(
            ol.proj.fromLonLat(coordinates)
        )
    })
    if (mode == modes.DRAG) {
        addDragEvent(point)
    } else if (mode == modes.ROUTING || mode == modes.MANUAL) {
        point.setStyle(styleMarker)
        if (points.length == 0) {
            points.push(point)
            pointLayer.getSource().addFeature(point)
        } else {
            var url = document.getElementById("Itinero").checked ? "https://ern.noel.gv.at/Routing/SimpleRoute" : "https://ern.noel.gv.at/VAORouting/SimpleRouting"
            var featureCollection = mode == modes.ROUTING || (document.getElementById("route").checked && byaddress) ? await getRoute(url, [points[points.length - 1], point]) : getLine([points[points.length - 1], point])
            if (featureCollection != null) {
                var route = (new ol.format.GeoJSON()).readFeatures(
                    //feature collection json
                    featureCollection,
                    {
                        dataProjection: 'EPSG:4326',
                        featureProjection: 'EPSG:3857'
                    }
                )[0]
                points.push(point)
                routes.push(route)
                var lineStyle = new ol.style.Style({
                    stroke: new ol.style.Stroke({ color: '#ffcc33', width: 3 })
                })
                route.setStyle(lineStyle)
                pointLayer.getSource().addFeature(point)
                routesLayer.getSource().addFeature(route)
                routesLayer.getSource().refresh()
            }
        }
        pointLayer.getSource().refresh()
    }

}



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

            map = new ol.Map({
                layers: [

                    new ol.layer.Tile({
                        source: new ol.source.OSM(),
                        opacity: 0.7
                    }),

                    new ol.layer.Tile({
                        source: new ol.source.WMTS((options)),
                        opacity: 1
                    }),
                    pointLayer,

                    routesLayer
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
            })
            map.addControl(menubar)
            map.on('click', function (event) {
                if (mode == modes.ROUTING || mode == modes.MANUAL) addPoint(ol.proj.toLonLat(event.coordinate), false)
                if (mode == modes.BIN) handleBin(event.coordinate)
            });
            splitInteraction.setActive(false)
            map.addInteraction(splitInteraction)
        });
window.addPointByAddress = addPoint
window.setMode = setMode
window.modes = modes
/* export { setMode, modes }; */