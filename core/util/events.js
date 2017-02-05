/*
 * noVNC: HTML5 VNC client
 * Copyright (C) 2012 Joel Martin
 * Licensed under MPL 2.0 (see LICENSE.txt)
 *
 * See README.md for usage and integration instructions.
 */

/*
 * Cross-browser event and position routines
 */

import * as Log from './logging.js';

function getPosition (obj) {
    "use strict";
    // NB(sross): the Mozilla developer reference seems to indicate that
    // getBoundingClientRect includes border and padding, so the canvas
    // style should NOT include either.
    var objPosition = obj.getBoundingClientRect();
    return {'x': objPosition.left + window.pageXOffset, 'y': objPosition.top + window.pageYOffset,
            'width': objPosition.width, 'height': objPosition.height};
};

export function getPointerEvent (e) {
    var evt;
    evt = (e ? e : window.event);
    evt = (evt.changedTouches ? evt.changedTouches[0] : evt.touches ? evt.touches[0] : evt);
    return evt;
};

// Get mouse event position in DOM element
export function getEventPosition (e, obj, scale) {
    "use strict";
    var evt, docX, docY, pos;
    evt = getPointerEvent(e);
    if (evt.pageX || evt.pageY) {
        docX = evt.pageX;
        docY = evt.pageY;
    } else if (evt.clientX || evt.clientY) {
        docX = evt.clientX + document.body.scrollLeft +
            document.documentElement.scrollLeft;
        docY = evt.clientY + document.body.scrollTop +
            document.documentElement.scrollTop;
    }
    pos = getPosition(obj);
    if (typeof scale === "undefined") {
        scale = 1;
    }
    var realx = docX - pos.x;
    var realy = docY - pos.y;
    var x = Math.max(Math.min(realx, pos.width - 1), 0);
    var y = Math.max(Math.min(realy, pos.height - 1), 0);
    return {'x': x / scale, 'y': y / scale, 'realx': realx / scale, 'realy': realy / scale};
};

export function stopEvent (e) {
    e.stopPropagation();
    e.preventDefault();
};

// Emulate Element.setCapture() when not supported
var _captureRecursion = false;
var _captureElem = null;
const _captureProxy = function (e) {
    // Recursion protection as we'll see our own event
    if (_captureRecursion) return;

    // Clone the event as we cannot dispatch an already dispatched event
    var newEv = new e.constructor(e.type, e);

    _captureRecursion = true;
    _captureElem.dispatchEvent(newEv);
    _captureRecursion = false;

    // Implicitly release the capture on button release
    if ((e.type === "mouseup") || (e.type === "touchend")) {
        releaseCapture();
    }
};

export function setCapture (elem) {
    if (elem.setCapture) {

        elem.setCapture();

        // IE releases capture on 'click' events which might not trigger
        elem.addEventListener('mouseup', releaseCapture);
        elem.addEventListener('touchend', releaseCapture);

    } else {
        // Safari on iOS 9 has a broken constructor for TouchEvent.
        // We are fine in this case however, since Safari seems to
        // have some sort of implicit setCapture magic anyway.
        if (window.TouchEvent !== undefined) {
            try {
                new TouchEvent("touchstart");
            } catch (TypeError) {
                return;
            }
        }

        var captureElem = document.getElementById("noVNC_mouse_capture_elem");

        if (captureElem === null) {
            captureElem = document.createElement("div");
            captureElem.id = "noVNC_mouse_capture_elem";
            captureElem.style.position = "fixed";
            captureElem.style.top = "0px";
            captureElem.style.left = "0px";
            captureElem.style.width = "100%";
            captureElem.style.height = "100%";
            captureElem.style.zIndex = 10000;
            captureElem.style.display = "none";
            document.body.appendChild(captureElem);

            captureElem.addEventListener('mousemove', _captureProxy);
            captureElem.addEventListener('mouseup', _captureProxy);

            captureElem.addEventListener('touchmove', _captureProxy);
            captureElem.addEventListener('touchend', _captureProxy);
        }

        _captureElem = elem;
        captureElem.style.display = null;

        // We listen to events on window in order to keep tracking if it
        // happens to leave the viewport
        window.addEventListener('mousemove', _captureProxy);
        window.addEventListener('mouseup', _captureProxy);

        window.addEventListener('touchmove', _captureProxy);
        window.addEventListener('touchend', _captureProxy);
    }
};

export function releaseCapture () {
    if (document.releaseCapture) {

        document.releaseCapture();

    } else {
        var captureElem = document.getElementById("noVNC_mouse_capture_elem");
        _captureElem = null;
        captureElem.style.display = "none";

        window.removeEventListener('mousemove', _captureProxy);
        window.removeEventListener('mouseup', _captureProxy);

        window.removeEventListener('touchmove', _captureProxy);
        window.removeEventListener('touchend', _captureProxy);
    }
};
