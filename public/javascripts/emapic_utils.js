//
// Emapic various util functions
//

var emapic = emapic || {};

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

(function(emapic) {

    emapic.utils = emapic.utils || {};

    emapic.utils.nominatimEmail = null;

    emapic.utils.escapeHtml = function(text) {
        return $("<div>").text(text).html();
    };

    emapic.utils.getURLParameter = function(sParam) {
        var sPageURL = window.location.search.substring(1);
        var sURLVariables = sPageURL.split('&');
        for (var i = 0; i < sURLVariables.length; i++) {
            var sParameterName = sURLVariables[i].split('=');
            if (sParameterName[0] == sParam) {
                return sParameterName[1];
            }
        }
        return null;
    };

    emapic.utils.disableDefaultClickEvents = function(element) {
        var stop = L.DomEvent.stopPropagation;
        L.DomEvent
            .on(element, 'click', stop)
            .on(element, 'mousedown', stop)
            .on(element, 'dblclick', stop)
            .on(element, 'click', L.DomEvent.preventDefault);
    };

    emapic.utils.disableMapInteraction = function(spinner) {
        if (emapic.map !== null) {
            if (spinner) {
                emapic.map.spin(true, {
                    zIndex: 10
                });
                $('#map').addClass('disable-all');
            }
            emapic.map.dragging.disable();
            $('.leaflet-container').addClass('force-disable');
            emapic.map.touchZoom.disable();
            emapic.map.doubleClickZoom.disable();
            emapic.map.scrollWheelZoom.disable();
            emapic.map.boxZoom.disable();
            emapic.map.keyboard.disable();
            if (emapic.map.tap) emapic.map.tap.disable();
            $('.leaflet-control-container').addClass('force-disable');
        }
    };

    emapic.utils.enableMapInteraction = function() {
        if (emapic.map !== null) {
            emapic.map.dragging.enable();
            emapic.map.touchZoom.enable();
            emapic.map.doubleClickZoom.enable();
            emapic.map.scrollWheelZoom.enable();
            emapic.map.boxZoom.enable();
            emapic.map.keyboard.enable();
            if (emapic.map.tap) emapic.map.tap.enable();
            $('.leaflet-container').removeClass('force-disable');
            $('#map').removeClass('disable-all');
            $('.leaflet-control-container').removeClass('force-disable');
            emapic.map.spin(false);
        }
    };

    emapic.utils.disableAllEventsPropagation = function(element) {
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
    };

    emapic.utils.overrideFunction = function(originalFunction, beforeFunction, afterFunction) {
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
    };

    var i18n = {};

    emapic.utils.registerI18n = function(i18nStr, translation) {
        i18n[i18nStr] = (typeof i18n[i18nStr] === 'undefined') ? translation : i18n[i18nStr];
    };

    emapic.utils.getI18n = function(i18nStr, defaultTranslation) {
        return (typeof i18n[i18nStr] === 'undefined') ? ((typeof defaultTranslation !== 'undefined') ? defaultTranslation : i18nStr ) : i18n[i18nStr];
    };

    emapic.utils.setLocale = function(value) {
        $.cookie('locale', value, { expires: 30, path: '/' });
        location.reload();
    };

    emapic.utils.checkInputNotVoid = function(input) {
        var $input = $(input),
            val = $input.val(),
            $tgt = $('#' + $input.attr('target'));
        if ($tgt != null) {
            $tgt.attr('disabled', !(val != null && val.trim() != ''))
        }
    };

    emapic.utils.inputEnterToClick = function(event) {
        if (!event) {
            event = window.event;
        }

        // Enter is pressed
        if (event.keyCode == 13) {
            var $input = $(event.target);
            var $tgt = $('#' + $input.attr('target'));
            if ($tgt.attr('disabled') != 'disabled') {
                $tgt.click();
            }
        }
    };

    emapic.utils.getDistance = function(latLngs) {
        var distance = 0;
        for (var i = 1, len = latLngs.length; i<len; i++) {
            distance += latLngs[i-1].distanceTo(latLngs[i]);
        }
        return distance;
    };

    emapic.utils.getGlyphiconMarkerIconHtml = function(icon, backgroundColor, x, y) {
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
        var markerContent = '';
        if (icon !== null) {
            markerContent = '<ellipse ry="13.192183" rx="13.02163" cy="16.567797" cx="16.64089" style="opacity:1;fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:#000000;stroke-width:1.02665293;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" /><foreignObject class="svg-marker-icon" height="20" width="32" y="{y}" x="{x}"><i class="glyphicon glyphicon-{icon}" style="padding-top: 1px;"></i></foreignObject>';
        }
        return ('<svg width="51" height="46"><defs><pattern id="image" x="0" y="0" patternUnits="userSpaceOnUse" height="46" width="51"><image x="10" y="7" xlink:href="/images/marker-shadow.png" width="41" height="41"></image></pattern></defs><rect width="51" height="46" fill="url(#image)" /><path style="fill:{color};stroke:#000000;stroke-width:0.99133736;stroke-linejoin:miter;stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none" d="M 27.997745,5.1426005 C 24.789271,2.026619 20.952126,0.47068128 16.484158,0.50959524 12.016191,0.5487035 8.2054436,2.1713216 5.091418,5.3424462 1.9378926,8.514353 0.38039059,12.350325 0.45880339,16.856033 c 0.0258144,2.991029 0.76848471,5.673295 2.18949741,8.083562 0.077632,0.11361 0.1918277,0.263983 0.3064164,0.452682 0,0 12.4091738,18.816149 13.0214198,19.71936 0.611464,0.904777 1.199853,0.01446 1.199853,0.01446 L 30.668667,24.885429 C 32.123902,22.41122 32.857383,19.640568 32.830791,16.573472 32.791683,12.06757 31.168283,8.2591689 27.997745,5.1426005 z" />' + markerContent + '</svg>').replace(/\{color\}/g, backgroundColor).replace(/\{icon\}/g, icon).replace(/\{x\}/g, x).replace(/\{y\}/g, y);
    };

    emapic.utils.rgbToHsv = function(rgb) {
        var hsv = {},
            max=max3(rgb.r,rgb.g,rgb.b),
            dif=max-min3(rgb.r,rgb.g,rgb.b);
        hsv.saturation=(max===0.0)?0:(100*dif/max);
        if (hsv.saturation===0) hsv.hue=0;
        else if (rgb.r==max) hsv.hue=60.0*(rgb.g-rgb.b)/dif;
        else if (rgb.g==max) hsv.hue=120.0+60.0*(rgb.b-rgb.r)/dif;
        else if (rgb.b==max) hsv.hue=240.0+60.0*(rgb.r-rgb.g)/dif;
        if (hsv.hue<0.0) hsv.hue+=360.0;
        hsv.value=Math.round(max*100/255);
        hsv.hue=Math.round(hsv.hue);
        hsv.saturation=Math.round(hsv.saturation);
        return hsv;
    };

    // RGB2HSV and HSV2RGB are based on Color Match Remix [http://color.twysted.net/]
    // which is based on or copied from ColorMatch 5K [http://colormatch.dk/]
    emapic.utils.hsvToRgb = function(hsv) {
        var rgb={};
        if (hsv.saturation==0) {
            rgb.r=rgb.g=rgb.b=Math.round(hsv.value*2.55);
        } else {
            hsv.hue/=60;
            hsv.saturation/=100;
            hsv.value/=100;
            var i=Math.floor(hsv.hue),
                f=hsv.hue-i,
                p=hsv.value*(1-hsv.saturation),
                q=hsv.value*(1-hsv.saturation*f),
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
    };

    function hueShift(h,s) {
        h+=s; while (h>=360.0) h-=360.0; while (h<0.0) h+=360.0; return h;
    }

    function min3(a,b,c) {
        return (a<b)?((a<c)?a:c):((b<c)?b:c);
    }

    function max3(a,b,c) {
        return (a>b)?((a>c)?a:c):((b>c)?b:c);
    }

    emapic.utils.rgbToHex = function(rgb) {
        return "#" + ((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1);
    };

    emapic.utils.hexToRgb = function(hex) {
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
    };

    emapic.utils.getComplimentaryColor = function(hex) {
        var temphsv=emapic.utils.rgbToHsv(emapic.utils.hexToRgb(hex));
        temphsv.hue=hueShift(temphsv.hue,180.0);
        return emapic.utils.rgbToHex(emapic.utils.hsvToRgb(temphsv));
    };

    // Utilities for checking that the user doesn't leave the page w/o saving changes

    var leavingPageSafely = false;

    emapic.utils.checkLeavingPageSafely = function() {
        if (leavingPageSafely) {
            return;
        }
        return emapic.utils.getI18n('js_leaving_page_warning');
    };

    emapic.utils.confirmLeavingPageSafely = function() {
        leavingPageSafely = true;
        return true;
    };

    emapic.utils.getJsonAlertError = function(url, errorMsg) {
        return $.getJSON(url).fail(function(jqxhr, textStatus, error) {
            console.error("JSON request for url '" + url + "' failed: " + textStatus + ", " + error );
            $.notify({
                message: emapic.utils.getI18n(errorMsg) || emapic.utils.getI18n('js_error_loading_data')
            }, {
                type: 'danger',
                delay: 0,
                z_index: 12000
            });
        });
    };

    emapic.utils.reverseGeocodePosition = function(lat, lon, zoom) {
        var params = {
            format: 'json',
            lat: lat,
            lon: lon,
            zoom: zoom || 12
        };
        if (emapic.utils.nominatimEmail !== null) {
            params.email = emapic.utils.nominatimEmail;
        }
        return $.getJSON('https://nominatim.openstreetmap.org/reverse', params);
    };

    var checkInputUrlIsImageTargetsDeferred = {};

    emapic.utils.checkInputUrlIsImage = function(input) {
        var $input = $(input),
            val = $input.val(),
            tgt = $input.attr('target'),
            $tgt = $('#' + tgt);
        $tgt.attr('disabled', true);
        if ($tgt !== null) {
            if (val !== null && val.trim() !== '') {
                val = val.trim();
                if (val.lastIndexOf('http', 0) !== 0) {
                    val = 'http://' + val;
                }
                var dfd = checkInputUrlIsImageTargetsDeferred[tgt] = emapic.utils.checkUrlIsImage(val);
                checkInputUrlIsImageTargetsDeferred[tgt].promise().done(function(result) {
                    // If a more recent deferred has been created for the same
                    // target, then we ignore the result
                    if (checkInputUrlIsImageTargetsDeferred[tgt] === dfd) {
                        $tgt.attr('disabled', !result);
                    }
                }).fail(function(error) {
                    if (error !== null) {
                        console.error(error);
                    }
                });
            }
        }
    };

    emapic.utils.checkUrlIsImage = function(url, timeout) {
        timeout = timeout || 5000;
        var dfd = $.Deferred(),
            timer,
            img = new Image();
        img.onerror = img.onabort = function () {
            clearTimeout(timer);
            dfd.resolve(false);
        };
        img.onload = function () {
            clearTimeout(timer);
            dfd.resolve(true);
        };
        timer = setTimeout(function () {
            // reset .src to invalid URL so it stops previous
            // loading, but doesn't trigger new load
            img.src = null;
            dfd.resolve(false);
        }, timeout);
        img.src = url;
        return dfd;
    };

    emapic.utils.filterKeydownOnlyDigits = function(e) {
        // Allow: backspace, delete, tab, escape and enter
        if ($.inArray(e.keyCode, [46, 8, 9, 27, 13, 110]) !== -1 ||
             // Allow: Ctrl+A, Command+A
            (e.keyCode === 65 && (e.ctrlKey === true || e.metaKey === true)) ||
             // Allow: home, end, left, right, down, up
            (e.keyCode >= 35 && e.keyCode <= 40)) {
                // let it happen, don't do anything
                return true;
        }
        // Ensure that it is a number and stop the keypress
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
            e.preventDefault();
            return false;
        }
        return true;
    }

})(emapic);
