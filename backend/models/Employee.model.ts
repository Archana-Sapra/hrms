/**
 * Employee Model - TypeScript + Mongoose
 * Core employee HR data with comprehensive validation
 */

import mongoose, { Schema, type Model } from 'mongoose';
import type {
  IEmployee,
  Gender,
  MaritalStatus,
  OfficeAddress,
  CompanyName,
  PaymentMode,
  EmploymentType,
} from '../types/index.js';

const employeeSchema = new Schema<IEmployee>(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      trim: true,
      uppercase: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [2, 'First name must be at least 2 characters'],
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [2, 'Last name must be at least 2 characters'],
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    gender: {
      type: String,
      enum: {
        values: ['male', 'female', 'other'] as Gender[],
        message: 'Gender must be one of: male, female, other',
      },
      required: [true, 'Gender is required'],
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
      validate: {
        validator: function (value: Date): boolean {
          const age = (Date.now() - value.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
          return age >= 18 && age <= 100;
        },
        message: 'Employee must be between 18 and 100 years old',
      },
    },
    maritalStatus: {
      type: String,
      enum: {
        values: ['single', 'married', 'divorced'] as MaritalStatus[],
        message: 'Marital status must be one of: single, married, divorced',
      },
      required: [true, 'Marital status is required'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      validate: {
        validator: function (v: string): boolean {
          return /^[0-9]{10}$/.test(v);
        },
        message: 'Phone number must be exactly 10 digits',
      },
    },
    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters'],
    },
    aadhaarNumber: {
      type: String,
      required: [true, 'Aadhaar number is required'],
      trim: true,
      validate: {
        validator: function (v: string): boolean {
          return /^[0-9]{12}$/.test(v);
        },
        message: 'Aadhaar number must be exactly 12 digits',
      },
    },
    panNumber: {
      type: String,
      required: [true, 'PAN number is required'],
      uppercase: true,
      trim: true,
      minlength: [10, 'PAN number must be exactly 10 characters'],
      maxlength: [10, 'PAN number must be exactly 10 characters'],
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN number format'],
    },
    fatherName: {
      type: String,
      trim: true,
      maxlength: [100, 'Father name cannot exceed 100 characters'],
    },
    motherName: {
      type: String,
      trim: true,
      maxlength: [100, 'Mother name cannot exceed 100 characters'],
    },
    fatherPhone: {
      type: String,
      trim: true,
      validate: {
        validator: function (v: string | undefined): boolean {
          return !v || /^[0-9]{10}$/.test(v);
        },
        message: 'Father phone number must be exactly 10 digits',
      },
    },
    motherPhone: {
      type: String,
      trim: true,
      validate: {
        validator: function (v: string | undefined): boolean {
          return !v || /^[0-9]{10}$/.test(v);
        },
        message: 'Mother phone number must be exactly 10 digits',
      },
    },
    officeAddress: {
      type: String,
      enum: {
        values: ['SanikColony', 'Indore', 'N.F.C.','Offsite'] as OfficeAddress[],
        message: 'Office address must be one of: SanikColony, Indore, N.F.C., Offsite',
      },
      required: [true, 'Office address is required'],
    },
    companyName: {
      type: String,
      enum: {
        values: [
          'Indra Financial Services Limited',
          'COSMOS INVESTIFIASSET MANAGEMENT LLP',
          'SENSIBLE TAX ADVISORY LLP',
        ] as CompanyName[],
        message: 'Invalid company name',
      },
      required: [true, 'Company name is required'],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      maxlength: [100, 'Department name cannot exceed 100 characters'],
    },
    position: {
      type: String,
      required: [true, 'Position is required'],
      trim: true,
      maxlength: [100, 'Position cannot exceed 100 characters'],
    },
    paymentMode: {
      type: String,
      enum: {
        values: ['Bank Transfer', 'Cheque', 'Cash'] as PaymentMode[],
        message: 'Payment mode must be one of: Bank Transfer, Cheque, Cash',
      },
      required: [true, 'Payment mode is required'],
    },
    bankName: {
      type: String,
      required: [true, 'Bank name is required'],
      trim: true,
      maxlength: [100, 'Bank name cannot exceed 100 characters'],
    },
    bankAccountNumber: {
      type: String,
      required: [true, 'Bank account number is required'],
      trim: true,
      minlength: [8, 'Bank account number must be at least 8 characters'],
      maxlength: [20, 'Bank account number cannot exceed 20 characters'],
    },
    bankIFSCCode: {
      type: String,
      required: [true, 'Bank IFSC code is required'],
      uppercase: true,
      trim: true,
      minlength: [11, 'IFSC code must be exactly 11 characters'],
      maxlength: [11, 'IFSC code must be exactly 11 characters'],
      match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format'],
    },
    employmentType: {
      type: String,
      enum: {
        values: ['fulltime', 'intern', 'remote'] as EmploymentType[],
        message: 'Employment type must be one of: fulltime, intern, remote',
      },
      required: [true, 'Employment type is required'],
    },
    reportingSupervisor: {
      type: String,
      required: [true, 'Reporting supervisor is required'],
      trim: true,
      maxlength: [100, 'Reporting supervisor name cannot exceed 100 characters'],
    },
    joiningDate: {
      type: Date,
      required: [true, 'Joining date is required'],
      validate: {
        validator: function (value: Date): boolean {
          return value <= new Date();
        },
        message: 'Joining date cannot be in the future',
      },
    },
    emergencyContactNumber: {
      type: String,
      required: [true, 'Emergency contact number is required'],
      trim: true,
      validate: {
        validator: function (v: string): boolean {
          return /^[0-9]{10}$/.test(v);
        },
        message: 'Emergency contact number must be exactly 10 digits',
      },
    },
    emergencyContactName: {
      type: String,
      required: [true, 'Emergency contact name is required'],
      trim: true,
      maxlength: [100, 'Emergency contact name cannot exceed 100 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    profilePicture: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
    toObject: { virtuals: true },
  }
);

// Virtual for full name
employeeSchema.virtual('fullName').get(function (this: IEmployee) {
  return `${this.firstName} ${this.lastName}`;
});

// Indexes for performance optimization
employeeSchema.index({ employeeId: 1 }, { unique: true });
employeeSchema.index({ email: 1 }, { unique: true });
employeeSchema.index({ phone: 1 }, { unique: true });
employeeSchema.index({ aadhaarNumber: 1 }, { unique: true });
employeeSchema.index({ panNumber: 1 }, { unique: true });
employeeSchema.index({ isActive: 1, firstName: 1, lastName: 1 });
employeeSchema.index({ isActive: 1, department: 1 });
employeeSchema.index({ joiningDate: 1 });
employeeSchema.index({ companyName: 1, isActive: 1 });

/**
 * Static method: Find active employees
 */
employeeSchema.statics.findActive = function () {
  return this.find({ isActive: true }).sort({ firstName: 1, lastName: 1 });
};

/**
 * Static method: Find by employee ID
 */
employeeSchema.statics.findByEmployeeId = function (employeeId: string) {
  return this.findOne({ employeeId: employeeId.toUpperCase() });
};

/**
 * Static method: Find by department
 */
employeeSchema.statics.findByDepartment = function (department: string) {
  return this.find({ department, isActive: true });
};

/**
 * Instance method: Get age
 */
employeeSchema.methods.getAge = function (this: IEmployee): number {
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

/**
 * Instance method: Get tenure in months
 */
employeeSchema.methods.getTenure = function (this: IEmployee): number {
  const today = new Date();
  const joiningDate = new Date(this.joiningDate);
  const months =
    (today.getFullYear() - joiningDate.getFullYear()) * 12 +
    (today.getMonth() - joiningDate.getMonth());
  return Math.max(0, months);
};

// Extend IEmployee interface with custom methods
declare module '../types/index.js' {
  interface IEmployee {
    fullName: string;
    getAge(): number;
    getTenure(): number;
  }
}

// Extend model with static methods
interface IEmployeeModel extends Model<IEmployee> {
  findActive(): Promise<IEmployee[]>;
  findByEmployeeId(employeeId: string): Promise<IEmployee | null>;
  findByDepartment(department: string): Promise<IEmployee[]>;
}

const Employee = mongoose.model<IEmployee, IEmployeeModel>('Employee', employeeSchema);

export default Employee;
