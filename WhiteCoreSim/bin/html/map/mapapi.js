/** Leaflet mapping  
* 	This Code was adapted from similar code provided by Second Life 
*    but modified to suit the WhiteCore API and options
*
*  March 2017 greythane @ gmail . com
**/


 /**
 * Namespace maker
 *
 * by Ringo
 *
 * A very simple way to create a jquery namespace to help organize related
 * methods, constants, etc.
 */

if (typeof ($) === 'undefined') {
    $ = {};
}

/**
 * Define and construct the jquery namespace
 *
 * @return {null}
 */
$.namespace = function() {
    var o = null;
    var i,
        j,
        d;
    for (i = 0; i < arguments.length; i++) {
        d = arguments[i].split(".");
        o = window;
        for (j = 0; j < d.length; j++) {
            o[d[j]] = o[d[j]] || {};
            o = o[d[j]];
        }
    }
    return o;
};

// Namespace declarations
// Add new declarations here!
$.namespace('$.sl.maps.config');
$.namespace('$.sl.maps');
$.sl.maps.config = {
    sl_base_url: "{MainServerURL}",
    tile_url: "{WorldMapServiceURL}",

    //Default Destination Information
    default_title: "Welcome to WhiteCore Sim",
    default_img: "http://whitecore-sim.org/wiki/default/default-new.jpg",
    default_msg: "WhiteCore is a virtual space for meeting friends, doing business, and sharing knowledge. <strong>If you have a Second Life or alternative viewer installed on your computer<strong>, teleport in and start exploring!",

    // Turn on the map debugger
    map_debug: false,

    // The maximum width/height of the SL grid in regions:
    // 2^20 regions on a side = 1,048,786    ("This should be enough for anyone")
    // *NOTE: This must be a power of 2 and divisible by 2^(max zoom) = 256
    map_grid_edge_size: 1048576,

    // NOTE: Mustachejs Templates
    // These templates were moved in to here so they are available as soon as the javascript is loaded
    // that way we don't have to wait for the page to full load before processing all the data we have on hand.

    // Ballooon Popup Template
    balloon_tmpl: ' \
        <div class="balloon-content"> \
            <h3> \
                {{#slurl}} \
                <a href="{{{slurl}}}" onclick="trakkit(\'maps\', \'teleport\', \'{{{slurl}}}\');"> \
                {{/slurl}} \
                    {{title}} \
                {{#slurl}} \
                </a> \
                {{/slurl}} \
            </h3> \
            {{#img}} \
            <a href="{{{slurl}}}" onclick="trakkit(\'maps\', \'teleport\', \'{{{slurl}}}\');"> \
                <img src="{{{img}}}" onError="this.onerror=null;this.src=assetsURL + \'/_img/default-new.jpg\';" /> \
            </a> \
            {{/img}} \
            <p>{{{msg}}}</p> \
            <div class="buttons"> \
                {{#slurl}} \
                    <a class="HIGHLANDER_button_hot btn_large primary" title="visit this location" href="{{{slurl}}}" onclick="trakkit(\'maps\', \'teleport\', \'{{{slurl}}}\');">Visit this location</a> \
                {{/slurl}} \
                <a href="http://join.secondlife.com/" target="_top" class="HIGHLANDER_button_hot btn_large secondary join_button">Join Now, it&rsquo;s free!</a> \
            </div> \
        </div>'
    ,

    // Slurl Doesn't Exist Template
    noexists_tmpl: ' \
        <div id="map-error"> \
            <div id="error-content"> \
                <span class="error-close">Hide message</span> \
                <span class="location-title">We are unable to locate the region "{{region_name}}"</span> \
                <p>This region may no longer exist, but please double check your spelling and coordinates to make sure there aren&rsquo;t any errors and try again.</p> \
                <p>If your problem persists, contact <a href="http://whitecore-sim.org/wiki/default/chat">WhiteCore support</a></p> \
            </div> \
        </div>'

}

// License and Terms of Use
//
// Copyright 2016 Linden Research, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//
// This javascript makes use of the WhiteCore Map API, which is documented
// at http://whitecore-sim.org/wiki/Map_API
//
// Use of the WhiteCore Map API is subject to the WhiteCore API Terms of Use:
//   https://whitecore-sim.org/wiki/API_Terms_of_Use
//
// Questions regarding this javascript, and any suggested improvements to it,
// should be sent to the mailing list opensource-dev@list.secondlife.com
// ==============================================================================

/*

# How A Leaflet Map #

Leaflet provides a "Simple" coordinate space for 2D maps
like WhiteCore's out of the box. The Simple CRS is not even limited by a
geographic conception of coordinate limits: we can really use the real
regionspace coordinates & the Simple CRS operates correctly. This means we have
nonsensical (Earth-wise) "latitudes" & "longitudes", because they're really
just coordinates.

<http://leafletjs.com/examples/crs-simple/crs-simple.html>

For further simplicity, the possible WhiteCore region space (labeled here
"grid_x, grid_y") is mapped to the upper right quadrant of such a map. This
puts the (0, 0) origin of region space at LatLng (0, 0).

    (0, 2^20) long, lat
    (0, 2^20) grid_x, grid_y
     |
     V
     X------------------------------------+
     |                                    |
     |                                    |
     |                                    |
     |                                    |
     |                                    |
     |                                    |
     |                                    |
     |                                    |
     | xxx                                |
     | xxx                                |   (2^20, 0) long, lat
     X------------------------------------X<- (2^20, 0) grid_x, grid_y
     ^
     |
    (0, 0) long, lat
    (0, 0) grid_x, grid_y

A large scaling value called `map_grid_edge_size` defines the largest region
coordinate at the top and far right edge of the map. At the current value of
2^20 = 1M, this creates a map area with room for 1 trillion regions. The xxx'd
area of the map represents today's populated regions.

## Zoom levels ##

WC Maps zoom levels (Zl) start zoomed in, at Zl 1, where each tile comprises 1
region by itself. At Zl 2 each tile is 2x2 regions, and doubled again (in each
dimension) at each additional level. This means each tile is 2^(Zl-1) regions
across.

Leaflet lets us just use these zoom levels, though we have to specify our
levels are backwards & start at 1. The wrinkle with Leaflet is it wants to
address the tile images at different zoom levels in how many _tiles_ from (0,
0) we are, but WC map tiles are addressed in regionspace coordinates at all
zoom levels. These are the same at Zl 1 where 1 tile = 1 region. We provide the
`SLTileLayer` layer class to un-convert Leaflet's tile coordinates back to
regionspace coordinates at the other zoom levels.

*/

// === Constants ===
var slDebugMap = $.sl.maps.config.map_debug;

var MIN_ZOOM_LEVEL = 1;
var MAX_ZOOM_LEVEL = 8;

/**
 * Creates a WhiteCore map in the given DOM element & returns the Leaflet Map.
 *
 * @param {Element} map_element the DOM element to contain the map
 */
function SLMap(mapElement, mapOptions)
{
    mapElement.className += ' mapapi-map-container';

    var mapDiv = document.createElement("div");
    mapDiv.style.height = "100%";
    mapElement.appendChild(mapDiv);

    var SLTileLayer = L.TileLayer.extend({
        getTileUrl: function(coords) {
            var data = {
                r: L.Browser.retina ? '@2x' : '',
                s: this._getSubdomain(coords),
                z: this._getZoomForUrl()
            };

            var regionsPerTileEdge = Math.pow(2, data['z'] - 1);
            data['region_x'] = coords.x * regionsPerTileEdge;
            data['region_y'] = (Math.abs(coords.y) - 1) * regionsPerTileEdge;

            return L.Util.template(this._url, L.extend(data, this.options));
        }
    });

    var tiles = new SLTileLayer($.sl.maps.config.tile_url + "/map-{z}-{region_x}-{region_y}-objects.jpg", {
        crs: L.CRS.Simple,
        minZoom: MIN_ZOOM_LEVEL,
        maxZoom: MAX_ZOOM_LEVEL,
        zoomOffset: 1,
        zoomReverse: true,
        bounds: [[0, 0], [$.sl.maps.config.map_grid_edge_size, $.sl.maps.config.map_grid_edge_size]],
        attribution: "<a href='" + $.sl.maps.config.sl_base_url + "'>WhiteCore</a>"
    });

    var map = L.map(mapDiv, {
        crs: L.CRS.Simple,
        minZoom: MIN_ZOOM_LEVEL,
        maxZoom: MAX_ZOOM_LEVEL,
        maxBounds: [[0, 0], [$.sl.maps.config.map_grid_edge_size, $.sl.maps.config.map_grid_edge_size]],
        layers: [tiles]
    });

    map.on('click', function(event) {
        gotoSLURL(event.latlng.lng, event.latlng.lat, map);
    });

    return map;
}

/**
 * Loads the script with the given URL by adding a script tag to the document.
 *
 * @private
 * @param {string} scriptURL the script to load
 * @param {function} onLoadHandler a callback to call when the script is loaded (optional)
 */
function slAddDynamicScript(scriptURL, onLoadHandler)
{
    var script = document.createElement('script');
    script.src = scriptURL;
    script.type = "text/javascript";

    if (onLoadHandler) {
        // Need to use ready state change for IE as it doesn't support onload for scripts
        script.onreadystatechange = function() {
            if (script.readyState == 'complete' || script.readyState == 'loaded') {
                onLoadHandler();
            }
        }
        // Standard onload for Firefox/Safari/Opera etc
        script.onload = onLoadHandler;
    }

    document.body.appendChild(script);
}

/**
 * Opens a map window (info window) for the given WC location, giving its name
 * and a "Teleport Here" button, as when clicked.
 *
 * @param {number} x the horizontal (west-east) WC Maps region coordinate to open the map window at
 * @param {number} y the vertical (south-north) WC Maps region coordinate to open the map window at
 * @param {SLMap} slMap the map in which to open the map window
 */
function gotoSLURL(x, y, lmap)
{
    // Work out region co-ords, and local co-ords within region
    var int_x = Math.floor(x);
    var int_y = Math.floor(y);

    var local_x = Math.round((x - int_x) * 256);
    var local_y = Math.round((y - int_y) * 256);

    // Add a dynamic script to get this region name, and then trigger a URL change
    // based on the results
    //var scriptURL = "https://thunderlife.us/includes/regname.php?grid_x=" + int_x + "&grid_y=" + int_y;
    var scriptURL ="{WorldMapAPIServiceURL}/get-region-name-by-coords?var=wcRegionName&grid_x=" + encodeURIComponent(int_x) + "&grid_y=" + encodeURIComponent(int_y);

    // Once the script has loaded, we use the result to teleport the user into SL
    var onLoadHandler = function() {
        if (wcRegionName == null || wcRegionName.error)
            return;

        var url = "secondlife://" + encodeURIComponent(wcRegionName)
        + "/" + local_x + "/" + local_y;

        var debugInfo = '';
        if (slDebugMap) {
            debugInfo = ' x: ' + int_x + ' y: ' + int_y;
        }

        var content = '<div class="balloon-content balloon-content-narrow"><h3><a href="' + url + '">' + wcRegionName + '</a></h3>'
        + debugInfo
        + '<div class="buttons"><a href="' + url + '" class="HIGHLANDER_button_hot btn_large primary">Visit this location</a></div></div>';
        var popup = L.popup().setLatLng([y, x]).setContent(content).openOn(lmap);
    };

    slAddDynamicScript(scriptURL, onLoadHandler);
}
