/**
 * @fileoverview Floating layer for  showing detail resource
 * @author NHN FE Development Lab <dl_javascript@nhn.com>
 */
'use strict';

var View = require('../../view/view');
var FloatingLayer = require('../../common/floatingLayer');
var util = require('tui-code-snippet');
var config = require('../../config'),
    domevent = require('../../common/domevent'),
    domutil = require('../../common/domutil');
var tmpl = require('../template/popup/resourceDetailPopup.hbs');
var ARROW_WIDTH_HALF = 8;

/**
 * @constructor
 * @extends {View}
 * @param {HTMLElement} container - container element
 */
function ResourceDetailPopup(container) {
    View.call(this, container);
    /**
     * @type {FloatingLayer}
     */
    this.layer = new FloatingLayer(null, container);

    /**
     * cached view model
     * @type {object}
     */
    this._viewModel = null;
    this._resource = null;
    this._calendar = null;
    this._assignees = [];

    domevent.on(container, 'click', this._onClick, this);
}

util.inherit(ResourceDetailPopup, View);

/**
 * Mousedown event handler for hiding popup layer when user mousedown outside of
 * layer
 * @param {MouseEvent} mouseDownEvent - mouse event object
 */
ResourceDetailPopup.prototype._onMouseDown = function(mouseDownEvent) {
    var target = (mouseDownEvent.target || mouseDownEvent.srcElement),
        popupLayer = domutil.closest(target, config.classname('.floating-layer'));

    if (popupLayer) {
        return;
    }

    this.hide();
};

/**
 * @override
 */
ResourceDetailPopup.prototype.destroy = function() {
    this.layer.destroy();
    this.layer = null;
    domevent.off(this.container, 'click', this._onClick, this);
    domevent.off(document.body, 'mousedown', this._onMouseDown, this);
    View.prototype.destroy.call(this);
};

/**
 * @override
 * Click event handler for close button
 * @param {MouseEvent} clickEvent - mouse event object
 */
ResourceDetailPopup.prototype._onClick = function(clickEvent) {
    var target;
    if (this.layer.container.style.display !== 'none') {
        target = (clickEvent.target || clickEvent.srcElement);

        this._onClickEditResource(target);

        this._onClickDeleteResource(target);
    }
};

/**
 * @fires ResourceDetailPopup#clickEditResource
 * @param {HTMLElement} target - event target
 */
ResourceDetailPopup.prototype._onClickEditResource = function(target) {
    var className = config.classname('popup-edit-resource');

    if (domutil.hasClass(target, className) || domutil.closest(target, '.' + className)) {
        this.fire('beforeUpdateResource', {
            resource: this._resource,
            assignees: this._assignees,
            triggerEventName: 'click',
            trigger: this._resourceEl
        });

        this.hide();
    }
};

/**
 * @fires ResourceDetailPopup#clickEditResource
 * @param {HTMLElement} target - event target
 */
ResourceDetailPopup.prototype._onClickDeleteResource = function(target) {
    var className = config.classname('popup-delete-resource');

    if (domutil.hasClass(target, className) || domutil.closest(target, '.' + className)) {
        this.fire('beforeDeleteResource', {
            resource: this._resource
        });

        this.hide();
    }
};

/**
 * @override
 * @param {object} viewModel - view model from factory/monthView
 */
ResourceDetailPopup.prototype.render = function(viewModel) {
    var layer = this.layer;
    var self = this;
    var boxElement, guideElements;

    layer.setContent(tmpl({
        resource: viewModel.resource,
        teams: viewModel.teams,
        assignees: viewModel.assignees
    }));
    layer.show();

    if (viewModel.trigger) {
        boxElement = domutil.closest(viewModel.trigger, config.classname('.left-nav-bar-resources-item')) ||
            viewModel.target;

        this._resourceEl = boxElement;
    } else {
        this.guide = viewModel.guide;
        guideElements = this._getGuideElements(this.guide);
        boxElement = guideElements.length ? guideElements[0] : null;
    }

    this._setPopupPositionAndArrowDirection(boxElement.getBoundingClientRect());

    this._resource = viewModel.resource;
    this._assignees = viewModel.assignees;

    util.debounce(function() {
        domevent.on(document.body, 'mousedown', self._onMouseDown, self);
    })();

    this.fire('beforeDisplayResourceEditWindow', {
        resource: this._resource,
        assignees: this._assignees
    });
};

/**
 * Set popup position and arrow direction to apear near guide element
 * @param {MonthCreationGuide|TimeCreationGuide|DayGridCreationGuide} guideBound - creation guide element
 */
ResourceDetailPopup.prototype._setPopupPositionAndArrowDirection = function(guideBound) {
    var layer = domutil.find(config.classname('.popup'), this.layer.container);
    var layerSize = {
        width: layer.offsetWidth,
        height: layer.offsetHeight
    };
    var windowSize = {
        right: window.innerWidth,
        bottom: window.innerHeight
    };
    var parentRect = this.layer.parent.getBoundingClientRect();
    var parentBounds = {
        left: parentRect.left,
        top: parentRect.top
    };
    var pos;

    pos = this._calcRenderingData(layerSize, windowSize, guideBound);
    pos.x -= parentBounds.left;
    pos.y -= (parentBounds.top + 6);
    this.layer.setPosition(pos.x, pos.y);
    this._setArrowDirection(pos.arrow);
};

/**
 * Calculate rendering position usering guide elements
 * @param {{width: {number}, height: {number}}} layerSize - popup layer's width and height
 * @param {{top: {number}, left: {number}, right: {number}, bottom: {number}}} parentSize - width and height of the upper layer, that acts as a border of popup
 * @param {{top: {number}, left: {number}, right: {number}, bottom: {number}}} guideBound - guide element bound data
 * @returns {PopupRenderingData} rendering position of popup and popup arrow
 */
ResourceDetailPopup.prototype._calcRenderingData = function(layerSize, parentSize, guideBound) {
    var guideVerticalCenter = (guideBound.top + guideBound.bottom) / 2;
    var x = guideBound.right;
    var y = guideVerticalCenter;
    var arrowDirection = 'arrow-left';
    var arrowTop;

    if (y < 0) {
        y = y + (layerSize.height / 2) - guideVerticalCenter;
    }

    if (x > 0 && (x + layerSize.width > parentSize.right)) {
        x = guideBound.left - layerSize.width - ARROW_WIDTH_HALF - 3;
        arrowDirection = 'arrow-right';
    }

    if (x < 0) {
        x = 0;
    }

    if (guideBound.right > x + layerSize.width) {
        arrowDirection = 'arrow-right';
    }

    /**
     * @typedef {Object} PopupRenderingData
     * @property {number} x - left position
     * @property {number} y - top position
     * @property {string} arrow.direction - direction of popup arrow
     * @property {number} [arrow.position] - relative position of popup arrow, if it is not set, arrow appears on the middle of popup
     */
    return {
        x: x + ARROW_WIDTH_HALF,
        y: y - (layerSize.height / 2) + ARROW_WIDTH_HALF,
        arrow: {
            direction: arrowDirection,
            position: arrowTop
        }
    };
};

/**
 * Set arrow's direction and position
 * @param {Object} arrow rendering data for popup arrow
 */
ResourceDetailPopup.prototype._setArrowDirection = function(arrow) {
    var direction = arrow.direction || 'arrow-left';
    var arrowEl = domutil.find(config.classname('.popup-arrow'), this.layer.container);
    var borderElement = domutil.find(config.classname('.popup-arrow-border', arrowEl));

    if (direction !== config.classname('arrow-left')) {
        domutil.removeClass(arrowEl, config.classname('arrow-left'));
        domutil.addClass(arrowEl, config.classname(direction));
    }

    if (arrow.position) {
        borderElement.style.top = arrow.position + 'px';
    }
};

/**
 * Hide layer
 */
ResourceDetailPopup.prototype.hide = function() {
    this.layer.hide();

    if (this.guide) {
        this.guide.clearGuideElement();
        this.guide = null;
    }

    domevent.off(document.body, 'mousedown', this._onMouseDown, this);
};

/**
 * refresh layer
 */
ResourceDetailPopup.prototype.refresh = function() {
    if (this._viewModel) {
        this.layer.setContent(this.tmpl(this._viewModel));
    }
};

module.exports = ResourceDetailPopup;
