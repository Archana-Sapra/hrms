import type {
  CreateRegularizationInput,
  ReviewRegularizationInput,
  RequestListQuery,
  BulkRequestStatusInput,
} from '../validators/request.schemas.js';
import type { Response } from 'express';
import mongoose from 'mongoose';
import RegularizationRequest from '../models/Regularization.model.js';
import User from '../models/User.model.js';
import Employee from '../models/Employee.model.js';
import { DateTime } from 'luxon';
import { toIST, getISTNow } from '../utils/timezone.js';
import { applyRegularizationReview } from '../services/regularizationReviewService.js';
import NotificationService from '../services/notificationService.js';
import logger from '../utils/logger.js';
import { getValidatedQuery } from '../middlewares/zodValidation.middleware.js';
import { paramValue } from '../utils/helpers.js';
import type { IAuthRequest } from '../types/index.js';

export const requestRegularization = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { date, requestedCheckIn, requestedCheckOut, reason } = req.body as CreateRegularizationInput;

    const user = req.user;
    if (!user || !user.employeeId) {
      res.status(400).json({ message: 'You must be linked to an employee profile to request regularization.' });
      return;
    }

    const dateIST = toIST(date).startOf('day').toJSDate();

    let requestedCheckInIST: Date | undefined = undefined;
    let requestedCheckOutIST: Date | undefined = undefined;

    if (requestedCheckIn) {
      let parsedCheckIn: DateTime;
      if (requestedCheckIn.includes('T') || requestedCheckIn.includes(' ') || requestedCheckIn.length > 8) {
        parsedCheckIn = toIST(requestedCheckIn);
      } else {
        parsedCheckIn = toIST(date + ' ' + requestedCheckIn);
      }

      if (!parsedCheckIn.isValid) {
        res.status(400).json({
          message: `Invalid check-in time format: ${requestedCheckIn}`
        });
        return;
      }

      requestedCheckInIST = parsedCheckIn.toJSDate();
    }

    if (requestedCheckOut) {
      let parsedCheckOut: DateTime;
      if (requestedCheckOut.includes('T') || requestedCheckOut.includes(' ') || requestedCheckOut.length > 8) {
        parsedCheckOut = toIST(requestedCheckOut);
      } else {
        parsedCheckOut = toIST(date + ' ' + requestedCheckOut);
      }

      if (!parsedCheckOut.isValid) {
        res.status(400).json({
          message: `Invalid check-out time format: ${requestedCheckOut}`
        });
        return;
      }

      requestedCheckOutIST = parsedCheckOut.toJSDate();
    }

    const regularizationDateStr = toIST(date).toFormat('yyyy-MM-dd');

    if (requestedCheckInIST) {
      const checkInDateStr = toIST(requestedCheckInIST).toFormat('yyyy-MM-dd');
      if (checkInDateStr !== regularizationDateStr) {
        res.status(400).json({
          message: `Check-in time must be on the regularization date (${regularizationDateStr}). Got: ${checkInDateStr}`
        });
        return;
      }
    }

    if (requestedCheckOutIST) {
      const checkOutDateStr = toIST(requestedCheckOutIST).toFormat('yyyy-MM-dd');
      if (checkOutDateStr !== regularizationDateStr) {
        res.status(400).json({
          message: `Check-out time must be on the regularization date (${regularizationDateStr}). Got: ${checkOutDateStr}`
        });
        return;
      }
    }

    if (requestedCheckInIST && requestedCheckOutIST) {
      if (requestedCheckInIST >= requestedCheckOutIST) {
        res.status(400).json({
          message: 'Check-in time must be before check-out time'
        });
        return;
      }
    }

    const existing = await RegularizationRequest.findOne({ employeeId: user.employeeId, date: dateIST, status: 'pending' });
    if (existing) {
      existing.requestedCheckIn = requestedCheckInIST;
      existing.requestedCheckOut = requestedCheckOutIST;
      existing.reason = reason;
      await existing.save();
      res.status(200).json({ success: true, message: 'Regularization request updated.', reg: existing });
      return;
    }

    const reg = await RegularizationRequest.create({
      employeeId: user.employeeId,
      user: user._id,
      date: dateIST,
      requestedCheckIn: requestedCheckInIST,
      requestedCheckOut: requestedCheckOutIST,
      reason
    });

    NotificationService.notifyHR('regularization_request', {
      employee: user.name,
      employeeId: user.employeeId,
      date,
      checkIn: requestedCheckIn || 'Not specified',
      checkOut: requestedCheckOut || 'Not specified',
      reason
    }).catch((error: unknown) => {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error({ err }, 'Failed to send regularization request notification');
    });

    res.status(201).json({ success: true, message: 'Regularization request submitted.', reg });
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err: error }, 'Failed to submit regularization request');
    res.status(500).json({ message: 'Failed to submit regularization request', error: error.message });
  }
};

export const getMyRegularizations = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user || !user.employeeId) {
      res.status(400).json({ message: 'You must be linked to an employee profile.' });
      return;
    }

    const regs = await RegularizationRequest.find({ employeeId: user.employeeId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, regs });
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err: error }, 'Failed to fetch regularization requests');
    res.status(500).json({ message: 'Failed to fetch regularization requests', error: error.message });
  }
};

export const getAllRegularizations = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== 'hr' && req.user.role !== 'admin')) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    const { startDate, endDate, status, page, limit } = getValidatedQuery<RequestListQuery>(req);
    const filter: { status?: string; createdAt?: { $gte?: Date; $lte?: Date } } = {};
    if (status) {
      filter.status = status;
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Counts ignore the status filter so the UI can badge every status at once.
    const countFilter = { ...filter };
    delete countFilter.status;

    const [regs, total, statusCounts] = await Promise.all([
      RegularizationRequest.find(filter)
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      RegularizationRequest.countDocuments(filter),
      RegularizationRequest.aggregate<{ _id: string; count: number }>([
        { $match: countFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    // Resolve employee names from Employee model (more reliable than User.name)
    const employeeIds = [...new Set(regs.map(r => r.employeeId).filter(Boolean))];
    const employees = await Employee.find({ employeeId: { $in: employeeIds } }).select('employeeId firstName lastName').lean();
    const employeeMap = new Map(employees.map(e => [`${e.employeeId}`, `${e.firstName} ${e.lastName}`]));

    const regsWithNames = regs.map(reg => ({
      ...reg,
      employeeName: employeeMap.get(reg.employeeId) || (reg.user as { name?: string } | undefined)?.name || 'Unknown User',
    }));

    res.json({
      success: true,
      regs: regsWithNames,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      statusCounts: Object.fromEntries(statusCounts.map((s) => [s._id, s.count])),
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err: error }, 'Failed to fetch all regularization requests');
    res.status(500).json({ message: 'Failed to fetch all regularization requests', error: error.message });
  }
};

export const reviewRegularization = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== 'hr' && req.user.role !== 'admin')) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    const id = paramValue(req.params.id);
    const { status, reviewComment } = req.body as ReviewRegularizationInput;

    if (!id) {
      res.status(400).json({ message: 'Request ID is required' });
      return;
    }

    const outcome = await applyRegularizationReview({
      id,
      status,
      reviewComment,
      reviewerId: req.user._id,
    });

    if (!outcome.ok) {
      const notFound = outcome.reason === 'Request not found' || outcome.reason.startsWith('Employee not found');
      res.status(notFound ? 404 : 400).json({ message: outcome.reason });
      return;
    }

    res.json({ success: true, message: `Request ${status}` });
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err: error, requestId: req.params.id }, 'Error in reviewRegularization');
    res.status(500).json({ message: 'Failed to review request', error: error.message });
  }
};

export const bulkReviewRegularizations = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== 'hr' && req.user.role !== 'admin')) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    const { ids, status, reviewComment } = req.body as BulkRequestStatusInput;

    const failures: { id: string; reason: string }[] = [];
    let updatedCount = 0;

    // Sequential: each approval performs several dependent writes plus cache
    // invalidation, and a wide parallel fan-out exhausts the connection pool.
    for (const id of ids) {
      try {
        const outcome = await applyRegularizationReview({
          id,
          status,
          reviewComment,
          reviewerId: req.user._id,
        });
        if (outcome.ok) updatedCount += 1;
        else failures.push({ id: outcome.id, reason: outcome.reason });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        logger.error({ err: error, id }, 'Bulk regularization item failed');
        failures.push({ id, reason: error.message });
      }
    }

    logger.info(
      { requested: ids.length, updatedCount, failedCount: failures.length },
      'Bulk regularization review complete'
    );

    res.json({ success: true, updatedCount, failedCount: failures.length, failures });
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err: error }, 'Error in bulkReviewRegularizations');
    res.status(500).json({ message: 'Failed to review requests', error: error.message });
  }
};
