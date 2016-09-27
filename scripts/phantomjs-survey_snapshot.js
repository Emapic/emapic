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
    wait = 10000,
    headerHeight = 85;

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

// We add extra pixels for the header
height += headerHeight;

// viewportSize being the actual size of the headless browser
page.viewportSize = {
    width: width,
    height: height
};
// the clipRect is the portion of the page you are taking a screenshot of
// We remove the navbar from view
page.clipRect = {
    top: headerHeight,
    left: 0,
    width: width,
    height: height - headerHeight
};
page.open(url, function(status) {
  if(status === "success") {
    page.evaluate(function() {
        // Remove the cookie warning
        $('<style>.cc_banner-wrapper { display: none; }</style>').appendTo('head');
        // Remove the login message
        $('<style>.alert { display: none; }</style>').appendTo('head');
    });
    window.setTimeout(function () {
        page.evaluate(function() {
            // Disable clustering
            emapic.modules.clustering.toggleClustering($('#clustering-control-activate'));
            // Remove the controls
            var control = document.getElementsByClassName('leaflet-control-container');
            for (var i=0; i < control.length; i++) {
               control[i].style.display="none";
            }
        });
        page.render(destination);
        phantom.exit();
    }, wait);
  }
});
