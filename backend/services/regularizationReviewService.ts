import type mongoose from 'mongoose';
import RegularizationRequest from '../models/Regularization.model.js';
import Attendance from '../models/Attendance.model.js';
import Employee from '../models/Employee.model.js';
import { getISTDayBoundaries } from '../utils/timezone.js';
import { invalidateAttendanceCache, invalidateDashboardCache } from '../utils/cacheInvalidation.js';
import { AttendanceBusinessService } from './attendance/AttendanceBusinessService.js';
import NotificationService from '../services/notificationService.js';
import logger from '../utils/logger.js';
import type { RegularizationStatus } from '../types/index.js';

export type RegReviewDecision = 'approved' | 'rejected';

export type RegReviewOutcome =
  | { ok: true; id: string; status: RegReviewDecision }
  | { ok: false; id: string; reason: string };

interface ApplyRegularizationReviewArgs {
  id: string;
  status: RegReviewDecision;
  reviewComment?: string | null;
  reviewerId: mongoose.Types.ObjectId;
}

/**
 * Applies one regularization decision, including the attendance side effects
 * (approving writes an Attendance record) — which is why bulk cannot be an
 * `updateMany`. Business-rule failures return `ok: false` rather than throwing,
 * so a bulk caller can skip the bad item and finish the batch.
 */
export async function applyRegularizationReview({
  id,
  status,
  reviewComment,
  reviewerId,
}: ApplyRegularizationReviewArgs): Promise<RegReviewOutcome> {
  const reg = await RegularizationRequest.findById(id);
  if (!reg) {
    return { ok: false, id, reason: 'Request not found' };
  }

  if (reg.status !== 'pending') {
    return { ok: false, id, reason: 'Request already reviewed' };
  }

  const checkInTime = reg.requestedCheckIn;
  const checkOutTime = reg.requestedCheckOut;

  // Everything that can reject an approval is checked before the request is
  // marked approved. Saving first would leave a request approved with no
  // attendance record behind it, which is unrecoverable through the UI.
  let employeeDoc = null;
  let existingAttendance = null;
  let dayStart = null;

  if (status === 'approved') {
    employeeDoc = await Employee.findOne({ employeeId: reg.employeeId });
    if (!employeeDoc) {
      logger.error({ employeeId: reg.employeeId }, 'Employee not found for regularization');
      return { ok: false, id, reason: 'Employee not found for regularization' };
    }

    if (!checkInTime && !checkOutTime) {
      return { ok: false, id, reason: 'At least check-in or check-out time must be provided' };
    }

    if (checkInTime && checkOutTime && checkInTime >= checkOutTime) {
      return { ok: false, id, reason: 'Check-in time must be before check-out time' };
    }

    const { startOfDay, endOfDay } = getISTDayBoundaries(reg.date);
    dayStart = startOfDay;

    existingAttendance = await Attendance.findOne({
      employee: employeeDoc._id,
      date: {
        $gte: startOfDay.toJSDate(),
        $lte: endOfDay.toJSDate(),
      },
    });

    if (!existingAttendance && !checkInTime) {
      return {
        ok: false,
        id,
        reason: 'Check-in time is required when no attendance record exists for the date',
      };
    }
  }

  reg.status = status as RegularizationStatus;
  reg.reviewedBy = reviewerId;
  reg.reviewComment = reviewComment || '';
  await reg.save();

  if (status === 'approved' && employeeDoc && dayStart) {
    logger.info({ id, employeeId: reg.employeeId, date: reg.date }, 'Processing regularization approval');

    let att = existingAttendance;

    if (!att) {
      att = await Attendance.create({
        employee: employeeDoc._id,
        employeeName: `${employeeDoc.firstName} ${employeeDoc.lastName}`,
        date: dayStart.toJSDate(),
        checkIn: checkInTime,
        checkOut: checkOutTime,
        status: 'present' as const,
        comments: 'Regularized by HR/Admin',
        reason: 'Regularized by HR/Admin',
      });
      logger.info({ id: att._id }, 'Created attendance record for regularization');
    } else {
      if (checkInTime) att.checkIn = checkInTime;
      if (checkOutTime) att.checkOut = checkOutTime;

      att.reason = 'Regularized by HR/Admin';
      att.comments = 'Regularized by HR/Admin';

      if (!att.employeeName) {
        att.employeeName = `${employeeDoc.firstName} ${employeeDoc.lastName}`;
      }

      await att.save();
      logger.info({ id: att._id }, 'Updated attendance record for regularization');
    }

    if (att.checkIn && att.checkOut) {
      const statusResult = await AttendanceBusinessService.calculateFinalStatus(att.checkIn, att.checkOut);
      att.status = statusResult.status;
      att.workHours = statusResult.workHours;
      await att.save();
    } else if (att.checkIn && !att.checkOut) {
      const statusResult = await AttendanceBusinessService.determineAttendanceStatus(att.checkIn, null);
      att.status = statusResult.status;
      await att.save();
    }

    // A stale cache must not fail an otherwise-applied decision.
    try {
      invalidateAttendanceCache(employeeDoc.employeeId);
      invalidateDashboardCache();
    } catch (cacheError) {
      const err = cacheError instanceof Error ? cacheError : new Error('Unknown error');
      logger.error({ err }, 'Error invalidating cache (non-critical)');
    }
  }

  if (reg.employeeId) {
    NotificationService.notifyEmployee(reg.employeeId, 'regularization_status_update', {
      status,
      date: reg.date ? reg.date.toDateString() : 'Unknown date',
      checkIn: reg.requestedCheckIn ? reg.requestedCheckIn.toLocaleString() : 'Not specified',
      checkOut: reg.requestedCheckOut ? reg.requestedCheckOut.toLocaleString() : 'Not specified',
      reason: reg.reason || 'No reason provided',
      comment: reviewComment || 'No comment',
    }).catch((error: unknown) => {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error({ err }, 'Failed to send regularization status notification');
    });
  }

  return { ok: true, id, status };
}
