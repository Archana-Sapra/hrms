import { z } from 'zod';
import { differenceInYears } from 'date-fns';

/**
 * Employee Validation Schemas using Zod
 *
 * These schemas provide client-side validation for employee data
 * to ensure data integrity before sending to the backend.
 */

/**
 * Allow "" (field cleared or never filled) alongside a valid value.
 *
 * `.optional()` alone only permits the key being *absent*, but the profile form
 * always submits every field, and clearing an input submits "". That made
 * genuinely optional data unsaveable: an employee with no mother's phone, no
 * PAN, or no emergency contact could not be saved at all, because "" failed the
 * format regex. Mirrors `optionalOrBlank` in backend/validators/employee.schemas.ts,
 * which already accepts blanks — the frontend was rejecting data the API allows.
 */
const optionalOrBlank = <T extends z.ZodType<string>>(schema: T) =>
  z.union([schema, z.literal('')]).optional();

// Helper validators
const indianPhone = z.string().regex(
  /^[6-9]\d{9}$/,
  'Invalid Indian phone number. Must be 10 digits starting with 6-9'
);

const aadhaarNumber = z.string().regex(
  /^\d{12}$/,
  'Aadhaar must be exactly 12 digits'
);

const panNumber = z.string().regex(
  /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  'Invalid PAN format. Must be like ABCDE1234F'
);

const ifscCode = z.string().regex(
  /^[A-Z]{4}0[A-Z0-9]{6}$/,
  'Invalid IFSC code format'
);

const employeeId = z.string().regex(
  /^[A-Z0-9-]+$/,
  'Employee ID can only contain uppercase letters, numbers, and hyphens'
);

// Date validators with age restrictions
const dateOfBirth = z.coerce.date()
  .refine(
    (date) => {
      const age = differenceInYears(new Date(), date);
      return age >= 18 && age <= 100;
    },
    'Employee must be between 18 and 100 years old'
  )
  .refine(
    (date) => date <= new Date(),
    'Date of birth cannot be in the future'
  );

const joiningDate = z.coerce.date()
  .refine(
    (date) => {
      const diff = differenceInYears(new Date(), date);
      return diff >= -1; // Allow future dates up to 1 year
    },
    'Joining date cannot be more than 1 year in the future'
  );

// Base Employee Schema
export const employeeSchema = z.object({
  // Required fields
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),

  lastName: z.string()
    .min(1, 'Last name must be at least 1 character')
    .max(50, 'Last name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),

  email: z.string()
    .email('Invalid email address')
    .toLowerCase()
    .max(100, 'Email must not exceed 100 characters'),

  phone: indianPhone,

  employeeId: employeeId,

  // Optional but validated fields.
  // Every one accepts "" — see optionalOrBlank above. An employee with no
  // parents on record, no PAN, or no emergency contact must still be saveable.
  dateOfBirth: z.union([dateOfBirth, z.literal('')]).optional(),

  joiningDate: z.union([joiningDate, z.literal('')]).optional(),

  gender: optionalOrBlank(z.enum(['male', 'female', 'other'])),

  maritalStatus: optionalOrBlank(z.enum(['single', 'married', 'divorced', 'widowed'])),

  department: z.string().max(100).optional(),

  position: z.string().max(100).optional(),

  companyName: z.string().max(100).optional(),

  employmentType: optionalOrBlank(
    z.enum(['fulltime', 'intern', 'remote', 'contract', 'parttime'])
  ),

  officeAddress: optionalOrBlank(
    z.enum(['SanikColony', 'Indore', 'N.F.C.', 'Offsite'])
  ),

  reportingSupervisor: z.string().max(100).optional(),

  // Contact Information
  address: z.string().max(500).optional(),

  emergencyContactName: z.string().max(100).optional(),

  emergencyContactNumber: optionalOrBlank(indianPhone),

  // Parent Information
  fatherName: z.string().max(100).optional(),

  fatherPhone: optionalOrBlank(indianPhone),

  motherName: z.string().max(100).optional(),

  motherPhone: optionalOrBlank(indianPhone),

  // Government IDs
  aadhaarNumber: optionalOrBlank(aadhaarNumber),

  panNumber: optionalOrBlank(panNumber),

  // Banking Information
  bankName: z.string().max(100).optional(),

  bankAccountNumber: optionalOrBlank(
    z.string().regex(/^\d{9,18}$/, 'Bank account number must be 9-18 digits')
  ),

  bankIFSCCode: optionalOrBlank(ifscCode),

  paymentMode: optionalOrBlank(z.enum(['Bank Transfer', 'Cheque', 'Cash'])),

  // Status
  isActive: z.boolean().optional(),
});

// Schema for creating a new employee (stricter requirements)
export const createEmployeeSchema = employeeSchema.extend({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  phone: indianPhone,
  employeeId: employeeId,
  department: z.string().min(1, 'Department is required'),
  position: z.string().min(1, 'Position is required'),
  joiningDate: joiningDate,
});

// Schema for updating employee (all fields optional except ID)
export const updateEmployeeSchema = employeeSchema.partial().extend({
  _id: z.string().min(1, 'Employee ID is required'),
});

// Schema for employee search/filter
export const employeeSearchSchema = z.object({
  search: z.string().optional(),
  department: z.string().optional(),
  employmentType: z.enum(['fulltime', 'intern', 'remote', 'contract', 'parttime']).optional(),
  status: z.enum(['active', 'inactive', 'all']).optional(),
  sortBy: z.enum(['name', 'joiningDate', 'department']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Schema for bulk employee operations
export const bulkEmployeeActionSchema = z.object({
  employeeIds: z.array(z.string()).min(1, 'At least one employee must be selected'),
  action: z.enum(['activate', 'deactivate', 'delete', 'export']),
  confirm: z.boolean().refine((val) => val === true, 'Action must be confirmed'),
});

export type Employee = z.infer<typeof employeeSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type EmployeeSearchInput = z.infer<typeof employeeSearchSchema>;
export type BulkEmployeeActionInput = z.infer<typeof bulkEmployeeActionSchema>;

/** Field-name keyed map of validation messages. */
export type ValidationErrors = Record<string, string>;

export interface ValidationResult<T> {
  success: boolean;
  data: T | null;
  errors: ValidationErrors | null;
}

/** Flatten a ZodError into a { "path.to.field": message } map. */
const toErrorMap = (error: z.ZodError): ValidationErrors =>
  error.issues.reduce<ValidationErrors>((acc, issue) => {
    acc[issue.path.join('.')] = issue.message;
    return acc;
  }, {});

/** Run a schema and normalise the result into ValidationResult. */
const runValidation = <T>(schema: z.ZodType<T>, data: unknown): ValidationResult<T> => {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data, errors: null };
  }

  return { success: false, data: null, errors: toErrorMap(result.error) };
};

// Validation helper functions
export const validateEmployee = (data: unknown): ValidationResult<Employee> =>
  runValidation(employeeSchema, data);

export const validateCreateEmployee = (data: unknown): ValidationResult<CreateEmployeeInput> =>
  runValidation(createEmployeeSchema, data);

export const validateUpdateEmployee = (data: unknown): ValidationResult<UpdateEmployeeInput> =>
  runValidation(updateEmployeeSchema, data);

export interface FieldValidationResult {
  valid: boolean;
  error: string | null;
}

/** Field-level validator for real-time validation. */
export const validateField = (
  fieldName: keyof typeof employeeSchema.shape,
  value: unknown
): FieldValidationResult => {
  const fieldSchema = employeeSchema.shape[fieldName];
  if (!fieldSchema) {
    return { valid: true, error: null };
  }

  const result = fieldSchema.safeParse(value);
  if (result.success) {
    return { valid: true, error: null };
  }

  return { valid: false, error: result.error.issues[0]?.message ?? 'Invalid value' };
};

export default {
  employeeSchema,
  createEmployeeSchema,
  updateEmployeeSchema,
  employeeSearchSchema,
  bulkEmployeeActionSchema,
  validateEmployee,
  validateCreateEmployee,
  validateUpdateEmployee,
  validateField
};
