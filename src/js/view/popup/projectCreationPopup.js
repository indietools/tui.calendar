/**
 * @fileoverview Floating layer for updaing projects
 * @author IndieTools
 */
'use strict';

var View = require('../../view/view');
var FloatingLayer = require('../../common/floatingLayer');
var util = require('tui-code-snippet');
var DatePicker = require('tui-date-picker');
var timezone = require('../../common/timezone');
var config = require('../../config');
var domevent = require('../../common/domevent');
var colorutil = require('../../common/colorutil');
var domutil = require('../../common/domutil');
var tmpl = require('../template/popup/projectCreationPopup.hbs');
var TZDate = timezone.Date;
var MAX_WEEK_OF_MONTH = 6;
var ARROW_WIDTH_HALF = 8;

/**
 * @constructor
 * @extends {View}
 * @param {HTMLElement} container - container element
 * @param {boolean} usageStatistics - GA tracking options in Calendar
 */
function ProjectCreationPopup(container, usageStatistics) {
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
    this._project = null;
    this._focusedDropdown = null;
    this._usageStatistics = usageStatistics;
    this._onClickListeners = [
        this._closePopup.bind(this),
        this._onClickSaveProject.bind(this)
    ];

    domevent.on(container, 'click', this._onClick, this);
}

util.inherit(ProjectCreationPopup, View);

/**
 * Mousedown event handler for hiding popup layer when user mousedown outside of
 * layer
 * @param {MouseEvent} mouseDownEvent - mouse event object
 */
ProjectCreationPopup.prototype._onMouseDown = function(mouseDownEvent) {
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
ProjectCreationPopup.prototype.destroy = function() {
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
ProjectCreationPopup.prototype._onClick = function(clickEvent) {
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
ProjectCreationPopup.prototype._closePopup = function(target) {
    var className = config.classname('popup-close');

    if (domutil.hasClass(target, className) || domutil.closest(target, '.' + className)) {
        this.hide();

        return true;
    }

    return false;
};

/**
 * Save new projectndar if user clicked save button
 * @emits ProjectCreationPopup#saveProject
 * @param {HTMLElement} target click event target
 * @returns {boolean} whether save button is clicked or not
 */
ProjectCreationPopup.prototype._onClickSaveProject = function(target) {
    var className = config.classname('project-popup-save');
    var cssPrefix = config.cssPrefix;
    var name, description, bgColor, startDate, endDate, changes;

    if (!domutil.hasClass(target, className) && !domutil.closest(target, '.' + className)) {
        return false;
    }

    name = domutil.get(cssPrefix + 'project-name');
    description = domutil.get(cssPrefix + 'project-description');
    bgColor = domutil.get(cssPrefix + 'project-color-input');
    // TODO: When we meaningfully handle timezones, we'll need to convert again.
    startDate = new TZDate(this.rangePicker.getStartDate()); // .toLocalTime();
    endDate = new TZDate(this.rangePicker.getEndDate()); // .toLocalTime();

    if (!name.value) {
        name.focus();
        name.parentElement.style.border = '1px solid red';

        return true;
    }

    if (!bgColor.value) {
        // TODO: Also check for value repeated in other places.
        bgColor.focus();
        bgColor.parentElement.style.border = '1px solid red';

        return true;
    }

    if (!startDate || !endDate) {
        return true;
    }

    if (this._isEditMode) {
        changes = {
            name: name.value,
            description: description.value,
            bgColor: bgColor.value,
            color: colorutil.determineTextforBackground(bgColor.value),
            dragBgColor: bgColor.value,
            borderColor: bgColor.value,
            startDate: startDate,
            endDate: endDate
        };

        this.fire('beforeUpdateProject', {
            project: this._project,
            changes: changes
        });
    }

    this.hide();

    return true;
};

/**
 * @override
 * @param {object} viewModel - view model from factory/monthView
 */
ProjectCreationPopup.prototype.render = function(viewModel) {
    var layer = this.layer;
    var self = this;
    var boxElement, guideElements;

    viewModel.zIndex = this.layer.zIndex + 5;
    this._isEditMode = true; // viewModel.project;

    if (viewModel.trigger) {
        boxElement = viewModel.trigger;
    } else {
        this.guide = viewModel.guide;
        guideElements = this._getGuideElements(this.guide);
        boxElement = guideElements.length ? guideElements[0] : null;
    }

    if (this._isEditMode) {
        viewModel.name = viewModel.project.name;
        viewModel.description = viewModel.project.description;
        viewModel.bgColor = viewModel.project.bgColor;
        viewModel.startDate = viewModel.project.start_date;
        viewModel.endDate = viewModel.project.end_date;
    }

    layer.setContent(tmpl(viewModel));
    this._createDatepicker(viewModel.startDate, viewModel.endDate, true);
    layer.show();

    if (boxElement) {
        this._setPopupPositionAndArrowDirection(boxElement.getBoundingClientRect());
    }

    util.debounce(function() {
        domevent.on(document.body, 'mousedown', self._onMouseDown, self);
    })();

    this.fire('afterDisplayProjectEditWindow', {
        project: this._project
    });
};

/**
 * Set popup position and arrow direction to apear near guide element
 * @param {MonthCreationGuide|TimeCreationGuide|DayGridCreationGuide} guideBound - creation guide element
 */
ProjectCreationPopup.prototype._setPopupPositionAndArrowDirection = function(guideBound) {
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
ProjectCreationPopup.prototype._getGuideElements = function(guide) {
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
ProjectCreationPopup.prototype._getBoundOfFirstRowGuideElement = function(guideElements) {
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
ProjectCreationPopup.prototype._calcRenderingData = function(layerSize, parentSize, guideBound) {
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
ProjectCreationPopup.prototype._setArrowDirection = function(arrow) {
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
 * Create date range picker using start date and end date
 * @param {TZDate} start - start date
 * @param {TZDate} end - end date
 */
ProjectCreationPopup.prototype._createDatepicker = function(start, end) {
    var cssPrefix = config.cssPrefix;

    this.rangePicker = DatePicker.createRangePicker({
        startpicker: {
            date: new TZDate(start).toDate(),
            input: '#' + cssPrefix + 'project-start-date',
            container: '#' + cssPrefix + 'startpicker-container'
        },
        endpicker: {
            date: new TZDate(end).toDate(),
            input: '#' + cssPrefix + 'project-end-date',
            container: '#' + cssPrefix + 'endpicker-container'
        },
        format: 'yyyy-MM-dd',
        timepicker: null,
        usageStatistics: false
    });
};

/**
 * Hide layer
 */
ProjectCreationPopup.prototype.hide = function() {
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
ProjectCreationPopup.prototype.refresh = function() {
    if (this._viewModel) {
        this.layer.setContent(this.tmpl(this._viewModel));
    }
};

module.exports = ProjectCreationPopup;
