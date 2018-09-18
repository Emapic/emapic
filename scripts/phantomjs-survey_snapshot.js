// Usage is "phantomjs-survey_snapshot.js <output_file> <width> <height> <wait_time>"

var system = require('system'),
    args = system.args;

if (args.length === 1) {
    console.error('You must at least specify an argument with the URL to open.');
    exit();
}

var page = require('webpage').create(),
    url = args[1],
    destination = 'snapshot.png',
    width = 1024,
    height = 768,
    wait = 1000;

if (args.length >= 3) {
    destination = args[2];
    if (args.length >= 4) {
        width = parseInt(args[3]);
        if (args.length >= 5) {
            height = parseInt(args[4]);
            if (args.length >= 6) {
                wait = parseInt(args[5]);
            }
        }
    }
}

// viewportSize being the actual size of the headless browser
page.viewportSize = {
    width: width,
    height: height
};
page.onCallback = function(data){
    window.setTimeout(function () {
        page.render(destination);
        phantom.exit();
    }, wait);
};
page.open(url, function(status) {
    if(status === "success") {
        page.evaluate(function() {
            // Remove the header
            $('<style>#header { display: none !important; }</style>').appendTo('head');
            // Extend the map to the whole page
            $('<style>body > div.container-fluid { height: 100% !important; }</style>').appendTo('head');
            // Remove the cookie warning
            $('<style>.cc_banner-wrapper { display: none !important; }</style>').appendTo('head');
            // Remove the login message
            $('<style>.alert { display: none !important; }</style>').appendTo('head');
            // Remove the controls
            $('<style>.leaflet-control-container { display: none !important; }</style>').appendTo('head');

            $.when(emapic.allLayersLoadedPromise, emapic.baseLayerLoadedPromise).done(function() {
                // Disable clustering
                emapic.modules.clustering.deactivate();
                window.callPhantom();
            });
        });
    }
});
