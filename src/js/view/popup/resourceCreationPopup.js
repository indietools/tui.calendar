/**
 * @fileoverview Floating layer for writing new calendars
 * @author NHN FE Development Lab <dl_javascript@nhn.com>
 */
'use strict';

var View = require('../../view/view');
var FloatingLayer = require('../../common/floatingLayer');
var util = require('tui-code-snippet');
var config = require('../../config');
var domevent = require('../../common/domevent');
var domutil = require('../../common/domutil');
var common = require('../../common/common');
var tmpl = require('../template/popup/resourceCreationPopup.hbs');
var MAX_WEEK_OF_MONTH = 6;
var ARROW_WIDTH_HALF = 8;

/**
 * @constructor
 * @extends {View}
 * @param {HTMLElement} container - container element
 * @param {Array.<Calendar>} calendars - calendar list used to create new calendar
 * @param {boolean} usageStatistics - GA tracking options in Calendar
 */
function ResourceCreationPopup(container, calendars, usageStatistics) {
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
    this._selectedCals = [];
    this._resource = null;
    this.calendars = calendars;
    this._focusedSelect = null;
    this._usageStatistics = usageStatistics;
    this._onClickListeners = [
        this._selectSelectMenuItem.bind(this),
        this._toggleSelectMenuView.bind(this),
        this._closeSelectMenuView.bind(this, null),
        this._closePopup.bind(this),
        this._onClickSaveResource.bind(this)
    ];

    domevent.on(container, 'click', this._onClick, this);
}

util.inherit(ResourceCreationPopup, View);

/**
 * Mousedown event handler for hiding popup layer when user mousedown outside of
 * layer
 * @param {MouseEvent} mouseDownEvent - mouse event object
 */
ResourceCreationPopup.prototype._onMouseDown = function(mouseDownEvent) {
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
ResourceCreationPopup.prototype.destroy = function() {
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
ResourceCreationPopup.prototype._onClick = function(clickEvent) {
    var target = (clickEvent.target || clickEvent.srcElement);

    util.forEach(this._onClickListeners, function(listener) {
        return !listener(target);
    });
};

/**
 * Test click event target is close button, and return layer is closed(hidden)
 * @param {HTMLElement} target click event target
 * @returns {boolean} whether popup layer is closed or not
 */
ResourceCreationPopup.prototype._closePopup = function(target) {
    var className = config.classname('popup-close');

    if (domutil.hasClass(target, className) || domutil.closest(target, '.' + className)) {
        this.hide();

        return true;
    }

    return false;
};

/**
 * Toggle select menu view, when user clicks select button
 * @param {HTMLElement} target click event target
 * @returns {boolean} whether user clicked select button or not
 */
ResourceCreationPopup.prototype._toggleSelectMenuView = function(target) {
    var className = config.classname('select-button');
    var selectBtn = domutil.hasClass(target, className) ? target : domutil.closest(target, '.' + className);

    if (!selectBtn) {
        return false;
    }

    if (domutil.hasClass(selectBtn.parentNode, config.classname('open'))) {
        this._closeSelectMenuView(selectBtn.parentNode);
    } else {
        this._openSelectMenuView(selectBtn.parentNode);
    }

    return true;
};

/**
 * Close select menu
 * @param {HTMLElement} select - select element that has a opened select menu
 */
ResourceCreationPopup.prototype._closeSelectMenuView = function(select) {
    select = select || this._focusedSelect;
    if (select) {
        domutil.removeClass(select, config.classname('open'));
        this._focusedSelect = null;
    }
};

/**
 * Open selectn menu
 * @param {HTMLElement} select - select element that has a closed select menu
 */
ResourceCreationPopup.prototype._openSelectMenuView = function(select) {
    domutil.addClass(select, config.classname('open'));
    this._focusedSelect = select;
};

/**
 * If click select menu item, close select menu
 * @param {HTMLElement} target click event target
 * @returns {boolean} whether
 */
ResourceCreationPopup.prototype._selectSelectMenuItem = function(target) {
    var itemClassName = config.classname('select-menu-item');
    var selectedClassName = config.classname('select-menu-item-selected');
    var selectedItem = domutil.hasClass(target, itemClassName) ? target : domutil.closest(target, '.' + itemClassName);
    var select, add, cSpan;

    if (!selectedItem) {
        return false;
    }

    if (domutil.hasClass(selectedItem, selectedClassName)) {
        domutil.removeClass(selectedItem, selectedClassName);
        add = false;
    } else {
        domutil.addClass(selectedItem, selectedClassName);
        add = true;
    }

    select = domutil.closest(selectedItem, config.classname('.select'));

    if (domutil.hasClass(select, config.classname('section-calendar'))) {
        if (add) {
            this._selectedCals = this._selectedCals.concat(
                this.calendars.filter(function(cal) {
                    return cal.id === domutil.getData(selectedItem, 'calendarId');
                })
            );
        } else {
            this._selectedCals = this._selectedCals.filter(function(cal) {
                return cal.id !== domutil.getData(selectedItem, 'calendarId');
            });
        }
    }

    cSpan = document.getElementById('countSpan');
    cSpan.innerText = '(' + this._selectedCals.length.toString() + ')';

    return true;
};

/**
 * Save new resource if user clicked save button
 * @emits ResourceCreationPopup#saveResource
 * @param {HTMLElement} target click event target
 * @returns {boolean} whether save button is clicked or not
 */
ResourceCreationPopup.prototype._onClickSaveResource = function(target) {
    var className = config.classname('resource-popup-save');
    var cssPrefix = config.cssPrefix;
    var name, calendars, changes;

    if (!domutil.hasClass(target, className) && !domutil.closest(target, '.' + className)) {
        return false;
    }

    name = domutil.get(cssPrefix + 'resource-title');

    if (!name.value) {
        name.focus();

        return true;
    }

    calendars = Array.from(document.querySelectorAll('.tui-full-calendar-select-menu > .tui-full-calendar-select-menu-item-selected')).map(function(item) {
        return item.dataset.calendarId;
    });

    if (this._isEditMode) {
        changes = common.getResourceChanges(
            this._resource,
            ['name', 'calendars', 'checked'],
            {
                name: name.value,
                calendars: calendars,
                checked: true
            }
        );

        this.fire('beforeUpdateResource', {
            resource: this._resource,
            changes: changes
        });
    } else {
        /**
         * @event ResourceCreationPopup#beforeCreateResource
         * @type {object}
         * @property {Resource} resource - new resource instance to be added
         */
        this.fire('beforeCreateResource', {
            name: name.value,
            calendars: calendars,
            checked: true
        });
    }

    this.hide();

    return true;
};

/**
 * @override
 * @param {object} viewModel - view model from factory/monthView
 */
ResourceCreationPopup.prototype.render = function(viewModel) {
    var calendars = this.calendars;
    var layer = this.layer;
    var self = this;
    var boxElement, guideElements;

    viewModel.zIndex = this.layer.zIndex + 5;
    viewModel.calendars = calendars;
    this._isEditMode = viewModel.resource;

    if (viewModel.trigger) {
        boxElement = viewModel.trigger;
    } else {
        this.guide = viewModel.guide;
        guideElements = this._getGuideElements(this.guide);
        boxElement = guideElements.length ? guideElements[0] : null;
    }

    if (this._isEditMode) {
        this._resource = viewModel.resource;
        this._selectedCals = this.calendars.filter(function(cal) {
            return viewModel.resource.calendars.includes(cal.id);
        }) || [];
        viewModel.selectedIds = viewModel.resource.calendars || [];
        viewModel.name = viewModel.resource.name;
    } else {
        viewModel.selectedIds = [];
        this._selectedCals = [];
    }

    layer.setContent(tmpl(viewModel));
    layer.show();

    if (boxElement) {
        this._setPopupPositionAndArrowDirection(boxElement.getBoundingClientRect());
    }

    util.debounce(function() {
        domevent.on(document.body, 'mousedown', self._onMouseDown, self);
    })();
};

/**
 * Set popup position and arrow direction to apear near guide element
 * @param {MonthCreationGuide|TimeCreationGuide|DayGridCreationGuide} guideBound - creation guide element
 */
ResourceCreationPopup.prototype._setPopupPositionAndArrowDirection = function(guideBound) {
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
 * Get guide elements from creation guide object
 * It is used to calculate rendering position of popup
 * It will be disappeared when hiding popup
 * @param {MonthCreationGuide|TimeCreationGuide|AlldayCreationGuide} guide - creation guide
 * @returns {Array.<HTMLElement>} creation guide element
 */
ResourceCreationPopup.prototype._getGuideElements = function(guide) {
    var guideElements = [];
    var i = 0;

    if (guide.guideElement) {
        guideElements.push(guide.guideElement);
    } else if (guide.guideElements) {
        for (; i < MAX_WEEK_OF_MONTH; i += 1) {
            if (guide.guideElements[i]) {
                guideElements.push(guide.guideElements[i]);
            }
        }
    }

    return guideElements;
};

/**
 * Get guide element's bound data which only includes top, right, bottom, left
 * @param {Array.<HTMLElement>} guideElements - creation guide elements
 * @returns {Object} - popup bound data
 */
ResourceCreationPopup.prototype._getBoundOfFirstRowGuideElement = function(guideElements) {
    var bound;

    if (!guideElements.length) {
        return null;
    }

    bound = guideElements[0].getBoundingClientRect();

    return {
        top: bound.top,
        left: bound.left,
        bottom: bound.bottom,
        right: bound.right
    };
};

/**
 * Calculate rendering position usering guide elements
 * @param {{width: {number}, height: {number}}} layerSize - popup layer's width and height
 * @param {{top: {number}, left: {number}, right: {number}, bottom: {number}}} parentSize - width and height of the upper layer, that acts as a border of popup
 * @param {{top: {number}, left: {number}, right: {number}, bottom: {number}}} guideBound - guide element bound data
 * @returns {PopupRenderingData} rendering position of popup and popup arrow
 */
ResourceCreationPopup.prototype._calcRenderingData = function(layerSize, parentSize, guideBound) {
    var guideHorizontalCenter = (guideBound.left + guideBound.right) / 2;
    var x = guideHorizontalCenter - (layerSize.width / 2);
    var y = guideBound.top - layerSize.height + 3;
    var arrowDirection = 'arrow-bottom';
    var arrowLeft;

    if (y < 0) {
        y = guideBound.bottom + 9;
        arrowDirection = 'arrow-top';
    }

    if (x > 0 && (x + layerSize.width > parentSize.right)) {
        x = parentSize.right - layerSize.width;
    }

    if (x < 0) {
        x = 0;
    }

    if (guideHorizontalCenter - x !== layerSize.width / 2) {
        arrowLeft = guideHorizontalCenter - x - ARROW_WIDTH_HALF;
    }

    /**
     * @typedef {Object} PopupRenderingData
     * @property {number} x - left position
     * @property {number} y - top position
     * @property {string} arrow.direction - direction of popup arrow
     * @property {number} [arrow.position] - relative position of popup arrow, if it is not set, arrow appears on the middle of popup
     */
    return {
        x: x,
        y: y,
        arrow: {
            direction: arrowDirection,
            position: arrowLeft
        }
    };
};

/**
 * Set arrow's direction and position
 * @param {Object} arrow rendering data for popup arrow
 */
ResourceCreationPopup.prototype._setArrowDirection = function(arrow) {
    var direction = arrow.direction || 'arrow-bottom';
    var arrowEl = domutil.get(config.classname('popup-arrow'));
    var borderElement = domutil.find(config.classname('.popup-arrow-border', arrowEl));

    if (direction !== config.classname('arrow-bottom')) {
        domutil.removeClass(arrowEl, config.classname('arrow-bottom'));
        domutil.addClass(arrowEl, config.classname(direction));
    }

    if (arrow.position) {
        borderElement.style.left = arrow.position + 'px';
    }
};

/**
 * Hide layer
 */
ResourceCreationPopup.prototype.hide = function() {
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
ResourceCreationPopup.prototype.refresh = function() {
    if (this._viewModel) {
        this.layer.setContent(this.tmpl(this._viewModel));
    }
};

/**
 * Set calendar list
 * @param {Array.<Calendar>} calendars - calendar list
 */
ResourceCreationPopup.prototype.setCalendars = function(calendars) {
    this.calendars = calendars || [];
};

module.exports = ResourceCreationPopup;
