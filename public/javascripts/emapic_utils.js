//
// Emappy various util functions
//


// If we have loaded the validation plugin, then we add an additional one
// for max file size
if (typeof $.fn.validator !== 'undefined' &&
    typeof $.fn.validator.Constructor !== 'undefined' &&
    typeof $.fn.validator.Constructor.VALIDATORS !== 'undefined') {
        $.fn.validator.Constructor.VALIDATORS.maxfilesize = function ($el) {
            var maxfilesize = $el.data('maxfilesize');
            if ($el[0].files && $el[0].files.length > 0) {
                return $el[0].files[0].size <= maxfilesize;
            }
            return true;
        };
}

function getCurrentYear() {
    return new Date().getFullYear();
}

function escapeHtml(text) {
    return $("<div>").text(text).html();
}

function getURLParameter(sParam) {
    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++) {
        var sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam) {
            return sParameterName[1];
        }
    }
    return null;
}

function disableDefaultClickEvents(element) {
    var stop = L.DomEvent.stopPropagation;
    L.DomEvent
        .on(element, 'click', stop)
        .on(element, 'mousedown', stop)
        .on(element, 'dblclick', stop)
        .on(element, 'click', L.DomEvent.preventDefault);
}

function disableMapInteraction(disableZoomBtns) {
    map.dragging.disable();
    $( ".leaflet-container" ).addClass('force-disable');
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
    if (map.tap) map.tap.disable();
    if (disableZoomBtns) {
        $('.leaflet-control-zoom a').addClass('force-disable');
    }
}

function enableMapInteraction() {
    map.dragging.enable();
    map.touchZoom.enable();
    map.doubleClickZoom.enable();
    map.scrollWheelZoom.enable();
    map.boxZoom.enable();
    map.keyboard.enable();
    if (map.tap) map.tap.enable();
    $( ".leaflet-container" ).removeClass('force-disable');
    $('.leaflet-control-zoom a').removeClass('force-disable');
}

function disableAllEventsPropagation(element) {
    var stop = L.DomEvent.stopPropagation;
    L.DomEvent
        .on(element, 'blur', stop)
        .on(element, 'change', stop)
        .on(element, 'click', stop)
        .on(element, 'dblclick', stop)
        .on(element, 'error', stop)
        .on(element, 'focus', stop)
        .on(element, 'focusin', stop)
        .on(element, 'focusout', stop)
        .on(element, 'hover', stop)
        .on(element, 'keydown', stop)
        .on(element, 'keypress', stop)
        .on(element, 'keyup', stop)
        .on(element, 'load', stop)
        .on(element, 'mousedown', stop)
        .on(element, 'mouseenter', stop)
        .on(element, 'mouseleave', stop)
        .on(element, 'mouseout', stop)
        .on(element, 'mouseover', stop)
        // Stopping mouseover and mouseup events gives problems with
        // jscrollpane plugin
        /*.on(element, 'mousemove', stop)
        .on(element, 'mouseup', stop)*/
        .on(element, 'resize', stop)
        .on(element, 'scroll', stop)
        .on(element, 'DOMMouseScroll', stop)
        .on(element, 'mousewheel', stop)
        .on(element, 'select', stop)
        .on(element, 'submit', stop)
        // Stopping touch events gives problems with buttons inside
        // jscrollpane
        /*.on(element, 'touchstart', stop)
        .on(element, 'touchend', stop)
        .on(element, 'touchmove', stop)
        .on(element, 'touchcancel', stop)*/;
}

function yearsOptions(fromYear, toYear) {
    var optString = "<option value=0></option>",
    year = fromYear;
    while ( year >= toYear ) {
        optString += "<option value='" + year + "'>" + year + "</option>";
        year -= 1;
    }
    return optString;
};

function overrideFunction(originalFunction, beforeFunction, afterFunction) {
    if (originalFunction != null) {
        if (beforeFunction != null) {
            if (afterFunction != null) {
                return function(param) {
                    beforeFunctionReturn = beforeFunction(param);
                    originalFunctionReturn = originalFunction(beforeFunctionReturn, param);
                    return afterFunction(originalFunctionReturn, beforeFunctionReturn, param);
                }
            } else {
                return function(param) {
                    beforeFunctionReturn = beforeFunction(param);
                    return originalFunction(beforeFunctionReturn, param);
                }
            }
        } else {
            if (afterFunction != null) {
                return function(param) {
                    originalFunctionReturn = originalFunction(param);
                    return afterFunction(originalFunctionReturn, param);
                }
            }
        }
    }
    return null;
}

i18n = {};

function registerI18n(i18nStr, translation) {
    i18n[i18nStr] = (typeof i18n[i18nStr] === 'undefined') ? translation : i18n[i18nStr];
}

function getI18n(i18nStr) {
    return i18n[i18nStr];
}

function getI18n(i18nStr, defaultTranslation) {
    return (typeof i18n[i18nStr] === 'undefined') ? defaultTranslation : i18n[i18nStr];
}

function setLocale(value) {
    $.cookie('locale', value, { expires: 30, path: '/' });
    location.reload();
}

function checkInputNotVoid(input) {
    var $input = $(input);
    var val = $input.val();
    var $tgt = $('#' + $input.attr('target'));
    if ($tgt != null) {
        $tgt.attr('disabled', !(val != null && val.trim() != ''))
    }
}

function inputEnterToClick(event) {
    if (!event) {
        var event = window.event;
    }

    // Enter is pressed
    if (event.keyCode == 13) {
        var $input = $(event.target);
        var $tgt = $('#' + $input.attr('target'));
        if ($tgt.attr('disabled') != 'disabled') {
            $tgt.click();
        }
    }
}

function getDistance(latLngs) {
    var distance = 0;
    for (var i = 1, len = latLngs.length; i<len; i++) {
        distance += latLngs[i-1].distanceTo(latLngs[i]);
    }
    return distance;
}

function getGlyphiconMarkerIconHtml(icon, backgroundColor, x, y) {
    if (typeof icon == 'undefined') {
        return null;
    }
    if (typeof backgroundColor == 'undefined') {
        backgroundColor = '#95c11f';
    }
    if (typeof x == 'undefined') {
        x = 0;
    }
    if (typeof y == 'undefined') {
        y = 7;
    }
    return '<svg width="51" height="46"><defs><pattern id="image" x="0" y="0" patternUnits="userSpaceOnUse" height="46" width="51"><image x="10" y="7" xlink:href="/images/marker-shadow.png" width="41" height="41"></image></pattern></defs><rect width="51" height="46" fill="url(#image)" /><path style="fill:{color};stroke:#000000;stroke-width:0.99133736;stroke-linejoin:miter;stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none" d="M 27.997745,5.1426005 C 24.789271,2.026619 20.952126,0.47068128 16.484158,0.50959524 12.016191,0.5487035 8.2054436,2.1713216 5.091418,5.3424462 1.9378926,8.514353 0.38039059,12.350325 0.45880339,16.856033 c 0.0258144,2.991029 0.76848471,5.673295 2.18949741,8.083562 0.077632,0.11361 0.1918277,0.263983 0.3064164,0.452682 0,0 12.4091738,18.816149 13.0214198,19.71936 0.611464,0.904777 1.199853,0.01446 1.199853,0.01446 L 30.668667,24.885429 C 32.123902,22.41122 32.857383,19.640568 32.830791,16.573472 32.791683,12.06757 31.168283,8.2591689 27.997745,5.1426005 z" /><ellipse ry="13.192183" rx="13.02163" cy="16.567797" cx="16.64089" style="opacity:1;fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:#000000;stroke-width:1.02665293;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" /><foreignObject class="svg-marker-icon" height="20" width="32" y="{y}" x="{x}"><i class="glyphicon glyphicon-{icon}" style="padding-top: 1px;"></i></foreignObject></svg>'.replace(/\{color\}/g, backgroundColor).replace(/\{icon\}/g, icon).replace(/\{x\}/g, x).replace(/\{y\}/g, y);
}

function rgbToHsv(rgb) {
    hsv = new Object();
    max=max3(rgb.r,rgb.g,rgb.b);
    dif=max-min3(rgb.r,rgb.g,rgb.b);
    hsv.saturation=(max==0.0)?0:(100*dif/max);
    if (hsv.saturation==0) hsv.hue=0;
    else if (rgb.r==max) hsv.hue=60.0*(rgb.g-rgb.b)/dif;
    else if (rgb.g==max) hsv.hue=120.0+60.0*(rgb.b-rgb.r)/dif;
    else if (rgb.b==max) hsv.hue=240.0+60.0*(rgb.r-rgb.g)/dif;
    if (hsv.hue<0.0) hsv.hue+=360.0;
    hsv.value=Math.round(max*100/255);
    hsv.hue=Math.round(hsv.hue);
    hsv.saturation=Math.round(hsv.saturation);
    return hsv;
}

// RGB2HSV and HSV2RGB are based on Color Match Remix [http://color.twysted.net/]
// which is based on or copied from ColorMatch 5K [http://colormatch.dk/]
function hsvToRgbB(hsv) {
    var rgb=new Object();
    if (hsv.saturation==0) {
        rgb.r=rgb.g=rgb.b=Math.round(hsv.value*2.55);
    } else {
        hsv.hue/=60;
        hsv.saturation/=100;
        hsv.value/=100;
        i=Math.floor(hsv.hue);
        f=hsv.hue-i;
        p=hsv.value*(1-hsv.saturation);
        q=hsv.value*(1-hsv.saturation*f);
        t=hsv.value*(1-hsv.saturation*(1-f));
        switch(i) {
        case 0: rgb.r=hsv.value; rgb.g=t; rgb.b=p; break;
        case 1: rgb.r=q; rgb.g=hsv.value; rgb.b=p; break;
        case 2: rgb.r=p; rgb.g=hsv.value; rgb.b=t; break;
        case 3: rgb.r=p; rgb.g=q; rgb.b=hsv.value; break;
        case 4: rgb.r=t; rgb.g=p; rgb.b=hsv.value; break;
        default: rgb.r=hsv.value; rgb.g=p; rgb.b=q;
        }
        rgb.r=Math.round(rgb.r*255);
        rgb.g=Math.round(rgb.g*255);
        rgb.b=Math.round(rgb.b*255);
    }
    return rgb;
}

function hueShift(h,s) {
    h+=s; while (h>=360.0) h-=360.0; while (h<0.0) h+=360.0; return h;
}

function min3(a,b,c) {
    return (a<b)?((a<c)?a:c):((b<c)?b:c);
}

function max3(a,b,c) {
    return (a>b)?((a>c)?a:c):((b>c)?b:c);
}

function rgbToHex(rgb) {
    return "#" + ((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1);
}

function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function getComplimentaryColor(hex) {
    var temphsv=rgbToHsv(hexToRgb(hex));
    temphsv.hue=hueShift(temphsv.hue,180.0);
    return rgbToHex(hsvToRgbB(temphsv));
}

// Utilities for checking that the user doesn't leave the page w/o saving changes

var leavingPageSafely = false;

function checkLeavingPageSafely() {
    if (leavingPageSafely) {
        return;
    }
    return getI18n('js_leaving_page_warning');
}

function confirmLeavingPageSafely() {
    leavingPageSafely = true;
    return true;
}
