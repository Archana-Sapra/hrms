/**
 * Settings Model - TypeScript + Mongoose
 * System-wide and department-specific configuration
 */

import mongoose, { Schema, type Document, type Model } from 'mongoose';
import {
  DEFAULT_GEOFENCE_RADIUS_METERS,
  MIN_GEOFENCE_RADIUS_METERS,
  MAX_GEOFENCE_RADIUS_METERS,
} from './OfficeLocation.model.js';

export type LocationSetting = 'na' | 'optional' | 'mandatory';
export type TaskReportSetting = 'na' | 'optional' | 'mandatory';
export type SaturdayWorkType = 'full' | 'half';
export type SettingsScope = 'global' | 'department';

export interface IAttendanceConfig {
  lateThreshold: string;
  workStartTime: string;
  workEndTime: string;
  halfDayEndTime: string;
  minimumWorkHours: number;
  fullDayHours: number;
  workingDays: number[];
  nonWorkingDays: number[];
  saturdayWorkType: SaturdayWorkType;
  saturdayHolidays: number[];
}

export interface IHrEmailTypes {
  leaveRequests: boolean;
  wfhRequests: boolean;
  regularizationRequests: boolean;
  helpRequests: boolean;
  employeeMilestones: boolean;
  expenseRequests: boolean;
}

export interface IMilestoneTypes {
  threeMonths: boolean;
  sixMonths: boolean;
  oneYear: boolean;
}

export interface IDailyHrAttendanceReport {
  enabled: boolean;
  sendTime: string;
  includeAbsentees: boolean;
  subjectLine: string;
}

export interface INotificationConfig {
  hrEmails: string[];
  emailEnabled: boolean;
  pushEnabled: boolean;
  hrEmailTypes: IHrEmailTypes;
  holidayReminderEnabled: boolean;
  holidayReminderDays: number;
  milestoneAlertsEnabled: boolean;
  milestoneTypes: IMilestoneTypes;
  dailyHrAttendanceReport: IDailyHrAttendanceReport;
}

export interface IGeofenceConfig {
  enabled: boolean;
  enforceCheckIn: boolean;
  enforceCheckOut: boolean;
  defaultRadius: number;
  allowWFHBypass: boolean;
}

export interface IGeneralConfig {
  locationSetting: LocationSetting;
  taskReportSetting: TaskReportSetting;
  geofence: IGeofenceConfig;
}

export type RetentionMonths = 1 | 2 | 3 | 6 | 12;

export interface IRegularizationRetentionConfig {
  enabled: boolean;
  retentionMonths: RetentionMonths;
}

export interface IRequestRetentionConfig {
  regularization: IRegularizationRetentionConfig;
}

export interface ISettingsDoc extends Document {
  attendance: IAttendanceConfig;
  notifications: INotificationConfig;
  general: IGeneralConfig;
  requestRetention: IRequestRetentionConfig;
  scope: SettingsScope;
  department?: string;
  lastUpdatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const settingsSchema = new Schema<ISettingsDoc>(
  {
    attendance: {
      lateThreshold: {
        type: String,
        default: '09:55',
        match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      },
      workStartTime: {
        type: String,
        default: '09:00',
        match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      },
      workEndTime: {
        type: String,
        default: '18:00',
        match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      },
      halfDayEndTime: {
        type: String,
        default: '13:00',
        match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      },
      minimumWorkHours: {
        type: Number,
        default: 4,
        min: [0, 'Minimum work hours cannot be negative'],
        max: [24, 'Minimum work hours cannot exceed 24'],
      },
      fullDayHours: {
        type: Number,
        default: 8,
        min: [0, 'Full day hours cannot be negative'],
        max: [24, 'Full day hours cannot exceed 24'],
      },
      workingDays: {
        type: [Number],
        default: [1, 2, 3, 4, 5, 6], // Monday to Saturday
      },
      nonWorkingDays: {
        type: [Number],
        default: [0], // Sunday
      },
      saturdayWorkType: {
        type: String,
        enum: {
          values: ['full', 'half'] as SaturdayWorkType[],
          message: 'Saturday work type must be full or half',
        },
        default: 'full',
      },
      saturdayHolidays: {
        type: [Number],
        default: [],
        validate: {
          validator: function (arr: number[]): boolean {
            return arr.every((num) => num >= 1 && num <= 4);
          },
          message: 'Saturday holidays must be between 1-4',
        },
      },
    },
    notifications: {
      hrEmails: {
        type: [String],
        default: [],
        validate: {
          validator: function (arr: string[]): boolean {
            return arr.every((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
          },
          message: 'All HR emails must be valid',
        },
      },
      emailEnabled: { type: Boolean, default: true },
      pushEnabled: { type: Boolean, default: true },
      hrEmailTypes: {
        leaveRequests: { type: Boolean, default: true },
        wfhRequests: { type: Boolean, default: true },
        regularizationRequests: { type: Boolean, default: true },
        helpRequests: { type: Boolean, default: true },
        employeeMilestones: { type: Boolean, default: true },
        expenseRequests: { type: Boolean, default: true },
      },
      holidayReminderEnabled: { type: Boolean, default: true },
      holidayReminderDays: {
        type: Number,
        default: 1,
        min: [0, 'Holiday reminder days cannot be negative'],
        max: [7, 'Holiday reminder days cannot exceed 7'],
      },
      milestoneAlertsEnabled: { type: Boolean, default: true },
      milestoneTypes: {
        threeMonths: { type: Boolean, default: true },
        sixMonths: { type: Boolean, default: true },
        oneYear: { type: Boolean, default: true },
      },
      dailyHrAttendanceReport: {
        enabled: { type: Boolean, default: false },
        sendTime: {
          type: String,
          default: '19:00',
          match: /^([01]\d|2[0-3]):([0-5]\d)$/,
        },
        includeAbsentees: { type: Boolean, default: true },
        subjectLine: {
          type: String,
          default: 'Daily Attendance Report - {date}',
          maxlength: [200, 'Subject line cannot exceed 200 characters'],
        },
      },
    },
    general: {
      locationSetting: {
        type: String,
        enum: {
          values: ['na', 'optional', 'mandatory'] as LocationSetting[],
          message: 'Location setting must be na, optional, or mandatory',
        },
        default: 'na',
      },
      taskReportSetting: {
        type: String,
        enum: {
          values: ['na', 'optional', 'mandatory'] as TaskReportSetting[],
          message: 'Task report setting must be na, optional, or mandatory',
        },
        default: 'na',
      },
      geofence: {
        enabled: { type: Boolean, default: true },
        enforceCheckIn: { type: Boolean, default: true },
        enforceCheckOut: { type: Boolean, default: true },
        // Bounds mirror OfficeLocation.radius deliberately: this value is fed
        // straight into office creation, so a wider range here would produce
        // a default that can never be saved.
        defaultRadius: {
          type: Number,
          default: DEFAULT_GEOFENCE_RADIUS_METERS,
          min: [
            MIN_GEOFENCE_RADIUS_METERS,
            `Default radius must be at least ${MIN_GEOFENCE_RADIUS_METERS} meters`,
          ],
          max: [
            MAX_GEOFENCE_RADIUS_METERS,
            `Default radius cannot exceed ${MAX_GEOFENCE_RADIUS_METERS} meters`,
          ],
        },
        allowWFHBypass: { type: Boolean, default: true },
      },
    },
    requestRetention: {
      regularization: {
        enabled: { type: Boolean, default: false },
        retentionMonths: {
          type: Number,
          enum: {
            values: [1, 2, 3, 6, 12] as RetentionMonths[],
            message: 'Retention period must be 1, 2, 3, 6, or 12 months',
          },
          default: 6,
        },
      },
    },
    scope: {
      type: String,
      enum: {
        values: ['global', 'department'] as SettingsScope[],
        message: 'Scope must be global or department',
      },
      default: 'global',
    },
    department: {
      type: String,
      trim: true,
    },
    lastUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    collection: 'settings',
  }
);

// Indexes
settingsSchema.index({ scope: 1, department: 1 }, { unique: true, sparse: true });
settingsSchema.index(
  { scope: 1 },
  { unique: true, partialFilterExpression: { scope: 'global' } }
);
settingsSchema.index({ lastUpdatedBy: 1 });

/**
 * Pre-save hook: Validate department field based on scope
 */
settingsSchema.pre('save', function (next) {
  if (this.scope === 'global') {
    this.department = undefined;
  } else if (this.scope === 'department' && !this.department) {
    return next(new Error('Department is required when scope is department'));
  }
  next();
});

/**
 * Static methods interface
 */
interface ISettingsModel extends Model<ISettingsDoc> {
  getGlobalSettings(): Promise<ISettingsDoc>;
  getDepartmentSettings(department: string): Promise<ISettingsDoc | null>;
  getEffectiveSettings(department?: string | null): Promise<Record<string, unknown>>;
  mergeSettings(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown>;
}

/**
 * Static method: Get global settings (create if not exists)
 */
settingsSchema.static('getGlobalSettings', async function (): Promise<ISettingsDoc> {
  let settings = await this.findOne({ scope: 'global' });
  if (!settings) {
    settings = await this.create({ scope: 'global' });
  }
  return settings;
});

/**
 * Static method: Get department settings
 */
settingsSchema.static(
  'getDepartmentSettings',
  async function (department: string): Promise<ISettingsDoc | null> {
    return await this.findOne({ scope: 'department', department });
  }
);

/**
 * Static method: Get effective settings (department overrides global)
 */
settingsSchema.static(
  'getEffectiveSettings',
  async function (department: string | null = null): Promise<Record<string, unknown>> {
    const Settings = this as unknown as ISettingsModel;
    const globalSettings = await Settings.getGlobalSettings();
    let effectiveSettings = globalSettings.toObject();

    if (department) {
      const departmentSettings = await Settings.getDepartmentSettings(department);
      if (departmentSettings) {
        effectiveSettings = Settings.mergeSettings(effectiveSettings, departmentSettings.toObject());
      }
    }

    return effectiveSettings;
  }
);

/**
 * Helper method: Deep merge settings (department overrides global)
 */
settingsSchema.static(
  'mergeSettings',
  function (
    base: Record<string, unknown>,
    override: Record<string, unknown>
  ): Record<string, unknown> {
    const result = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;

    const deepMerge = (target: Record<string, unknown>, source: Record<string, unknown>): void => {
      Object.keys(source).forEach((key) => {
        // Skip metadata fields
        if (['_id', 'createdAt', 'updatedAt', '__v', 'scope', 'department'].includes(key)) {
          return;
        }

        const sourceValue = source[key];

        // Skip null/undefined values
        if (sourceValue === null || sourceValue === undefined) {
          return;
        }

        // Handle arrays - replace entirely
        if (Array.isArray(sourceValue)) {
          target[key] = [...sourceValue];
          return;
        }

        // Handle objects - recursively merge
        if (typeof sourceValue === 'object') {
          if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
            target[key] = {};
          }
          deepMerge(target[key] as Record<string, unknown>, sourceValue as Record<string, unknown>);
        } else {
          // Primitive value - override
          target[key] = sourceValue;
        }
      });
    };

    deepMerge(result, override);
    return result;
  }
);

const Settings = mongoose.model<ISettingsDoc, ISettingsModel>('Settings', settingsSchema);

export default Settings;
