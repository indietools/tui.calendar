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
    },
    /**
     * Genearte a recommended, complimentary color to a provided reference
     * color, omitting desired colors.
     * @param {string} color - hex coded background color to determine recommended color for.
     * @param {array} omitColors - array of hex coded background colors which the result can't match
     * @returns {array} array of hex coded recommended colors
     */
    getRecommendedColors: function(color, omitColors) {
        var suggestedColors = [];
        var colorR, colorG, colorB, HSL, newHSL, newHex, nS, nL;
        var cCounter = 0.075;

        color = (color === '#ffffff' ? '#000000' : color);
        colorR = color.substring(1, 3);
        colorG = color.substring(3, 5);
        colorB = color.substring(5, 7);

        HSL = this.rgb2Hsl(colorR, colorG, colorB);
        nS = (HSL.s > 0.9 ? 0.9 : 1.1);
        nL = (HSL.l > 0.5 ? 0.6 : 1.3);

        while (cCounter < 1) {
            if (Math.abs(cCounter - HSL.h) > 0.1) {
                newHSL = {
                    'h': cCounter,
                    's': HSL.s,
                    'l': HSL.l
                };
                newHex = this.hsl2Rgb(newHSL.h, newHSL.s, newHSL.l);
                suggestedColors.push(newHex);
            }
            cCounter += 0.075;
        }

        cCounter = 0.075;
        while (cCounter + 0.0375 < 1) {
            newHSL = {
                'h': cCounter + 0.0375,
                's': HSL.s * nS,
                'l': HSL.l * nL
            };
            newHex = this.hsl2Rgb(newHSL.h, newHSL.s, newHSL.l);
            suggestedColors.push(newHex);
            cCounter += 0.075;
        }

        suggestedColors = suggestedColors.filter(function(c) {
            return !omitColors.includes(c);
        });

        if (suggestedColors.length < 1) {
            return [this.randomColor('')];
        }

        return suggestedColors;
    },
    /**
     * Return a hex string from an RGB color string
     * @param {string} rgb - the red component of a hex color
     * @returns {string} Hex color string
     */
    rgb2Hex: function(rgb) {
        rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);

        return '#' + hexify(rgb[1]) + hexify(rgb[2]) + hexify(rgb[3]);

        function hexify(x) {
            var intX = parseInt(x, 10);
            if (isNaN(x)) {
                return '00';
            }

            return intX < 15 ? '0' + intX.toString(16) : intX.toString(16);
        }
    },
    /**
     * Return a dict with the H, S, and L values for a given RGB triplet
     * @param {string} varR - the red component of a hex color
     * @param {string} varG - the green component of a hex color
     * @param {string} varB - the blue component of a hex color
     * @returns {object} dict containing 'h', 's', and 'l' values
     */
    rgb2Hsl: function(varR, varG, varB) {
        var r = parseInt(varR, 16) / 255;
        var g = parseInt(varG, 16) / 255;
        var b = parseInt(varB, 16) / 255;
        var min = Math.min(r, g, b);
        var max = Math.max(r, g, b);
        var h, s, deltaR, deltaG, deltaB;
        var deltaMax = max - min;
        var l = (max + min) / 2;

        if (deltaMax === 0) {
            h = 0;
            s = 0;
        } else {
            if (l < 0.5) {
                s = deltaMax / (max + min);
            } else {
                s = deltaMax / (2 - max - min);
            }
            deltaR = (((max - r) / 6) + (deltaMax / 2)) / deltaMax;
            deltaG = (((max - g) / 6) + (deltaMax / 2)) / deltaMax;
            deltaB = (((max - b) / 6) + (deltaMax / 2)) / deltaMax;

            if (r === max) {
                h = deltaB - deltaG;
            } else if (g === max) {
                h = (1 / 3) + deltaR - deltaB;
            } else if (b === max) {
                h = (2 / 3) + deltaG - deltaR;
            }

            if (h < 0) {
                h += 1;
            }

            if (h > 1) {
                h -= 1;
            }
        }

        return {
            'h': h,
            's': s,
            'l': l
        };
    },
    /**
     * Returns a hex color string from HSL values.
     * @param {string} h - the "hue" component of a hex color
     * @param {string} s - the "saturation" component of a color
     * @param {string} l - the "lightness" componenet of a color
     * @returns {string} hex color string
     */
    hsl2Rgb: function(h, s, l) {
        var r, g, b, hueVar1, hueVar2;

        if (s === 0) {
            r = l * 255;
            g = l * 255;
            b = l * 255;
        } else {
            if (l < 0.5) {
                hueVar2 = l * (1 + s);
            } else {
                hueVar2 = (l + s) - (s * l);
            }

            hueVar1 = (2 * l) - hueVar2;
            r = 255 * hue2Rgb(hueVar1, hueVar2, h + (1 / 3));
            g = 255 * hue2Rgb(hueVar1, hueVar2, h);
            b = 255 * hue2Rgb(hueVar1, hueVar2, h - (1 / 3));
        }

        return '#' + (Math.round(r) < 16 ?
            '0' + Math.round(r).toString(16) : Math.round(r).toString(16)) +
            (Math.round(g) < 16 ?
                '0' + Math.round(g).toString(16) : Math.round(g).toString(16)) +
            (Math.round(b) < 16 ?
                '0' + Math.round(b).toString(16) : Math.round(b).toString(16));
        // Function to convert hue to RGB, called from above
        function hue2Rgb(v1, v2, vh) {
            if (vh < 0) {
                vh += 1;
            }
            if (vh > 1) {
                vh -= 1;
            }

            if ((6 * vh) < 1) {
                return (v1 + (((v2 - v1) * 6) * vh));
            }
            if ((2 * vh) < 1) {
                return (v2);
            }
            if ((3 * vh) < 2) {
                return (v1 + ((v2 - v1) * (((2 / 3) - vh) * 6)));
            }

            return (v1);
        }
    },
    /**
     * Genearte a random hex color string
     * @param {string} lor - string which will be populated with random hex characters.
     * @returns {string} hex coded color
     */
    randomColor: function(lor) {
        var c = (lor += [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'a', 'b', 'c', 'd', 'e', 'f'][Math.floor(Math.random() * 16)]);
        return c && (lor.length === 6) ? lor : this.randomColor(lor);
    }
};

module.exports = colorutil;
