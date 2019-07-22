var menubar = new ol.control.Bar(
    {
        toggleOne: true,
        group: false,
        controls: [
            new ol.control.Toggle(
                {
                    html: '<i class="fas fa-directions"></i>',
                    title: "Mode",
                    onToggle: function(b) {setMode(b ? modes.MANUAL :modes.NOTHING)},
                    bar: new ol.control.Bar(
                        {
                            toggleOne: true,
                            group: true,
                            controls:
                                [
                                    new ol.control.Toggle(
                                        {
                                            html: '<i class="fas fa-arrow-up"></i>',
                                            title: "Manual",
                                            onToggle: function (b) {setMode(b ? modes.MANUAL : modes.NOTHING) }
                                        }),
                                    new ol.control.Toggle(
                                        {
                                            html: '<i class="fas fa-location-arrow"></i>',
                                            title: "Route",
                                            onToggle: function (b) {setMode(b ? modes.ROUTING : modes.NOTHING)},
                                        })
                                ]
                        })
                }),
                new ol.control.Toggle({
                    html: '<i class="fas fa-trash"></i>',
                    title: 'Recycle Bin',
                    onToggle: function(b) {setMode(b ? modes.BIN : modes.NOTHING)}
                }),
                new ol.control.Toggle({
                    html: '<i class="fas fa-hand-paper"></i>',
                    title: 'Drag',
                    onToggle: function (b) {setMode(b ? modes.DRAG : modes.NOTHING)}
                }),
                new ol.control.Toggle({
                    html: '<i class="fas fa-cut"></i>',
                    title: 'Split',
                    onToggle: function (b) {setMode(b ? modes.SPLIT : modes.NOTHING)}
                })
        ]
    })

//zur weitergabe anderer Files
window.menubar = menubar