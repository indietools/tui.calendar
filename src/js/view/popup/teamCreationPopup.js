/**
 * @fileoverview Floating layer for new teams
 * @author NHN FE Development Lab <dl_javascript@nhn.com>
 */
'use strict';

var View = require('../../view/view');
var FloatingLayer = require('../../common/floatingLayer');
var util = require('tui-code-snippet');
var config = require('../../config');
var domevent = require('../../common/domevent');
var domutil = require('../../common/domutil');
var colorutil = require('../../common/colorutil');
var common = require('../../common/common');
var tmpl = require('../template/popup/teamCreationPopup.hbs');
var MAX_WEEK_OF_MONTH = 6;
var ARROW_WIDTH_HALF = 8;

/**
 * @constructor
 * @extends {View}
 * @param {HTMLElement} container - container element
 * @param {Array.<Calendar>} calendars - calendar list used to create new team
 * @param {Array.<Team>} teams - team list used to create new team
 * @param {Array.<Resource>} resources - resource list used when creating new calendar
 * @param {boolean} usageStatistics - GA tracking options in Team
 */
function TeamCreationPopup(container, calendars, teams, resources, usageStatistics) {
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
    this._selectedCal = null;
    this._team = null;
    this.calendars = calendars;
    this.teams = teams;
    this.resources = resources;
    this._focusedDropdown = null;
    this._usageStatistics = usageStatistics;
    this._onClickListeners = [
        this._selectDropdownMenuColorPickerItem.bind(this),
        this._selectDropdownMenuItem.bind(this),
        this._toggleDropdownMenuView.bind(this),
        this._closeDropdownMenuView.bind(this, null),
        this._closePopup.bind(this),
        this._onClickSaveTeam.bind(this)
    ];

    domevent.on(container, 'click', this._onClick, this);
}

util.inherit(TeamCreationPopup, View);

/**
 * Mousedown event handler for hiding popup layer when user mousedown outside of
 * layer
 * @param {MouseEvent} mouseDownEvent - mouse event object
 */
TeamCreationPopup.prototype._onMouseDown = function(mouseDownEvent) {
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
TeamCreationPopup.prototype.destroy = function() {
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
TeamCreationPopup.prototype._onClick = function(clickEvent) {
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
TeamCreationPopup.prototype._closePopup = function(target) {
    var className = config.classname('popup-close');

    if (domutil.hasClass(target, className) || domutil.closest(target, '.' + className)) {
        this.hide();

        return true;
    }

    return false;
};

/**
 * Toggle dropdown menu view, when user clicks dropdown button
 * @param {HTMLElement} target click event target
 * @returns {boolean} whether user clicked dropdown button or not
 */
TeamCreationPopup.prototype._toggleDropdownMenuView = function(target) {
    var className = config.classname('team-color-dropdown-button');
    var dropdownBtn = domutil.hasClass(target, className) ? target : domutil.closest(target, '.' + className);

    if (!dropdownBtn) {
        return false;
    }

    if (domutil.hasClass(dropdownBtn.parentNode, config.classname('open'))) {
        this._closeDropdownMenuView(dropdownBtn.parentNode);
    } else {
        this._openDropdownMenuView(dropdownBtn.parentNode);
    }

    return true;
};

/**
 * Close drop down menu
 * @param {HTMLElement} dropdown - dropdown element that has a opened dropdown menu
 */
TeamCreationPopup.prototype._closeDropdownMenuView = function(dropdown) {
    dropdown = dropdown || this._focusedDropdown;
    if (dropdown) {
        domutil.removeClass(dropdown, config.classname('open'));
        this._focusedDropdown = null;
    }
};

/**
 * Open drop down menu
 * @param {HTMLElement} dropdown - dropdown element that has a closed dropdown menu
 */
TeamCreationPopup.prototype._openDropdownMenuView = function(dropdown) {
    domutil.addClass(dropdown, config.classname('open'));
    this._focusedDropdown = dropdown;
};

/**
 * If click dropdown menu color picker item, close dropdown menu
 * @param {HTMLElement} target click event target
 * @returns {boolean} whether
 */
TeamCreationPopup.prototype._selectDropdownMenuColorPickerItem = function(target) {
    var itemClassName = config.classname('team-color-dropdown-menu-color-picker-item');
    var selectedItem = domutil.hasClass(target, itemClassName) ? target : domutil.closest(target, '.' + itemClassName);

    if (!selectedItem) {
        return false;
    }

    return true;
};

/**
 * If click dropdown menu item, close dropdown menu
 * @param {HTMLElement} target click event target
 * @returns {boolean} whether
 */
TeamCreationPopup.prototype._selectDropdownMenuItem = function(target) {
    var itemClassName = config.classname('team-color-dropdown-menu-item');
    var iconClassName = config.classname('icon');
    var selectedItem = domutil.hasClass(target, itemClassName) ? target : domutil.closest(target, '.' + itemClassName);
    var bgColor, dropdown, dropdownBtn;

    if (!selectedItem) {
        return false;
    }

    bgColor = domutil.find('.' + iconClassName, selectedItem).style.backgroundColor || 'transparent';

    dropdown = domutil.closest(selectedItem, config.classname('.dropdown'));
    dropdownBtn = domutil.find(config.classname('.dropdown-button'), dropdown);

    if (domutil.hasClass(dropdown, config.classname('section-color'))) {
        domutil.find('.' + iconClassName, dropdownBtn).style.backgroundColor = bgColor;
    }

    domutil.removeClass(dropdown, config.classname('open'));

    return true;
};

/**
 * Save new team if user clicked save button
 * @emits TeamCreationPopup#saveTeam
 * @param {HTMLElement} target click event target
 * @returns {boolean} whether save button is clicked or not
 */
TeamCreationPopup.prototype._onClickSaveTeam = function(target) {
    var className = config.classname('team-popup-save');
    var cssPrefix = config.cssPrefix;
    var name, bgColor, resources, resourcesArray, changes;

    if (!domutil.hasClass(target, className) && !domutil.closest(target, '.' + className)) {
        return false;
    }

    name = domutil.get(cssPrefix + 'team-name');
    bgColor = domutil.get(cssPrefix + 'team-creation-selected-color');
    resources = domutil.get(cssPrefix + 'team-creation-resources-input');

    if (!name.value) {
        name.focus();
        name.parentElement.style.border = '1px solid red';

        return true;
    }

    if (!bgColor.style.backgroundColor) {
        // TODO: Also check for value repeated in other calendars.
        bgColor.focus();
        bgColor.parentElement.style.border = '1px solid red';

        return true;
    }
    bgColor.value = (bgColor.style.backgroundColor.substring(0, 1) === 'r' ?
        colorutil.rgb2Hex(bgColor.style.backgroundColor) :
        bgColor.style.backgroundColor);

    resourcesArray = resources.value.split(',') || [];

    if (this._isEditMode) {
        changes = common.getTeamChanges(
            this._team,
            ['name', 'bgColor', 'color', 'dragBgColor', 'borderColor', 'resources', 'checked'],
            {
                name: name.value,
                bgColor: bgColor.value,
                color: colorutil.determineTextforBackground(bgColor.value),
                dragBgColor: bgColor.value,
                borderColor: bgColor.value,
                resources: resourcesArray,
                checked: true
            }
        );

        this.fire('beforeUpdateTeam', {
            team: this._team,
            changes: changes
        });
    } else {
        /**
         * @event TeamCreationPopup#beforeCreateTeam
         * @type {object}
         * @property {Team} team - new team instance to be added
         */
        this.fire('beforeCreateTeam', {
            name: name.value,
            bgColor: bgColor.value,
            color: colorutil.determineTextforBackground(bgColor.value),
            dragBgColor: bgColor.value,
            borderColor: bgColor.value,
            resources: resourcesArray,
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
TeamCreationPopup.prototype.render = function(viewModel) {
    var calendars = this.calendars;
    var layer = this.layer;
    var self = this;
    var boxElement, guideElements;

    viewModel.zIndex = this.layer.zIndex + 5;
    viewModel.calendars = calendars;
    this._isEditMode = viewModel.team;

    if (viewModel.trigger) {
        boxElement = viewModel.trigger;
    } else {
        this.guide = viewModel.guide;
        guideElements = this._getGuideElements(this.guide);
        boxElement = guideElements.length ? guideElements[0] : null;
    }

    this._selectedCal = calendars[0];
    if (this._isEditMode) {
        this._team = viewModel.team;
        viewModel.recColors = this.findRecommendedColors(this._selectedCal.bgColor).concat([viewModel.team.bgColor]);
        viewModel.bgColor = viewModel.team.bgColor;
        viewModel.name = viewModel.team.name;
    } else {
        viewModel.recColors = this.findRecommendedColors(this._selectedCal.bgColor);
        viewModel.bgColor = viewModel.recColors[0];
    }

    layer.setContent(tmpl(viewModel));
    layer.show();

    if (boxElement) {
        this._setPopupPositionAndArrowDirection(boxElement.getBoundingClientRect());
    }

    util.debounce(function() {
        domevent.on(document.body, 'mousedown', self._onMouseDown, self);
    })();

    this.fire('afterDisplayTeamEditWindow', {
        team: this._team,
        resources: viewModel.resources
    });
};

/**
 * Set popup position and arrow direction to apear near guide element
 * @param {MonthCreationGuide|TimeCreationGuide|DayGridCreationGuide} guideBound - creation guide element
 */
TeamCreationPopup.prototype._setPopupPositionAndArrowDirection = function(guideBound) {
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
TeamCreationPopup.prototype._getGuideElements = function(guide) {
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
TeamCreationPopup.prototype._getBoundOfFirstRowGuideElement = function(guideElements) {
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
TeamCreationPopup.prototype._calcRenderingData = function(layerSize, parentSize, guideBound) {
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
TeamCreationPopup.prototype._setArrowDirection = function(arrow) {
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
TeamCreationPopup.prototype.hide = function() {
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
TeamCreationPopup.prototype.refresh = function() {
    if (this._viewModel) {
        this.layer.setContent(this.tmpl(this._viewModel));
    }
};

/**
 * Set team list
 * @param {Array.<Team>} teams - team list
 */
TeamCreationPopup.prototype.setTeams = function(teams) {
    this.teams = teams || [];
};

/**
 * Set resource list
 * @param {Array.<Resource>} resources - resource list
 */
TeamCreationPopup.prototype.setResources = function(resources) {
    this.resources = resources || [];
};

/**
 * Find an unused color recommendation
 * @param {String} color - 7 char hex string representing color
 * @returns {array} - array of potential colors
 */
TeamCreationPopup.prototype.findRecommendedColors = function(color) {
    var totalResources = this.resources.concat(this.teams);
    var totalResourcesColors = [];
    totalResources.forEach(function(res) {
        totalResourcesColors.push(res.bgColor);
    });

    return colorutil.getRecommendedColors(color, totalResourcesColors);
};

module.exports = TeamCreationPopup;
