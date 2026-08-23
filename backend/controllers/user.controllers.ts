import { paramValue } from '../utils/helpers.js';
import type {
  RegisterInput,
  LoginInput,
  UpdateEmployeeIdInput,
  UnlinkEmployeeInput,
} from '../validators/auth.schemas.js';
import type { Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.model.js';
import Employee from '../models/Employee.model.js';
import { generateTokenFromUser } from '../utils/jwt.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import type { IAuthRequest } from '../types/index.js';

export const register = asyncHandler(async (req: IAuthRequest, res: Response) => {
  // Shape guaranteed by validateBody(registerSchema) on the route.
  const { name, email, password, role, employeeId } = req.body as RegisterInput;

  // HR may staff the directory but not mint privileged accounts; without this
  // an HR user could create an admin and escalate their own access.
  if (req.user?.role !== 'admin' && role !== 'employee') {
    throw new ValidationError('Only an admin can create admin or HR accounts');
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ValidationError('User already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const userData: {
    name: string;
    email: string;
    password: string;
    role: string;
    employee?: unknown;
    employeeId?: string;
  } = {
    name,
    email,
    password: hashedPassword,
    role
  };

  // Any role may link a profile, and none has to at creation time. An employee
  // account left unlinked cannot log in (login enforces that) until it is
  // linked from the directory's Accounts tab.
  if (employeeId) {
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      throw new NotFoundError('Employee not found for given employeeId');
    }

    userData.employee = employee._id;
    userData.employeeId = employee.employeeId;
  }

  const user = await User.create(userData);
  res.status(201).json({ success: true, message: 'User registered successfully', user });
});

export const login = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { email, password } = req.body as LoginInput;

  const user = await User.findOne({ email });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.isActive === false) {
    throw new ValidationError('Account has been deactivated. Please contact HR.');
  }

  // Block login for unlinked employee accounts
  if (user.role === 'employee' && !user.employeeId) {
    throw new ValidationError(
      'Your account is not linked to an employee profile. Please contact HR.'
    );
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ValidationError('Invalid credentials');
  }

  // Generate token with all user data
  const token = generateTokenFromUser(user);

  res.json({ success: true, message: 'Login successful', token });
});

export const updateEmployeeId = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { userId, employeeId } = req.body as UpdateEmployeeIdInput;

  if (!userId || !employeeId) {
    throw new ValidationError('User ID and Employee ID are required');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const employee = await Employee.findOne({ employeeId });
  if (!employee) {
    throw new NotFoundError('Employee not found');
  }

  user.employee = employee._id;
  user.employeeId = employee.employeeId;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'User successfully linked to employee profile',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      employee: user.employee,
      employeeId: user.employeeId
    }
  });
});

export const unlinkEmployee = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { userId } = req.body as UnlinkEmployeeInput;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (!user.employeeId && !user.employee) {
    throw new ValidationError('User is not linked to any employee');
  }

  user.employee = undefined;
  user.employeeId = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'User successfully unlinked from employee profile',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

export const findUsersWithMissingEmployeeId = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const users = await User.find({
    role: 'employee',
    $or: [
      { employee: { $exists: false } },
      { employee: null },
      { employeeId: { $exists: false } },
      { employeeId: null },
      { employeeId: '' }
    ]
  });

  res.status(200).json({
    success: true,
    count: users.length,
    users: users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    }))
  });
});

export const getUserByEmployeeId = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const employeeId = paramValue(req.params.employeeId);

  if (!employeeId) {
    throw new ValidationError('Employee ID parameter is required');
  }

  const decodedEmployeeId = decodeURIComponent(employeeId);

  const employee = await Employee.findOne({ employeeId: decodedEmployeeId });
  if (!employee) {
    throw new NotFoundError('Employee not found for this employeeId');
  }

  const user = await User.findOne({ employee: employee._id });
  if (!user) {
    throw new NotFoundError('User not found for this employeeId');
  }

  res.json({ userId: user._id, employee: user.employee });
});

export const getAllUsers = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const users = await User.find().populate('employee');
  res.json({ users });
});

export const deleteUser = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const userId = paramValue(req.params.userId);

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Safety: refuse to delete users who are still linked to an employee
  if (user.employeeId || user.employee) {
    throw new ValidationError(
      'Cannot delete a user who is still linked to an employee. Please unlink first.'
    );
  }

  // Mirrors register: HR staffs the directory, only an admin touches
  // privileged accounts.
  if (req.user?.role !== 'admin' && user.role !== 'employee') {
    throw new ValidationError('Only an admin can delete admin or HR accounts.');
  }

  // Never delete yourself, and never remove the last admin — either would lock
  // the organisation out of user management. A mistyped account is still
  // deletable, which is the point of allowing this at all.
  if (String(user._id) === String(req.user?._id)) {
    throw new ValidationError('You cannot delete your own account.');
  }

  if (user.role === 'admin') {
    const admins = await User.countDocuments({ role: 'admin' });
    if (admins <= 1) {
      throw new ValidationError('Cannot delete the only admin account.');
    }
  }

  await User.findByIdAndDelete(userId);
  res.json({ success: true, message: 'User deleted successfully' });
});
