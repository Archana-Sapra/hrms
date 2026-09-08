import cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import Holiday from '../models/Holiday.model.js';
import Employee from '../models/Employee.model.js';
import Attendance from '../models/Attendance.model.js';
import Settings from '../models/Settings.model.js';
import RegularizationRequest from '../models/Regularization.model.js';
import NotificationService from './notificationService.js';
import EmailService from './emailService.js';
import { getISTNow, toIST } from '../utils/timezone.js';
import logger from '../utils/logger.js';
import type { DateTime } from 'luxon';

class SchedulerService {
  private holidayReminderJob: ScheduledTask | null = null;
  private milestoneJob: ScheduledTask | null = null;
  private birthdayJob: ScheduledTask | null = null;
  private dailyHrAttendanceReportJob: ScheduledTask | null = null;
  private regularizationCleanupJob: ScheduledTask | null = null;
  private isRunning: boolean = false;

  constructor() {
    this.holidayReminderJob = null;
    this.milestoneJob = null;
    this.birthdayJob = null;
    this.dailyHrAttendanceReportJob = null;
    this.regularizationCleanupJob = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;

    logger.info('Starting scheduler service...');

    // Holiday reminder job - runs daily at 6 PM
    this.holidayReminderJob = cron.schedule('0 18 * * *', async () => {
      await this.checkHolidayReminders();
    }, {
      timezone: 'Asia/Kolkata'
    });

    // Employee milestone job - runs daily at 9 AM
    this.milestoneJob = cron.schedule('0 9 * * *', async () => {
      await this.checkEmployeeMilestones();
    }, {
      timezone: 'Asia/Kolkata'
    });

    // Birthday wishes job - runs daily at 8 AM
    this.birthdayJob = cron.schedule('0 8 * * *', async () => {
      await this.checkBirthdayWishes();
    }, {
      timezone: 'Asia/Kolkata'
    });

    // Regularization retention cleanup job - runs daily at 2 AM (off-peak)
    this.regularizationCleanupJob = cron.schedule('0 2 * * *', async () => {
      await this.cleanupOldRegularizations();
    }, {
      timezone: 'Asia/Kolkata'
    });

    this.isRunning = true;
    logger.info('Scheduler service started successfully');
  }

  stop() {
    if (!this.isRunning) return;

    if (this.holidayReminderJob) {
      this.holidayReminderJob.stop();
      this.holidayReminderJob = null;
    }

    if (this.milestoneJob) {
      this.milestoneJob.stop();
      this.milestoneJob = null;
    }

    if (this.birthdayJob) {
      this.birthdayJob.stop();
      this.birthdayJob = null;
    }

    if (this.dailyHrAttendanceReportJob) {
      this.dailyHrAttendanceReportJob.stop();
      this.dailyHrAttendanceReportJob = null;
    }

    if (this.regularizationCleanupJob) {
      this.regularizationCleanupJob.stop();
      this.regularizationCleanupJob = null;
    }

    this.isRunning = false;
    logger.info('Scheduler service stopped');
  }

  async checkHolidayReminders() {
    try {
      const nowIST = getISTNow();
      logger.info(`[Scheduler] Holiday reminder check started | Time: ${nowIST.toFormat('yyyy-MM-dd HH:mm:ss ZZ')}`);

      const settings = await Settings.getGlobalSettings();
      if (!settings.notifications.holidayReminderEnabled) {
        logger.info('[Scheduler] Holiday reminders disabled');
        return;
      }

      const reminderDays = settings.notifications.holidayReminderDays;

      // Use IST timezone utilities
      const reminderDateIST = nowIST.plus({ days: reminderDays }).startOf('day');
      const nextDayIST = reminderDateIST.plus({ days: 1 });

      // Convert to JavaScript Date for MongoDB query
      const reminderDate = reminderDateIST.toJSDate();
      const nextDay = nextDayIST.toJSDate();

      logger.info(`[Scheduler] Query: date >= ${reminderDate.toISOString()} AND date < ${nextDay.toISOString()} | reminderDays: ${reminderDays}`);

      const holidays = await Holiday.find({
        date: {
          $gte: reminderDate,
          $lt: nextDay
        }
      });

      logger.info(`[Scheduler] Found ${holidays.length} holiday(s) for ${reminderDateIST.toFormat('yyyy-MM-dd')}`);

      for (const holiday of holidays) {
        const holidayDateIST = toIST(holiday.date);
        const formattedDate = holidayDateIST.toFormat('cccc, MMMM d, yyyy');

        logger.info(`[Scheduler] Sending: ${holiday.name} | Date: ${holiday.date.toISOString()} | Formatted: ${formattedDate}`);

        await NotificationService.notifyAllEmployees('holiday_reminder', {
          title: holiday.name,
          date: formattedDate,
          isOptional: holiday.type === 'optional',
          description: holiday.description
        });
      }

      if (holidays.length > 0) {
        logger.info(`[Scheduler] Holiday reminders sent: ${holidays.length}`);
      }
    } catch (error: any) {
      logger.error({ err: error }, '[Scheduler] Holiday reminder error');
    }
  }

  async checkEmployeeMilestones() {
    try {
      logger.info('Checking for employee milestones...');

      const settings = await Settings.getGlobalSettings();
      if (!settings.notifications.milestoneAlertsEnabled) {
        logger.info('Milestone alerts are disabled');
        return;
      }

      const today = getISTNow().startOf('day').toJSDate();

      const employees = await Employee.find({ isActive: true });
      let milestonesFound = 0;

      for (const employee of employees) {
        const joiningDate = toIST(employee.joiningDate).startOf('day');
        const todayIST = toIST(today).startOf('day');

        // Calculate months between joining date and today
        const monthsDiff = todayIST.year * 12 + todayIST.month - (joiningDate.year * 12 + joiningDate.month);

        let milestoneType = null;

        // Check for exact milestone matches using calendar months and same day
        const isSameDay = todayIST.day === joiningDate.day;

        if (isSameDay) {
          if (settings.notifications.milestoneTypes.threeMonths && monthsDiff === 3) {
            milestoneType = '3 months';
          } else if (settings.notifications.milestoneTypes.sixMonths && monthsDiff === 6) {
            milestoneType = '6 months';
          } else if (settings.notifications.milestoneTypes.oneYear && monthsDiff === 12) {
            milestoneType = '1 year';
          }
        }

        if (milestoneType) {
          logger.info(`Employee milestone: ${employee.firstName} ${employee.lastName} - ${milestoneType}`);

          await NotificationService.notifyHR('employee_milestone', {
            employee: `${employee.firstName} ${employee.lastName}`,
            employeeId: employee.employeeId,
            milestone: milestoneType,
            joiningDate: joiningDate.toFormat('yyyy-MM-dd'),
            department: employee.department,
            position: employee.position
          });

          milestonesFound++;
        }
      }

      if (milestonesFound > 0) {
        logger.info(`Found ${milestonesFound} employee milestone(s)`);
      }
    } catch (error: any) {
      logger.error({ err: error }, 'Error checking employee milestones');
    }
  }

  async checkBirthdayWishes() {
    try {
      logger.info('Checking for birthday wishes to send...');

      const settings = await Settings.getGlobalSettings();
      if (!settings.notifications.emailEnabled) {
        logger.info('Email notifications are disabled - skipping birthday wishes');
        return;
      }

      const today = getISTNow().toJSDate(); // Get proper IST date
      const employees = await Employee.find({
        isActive: true,
        dateOfBirth: { $exists: true, $ne: null }
      });

      let birthdayCount = 0;

      for (const employee of employees) {
        const birthday = toIST(employee.dateOfBirth);
        const todayIST = toIST(today);

        // Check if today matches birthday (month and day) in IST
        if (birthday.month === todayIST.month &&
            birthday.day === todayIST.day) {

          logger.info(`Sending birthday wishes to: ${employee.firstName} ${employee.lastName}`);

          const age = todayIST.year - birthday.year;

          await NotificationService.notifyEmployee(employee.employeeId, 'birthday_wish', {
            employee: `${employee.firstName} ${employee.lastName}`,
            age: age,
            department: employee.department,
            employeeId: employee.employeeId
          });

          birthdayCount++;
        }
      }

      if (birthdayCount > 0) {
        logger.info(`Sent ${birthdayCount} birthday wish email(s)`);
      } else {
        logger.info('No birthdays today');
      }
    } catch (error: any) {
      logger.error({ err: error }, 'Error checking birthday wishes');
    }
  }

  async cleanupOldRegularizations() {
    try {
      const settings = await Settings.getGlobalSettings();
      const retentionConfig = settings.requestRetention.regularization;

      if (!retentionConfig.enabled) {
        logger.info('[Scheduler] Regularization retention cleanup is disabled');
        return;
      }

      const result = await this.deleteOldRegularizations(retentionConfig.retentionMonths);

      logger.info(
        `[Scheduler] Regularization retention cleanup: deleted ${result.deletedCount} request(s) older than ${retentionConfig.retentionMonths} month(s)`
      );
    } catch (error: any) {
      logger.error({ err: error }, '[Scheduler] Error in regularization retention cleanup');
    }
  }

  /**
   * Shared by the scheduled job and the manual "Run Now" trigger, which
   * deletes by whatever retention period is passed in - it does not consult
   * the `enabled` flag, so it works even while auto-delete is turned off.
   */
  async deleteOldRegularizations(retentionMonths: 1 | 2 | 3 | 6 | 12): Promise<{ deletedCount?: number }> {
    const cutoff = getISTNow().minus({ months: retentionMonths }).toJSDate();
    return RegularizationRequest.deleteMany({ createdAt: { $lt: cutoff } });
  }

  // Manual trigger methods for testing
  async triggerHolidayReminder() {
    logger.info('Manually triggering holiday reminder check...');
    await this.checkHolidayReminders();
  }

  async triggerRegularizationCleanup(retentionMonths: 1 | 2 | 3 | 6 | 12) {
    logger.info(`Manually triggering regularization retention cleanup (${retentionMonths} month(s))...`);
    const result = await this.deleteOldRegularizations(retentionMonths);
    logger.info(`[Scheduler] Manual regularization cleanup: deleted ${result.deletedCount} request(s)`);
    return result.deletedCount;
  }

  async triggerMilestoneCheck() {
    logger.info('Manually triggering milestone check...');
    await this.checkEmployeeMilestones();
  }

  async triggerBirthdayCheck() {
    logger.info('Manually triggering birthday check...');
    await this.checkBirthdayWishes();
  }

  async scheduleDailyHrAttendanceReport() {
    try {
      // Stop existing job if running
      if (this.dailyHrAttendanceReportJob) {
        this.dailyHrAttendanceReportJob.stop();
        this.dailyHrAttendanceReportJob = null;
      }

      // Get settings
      const settings = await Settings.getGlobalSettings();

      if (!settings.notifications.dailyHrAttendanceReport.enabled) {
        logger.info('[Scheduler] Daily HR attendance report is disabled');
        return;
      }

      const sendTime = settings.notifications.dailyHrAttendanceReport.sendTime; // e.g., "19:00"
      const [hour, minute] = sendTime.split(':');

      // Create cron expression: "minute hour * * *"
      const cronExpression = `${minute} ${hour} * * *`;

      this.dailyHrAttendanceReportJob = cron.schedule(
        cronExpression,
        async () => {
          logger.info(`[Scheduler] Running daily HR attendance report at ${sendTime} IST`);
          await this.sendDailyHrAttendanceReport();
        },
        {
          timezone: 'Asia/Kolkata'
        }
      );

      logger.info(`[Scheduler] Daily HR attendance report scheduled at ${sendTime} IST`);
    } catch (error: any) {
      logger.error({ err: error }, '[Scheduler] Failed to schedule daily HR attendance report');
    }
  }

  async sendDailyHrAttendanceReport() {
    try {
      const settings = await Settings.getGlobalSettings();

      if (!settings.notifications.emailEnabled) {
        logger.info('[Scheduler] Email notifications are disabled');
        return;
      }

      const hrEmails = settings.notifications.hrEmails;
      if (!hrEmails || hrEmails.length === 0) {
        logger.info('[Scheduler] No HR emails configured');
        return;
      }

      // Get today's date in IST
      const todayIST = getISTNow().startOf('day');
      const today = todayIST.toJSDate();
      const reportDateFormatted = todayIST.toFormat('MMMM d, yyyy');

      // Check if today is a non-working day (weekend based on settings)
      // Use Luxon's weekday property to get day of week in IST timezone
      const dayOfWeek = todayIST.weekday; // 1=Monday, 7=Sunday in Luxon
      const legacyDayOfWeek = dayOfWeek === 7 ? 0 : dayOfWeek; // Convert to 0=Sunday, 1=Monday, etc.
      if (settings.attendance.nonWorkingDays.includes(legacyDayOfWeek)) {
        logger.info(`[Scheduler] Skipping daily HR attendance report - today is a non-working day (day ${legacyDayOfWeek})`);
        return;
      }

      // Check if today is a holiday (only check active public holidays)
      const todayHoliday = await Holiday.findOne({
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        },
        isActive: true,
        type: 'public'
      });

      if (todayHoliday) {
        logger.info(`[Scheduler] Skipping daily HR attendance report - today is a holiday: ${todayHoliday.name}`);
        return;
      }

      // Fetch all active employees
      const employees = await Employee.find({ isActive: true })
        .select('firstName lastName officeAddress')
        .lean();

      // Fetch all attendance records for today
      const attendanceRecords = await Attendance.find({ date: today })
        .lean();

      // Create attendance map: employeeId -> attendance record
      const attendanceMap = new Map();
      attendanceRecords.forEach(record => {
        attendanceMap.set(record.employee.toString(), record);
      });

      // Group by office
      interface OfficeGroup {
        officeAddress: string;
        presentEmployees: Array<{ name: string; checkIn: string | null; checkOut: string | null }>;
        absentEmployees: Array<{ name: string }>;
      }
      const officeGroups: Record<string, OfficeGroup> = {};

      for (const employee of employees) {
        const officeAddress = employee.officeAddress || 'Unassigned';

        if (!officeGroups[officeAddress]) {
          officeGroups[officeAddress] = {
            officeAddress: officeAddress,
            presentEmployees: [],
            absentEmployees: []
          };
        }

        const group = officeGroups[officeAddress];
        const attendance = attendanceMap.get(employee._id.toString());
        const employeeName = `${employee.firstName} ${employee.lastName}`;

        if (attendance && attendance.status !== 'absent' && attendance.checkIn) {
          // Employee checked in
          group.presentEmployees.push({
            name: employeeName,
            checkIn: toIST(attendance.checkIn).toFormat('hh:mm a'),
            checkOut: attendance.checkOut ? toIST(attendance.checkOut).toFormat('hh:mm a') : null
          });
        } else if (settings.notifications.dailyHrAttendanceReport.includeAbsentees) {
          // Employee absent (no record, status is absent, or no check-in)
          group.absentEmployees.push({
            name: employeeName
          });
        }
      }

      // Sort employees by name within each group
      Object.values(officeGroups).forEach((group: OfficeGroup) => {
        group.presentEmployees.sort((a, b) => a.name.localeCompare(b.name));
        group.absentEmployees.sort((a, b) => a.name.localeCompare(b.name));
      });

      // Convert to array and sort by office name
      const officeGroupsArray = Object.values(officeGroups)
        .sort((a: OfficeGroup, b: OfficeGroup) => {
          if (a.officeAddress === 'Unassigned') return 1;
          if (b.officeAddress === 'Unassigned') return -1;
          return a.officeAddress.localeCompare(b.officeAddress);
        });

      // Calculate totals
      let totalPresent = 0;
      let totalAbsent = 0;
      officeGroupsArray.forEach((group: OfficeGroup) => {
        totalPresent += group.presentEmployees.length;
        totalAbsent += group.absentEmployees.length;
      });

      // Prepare email data
      const subjectLine = settings.notifications.dailyHrAttendanceReport.subjectLine.replace('{date}', reportDateFormatted);

      const emailData = {
        reportDateFormatted,
        officeGroups: officeGroupsArray,
        totalEmployees: employees.length,
        totalPresent,
        totalAbsent,
        generatedAt: getISTNow().toFormat('hh:mm a'),
        subjectLine
      };

      // Get email template
      const { subject, htmlContent } = EmailService.getTemplate('daily_hr_attendance_report', emailData);

      // Send to all HR emails
      let sentCount = 0;
      let failedCount = 0;

      for (const hrEmail of hrEmails) {
        try {
          await EmailService.send(hrEmail, subject, htmlContent);
          sentCount++;
          logger.info(`[Scheduler] Sent daily HR attendance report to ${hrEmail}`);
        } catch (error: any) {
          logger.error({ err: error }, `[Scheduler] Failed to send report to ${hrEmail}`);
          failedCount++;
        }

        // Rate limiting: 1000ms between emails (Resend limit: 2 req/sec)
        if (sentCount + failedCount < hrEmails.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      logger.info(`[Scheduler] Daily HR attendance report sent: ${sentCount} successful, ${failedCount} failed`);
    } catch (error: any) {
      logger.error({ err: error }, '[Scheduler] Error in sendDailyHrAttendanceReport');
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      holidayReminderActive: this.holidayReminderJob ? this.holidayReminderJob.getStatus() === 'scheduled' : false,
      milestoneJobActive: this.milestoneJob ? this.milestoneJob.getStatus() === 'scheduled' : false,
      birthdayJobActive: this.birthdayJob ? this.birthdayJob.getStatus() === 'scheduled' : false,
      dailyHrAttendanceReportActive: this.dailyHrAttendanceReportJob ? this.dailyHrAttendanceReportJob.getStatus() === 'scheduled' : false,
      regularizationCleanupActive: this.regularizationCleanupJob ? this.regularizationCleanupJob.getStatus() === 'scheduled' : false
    };
  }
}

export default new SchedulerService();