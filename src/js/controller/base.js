/**
 * @fileoverview Base calendar controller
 * @author NHN FE Development Lab <dl_javascript@nhn.com>
 */
'use strict';

var util = require('tui-code-snippet');
var Schedule = require('../model/schedule');
var ScheduleViewModel = require('../model/viewModel/scheduleViewModel');
var datetime = require('../common/datetime');
var common = require('../common/common');
var Theme = require('../theme/theme');

/**
 * @constructor
 * @param {object} options - options for base controller
 * @param {function} [options.groupFunc] - function for group each models {@see Collection#groupBy}
 * @param {themeConfig} [options.theme] - theme object
 * @mixes util.CustomEvents
 */
function Base(options) {
    options = options || {};

    /**
     * function for group each schedule models.
     * @type {function}
     * @param {ScheduleViewModel} viewModel - view model instance
     * @returns {string} group key
     */
    this.groupFunc = options.groupFunc || function(viewModel) {
        var model = viewModel.model;

        if (viewModel.model.isAllDay) {
            return 'allday';
        }

        if (model.category === 'time' && (model.end - model.start > datetime.MILLISECONDS_PER_DAY)) {
            return 'allday';
        }

        return model.category;
    };

    /**
     * schedules collection.
     * @type {Collection}
     */
    this.schedules = common.createScheduleCollection();

    /**
     * Matrix for multidate schedules.
     * @type {object.<string, array>}
     */
    this.dateMatrix = {};

    /**
     * Theme
     * @type {Theme}
     */
    this.theme = new Theme(options.theme);

    /**
     * Team list
     * @type {Array.<Team>}
     */
    this.teams = common.createTeamCollection();

    /**
     * Calendar list
     * @type {Array.<Calendar>}
     */
    this.calendars = common.createCalendarCollection();

    /**
     * Resource list
     * @type {Array.<Resource>}
     */
    this.resources = common.createResourceCollection();

    /**
     * User list
     * @type {Array.<User>}
     */
    this.users = common.createUserCollection();
}

/**
 * Calculate contain dates in schedule.
 * @private
 * @param {Schedule} schedule The instance of schedule.
 * @returns {array} contain dates.
 */
Base.prototype._getContainDatesInSchedule = function(schedule) {
    var scheduleStart = schedule.getStarts();
    var scheduleEnd = schedule.getEnds();
    var start = datetime.start(scheduleStart);
    var equalStartEnd = datetime.compare(scheduleStart, scheduleEnd) === 0;
    var endDate = equalStartEnd ? scheduleEnd : datetime.convertStartDayToLastDay(scheduleEnd);
    var end = datetime.end(endDate);
    var range = datetime.range(
        start,
        end,
        datetime.MILLISECONDS_PER_DAY
    );

    return range;
};

/****************
 * CRUD Schedule
 ****************/

/**
 * Create a schedule instance from raw data.
 * @emits Base#beforeCreateSchedule
 * @emits Base#createdSchedule
 * @param {object} options Data object to create schedule.
 * @param {boolean} silent - set true then don't fire events.
 * @returns {Schedule} The instance of Schedule that created.
 */
Base.prototype.createSchedule = function(options, silent) {
    var schedule,
        scheduleData = {
            data: options
        };

    /**
     * @event Base#beforeCreateSchedule
     * @type {Calendar~Schedule[]}
     */
    if (!this.invoke('beforeCreateSchedule', scheduleData)) {
        return null;
    }

    schedule = this.addSchedule(Schedule.create(options));

    if (!silent) {
        /**
         * @event Base#createdSchedule
         * @type {Schedule}
         */
        this.fire('createdSchedule', schedule);
    }

    return schedule;
};

/**
 * @emits Base#beforeCreateSchedule
 * @emits Base#createdSchedule
 * @param {Calendar~Schedule[]} dataList - dataObject list to create schedule.
 * @param {boolean} [silent=false] - set true then don't fire events.
 * @returns {Schedule[]} The instance list of Schedule that created.
 */
Base.prototype.createSchedules = function(dataList, silent) {
    var self = this;

    return util.map(dataList, function(data) {
        return self.createSchedule(data, silent);
    });
};

/**
 * Update a calendar.
 * @emits Base#updateCalendar
 * @param {Calendar} calendar - calendar instance to update
 * @param {object} options updated object data.
 * @returns {Calendar} updated calendar instance
 */
Base.prototype.updateCalendar = function(calendar, options) {
    options = options || {};

    if (!util.isUndefined(options.name)) {
        calendar.name = options.name;
    }

    if (!util.isUndefined(options.bgColor)) {
        calendar.bgColor = options.bgColor;
    }

    if (options.color) {
        calendar.color = options.color;
    }

    if (options.dragBgColor) {
        calendar.dragBgColor = options.dragBgColor;
    }

    if (options.borderColor) {
        calendar.borderColor = options.borderColor;
    }

    if (options.teams) {
        calendar.teams = options.teams;
    }

    if (options.resources) {
        calendar.resources = options.resources;
    }

    if (options.users) {
        calendar.users = options.users;
    }

    if (options.checked) {
        calendar.checked = options.checked;
    }

    /**
     * @event Base#updateCalendar
     */
    this.fire('updateCalendar');

    return calendar;
};

/**
 * Update a team.
 * @emits Base#updateTeam
 * @param {Team} team - team instance to update
 * @param {object} options updated object data.
 * @returns {Team} updated team instance
 */
Base.prototype.updateTeam = function(team, options) {
    options = options || {};

    if (!util.isUndefined(options.name)) {
        team.name = options.name;
    }

    if (!util.isUndefined(options.bgColor)) {
        team.bgColor = options.bgColor;
    }

    if (options.color) {
        team.color = options.color;
    }

    if (options.dragBgColor) {
        team.dragBgColor = options.dragBgColor;
    }

    if (options.borderColor) {
        team.borderColor = options.borderColor;
    }

    if (!util.isUndefined(options.resources) && options.resources instanceof Array) {
        team.resources = options.resources;
    }

    if (!util.isUndefined(options.calendars) && options.calendars instanceof Array) {
        team.calendars = options.calendars || [];
    }

    if (options.checked) {
        team.checked = options.checked;
    }

    /**
     * @event Base#updateTeam
     */
    this.fire('updateTeam');

    return team;
};

/**
 * Update a resource.
 * @emits Base#updateResource
 * @param {Resource} resource - resource instance to update
 * @param {object} options updated object data.
 * @returns {Resource} updated resource instance
 */
Base.prototype.updateResource = function(resource, options) {
    options = options || {};

    if (!util.isUndefined(options.name)) {
        resource.name = options.name;
    }

    if (!util.isUndefined(options.isPerson)) {
        resource.isPerson = options.isPerson;
    }

    if (!util.isUndefined(options.bgColor)) {
        resource.bgColor = options.bgColor;
    }

    if (options.color) {
        resource.color = options.color;
    }

    if (options.dragBgColor) {
        resource.dragBgColor = options.dragBgColor;
    }

    if (options.borderColor) {
        resource.borderColor = options.borderColor;
    }

    if (!util.isUndefined(options.assignees) && options.assignees instanceof Array) {
        resource.assignees = options.assignees || [];
    }

    if (!util.isUndefined(options.teams) && options.teams instanceof Array) {
        resource.teams = options.teams || [];
    }

    if (options.checked) {
        resource.checked = options.checked;
    }

    /**
     * @event Base#updateResource
     */
    this.fire('updateResource');

    return resource;
};

/**
 * Update a user.
 * @emits Base#updateUser
 * @param {User} user - user instance to update
 * @param {object} options updated object data.
 * @returns {User} updated user instance
 */
Base.prototype.updateUser = function(user, options) {
    options = options || {};

    if (!util.isUndefined(options.id)) {
        user.id = options.id;
    }

    if (!util.isUndefined(options.remoteId)) {
        user.remoteId = options.remoteId;
    }

    if (!util.isUndefined(options.resources) && options.resources instanceof Array) {
        user.resources = options.resources;
    }

    if (!util.isUndefined(options.name)) {
        user.name = options.name;
    }

    if (!util.isUndefined(options.email)) {
        user.email = options.email;
    }

    if (!util.isUndefined(options.phone)) {
        user.phone = options.phone;
    }

    /**
     * @event Base#updateUser
     */
    this.fire('updateUser');

    return user;
};

/**
 * Update a schedule.
 * @emits Base#updateSchedule
 * @param {Schedule} schedule - schedule instance to update
 * @param {object} options updated object data.
 * @returns {Schedule} updated schedule instance
 */
Base.prototype.updateSchedule = function(schedule, options) {
    var start = options.start || schedule.start;
    var end = options.end || schedule.end;

    options = options || {};

    if (options.category === 'allday') {
        options.isAllDay = true;
    }

    if (!util.isUndefined(options.isAllDay)) {
        schedule.set('isAllDay', options.isAllDay);
    }

    if (!util.isUndefined(options.calendarId)) {
        schedule.set('calendarId', options.calendarId);
    }

    if (options.title) {
        schedule.set('title', options.title);
    }

    if (options.body) {
        schedule.set('body', options.body);
    }

    if (options.start || options.end) {
        if (schedule.isAllDay) {
            schedule.setAllDayPeriod(start, end);
        } else {
            schedule.setTimePeriod(start, end);
        }
    }

    if (options.color) {
        schedule.set('color', options.color);
    }

    if (options.bgColor) {
        schedule.set('bgColor', options.bgColor);
    }

    if (options.borderColor) {
        schedule.set('borderColor', options.borderColor);
    }

    if (options.origin) {
        schedule.set('origin', options.origin);
    }

    if (!util.isUndefined(options.isPending)) {
        schedule.set('isPending', options.isPending);
    }

    if (!util.isUndefined(options.isFocused)) {
        schedule.set('isFocused', options.isFocused);
    }

    if (options.location) {
        schedule.set('location', options.location);
    }

    if (options.attendees) {
        schedule.set('attendees', options.attendees);
    }

    if (options.state) {
        schedule.set('state', options.state);
    }

    if (options.raw) {
        schedule.set('raw', options.raw);
    }

    this._removeFromMatrix(schedule);
    this._addToMatrix(schedule);

    /**
     * @event Base#updateSchedule
     */
    this.fire('updateSchedule');

    return schedule;
};

/**
 * Delete team instance from controller.
 * @param {Team} team - team instance to delete
 * @returns {Team} deleted model instance.
 */
Base.prototype.deleteTeam = function(team) {
    this.teams = this.teams.filter(function(res) {
        return res.id !== team.id;
    });

    return team;
};

/**
 * Delete resource instance from controller.
 * @param {Resource} resource - resource instance to delete
 * @returns {Resource} deleted model instance.
 */
Base.prototype.deleteResource = function(resource) {
    this.resources = this.resources.filter(function(res) {
        return res.id !== resource.id;
    });

    return resource;
};

/**
 * Delete user instance from controller.
 * @param {User} user - user instance to delete
 * @returns {User} deleted model instance.
 */
Base.prototype.deleteUser = function(user) {
    this.users = this.users.filter(function(res) {
        return res.id !== user.id;
    });

    return user;
};

/**
 * Delete calendar instance from controller.
 * @param {Calendar} calendar - calendar instance to delete
 * @returns {Calendar} deleted model instance.
 */
Base.prototype.deleteCalendar = function(calendar) {
    this.calendars = this.calendars.filter(function(cal) {
        return cal.id !== calendar.id;
    });

    return calendar;
};

/**
 * Delete schedule instance from controller.
 * @param {Schedule} schedule - schedule instance to delete
 * @returns {Schedule} deleted model instance.
 */
Base.prototype.deleteSchedule = function(schedule) {
    this._removeFromMatrix(schedule);
    this.schedules.remove(schedule);

    return schedule;
};

/**
 * Set date matrix to supplied schedule instance.
 * @param {Schedule} schedule - instance of schedule.
 */
Base.prototype._addToMatrix = function(schedule) {
    var ownMatrix = this.dateMatrix;
    var containDates = this._getContainDatesInSchedule(schedule);

    util.forEach(containDates, function(date) {
        var ymd = datetime.format(date, 'YYYYMMDD'),
            matrix = ownMatrix[ymd] = ownMatrix[ymd] || [];

        matrix.push(util.stamp(schedule));
    });
};

/**
 * Remove schedule's id from matrix.
 * @param {Schedule} schedule - instance of schedule
 */
Base.prototype._removeFromMatrix = function(schedule) {
    var modelID = util.stamp(schedule);

    util.forEach(this.dateMatrix, function(matrix) {
        var index = util.inArray(modelID, matrix);

        if (~index) {
            matrix.splice(index, 1);
        }
    }, this);
};

/**
 * Add a team instance.
 * @emits Base#addedTeam
 * @param {Team} team The instance of Team.
 * @param {boolean} silent - set true then don't fire events.
 * @returns {Team} The instance of Team that added.
 */
Base.prototype.addTeam = function(team, silent) {
    this.teams.add(team);

    if (!silent) {
        /**
         * @event Base#addedTeam
         * @type {object}
         */
        this.fire('addedTeam', team);
    }

    return team;
};

/**
 * Add a resource instance.
 * @emits Base#addedResource
 * @param {Resource} resource The instance of Resource.
 * @param {boolean} silent - set true then don't fire events.
 * @returns {Resource} The instance of Resource that added.
 */
Base.prototype.addResource = function(resource, silent) {
    this.resources.add(resource);

    if (!silent) {
        /**
         * @event Base#addedResource
         * @type {object}
         */
        this.fire('addedResource', resource);
    }

    return resource;
};

/**
 * Add a user instance.
 * @emits Base#addedUser
 * @param {User} user The instance of User.
 * @param {boolean} silent - set true then don't fire events.
 * @returns {User} The instance of User that added.
 */
Base.prototype.addUser = function(user, silent) {
    this.users.add(user);

    if (!silent) {
        /**
         * @event Base#addedUser
         * @type {object}
         */
        this.fire('addedUser', user);
    }

    return user;
};

/**
 * Add a calendar instance.
 * @emits Base#addedCalendar
 * @param {Calendar} calendar The instance of Calendar.
 * @param {boolean} silent - set true then don't fire events.
 * @returns {Calendar} The instance of Calendar that added.
 */
Base.prototype.addCalendar = function(calendar, silent) {
    this.calendars.add(calendar);

    if (!silent) {
        /**
         * @event Base#addedCalendar
         * @type {object}
         */
        this.fire('addedCalendar', calendar);
    }

    return calendar;
};

/**
 * Add a schedule instance.
 * @emits Base#addedSchedule
 * @param {Schedule} schedule The instance of Schedule.
 * @param {boolean} silent - set true then don't fire events.
 * @returns {Schedule} The instance of Schedule that added.
 */
Base.prototype.addSchedule = function(schedule, silent) {
    this.schedules.add(schedule);
    this._addToMatrix(schedule);

    if (!silent) {
        /**
         * @event Base#addedSchedule
         * @type {object}
         */
        this.fire('addedSchedule', schedule);
    }

    return schedule;
};

/**
 * split schedule model by ymd.
 * @param {Date} start - start date
 * @param {Date} end - end date
 * @param {Collection} scheduleCollection - collection of schedule model.
 * @returns {object.<string, Collection>} splitted schedule model collections.
 */
Base.prototype.splitScheduleByDateRange = function(start, end, scheduleCollection) {
    var range = datetime.range(
            datetime.start(start),
            datetime.end(end),
            datetime.MILLISECONDS_PER_DAY
        ),
        ownMatrix = this.dateMatrix,
        result = {};

    util.forEachArray(range, function(date) {
        var ymd = datetime.format(date, 'YYYYMMDD'),
            matrix = ownMatrix[ymd],
            collection;

        collection = result[ymd] = common.createScheduleCollection();

        if (matrix && matrix.length) {
            util.forEachArray(matrix, function(id) {
                scheduleCollection.doWhenHas(id, function(schedule) {
                    collection.add(schedule);
                });
            });
        }
    });

    return result;
};

/**
 * Return schedules in supplied date range.
 *
 * available only YMD.
 * @param {TZDate} start start date.
 * @param {TZDate} end end date.
 * @returns {object.<string, Collection>} schedule collection grouped by dates.
 */
Base.prototype.findByDateRange = function(start, end) {
    var range = datetime.range(
            datetime.start(start),
            datetime.end(end),
            datetime.MILLISECONDS_PER_DAY
        ),
        ownSchedules = this.schedules.items,
        ownMatrix = this.dateMatrix,
        dformat = datetime.format,
        result = {},
        matrix,
        ymd,
        viewModels;

    util.forEachArray(range, function(date) {
        ymd = dformat(date, 'YYYYMMDD');
        matrix = ownMatrix[ymd];
        viewModels = result[ymd] = common.createScheduleCollection();

        if (matrix && matrix.length) {
            viewModels.add.apply(viewModels, util.map(matrix, function(id) {
                return ScheduleViewModel.create(ownSchedules[id]);
            }));
        }
    });

    return result;
};

Base.prototype.clearSchedules = function() {
    this.dateMatrix = {};
    this.schedules.clear();
    /**
     * for inner view when clear schedules
     * @event Base#clearSchedules
     * @type {Schedule}
     */
    this.fire('clearSchedules');
};

/**
 * Set a theme.
 * @param {themeConfig} theme - theme keys, styles
 * @returns {Array.<string>} keys - error keys not predefined.
 */
Base.prototype.setTheme = function(theme) {
    return this.theme.setStyles(theme);
};

/**
 * Set team list
 * @param {Array.<Team>} teams - team list
 */
Base.prototype.setTeams = function(teams) {
    this.teams = teams;
};

/**
 * Set resource list
 * @param {Array.<Resource>} resources - resource list
 */
Base.prototype.setResources = function(resources) {
    this.resources = resources;
};

/**
 * Set user list
 * @param {Array.<User>} users - user list
 */
Base.prototype.setUsers = function(users) {
    this.users = users;
};

/**
 * Set calendar list
 * @param {Array.<Calendar>} calendars - calendar list
 */
Base.prototype.setCalendars = function(calendars) {
    this.calendars = calendars;
};

// mixin
util.CustomEvents.mixin(Base);

module.exports = Base;
