/**
 * @fileoverview Floating layer for showing team details
 * @author NHN FE Development Lab <dl_javascript@nhn.com>
 */
'use strict';

var View = require('../../view/view');
var FloatingLayer = require('../../common/floatingLayer');
var util = require('tui-code-snippet');
var config = require('../../config'),
    domevent = require('../../common/domevent'),
    domutil = require('../../common/domutil');
var tmpl = require('../template/popup/teamDetailPopup.hbs');
var ARROW_WIDTH_HALF = 8;

/**
 * @constructor
 * @extends {View}
 * @param {HTMLElement} container - container element
 */
function TeamDetailPopup(container) {
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
    this._team = null;
    this._resources = null;

    domevent.on(container, 'click', this._onClick, this);
}

util.inherit(TeamDetailPopup, View);

/**
 * Mousedown event handler for hiding popup layer when user mousedown outside of
 * layer
 * @param {MouseEvent} mouseDownEvent - mouse event object
 */
TeamDetailPopup.prototype._onMouseDown = function(mouseDownEvent) {
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
TeamDetailPopup.prototype.destroy = function() {
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
TeamDetailPopup.prototype._onClick = function(clickEvent) {
    var target;
    if (this.layer.container.style.display !== 'none') {
        target = (clickEvent.target || clickEvent.srcElement);

        this._onClickEditTeam(target);

        this._onClickDeleteTeam(target);
    }
};

/**
 * @fires TeamDetailPopup#clickEditTeam
 * @param {HTMLElement} target - event target
 */
TeamDetailPopup.prototype._onClickEditTeam = function(target) {
    var className = config.classname('popup-edit-team');

    if (domutil.hasClass(target, className) || domutil.closest(target, '.' + className)) {
        this.fire('beforeUpdateTeam', {
            team: this._team,
            resources: this._resources,
            triggerEventName: 'click',
            trigger: this._teamEl
        });

        this.hide();
    }
};

/**
 * @fires TeamDetailPopup#clickEditTeam
 * @param {HTMLElement} target - event target
 */
TeamDetailPopup.prototype._onClickDeleteTeam = function(target) {
    var className = config.classname('popup-delete-team');

    if (domutil.hasClass(target, className) || domutil.closest(target, '.' + className)) {
        this.fire('beforeDeleteTeam', {
            team: this._team
        });

        this.hide();
    }
};

/**
 * @override
 * @param {object} viewModel - view model from factory/monthView
 */
TeamDetailPopup.prototype.render = function(viewModel) {
    var layer = this.layer;
    var self = this;
    var boxElement, guideElements;

    layer.setContent(tmpl({
        team: viewModel.team,
        resources: viewModel.resources
    }));
    layer.show();

    if (viewModel.trigger) {
        boxElement = domutil.closest(viewModel.trigger, config.classname('.left-nav-bar-teams-item')) ||
            viewModel.target;

        this._teamEl = boxElement;
    } else {
        this.guide = viewModel.guide;
        guideElements = this._getGuideElements(this.guide);
        boxElement = guideElements.length ? guideElements[0] : null;
    }

    this._setPopupPositionAndArrowDirection(boxElement.getBoundingClientRect());

    this._team = viewModel.team;
    this._resources = viewModel.resources;

    util.debounce(function() {
        domevent.on(document.body, 'mousedown', self._onMouseDown, self);
    })();

    this.fire('beforeDisplayTeamEditWindow', {
        team: this._team
    });
};

/**
 * Set popup position and arrow direction to apear near guide element
 * @param {MonthCreationGuide|TimeCreationGuide|DayGridCreationGuide} guideBound - creation guide element
 */
TeamDetailPopup.prototype._setPopupPositionAndArrowDirection = function(guideBound) {
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
TeamDetailPopup.prototype._calcRenderingData = function(layerSize, parentSize, guideBound) {
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
TeamDetailPopup.prototype._setArrowDirection = function(arrow) {
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
TeamDetailPopup.prototype.hide = function() {
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
TeamDetailPopup.prototype.refresh = function() {
    if (this._viewModel) {
        this.layer.setContent(this.tmpl(this._viewModel));
    }
};

module.exports = TeamDetailPopup;
