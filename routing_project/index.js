var map

const modes = {
    ROUTING: 'routing',
    MANUAL: 'manual',
    DRAG: 'drag',
    BIN: 'bin',
    SPLIT: 'split',
    NOTHING: 'nothing'
}

//Layer, on which the Points get placed
var pointLayer = new ol.layer.Vector({
    source: new ol.source.Vector({
        features: []
    }),
    opacity: 1
})

//Layer, on which the LineStrings get placed
var routesLayer = new ol.layer.Vector({
    source: new ol.source.Vector({
        features: []
    }),
    opacity: 1
})

var routes = []
var points = []
var mode = modes.ROUTING //Mode at start
var parser = new ol.format.WMTSCapabilities(); /* used parse the Metadata */

function formatMeters(meter) {
    if (meter > 1000) {
        return (Math.round(meter) / 1000) +
            ' ' + 'km';
    } else {
        return meter + ' m';
    }
}

function updateInformationFields() {
    var wholeLengthElem = document.getElementById('wholeLength')
    var routeLengthElem = document.getElementById('routeLength')
    var lineLengthElem = document.getElementById('lineLength')

    var wL = 0
    var rL = 0
    var lL = 0

    routes.forEach(feature => {
        let length = feature.getGeometry().getLength()
        if (feature.values_.geometry.flatCoordinates.length > 4) {
            rL += length
        } else {
            lL += length
        }
        wL += length
    })
    wholeLengthElem.value = formatMeters(wL)
    lineLengthElem.value = formatMeters(lL)
    routeLengthElem.value = formatMeters(rL)
}

//Interaction, which splitts a LineString
var splitInteraction = new ol.interaction.Split({ sources: routesLayer.getSource() })
routesLayer.getSource().on("aftersplit", (e) => {
    if (routes.length > 0) {
        //get index of the unsplitted Feature
        var index = routes.indexOf(e.original)
        //add new Features instead of the old one into the array
        routes = routes.slice(0, index).concat(e.features).concat(routes.slice(index + 1, routes.length))
        var pointFeature = new ol.Feature({
            geometry: new ol.geom.Point(
                //Point where the LineString was splitted
                e.features[0].getGeometry().getCoordinateAt(1)
            )
        })
        //Get style of any point
        pointFeature.setStyle(points[0].getStyle())
        //add new Point into the array
        points = points.slice(0, index + 1).concat(pointFeature).concat(points.slice(index + 1, points.length))
        //add Feature to Layer
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
    //check if old Linestring was Route or Line
    let featureCollection = routes[dragPointIndex - 1].values_.geometry.flatCoordinates.length > 4 ? await getRoute(url, [points[dragPointIndex - 1], points[dragPointIndex]]) : getLine([points[dragPointIndex - 1], points[dragPointIndex]])
    var returnObj = null
    if (featureCollection) {
        //Array of Features
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
    //check if old Linestring was Route or Line
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

/**
 * Handle Translate-Event
 * @param {Event} evt Translate-Event
 * @param {Number} previous Index of the previous Line
 * @param {Number} afterwards Index of the afterwards Line
 * @param {Number} dragPointIndex Index of the Point, which was dragged
 */
async function handleTranslation(evt, previous, afterwards, dragPointIndex) {
    var eventFeature
    map.forEachFeatureAtPixel(map.getPixelFromCoordinate(evt.coordinate),
        function (feature) {
            eventFeature = feature
        }
    )
    //Get Service for Routing
    var url = document.getElementById("Itinero").checked ? "https://ern.noel.gv.at/Routing/SimpleRoute" : "https://ern.noel.gv.at/VAORouting/SimpleRouting"
    points[dragPointIndex] = eventFeature
    //check if there is already a route
    if (points.length >= 2) {
        var lineStyle = new ol.style.Style({
            stroke: new ol.style.Stroke({ color: '#ffcc33', width: 3 })
        })
        //check if point has a previous Line => is Startingpoint ?
        if (previous || previous == 0) {
            let newRoute = await getPrevious(url, dragPointIndex)
            if (newRoute) {
                if (routesLayer.getSource().hasFeature(routes[previous])) routesLayer.getSource().removeFeature(routes[previous])
                routes[previous] = newRoute
                routes[previous].setStyle(lineStyle)
                routesLayer.getSource().addFeature(routes[previous])
            }
        }
        //check if point has a afterwards Line => is Endingpoint ?
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

/**
 * Create Drag (ol.interaction.Translate) Event for Point-Feature
 * @param {Feature} point 
 */
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
    //Use translateend instead of translating to improve performance
    translate.on('translateend', function (evt) {
        handleTranslation(evt, previous, afterwards, dragPointIndex)
    });
    map.addInteraction(translate);
}

/**
 * Delete Feature
 * @param {Array<Number>} coordinates Coordinates of the Feature, which will be deleted
 */
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
        //Delete at beginning
        if (delPointIndex == 0) {
            //remove features
            routesLayer.getSource().removeFeature(routes[delPointIndex])
            pointLayer.getSource().removeFeature(points[delPointIndex])
            //remove the first element
            routes = routes.slice(1, routes.length)
            points = points.slice(1, points.length)
            routesLayer.getSource().refresh()
            pointLayer.getSource().refresh()
            //delete at end
        } else if (delPointIndex == points.length - 1) {
            routesLayer.getSource().removeFeature(routes[delPointIndex - 1])
            pointLayer.getSource().removeFeature(points[delPointIndex])
            routes.pop()
            points.pop()
            routesLayer.getSource().refresh()
            pointLayer.getSource().refresh()
        } else {
            //delete in between
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
//=========================================================================================
//                            === im/export data ===

makeToBlob = function (content) {
    return new Blob([content], {
        type: "text/json"
    });
};

function exportData() {
    var geosjsonObj = (new ol.format.GeoJSON()).writeFeatures([...routes, ...points])
    var a = document.createElement('a')
    a.style.display = 'none'
    a.download = 'data.json'
    document.body.appendChild(a)
    a.href = URL.createObjectURL(makeToBlob(geosjsonObj))
    a.click()
    URL.revokeObjectURL(a.href)
    a.remove()
}

async function getFileContent(file) {
    const fr = new FileReader()
    var prom = await new Promise((resolve, reject) => {
        fr.onerror = () => {
            fr.abort();
            reject(new DOMException("Problem parsing input file."));
        };
        fr.onload = () => {
            resolve(fr.result);
        };
        fr.readAsText(file);
    });
    return prom
}

async function importData(file) {
    var content = await getFileContent(file);
    var featureArr = (new ol.format.GeoJSON()).readFeatures(content)
    if (featureArr.length > 0) {
        featureArr.forEach(feature => {
            if (feature.getGeometry().getType() == 'Point') {
                points.push(feature)
                pointLayer.getSource().addFeature(feature)
            } else if (feature.getGeometry().getType() == 'LineString') {
                routes.push(feature)
                routesLayer.getSource().addFeature(feature)
            }
        })
        routesLayer.getSource().refresh()
        pointLayer.getSource().refresh()
    }
}

window.importData = importData
window.exportData = exportData

//==========================================================================

/**
 * Add a point Feature
 * @param {Array<Number>} coordinates Coordinates of the point
 * @param {Boolean} byaddress Pointadd-Call from Adressfield
 */
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
            //add menu from menu.js
            map.addControl(menubar)
            map.on('click', function (event) {
                //add point if mode is set to manual or routing
                if (mode == modes.ROUTING || mode == modes.MANUAL) addPoint(ol.proj.toLonLat(event.coordinate), false)
                //delete point if mode is set to wastebin
                if (mode == modes.BIN) handleBin(event.coordinate)
            });
            routesLayer.on('change', (e) => {
                updateInformationFields()
            })
            //deactivate split interaction on start
            splitInteraction.setActive(false)
            //add split interaction to map
            map.addInteraction(splitInteraction)
            updateInformationFields()

            //============================================================
            //       === hover LineString-Feature display length ===
            var currLengthElem = document.getElementById("currLength")
            var hoverStyle = new ol.style.Style({
                stroke: new ol.style.Stroke({ color: '#ff9233', width: 3 })
            })
            var defaultStyle = new ol.style.Style({
                stroke: new ol.style.Stroke({ color: '#ffcc33', width: 3 })
            })
            var hoverInteraction = new ol.interaction.Hover({ cursor: "pointer" });
            var hoverFeatureCoords = [0,0]
            hoverInteraction.on('enter', (e) => {
                if (e.feature.getGeometry().getType() == 'LineString') {
                    e.feature.setStyle(hoverStyle)
                    currLengthElem.value = formatMeters(e.feature.getGeometry().getLength())
                    hoverFeatureCoords = e.coordinate
                }
            })

            hoverInteraction.on('leave', (e) => {
                map.forEachFeatureAtPixel(map.getPixelFromCoordinate(hoverFeatureCoords), feature => {
                    if(feature.getGeometry().getType() == 'LineString'){
                        feature.setStyle(defaultStyle)
                    }
                })
                currLengthElem.value = 'No LineString selected'
            })
            map.addInteraction(hoverInteraction)
            //============================================================
        });

//export variables and functions so other files can use it
window.addPointByAddress = addPoint
window.setMode = setMode
window.modes = modes