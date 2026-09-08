/**
 * The single source of truth for settings form defaults on the client.
 *
 * These mirror the Mongoose schema defaults in backend/models/Settings.model.ts.
 * They exist only to give controlled inputs a value before the server response
 * arrives - the server, not this file, decides what an unset field means.
 *
 * Previously these defaults were written out four times (useState initialiser,
 * the sync effect, the service fallback, the model). Keep them here only.
 */

import type {
  AttendanceSettingsData,
  GeneralSettingsData,
  NotificationSettingsData,
  RequestRetentionSettingsData,
  SettingsFormData,
} from './types';
import type {
  AttendanceSettingsSection,
  GeneralSettingsSection,
  NotificationSettingsSection,
  RequestRetentionSettingsSection,
} from '@/types';

export const DEFAULT_ATTENDANCE: AttendanceSettingsData = {
  lateThreshold: '09:55',
  workStartTime: '09:00',
  workEndTime: '18:00',
  halfDayEndTime: '13:00',
  minimumWorkHours: 4,
  fullDayHours: 8,
  workingDays: [1, 2, 3, 4, 5, 6],
  nonWorkingDays: [0],
  saturdayWorkType: 'full',
  saturdayHolidays: [],
};

export const DEFAULT_NOTIFICATIONS: NotificationSettingsData = {
  hrEmails: [],
  emailEnabled: true,
  pushEnabled: true,
  holidayReminderEnabled: true,
  holidayReminderDays: 1,
  milestoneAlertsEnabled: true,
  milestoneTypes: {
    threeMonths: true,
    sixMonths: true,
    oneYear: true,
  },
  dailyHrAttendanceReport: {
    enabled: false,
    sendTime: '19:00',
    includeAbsentees: true,
    subjectLine: 'Daily Attendance Report - {date}',
  },
  hrEmailTypes: {
    leaveRequests: true,
    wfhRequests: true,
    regularizationRequests: true,
    helpRequests: true,
    employeeMilestones: true,
    expenseRequests: true,
  },
};

export const DEFAULT_GENERAL: GeneralSettingsData = {
  locationSetting: 'na',
  taskReportSetting: 'na',
  geofence: {
    enabled: true,
    enforceCheckIn: true,
    enforceCheckOut: true,
    defaultRadius: 100,
    allowWFHBypass: true,
  },
};

export const DEFAULT_REQUEST_RETENTION: RequestRetentionSettingsData = {
  regularization: {
    enabled: false,
    retentionMonths: 6,
  },
};

export const DEFAULT_SETTINGS_FORM: SettingsFormData = {
  attendance: DEFAULT_ATTENDANCE,
  notifications: DEFAULT_NOTIFICATIONS,
  general: DEFAULT_GENERAL,
  requestRetention: DEFAULT_REQUEST_RETENTION,
};

/**
 * Fill a partial server section with defaults for anything absent.
 * Nested objects are merged one level deep, which is as deep as these go.
 */
export const mergeAttendance = (
  section: AttendanceSettingsSection | undefined
): AttendanceSettingsData => ({
  ...DEFAULT_ATTENDANCE,
  ...section,
});

export const mergeNotifications = (
  section: NotificationSettingsSection | undefined
): NotificationSettingsData => ({
  ...DEFAULT_NOTIFICATIONS,
  ...section,
  milestoneTypes: {
    ...DEFAULT_NOTIFICATIONS.milestoneTypes,
    ...section?.milestoneTypes,
  },
  hrEmailTypes: {
    ...DEFAULT_NOTIFICATIONS.hrEmailTypes,
    ...section?.hrEmailTypes,
  },
  dailyHrAttendanceReport: {
    ...DEFAULT_NOTIFICATIONS.dailyHrAttendanceReport,
    ...section?.dailyHrAttendanceReport,
  },
});

export const mergeGeneral = (
  section: GeneralSettingsSection | undefined
): GeneralSettingsData => ({
  ...DEFAULT_GENERAL,
  ...section,
  geofence: {
    ...DEFAULT_GENERAL.geofence,
    ...section?.geofence,
  },
});

export const mergeRequestRetention = (
  section: RequestRetentionSettingsSection | undefined
): RequestRetentionSettingsData => ({
  ...DEFAULT_REQUEST_RETENTION,
  ...section,
  regularization: {
    ...DEFAULT_REQUEST_RETENTION.regularization,
    ...section?.regularization,
  },
});
