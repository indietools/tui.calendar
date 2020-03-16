/* eslint complexity: 0, no-shadow: 0, max-nested-callbacks: 0  */
/**
 * @fileoverview Utility modules managing pretty colors.
 * @author IndieTools <support@indie.tools>
 */
'use strict';

var colorutil;

var THRESHOLD = 149;

colorutil = {
    /**
     * Determine appropriate text color (#FFF or #000) for a given background color.
     * @param {string} bgColor - hex coded background color to determine font color for.
     * @returns {string} hex coded font color
     */
    determineTextforBackground: function(bgColor) {
        var r, g, b;

        if (bgColor.length === 7) {
            r = parseInt(bgColor.substring(1, 3), 16);
            g = parseInt(bgColor.substring(3, 5), 16);
            b = parseInt(bgColor.substring(5, 7), 16);
        } else {
            r = parseInt(bgColor.substring(0, 2), 16);
            g = parseInt(bgColor.substring(2, 4), 16);
            b = parseInt(bgColor.substring(4, 6), 16);
        }

        return (((r * 0.299) + (g * 0.587) + (b * 0.114)) > THRESHOLD) ? '#000000' : '#ffffff';
    }
};

module.exports = colorutil;
