/**
 * @fileoverview Factory module for WeekView
 * @author NHN FE Development Lab <dl_javascript@nhn.com>
 */
'use strict';

var util = require('tui-code-snippet');
var config = require('../config');
var domutil = require('../common/domutil');
var common = require('../common/common');
var VLayout = require('../common/vlayout');
var reqAnimFrame = require('../common/reqAnimFrame');
var Schedule = require('../model/schedule');
// Parent views
var Week = require('../view/week/week');

// Sub views
var DayName = require('../view/week/dayname');
var DayGrid = require('../view/week/dayGrid');
var TimeGrid = require('../view/week/timeGrid');
var ProjectCreationPopup = require('../view/popup/projectCreationPopup');
var ResourceCreationPopup = require('../view/popup/resourceCreationPopup');
var TeamCreationPopup = require('../view/popup/teamCreationPopup');
var CalendarCreationPopup = require('../view/popup/calendarCreationPopup');
var ScheduleCreationPopup = require('../view/popup/scheduleCreationPopup');
var ProjectDetailPopup = require('../view/popup/projectDetailPopup');
var ScheduleDetailPopup = require('../view/popup/scheduleDetailPopup');
var TeamDetailPopup = require('../view/popup/teamDetailPopup');
var CalendarDetailPopup = require('../view/popup/calendarDetailPopup');
var ResourceDetailPopup = require('../view/popup/resourceDetailPopup');

// Handlers
var DayNameClick = require('../handler/time/clickDayname');
var DayGridClick = require('../handler/daygrid/click');
var DayGridCreation = require('../handler/daygrid/creation');
var DayGridMove = require('../handler/daygrid/move');
var DayGridResize = require('../handler/daygrid/resize');
var TimeClick = require('../handler/time/click');
var TimeCreation = require('../handler/time/creation');
var TimeMove = require('../handler/time/move');
var TimeResize = require('../handler/time/resize');

var DAYGRID_HANDLDERS = {
    'click': DayGridClick,
    'creation': DayGridCreation,
    'move': DayGridMove,
    'resize': DayGridResize
};
var TIMEGRID_HANDLERS = {
    'click': TimeClick,
    'creation': TimeCreation,
    'move': TimeMove,
    'resize': TimeResize
};
var DEFAULT_PANELS = [
    {
        name: 'milestone',
        type: 'daygrid',
        minHeight: 20,
        maxHeight: 80,
        showExpandableButton: true,
        maxExpandableHeight: 210,
        handlers: ['click'],
        show: true
    },
    {
        name: 'task',
        type: 'daygrid',
        minHeight: 40,
        maxHeight: 120,
        showExpandableButton: true,
        maxExpandableHeight: 210,
        handlers: ['click', 'move'],
        show: true
    },
    {
        name: 'allday',
        type: 'daygrid',
        minHeight: 30,
        maxHeight: 80,
        showExpandableButton: true,
        maxExpandableHeight: 210,
        handlers: ['click', 'creation', 'move', 'resize'],
        show: true
    },
    {
        name: 'time',
        type: 'timegrid',
        autoHeight: true,
        handlers: ['click', 'creation', 'move', 'resize'],
        show: true
    }
];

/* eslint-disable complexity*/
module.exports = function(baseController, layoutContainer, dragHandler, options, viewName) {
    var panels = [],
        vpanels = [];
    var weekView, dayNameContainer, dayNameView, vLayoutContainer, vLayout;
    var createProjectView, onDisplayEditProject, onBeforeDisplayEditResource;
    var createView, createCalendarView, createTeamView, createResourceView;
    var onSaveNewSchedule, onSaveNewCalendar, onSaveNewTeam, onSaveNewResource;
    var onSetCalendars, lastVPanel, onShowProjectDetailPopup, onDisplayEditTeam;
    var onDisplayEditResource, onEditProject, onShowProjectEditPopup;
    var detailProjectView, detailView, detailCalendarView, detailResourceView;
    var detailTeamView, onShowTeamEditPopup, onShowTeamDetailPopup;
    var onShowDetailPopup, onShowCalendarDetailPopup, onShowResourceDetailPopup;
    var onDeleteSchedule, onDeleteCalendar, onDeleteTeam, onDeleteResource;
    var onShowEditPopup, onShowCalendarEditPopup, onShowResourceEditPopup;
    var onEditSchedule, onEditCalendar, onEditTeam, onDisplayEditSchedule;
    var onDisplayEditCalendar, onUpdateScheduleCalendar, onEditResource;
    var onBeforeDisplayEditTeam;
    var taskView = options.taskView;
    var scheduleView = options.scheduleView;
    var viewVisibilities = {
        'milestone': util.isArray(taskView) ? util.inArray('milestone', taskView) >= 0 : taskView,
        'task': util.isArray(taskView) ? util.inArray('task', taskView) >= 0 : taskView,
        'allday': util.isArray(scheduleView) ? util.inArray('allday', scheduleView) >= 0 : scheduleView,
        'time': util.isArray(scheduleView) ? util.inArray('time', scheduleView) >= 0 : scheduleView
    };

    // Make panels by view sequence and visibilities
    util.forEach(DEFAULT_PANELS, function(panel) {
        var name = panel.name;

        panel = util.extend({}, panel);
        panels.push(panel);

        // Change visibilities
        panel.show = viewVisibilities[name];

        if (panel.show) {
            if (vpanels.length) {
                vpanels.push({
                    isSplitter: true
                });
            }
            vpanels.push(util.extend({}, panel));
        }
    });

    if (vpanels.length) {
        lastVPanel = vpanels[vpanels.length - 1];
        lastVPanel.autoHeight = true;
        lastVPanel.maxHeight = null;
        lastVPanel.showExpandableButton = false;

        util.forEach(panels, function(panel) {
            if (panel.name === lastVPanel.name) {
                panel.showExpandableButton = false;

                return false;
            }

            return true;
        });
    }

    util.extend(options.week, {panels: panels});

    weekView = new Week(null, options.week, layoutContainer, panels, viewName);
    weekView.handler = {
        click: {},
        dayname: {},
        creation: {},
        move: {},
        resize: {}
    };

    dayNameContainer = domutil.appendHTMLElement('div', weekView.container, config.classname('dayname-layout'));

    /**********
     * Day name (top row(Mon, Tue, Wed...))
     **********/
    dayNameView = new DayName(options, dayNameContainer, baseController.theme);
    weekView.handler.dayname.date = new DayNameClick(dragHandler, dayNameView, baseController);
    weekView.addChild(dayNameView);

    /**********
     * Initialize vertical layout module
     **********/
    vLayoutContainer = domutil.appendHTMLElement('div', weekView.container, config.classname('vlayout-area'));
    vLayoutContainer.style.height = (domutil.getSize(weekView.container)[1] - dayNameView.container.offsetHeight) + 'px';

    vLayout = new VLayout({
        panels: vpanels,
        panelHeights: options.week.panelHeights || []
    }, vLayoutContainer, baseController.theme);

    weekView.vLayout = vLayout;

    util.forEach(panels, function(panel) {
        var name = panel.name;
        var handlers = panel.handlers;
        var view;

        if (!panel.show) {
            return;
        }

        if (panel.type === 'daygrid') {
            /**********
             * Schedule panel by Grid
             **********/
            view = new DayGrid(name, options, vLayout.getPanelByName(panel.name).container, baseController.theme);
            view.on('afterRender', function(viewModel) {
                vLayout.getPanelByName(name).setHeight(null, viewModel.height);
            });

            weekView.addChild(view);

            util.forEach(handlers, function(type) {
                if (!options.isReadOnly || type === 'click') {
                    weekView.handler[type][name] =
                        new DAYGRID_HANDLDERS[type](dragHandler, view, baseController, options);
                    view.addHandler(type, weekView.handler[type][name], vLayout.getPanelByName(name));
                }
            });
        } else if (panel.type === 'timegrid') {
            /**********
             * Schedule panel by TimeGrid
             **********/
            view = new TimeGrid(name, options, vLayout.getPanelByName(name).container);
            weekView.addChild(view);
            util.forEach(handlers, function(type) {
                if (!options.isReadOnly || type === 'click') {
                    weekView.handler[type][name] =
                        new TIMEGRID_HANDLERS[type](dragHandler, view, baseController, options);
                }
            });

            view.on('clickTimezonesCollapsedBtn', function() {
                var timezonesCollapsed = !weekView.state.timezonesCollapsed;

                weekView.setState({
                    timezonesCollapsed: timezonesCollapsed
                });
                reqAnimFrame.requestAnimFrame(function() {
                    if (!weekView.invoke('clickTimezonesCollapseBtn', timezonesCollapsed)) {
                        weekView.render();
                    }
                });
            });
        }
    });

    vLayout.on('resize', function() {
        reqAnimFrame.requestAnimFrame(function() {
            weekView.render();
        });
    });

    // binding create schedules event
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
            util.extend(scheduleData, {
                useCreationPopup: true
            });
            if (scheduleData.isAllDay) {
                weekView.handler.creation.allday.fire('beforeCreateSchedule', scheduleData);
            } else {
                weekView.handler.creation.time.fire('beforeCreateSchedule', scheduleData);
            }
        };

        onSaveNewTeam = function(teamData) {
            util.extend(teamData, {
                useCreationPopup: true
            });
            weekView.handler.creation.allday.fire('beforeCreateTeam', teamData);
        };

        onSaveNewCalendar = function(calendarData) {
            util.extend(calendarData, {
                useCreationPopup: true
            });
            weekView.handler.creation.allday.fire('beforeCreateCalendar', calendarData);
        };

        onSaveNewResource = function(resourceData) {
            util.extend(resourceData, {
                useCreationPopup: true
            });
            weekView.handler.creation.allday.fire('beforeCreateResource', resourceData);
        };

        createView.on('beforeCreateSchedule', onSaveNewSchedule);
        createTeamView.on('beforeCreateTeam', onSaveNewTeam);
        createCalendarView.on('beforeCreateCalendar', onSaveNewCalendar);
        createResourceView.on('beforeCreateResource', onSaveNewResource);
    }

    // TODO: onSetResources/Teams?
    onSetCalendars = function(calendars) {
        if (createView) {
            createView.setCalendars(calendars);
        }
        if (createTeamView) {
            createTeamView.setCalendars(calendars);
        }
        if (createCalendarView) {
            createCalendarView.setCalendars(calendars);
        }
        if (createResourceView) {
            createResourceView.setCalendars(calendars);
        }
    };

    baseController.on('setCalendars', onSetCalendars);

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

            // eventData.resources = baseController.resources.filter(function(res) {
            //     return resourceIds.includes(res.id);
            // });

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
            if (eventData.isAllDay) {
                weekView.handler.creation.allday.fire('beforeDeleteSchedule', eventData);
            } else {
                weekView.handler.creation.time.fire('beforeDeleteSchedule', eventData);
            }
        };
        onDeleteTeam = function(eventData) {
            weekView.handler.creation.allday.fire('beforeDeleteTeam', eventData);
        };
        onDeleteCalendar = function(eventData) {
            weekView.handler.creation.allday.fire('beforeDeleteCalendar', eventData);
        };
        onDeleteResource = function(eventData) {
            weekView.handler.creation.allday.fire('beforeDeleteResource', eventData);
        };
        onEditSchedule = function(eventData) {
            if (eventData.isAllDay) {
                weekView.handler.move.allday.fire('beforeUpdateSchedule', eventData);
            } else {
                weekView.handler.move.time.fire('beforeUpdateSchedule', eventData);
            }
        };
        onEditProject = function(eventData) {
            weekView.handler.creation.allday.fire('beforeUpdateProject', eventData);
        };
        onEditTeam = function(eventData) {
            weekView.handler.creation.allday.fire('beforeUpdateTeam', eventData);
        };
        onEditCalendar = function(eventData) {
            weekView.handler.creation.allday.fire('beforeUpdateCalendar', eventData);
        };
        onDisplayEditSchedule = function(eventData) {
            weekView.handler.creation.allday.fire('afterDisplayScheduleEditWindow', eventData);
        };
        onUpdateScheduleCalendar = function(eventData) {
            weekView.handler.creation.allday.fire('afterUpdateScheduleCalendar', eventData);
        };
        onDisplayEditTeam = function(eventData) {
            weekView.handler.creation.allday.fire('afterDisplayTeamEditWindow', eventData);
        };
        onBeforeDisplayEditTeam = function(eventData) {
            weekView.handler.creation.allday.fire('beforeDisplayTeamEditWindow', eventData);
        };
        onDisplayEditProject = function(eventData) {
            weekView.handler.creation.allday.fire('afterDisplayProjectEditWindow', eventData);
        };
        onDisplayEditCalendar = function(eventData) {
            weekView.handler.creation.allday.fire('afterDisplayCalendarEditWindow', eventData);
        };
        onDisplayEditResource = function(eventData) {
            weekView.handler.creation.allday.fire('afterDisplayResourceEditWindow', eventData);
        };
        onBeforeDisplayEditResource = function(eventData) {
            weekView.handler.creation.allday.fire('beforeDisplayResourceEditWindow', eventData);
        };
        onEditResource = function(eventData) {
            weekView.handler.creation.allday.fire('beforeUpdateResource', eventData);
        };

        util.forEach(weekView.handler.click, function(panel) {
            panel.on('clickSchedule', onShowDetailPopup);
        });
        if (options.useCreationPopup) {
            onShowEditPopup = function(eventData) {
                var calendars = baseController.calendars;
                eventData.isEditMode = true;
                createView.setCalendars(calendars);
                createView.render(eventData);
            };
            createView.on('beforeUpdateSchedule', onEditSchedule);
            createView.on('afterDisplayScheduleEditWindow', onDisplayEditSchedule);
            createView.on('afterUpdateScheduleCalendar', onUpdateScheduleCalendar);
            detailView.on('beforeUpdateSchedule', onShowEditPopup);

            onShowProjectEditPopup = function(eventData) {
                eventData.isEditMode = true;
                createProjectView.render(eventData);
            };
            createProjectView.on('beforeUpdateProject', onEditProject);
            createProjectView.on('afterDisplayProjectEditWindow', onDisplayEditProject);
            detailProjectView.on('beforeUpdateProject', onShowProjectEditPopup);

            onShowTeamEditPopup = function(eventData) {
                var resources = baseController.resources;
                eventData.isEditMode = true;
                createTeamView.setResources(resources);
                createTeamView.render(eventData);
            };
            createTeamView.on('beforeUpdateTeam', onEditTeam);
            createTeamView.on('afterDisplayTeamEditWindow', onDisplayEditTeam);
            detailTeamView.on('beforeDisplayTeamEditWindow', onBeforeDisplayEditTeam);
            detailTeamView.on('beforeUpdateTeam', onShowTeamEditPopup);

            onShowCalendarEditPopup = function(eventData) {
                var calendars = baseController.calendars;
                eventData.isEditMode = true;
                createCalendarView.setCalendars(calendars);
                createCalendarView.render(eventData);
            };
            createCalendarView.on('beforeUpdateCalendar', onEditCalendar);
            createCalendarView.on('afterDisplayCalendarEditWindow', onDisplayEditCalendar);
            detailCalendarView.on('beforeUpdateCalendar', onShowCalendarEditPopup);

            onShowResourceEditPopup = function(eventData) {
                var teams = baseController.teams;
                eventData.isEditMode = true;
                createResourceView.setTeams(teams);
                createResourceView.render(eventData);
            };
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

    weekView.on('afterRender', function() {
        vLayout.refresh();
    });

    // add controller
    weekView.controller = baseController.Week;

    // add destroy
    weekView._beforeDestroy = function() {
        util.forEach(weekView.handler, function(type) {
            util.forEach(type, function(handler) {
                handler.off();
                handler.destroy();
            });
        });

        if (options.useCreationPopup) {
            createResourceView.off('beforeCreateResource', onSaveNewResource);
            createResourceView.destroy();
            createTeamView.off('beforeCreateTeam', onSaveNewTeam);
            createTeamView.destroy();
            createCalendarView.off('beforeCreateCalendar', onSaveNewCalendar);
            createCalendarView.destroy();
            createView.off('beforeCreateSchedule', onSaveNewSchedule);
            createView.destroy();
        }

        if (options.useDetailPopup) {
            detailResourceView.off('beforeDeleteResource', onDeleteResource);
            detailResourceView.destroy();
            detailTeamView.off('beforeDeleteTeam', onDeleteTeam);
            detailTeamView.destroy();
            detailCalendarView.off('beforeDeleteCalendar', onDeleteCalendar);
            detailCalendarView.destroy();
            detailView.off('beforeDeleteSchedule', onDeleteSchedule);
            detailView.destroy();
        }

        weekView.off();
    };

    return {
        view: weekView,
        refresh: function() {
            var weekViewHeight = weekView.getViewBound().height,
                daynameViewHeight = domutil.getBCRect(
                    dayNameView.container
                ).height;

            vLayout.container.style.height =
                weekViewHeight - daynameViewHeight + 'px';
            vLayout.refresh();
        },
        scrollToNow: function() {
            weekView.children.each(function(childView) {
                if (childView.scrollToNow) {
                    childView.scrollToNow();
                }
            });
        },
        openResourceCreationPopup: function(resource) {
            if (createResourceView) {
                weekView.handler.creation.allday.invokeResourceCreationClick(resource);
            }
        },
        showResourceCreationPopup: function(resource) {
            if (createResourceView) {
                createResourceView.render(resource);
            }
        },
        showResourceDetailPopup: function(resource) {
            if (onShowResourceDetailPopup) {
                resource.guide = weekView.handler.creation.allday.guide;
                onShowResourceDetailPopup(resource);
            }
        },
        openTeamCreationPopup: function(team) {
            if (createTeamView) {
                weekView.handler.creation.allday.invokeTeamCreationClick(team);
            }
        },
        showTeamCreationPopup: function(team) {
            if (createTeamView) {
                createTeamView.render(team);
            }
        },
        showTeamDetailPopup: function(team) {
            if (onShowTeamDetailPopup) {
                team.guide = weekView.handler.creation.allday.guide;
                onShowTeamDetailPopup(team);
            }
        },
        openCalendarCreationPopup: function(calendar) {
            if (createCalendarView) {
                weekView.handler.creation.allday.invokeCalendarCreationClick(calendar);
            }
        },
        showCalendarCreationPopup: function(calendar) {
            if (createCalendarView) {
                createCalendarView.render(calendar);
            }
        },
        showCalendarDetailPopup: function(calendar) {
            if (onShowCalendarDetailPopup) {
                calendar.guide = weekView.handler.creation.allday.guide;
                onShowCalendarDetailPopup(calendar);
            }
        },
        openProjectCreationPopup: function(project) {
            if (createProjectView) {
                weekView.handler.creation.allday.invokeProjectCreationClick(project);
            }
        },
        showProjectCreationPopup: function(project) {
            if (createProjectView) {
                createProjectView.render(project);
            }
        },
        showProjectDetailPopup: function(project) {
            if (onShowProjectDetailPopup) {
                project.guide = weekView.handler.creation.allday.guide;
                onShowProjectDetailPopup(project);
            }
        },
        openCreationPopup: function(schedule) {
            if (createView) {
                if (schedule.isAllDay) {
                    weekView.handler.creation.allday.invokeCreationClick(Schedule.create(schedule));
                } else {
                    weekView.handler.creation.time.invokeCreationClick(Schedule.create(schedule));
                }
            }
        },
        showCreationPopup: function(eventData) {
            if (createView) {
                createView.setCalendars(baseController.calendars);
                createView.render(eventData);
            }
        }
    };
};
