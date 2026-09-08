
export interface OfficeFormData {
    name: string;
    address: string;
    latitude: string | number;
    longitude: string | number;
    radius: number;
    isActive: boolean;
}

export interface GeofenceSettings {
    enabled: boolean;
    enforceCheckIn: boolean;
    enforceCheckOut: boolean;
    allowWFHBypass: boolean;
    defaultRadius: number;
}

export interface GeneralSettingsData {
    locationSetting: 'na' | 'optional' | 'mandatory';
    taskReportSetting: 'na' | 'optional' | 'mandatory';
    geofence: GeofenceSettings;
}

export interface MilestoneTypes {
    threeMonths: boolean;
    sixMonths: boolean;
    oneYear: boolean;
}

export interface HrEmailTypes {
    leaveRequests: boolean;
    wfhRequests: boolean;
    regularizationRequests: boolean;
    helpRequests: boolean;
    employeeMilestones: boolean;
    expenseRequests: boolean;
}

export interface DailyHrReportSettings {
    enabled: boolean;
    sendTime: string;
    includeAbsentees: boolean;
    subjectLine: string;
}

export interface NotificationSettingsData {
    emailEnabled: boolean;
    pushEnabled: boolean;
    milestoneAlertsEnabled: boolean;
    milestoneTypes: MilestoneTypes;
    holidayReminderEnabled: boolean;
    holidayReminderDays: number;
    hrEmails: string[];
    hrEmailTypes: HrEmailTypes;
    dailyHrAttendanceReport: DailyHrReportSettings;
}

export interface AttendanceSettingsData {
    lateThreshold: string;
    workStartTime: string;
    workEndTime: string;
    halfDayEndTime: string;
    minimumWorkHours: number;
    fullDayHours: number;
    workingDays: number[];
    saturdayWorkType: 'full' | 'half';
    saturdayHolidays: number[];
    nonWorkingDays?: number[]; // Present in original JSX
}

export interface RequestRetentionSettingsData {
    regularization: {
        enabled: boolean;
        retentionMonths: 1 | 2 | 3 | 6 | 12;
    };
}

export interface SettingsFormData {
    general: GeneralSettingsData;
    notifications: NotificationSettingsData;
    attendance: AttendanceSettingsData;
    requestRetention: RequestRetentionSettingsData;
}

// Re-export specific form data wrapper if used by subcomponents
// AttendanceSettings uses { attendance: AttendanceSettingsData } shape as 'AttendanceFormData'
export interface AttendanceFormWrapper {
    attendance: AttendanceSettingsData;
}
