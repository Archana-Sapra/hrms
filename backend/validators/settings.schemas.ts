/**
 * Validation schemas for settings and department management.
 *
 * These are PATCH-style partial updates: the controllers deep-merge each
 * section into the existing Settings document, so every field is optional.
 * Sections are `.strict()` so unknown keys are rejected rather than silently
 * merged into the document (markModified would otherwise persist junk).
 *
 * Cross-field invariants (start < end, minimum <= full day) are enforced here
 * because Mongoose validators only see one path at a time.
 */

import { z } from 'zod';
import { employeeIdSchema, nameSchema } from './common.schemas.js';
import {
  MIN_GEOFENCE_RADIUS_METERS,
  MAX_GEOFENCE_RADIUS_METERS,
} from '../models/OfficeLocation.model.js';

/** HH:MM, 24-hour. */
const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:MM 24-hour format');

/** 0 = Sunday .. 6 = Saturday */
const weekday = z.number().int().min(0).max(6);

const attendanceSection = z
  .object({
    lateThreshold: timeString.optional(),
    workStartTime: timeString.optional(),
    workEndTime: timeString.optional(),
    halfDayEndTime: timeString.optional(),
    minimumWorkHours: z.number().min(0).max(24).optional(),
    fullDayHours: z.number().min(0).max(24).optional(),
    workingDays: z.array(weekday).max(7).optional(),
    nonWorkingDays: z.array(weekday).max(7).optional(),
    saturdayWorkType: z.enum(['full', 'half']).optional(),
    saturdayHolidays: z.array(z.number().int().min(1).max(4)).max(4).optional(),
  })
  .strict()
  .refine(
    (a) =>
      a.workStartTime === undefined ||
      a.workEndTime === undefined ||
      a.workStartTime < a.workEndTime,
    { message: 'workStartTime must be before workEndTime', path: ['workEndTime'] }
  )
  .refine(
    (a) =>
      a.minimumWorkHours === undefined ||
      a.fullDayHours === undefined ||
      a.minimumWorkHours <= a.fullDayHours,
    { message: 'minimumWorkHours cannot exceed fullDayHours', path: ['minimumWorkHours'] }
  )
  .refine(
    (a) =>
      a.workingDays === undefined ||
      a.nonWorkingDays === undefined ||
      !a.workingDays.some((d) => a.nonWorkingDays!.includes(d)),
    { message: 'A day cannot be both working and non-working', path: ['nonWorkingDays'] }
  );

const notificationsSection = z
  .object({
    hrEmails: z.array(z.email('Invalid HR email address')).max(50).optional(),
    emailEnabled: z.boolean().optional(),
    pushEnabled: z.boolean().optional(),
    hrEmailTypes: z
      .object({
        leaveRequests: z.boolean().optional(),
        wfhRequests: z.boolean().optional(),
        regularizationRequests: z.boolean().optional(),
        helpRequests: z.boolean().optional(),
        employeeMilestones: z.boolean().optional(),
        expenseRequests: z.boolean().optional(),
      })
      .strict()
      .optional(),
    holidayReminderEnabled: z.boolean().optional(),
    holidayReminderDays: z.number().int().min(0).max(7).optional(),
    milestoneAlertsEnabled: z.boolean().optional(),
    milestoneTypes: z
      .object({
        threeMonths: z.boolean().optional(),
        sixMonths: z.boolean().optional(),
        oneYear: z.boolean().optional(),
      })
      .strict()
      .optional(),
    dailyHrAttendanceReport: z
      .object({
        enabled: z.boolean().optional(),
        sendTime: timeString.optional(),
        includeAbsentees: z.boolean().optional(),
        subjectLine: z.string().max(200).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const generalSection = z
  .object({
    locationSetting: z.enum(['na', 'optional', 'mandatory']).optional(),
    taskReportSetting: z.enum(['na', 'optional', 'mandatory']).optional(),
    geofence: z
      .object({
        enabled: z.boolean().optional(),
        enforceCheckIn: z.boolean().optional(),
        enforceCheckOut: z.boolean().optional(),
        // Bounds mirror the OfficeLocation model: this value seeds office
        // creation, so a wider range here would yield an unsaveable default.
        defaultRadius: z
          .number()
          .min(MIN_GEOFENCE_RADIUS_METERS)
          .max(MAX_GEOFENCE_RADIUS_METERS)
          .optional(),
        allowWFHBypass: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const requestRetentionSection = z
  .object({
    regularization: z
      .object({
        enabled: z.boolean().optional(),
        retentionMonths: z.union([
          z.literal(1),
          z.literal(2),
          z.literal(3),
          z.literal(6),
          z.literal(12),
        ]).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const updateGlobalSettingsSchema = z
  .object({
    attendance: attendanceSection.nullish(),
    notifications: notificationsSection.nullish(),
    general: generalSection.nullish(),
    requestRetention: requestRetentionSection.nullish(),
  })
  .refine(
    (data) => Boolean(data.attendance || data.notifications || data.general || data.requestRetention),
    { message: 'At least one settings section is required' }
  );

export const updateDepartmentSettingsSchema = z
  .object({
    attendance: attendanceSection.nullish(),
    general: generalSection.nullish(),
  })
  .refine(
    (data) => Boolean(data.attendance || data.general),
    { message: 'At least one settings section is required' }
  );

export const runRegularizationCleanupSchema = z.object({
  retentionMonths: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(6),
    z.literal(12),
  ]),
});

export const getEffectiveSettingsQuerySchema = z.object({
  department: z.string().trim().min(1).max(100).optional(),
});

export const createDepartmentSchema = z.object({
  name: nameSchema,
});

export const renameDepartmentSchema = z.object({
  newName: nameSchema,
});

export const assignEmployeeToDepartmentSchema = z.object({
  employeeId: employeeIdSchema,
});

export type GetEffectiveSettingsQuery = z.infer<typeof getEffectiveSettingsQuerySchema>;
export type RunRegularizationCleanupInput = z.infer<typeof runRegularizationCleanupSchema>;
export type UpdateGlobalSettingsInput = z.infer<typeof updateGlobalSettingsSchema>;
export type UpdateDepartmentSettingsInput = z.infer<typeof updateDepartmentSettingsSchema>;
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type RenameDepartmentInput = z.infer<typeof renameDepartmentSchema>;
export type AssignEmployeeToDepartmentInput = z.infer<typeof assignEmployeeToDepartmentSchema>;
