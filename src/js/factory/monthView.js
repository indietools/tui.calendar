/**
 * @fileoverview Month view factory module
 * @author NHN FE Development Lab <dl_javascript@nhn.com>
 */
'use strict';

var util = require('tui-code-snippet');
var config = require('../config'),
    array = require('../common/array'),
    datetime = require('../common/datetime'),
    domutil = require('../common/domutil'),
    common = require('../common/common'),
    Month = require('../view/month/month'),
    MonthClick = require('../handler/month/click'),
    MonthCreation = require('../handler/month/creation'),
    MonthResize = require('../handler/month/resize'),
    MonthMove = require('../handler/month/move'),
    More = require('../view/month/more'),
    ProjectCreationPopup = require('../view/popup/projectCreationPopup'),
    ProjectDetailPopup = require('../view/popup/projectDetailPopup'),
    ResourceCreationPopup = require('../view/popup/resourceCreationPopup'),
    ResourceDetailPopup = require('../view/popup/resourceDetailPopup'),
    TeamCreationPopup = require('../view/popup/teamCreationPopup'),
    TeamDetailPopup = require('../view/popup/teamDetailPopup'),
    CalendarCreationPopup = require('../view/popup/calendarCreationPopup'),
    CalendarDetailPopup = require('../view/popup/calendarDetailPopup'),
    ScheduleCreationPopup = require('../view/popup/scheduleCreationPopup'),
    ScheduleDetailPopup = require('../view/popup/scheduleDetailPopup'),
    Schedule = require('../model/schedule');

/**
 * Get the view model for more layer
 * @param {TZDate} date - date has more schedules
 * @param {HTMLElement} target - target element
 * @param {Collection} schedules - schedule collection
 * @param {string[]} daynames - daynames to use upside of month more view
 * @returns {object} view model
 */
function getViewModelForMoreLayer(date, target, schedules, daynames) {
    schedules.each(function(schedule) {
        var model = schedule.model;
        schedule.hasMultiDates = !datetime.isSameDate(model.start, model.end);
    });

    return {
        target: target,
        date: datetime.format(date, 'YYYY.MM.DD'),
        dayname: daynames[date.getDay()],
        schedules: schedules.sort(array.compare.schedule.asc)
    };
}

/**
 * @param {Base} baseController - controller instance
 * @param {HTMLElement} layoutContainer - container element for month view
 * @param {Drag} dragHandler - drag handler instance
 * @param {object} options - options
 * @returns {object} view instance and refresh method
 */
function createMonthView(baseController, layoutContainer, dragHandler, options) {
    var monthViewContainer, monthView, moreView, createView, createCalendarView;
    var createTeamView, clickHandler, creationHandler, resizeHandler;
    var moveHandler, clearSchedulesHandler, onUpdateSchedule, onEditCalendar;
    var onShowCreationPopup, onSaveNewSchedule, onSaveNewTeam, onShowEditPopup;
    var detailView, onShowDetailPopup, onDeleteSchedule, onEditSchedule;
    var onEditTeam, onDisplayEditSchedule, createProjectView, createResourceView;
    var onSaveNewCalendar, onSaveNewResource, detailProjectView, detailTeamView;
    var detailCalendarView, detailResourceView, onShowProjectDetailPopup;
    var onShowTeamDetailPopup, onShowCalendarDetailPopup, onShowResourceDetailPopup;
    var onDeleteTeam, onDeleteCalendar, onDeleteResource, onEditProject;
    var onUpdateScheduleCalendar, onDisplayEditTeam, onDisplayEditProject;
    var onDisplayEditCalendar, onDisplayEditResource, onBeforeDisplayEditResource;
    var onEditResource, onShowProjectEditPopup, onShowTeamEditPopup;
    var onShowCalendarEditPopup, onShowResourceEditPopup;

    monthViewContainer = domutil.appendHTMLElement(
        'div', layoutContainer, config.classname('month'));

    monthView = new Month(options, monthViewContainer, baseController.Month);
    moreView = new More(options.month, layoutContainer, baseController.theme);

    // handlers
    clickHandler = new MonthClick(dragHandler, monthView, baseController);
    if (!options.isReadOnly) {
        creationHandler = new MonthCreation(dragHandler, monthView, baseController, options);
        resizeHandler = new MonthResize(dragHandler, monthView, baseController);
        moveHandler = new MonthMove(dragHandler, monthView, baseController);
    }

    clearSchedulesHandler = function() {
        if (moreView) {
            moreView.hide();
        }
    };

    onUpdateSchedule = function() {
        if (moreView) {
            moreView.refresh();
        }
    };

    // binding +n click schedule
    clickHandler.on('clickMore', function(clickMoreSchedule) {
        var date = clickMoreSchedule.date,
            target = clickMoreSchedule.target,
            schedules = util.pick(baseController.findByDateRange(
                datetime.start(date),
                datetime.end(date)
            ), clickMoreSchedule.ymd);

        schedules.items = util.filter(schedules.items, function(item) {
            return options.month.scheduleFilter(item.model);
        });

        if (schedules && schedules.length) {
            moreView.render(getViewModelForMoreLayer(date, target, schedules, monthView.options.daynames));

            schedules.each(function(scheduleViewModel) {
                if (scheduleViewModel) {
                    /**
                     * @event More#afterRenderSchedule
                     */
                    monthView.fire('afterRenderSchedule', {schedule: scheduleViewModel.model});
                }
            });

            monthView.fire('clickMore', {
                date: clickMoreSchedule.date,
                target: moreView.getMoreViewElement()
            });
        }
    });

    // binding popup for schedules creation
    if (options.useCreationPopup) {
        createProjectView = new ProjectCreationPopup(
            layoutContainer, options.usageStatistics);
        createView = new ScheduleCreationPopup(
            layoutContainer, baseController.calendars, baseController.resources,
            baseController.teams, options.usageStatistics);
        createTeamView = new TeamCreationPopup(
            layoutContainer, baseController.calendars, baseController.teams,
            baseController.resources, options.usageStatistics);
        createCalendarView = new CalendarCreationPopup(
            layoutContainer, baseController.calendars, baseController.resources,
            baseController.teams, options.usageStatistics);
        createResourceView = new ResourceCreationPopup(
            layoutContainer, baseController.calendars, baseController.teams,
            baseController.resources, options.usageStatistics);

        onSaveNewSchedule = function(scheduleData) {
            creationHandler.fire('beforeCreateSchedule', util.extend(scheduleData, {
                useCreationPopup: true
            }));
        };

        onSaveNewTeam = function(teamData) {
            util.extend(teamData, {
                useCreationPopup: true
            });
            createView.fire('beforeCreateTeam', teamData);
        };

        onSaveNewCalendar = function(calendarData) {
            util.extend(calendarData, {
                useCreationPopup: true
            });
            createView.fire('beforeCreateCalendar', calendarData);
        };

        onSaveNewResource = function(resourceData) {
            util.extend(resourceData, {
                useCreationPopup: true
            });
            createView.fire('beforeCreateResource', resourceData);
        };

        createView.on('beforeCreateSchedule', onSaveNewSchedule);
        createTeamView.on('beforeCreateTeam', onSaveNewTeam);
        createCalendarView.on('beforeCreateCalendar', onSaveNewCalendar);
        createResourceView.on('beforeCreateResource', onSaveNewResource);
    }

    // binding popup for schedule detail
    if (options.useDetailPopup) {
        detailProjectView = new ProjectDetailPopup(layoutContainer, baseController.calendars);
        detailView = new ScheduleDetailPopup(layoutContainer, baseController.calendars);
        detailTeamView = new TeamDetailPopup(layoutContainer, baseController.resources);
        detailCalendarView = new CalendarDetailPopup(layoutContainer, baseController.calendars);
        detailResourceView = new ResourceDetailPopup(layoutContainer);

        onShowDetailPopup = function(eventData) {
            var scheduleId = eventData.schedule.calendarId;
            var resourceIds = eventData.schedule.attendees || [];
            eventData.calendar = common.find(baseController.calendars, function(calendar) {
                return calendar.id === scheduleId;
            });

            eventData.attendees = baseController.resources.filter(function(res) {
                return resourceIds.includes(res.id);
            });
            eventData.attendees.concat(baseController.teams.filter(function(team) {
                return resourceIds.includes(team.id);
            }));

            if (options.isReadOnly) {
                eventData.schedule = util.extend({}, eventData.schedule, {isReadOnly: true});
            }

            detailView.render(eventData);
        };
        onShowProjectDetailPopup = function(eventData) {
            detailProjectView.render(eventData);
        };
        onShowTeamDetailPopup = function(eventData) {
            var calendarId = eventData.calendarId;
            var teamId = eventData.teamId;
            var resourceIds;

            eventData.team = common.find(baseController.teams, function(team) {
                return team.id === teamId;
            });

            resourceIds = eventData.team.resources || [];

            eventData.calendar = common.find(baseController.calendars, function(calendar) {
                return calendar.id === calendarId;
            });

            eventData.resources = baseController.resources.filter(function(res) {
                return resourceIds.includes(res.id);
            });
            eventData.resources.concat(baseController.teams.filter(function(team) {
                return resourceIds.includes(team.id);
            }));

            detailTeamView.render(eventData);
        };
        onShowCalendarDetailPopup = function(eventData) {
            var calendarId = eventData.calendarId;
            // var resourceIds = eventData.calendar.resources || [];
            eventData.calendar = common.find(baseController.calendars, function(calendar) {
                return calendar.id === calendarId;
            });

            detailCalendarView.render(eventData);
        };
        onShowResourceDetailPopup = function(eventData) {
            var resourceId = eventData.resourceId;
            var teamIds, resourceIds;
            eventData.resource = common.find(baseController.resources, function(resource) {
                return resource.id === resourceId;
            });

            resourceIds = eventData.resource.assignees || [];
            teamIds = eventData.resource.teams || [];
            eventData.teams = baseController.teams.filter(function(team) {
                return teamIds.includes(team.id);
            });

            eventData.assignees = baseController.resources.filter(function(res) {
                return resourceIds.includes(res.id);
            });

            detailResourceView.render(eventData);
        };
        onDeleteSchedule = function(eventData) {
            if (creationHandler) {
                creationHandler.fire('beforeDeleteSchedule', eventData);
            }
        };
        onDeleteTeam = function(eventData) {
            creationHandler.fire('beforeDeleteTeam', eventData);
        };
        onDeleteCalendar = function(eventData) {
            creationHandler.fire('beforeDeleteCalendar', eventData);
        };
        onDeleteResource = function(eventData) {
            creationHandler.fire('beforeDeleteResource', eventData);
        };
        onEditSchedule = function(eventData) {
            moveHandler.fire('beforeUpdateSchedule', eventData);
        };
        onEditProject = function(eventData) {
            creationHandler.fire('beforeUpdateProject', eventData);
        };
        onEditTeam = function(eventData) {
            creationHandler.fire('beforeUpdateTeam', eventData);
        };
        onEditCalendar = function(eventData) {
            creationHandler.fire('beforeUpdateCalendar', eventData);
        };
        onDisplayEditSchedule = function(eventData) {
            creationHandler.fire('afterDisplayScheduleEditWindow', eventData);
        };
        onUpdateScheduleCalendar = function(eventData) {
            creationHandler.fire('afterUpdateScheduleCalendar', eventData);
        };
        onDisplayEditTeam = function(eventData) {
            creationHandler.fire('afterDisplayTeamEditWindow', eventData);
        };
        onDisplayEditProject = function(eventData) {
            creationHandler.fire('afterDisplayProjectEditWindow', eventData);
        };
        onDisplayEditCalendar = function(eventData) {
            creationHandler.fire('afterDisplayCalendarEditWindow', eventData);
        };
        onDisplayEditResource = function(eventData) {
            creationHandler.fire('afterDisplayResourceEditWindow', eventData);
        };
        onBeforeDisplayEditResource = function(eventData) {
            creationHandler.fire('beforeDisplayResourceEditWindow', eventData);
        };
        onEditResource = function(eventData) {
            creationHandler.fire('beforeUpdateResource', eventData);
        };

        clickHandler.on('clickSchedule', onShowDetailPopup);

        if (options.useCreationPopup) {
            onShowEditPopup = function(eventData) {
                var calendars = baseController.calendars;
                eventData.isEditMode = true;
                createView.setCalendars(calendars);
                createView.render(eventData);
            };
            onShowProjectEditPopup = function(eventData) {
                eventData.isEditMode = true;
                createProjectView.render(eventData);
            };
            onShowTeamEditPopup = function(eventData) {
                var resources = baseController.resources;
                eventData.isEditMode = true;
                createTeamView.setResources(resources);
                createTeamView.render(eventData);
            };
            onShowCalendarEditPopup = function(eventData) {
                var calendars = baseController.calendars;
                eventData.isEditMode = true;
                createCalendarView.setCalendars(calendars);
                createCalendarView.render(eventData);
            };
            onShowResourceEditPopup = function(eventData) {
                var teams = baseController.teams;
                eventData.isEditMode = true;
                createResourceView.setTeams(teams);
                createResourceView.render(eventData);
            };

            createView.on('beforeUpdateSchedule', onEditSchedule);
            createView.on('afterDisplayScheduleEditWindow', onDisplayEditSchedule);
            createView.on('afterUpdateScheduleCalendar', onUpdateScheduleCalendar);
            detailView.on('beforeUpdateSchedule', onShowEditPopup);

            createProjectView.on('beforeUpdateProject', onEditProject);
            createProjectView.on('afterDisplayProjectEditWindow', onDisplayEditProject);
            detailProjectView.on('beforeUpdateProject', onShowProjectEditPopup);

            createTeamView.on('beforeUpdateTeam', onEditTeam);
            createTeamView.on('afterDisplayTeamEditWindow', onDisplayEditTeam);
            detailTeamView.on('beforeUpdateTeam', onShowTeamEditPopup);

            createCalendarView.on('beforeUpdateCalendar', onEditCalendar);
            createCalendarView.on('afterDisplayCalendarEditWindow', onDisplayEditCalendar);
            detailCalendarView.on('beforeUpdateCalendar', onShowCalendarEditPopup);

            createResourceView.on('beforeUpdateResource', onEditResource);
            createResourceView.on('afterDisplayResourceEditWindow', onDisplayEditResource);
            detailResourceView.on('beforeDisplayResourceEditWindow', onBeforeDisplayEditResource);
            detailResourceView.on('beforeUpdateResource', onShowResourceEditPopup);
        } else {
            detailView.on('beforeUpdateSchedule', onEditSchedule);
            detailTeamView.on('beforeUpdateTeam', onEditTeam);
            detailCalendarView.on('beforeUpdateCalendar', onEditCalendar);
            detailResourceView.on('beforeUpdateResource', onEditResource);
        }
        detailView.on('beforeDeleteSchedule', onDeleteSchedule);
        detailTeamView.on('beforeDeleteTeam', onDeleteTeam);
        detailCalendarView.on('beforeDeleteCalendar', onDeleteCalendar);
        detailResourceView.on('beforeDeleteResource', onDeleteResource);
    }

    // binding clear schedules
    baseController.on('clearSchedules', clearSchedulesHandler);

    // bind update schedule event
    baseController.on('updateSchedule', onUpdateSchedule);

    if (moveHandler) {
        moveHandler.on('monthMoveStart_from_morelayer', function() {
            moreView.hide();
        });
    }

    monthView.handler = {
        click: {
            'default': clickHandler
        }
    };

    if (!options.isReadOnly) {
        monthView.handler = util.extend(monthView.handler, {
            creation: {
                'default': creationHandler
            },
            resize: {
                'default': resizeHandler
            },
            move: {
                'default': moveHandler
            }
        });
    }

    monthView._beforeDestroy = function() {
        moreView.destroy();
        baseController.off('clearSchedules', clearSchedulesHandler);
        baseController.off('updateSchedule', onUpdateSchedule);

        util.forEach(monthView.handler, function(type) {
            util.forEach(type, function(handler) {
                handler.off();
                handler.destroy();
            });
        });

        if (options.useCreationPopup && options.useDetailPopup) {
            createView.off('beforeUpdateSchedule', onUpdateSchedule);
            createCalendarView.off('beforeUpdateCalendar', onUpdateSchedule);
        }

        if (options.useCreationPopup) {
            if (creationHandler) {
                creationHandler.off('beforeCreateSchedule', onShowCreationPopup);
                createResourceView.off('beforeCreateResource', onSaveNewResource);
                createTeamView.off('beforeCreateTeam', onSaveNewTeam);
                createCalendarView.off('beforeCreateCalendar', onSaveNewCalendar);
            }

            createView.off('saveSchedule', onSaveNewSchedule);
            createView.destroy();
            createResourceView.destroy();
            createTeamView.destroy();
            createCalendarView.destroy();
        }

        if (options.useDetailPopup) {
            clickHandler.off('clickSchedule', onShowDetailPopup);
            detailView.off('beforeUpdateSchedule', onUpdateSchedule);
            detailView.off('beforeDeleteSchedule', onDeleteSchedule);
            detailResourceView.off('beforeDeleteResource', onDeleteResource);
            detailTeamView.off('beforeDeleteTeam', onDeleteTeam);
            detailCalendarView.off('beforeDeleteCalendar', onDeleteCalendar);

            detailView.destroy();
            detailResourceView.destroy();
            detailTeamView.destroy();
            detailCalendarView.destroy();
        }
    };

    // add controller
    monthView.controller = baseController.Month;

    return {
        view: monthView,
        refresh: function() {
            monthView.vLayout.refresh();
        },
        openResourceCreationPopup: function(resource) {
            if (createResourceView) {
                creationHandler.invokeResourceCreationClick(resource);
            }
        },
        showResourceCreationPopup: function(resource) {
            if (createResourceView) {
                createResourceView.render(resource);
            }
        },
        showResourceDetailPopup: function(resource) {
            if (onShowResourceDetailPopup) {
                resource.guide = creationHandler.guide;
                onShowResourceDetailPopup(resource);
            }
        },
        openTeamCreationPopup: function(team) {
            if (createTeamView) {
                creationHandler.invokeTeamCreationClick(team);
            }
        },
        showTeamCreationPopup: function(team) {
            if (createTeamView) {
                createTeamView.render(team);
            }
        },
        showTeamDetailPopup: function(team) {
            if (onShowTeamDetailPopup) {
                team.guide = creationHandler.guide;
                onShowTeamDetailPopup(team);
            }
        },
        openCalendarCreationPopup: function(calendar) {
            if (createCalendarView) {
                creationHandler.invokeCalendarCreationClick(calendar);
            }
        },
        showCalendarCreationPopup: function(calendar) {
            if (createCalendarView) {
                createCalendarView.render(calendar);
            }
        },
        showCalendarDetailPopup: function(calendar) {
            if (onShowCalendarDetailPopup) {
                calendar.guide = creationHandler.guide;
                onShowCalendarDetailPopup(calendar);
            }
        },
        openProjectCreationPopup: function(project) {
            if (createProjectView) {
                creationHandler.invokeProjectCreationClick(project);
            }
        },
        showProjectCreationPopup: function(project) {
            if (createProjectView) {
                createProjectView.render(project);
            }
        },
        showProjectDetailPopup: function(project) {
            if (onShowProjectDetailPopup) {
                project.guide = creationHandler.guide;
                onShowProjectDetailPopup(project);
            }
        },
        openCreationPopup: function(schedule) {
            if (createView && creationHandler) {
                creationHandler.invokeCreationClick(Schedule.create(schedule));
            }
        },
        showCreationPopup: function(eventData) {
            if (createView) {
                createView.setCalendars(baseController.calendars);
                createView.render(eventData);
            }
        },
        hideMoreView: function() {
            if (moreView) {
                moreView.hide();
            }
        }
    };
}

module.exports = createMonthView;
