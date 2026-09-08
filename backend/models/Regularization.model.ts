/**
 * Regularization Request Model - TypeScript + Mongoose
 * Requests to regularize attendance (missed check-in/check-out)
 */

import mongoose, { Schema, type Document } from 'mongoose';

export type RegularizationStatus = 'pending' | 'approved' | 'rejected';

export interface IRegularizationDoc extends Document {
  employeeId: string;
  user: mongoose.Types.ObjectId;
  date: Date;
  requestedCheckIn?: Date;
  requestedCheckOut?: Date;
  reason: string;
  status: RegularizationStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewComment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const regularizationSchema = new Schema<IRegularizationDoc>(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      trim: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    requestedCheckIn: {
      type: Date,
    },
    requestedCheckOut: {
      type: Date,
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected'] as RegularizationStatus[],
        message: 'Status must be pending, approved, or rejected',
      },
      default: 'pending',
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewComment: {
      type: String,
      trim: true,
      maxlength: [500, 'Review comment cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Performance indexes for common queries
regularizationSchema.index({ employeeId: 1, status: 1 }); // Employee regularization queries
regularizationSchema.index({ status: 1, date: 1 }); // Status-based queries with date sorting
regularizationSchema.index({ employeeId: 1, date: 1 }); // Employee + date lookup
regularizationSchema.index({ date: 1 }); // Date range queries
regularizationSchema.index({ createdAt: 1 }); // Retention cleanup queries

const RegularizationRequest = mongoose.model<IRegularizationDoc>(
  'RegularizationRequest',
  regularizationSchema
);

export default RegularizationRequest;
