// Centralized API Endpoints Configuration
// This file ensures consistency between frontend API calls and backend routes

export const API_ENDPOINTS = {
  // Base configuration
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',

  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
  },

  // Employee Management
  EMPLOYEES: {
    BASE: '/employees',
    PROFILE: '/employees/profile',
    CREATE: '/employees/create',
    GET_ALL: '/employees',
    GET_BY_ID: (id: string) => `/employees/${encodeURIComponent(id)}`,
    UPDATE: (id: string) => `/employees/update/${encodeURIComponent(id)}`,
    DELETE: (id: string) => `/employees/${encodeURIComponent(id)}`,
  },

  // Attendance Management
  ATTENDANCE: {
    BASE: '/attendance',
    CHECK_IN: '/attendance/checkin',
    CHECK_OUT: '/attendance/checkout',
    RECORDS: '/attendance/records',
    GET_RECORDS: '/attendance',
    MY_RECORDS: '/attendance/my',
    MY_ATTENDANCE: '/attendance/my',
    GET_MISSING_CHECKOUTS: '/attendance/missing-checkouts',
    TODAY_WITH_ABSENTS: '/attendance/today-with-absents',
    ADMIN_RANGE: '/attendance/admin-range',
    EMPLOYEE_WITH_ABSENTS: '/attendance/employee-with-absents',
    UPDATE_RECORD: (recordId: string) => `/attendance/update/${recordId}`,
  },

  OFFICE_LOCATIONS: {
    BASE: '/office-locations',
    ACTIVE: '/office-locations/active',
    CREATE: '/office-locations',
    UPDATE: (id: string) => `/office-locations/${encodeURIComponent(id)}`,
    DELETE: (id: string) => `/office-locations/${encodeURIComponent(id)}`,
  },

  WFH_REQUESTS: {
    BASE: '/wfh-requests',
    MY: '/wfh-requests/my',
    REVIEW: (id: string) => `/wfh-requests/${encodeURIComponent(id)}/status`,
  },

  // WFH alias (same as WFH_REQUESTS, used by some hooks)
  WFH: {
    BASE: '/wfh-requests',
    MY: '/wfh-requests/my',
    REVIEW: (id: string) => `/wfh-requests/${encodeURIComponent(id)}/status`,
  },

  // Leave Management
  LEAVES: {
    BASE: '/leaves',
    REQUEST: '/leaves/request',
    MY_LEAVES: '/leaves/my',
    ALL_LEAVES: '/leaves/all',
    PREVIEW_DAYS: '/leaves/preview-days',
    UPDATE_STATUS: (id: string) => `/leaves/${id}/status`,
  },

  // Expense Management
  EXPENSES: {
    BASE: '/expenses',
    REQUEST: '/expenses/request',
    MY_EXPENSES: '/expenses/my',
    ALL_EXPENSES: '/expenses/all',
    UPDATE: (id: string) => `/expenses/${id}`,
    UPDATE_STATUS: (id: string) => `/expenses/${id}/status`,
    BULK_UPDATE: '/expenses/bulk-status',
    EXPORT: '/expenses/export',
  },

  // Regularization Management
  REGULARIZATIONS: {
    BASE: '/regularizations',
    REQUEST: '/regularizations/request',
    MY_REGULARIZATIONS: '/regularizations/my',
    ALL_REGULARIZATIONS: '/regularizations',
    REVIEW: (id: string) => `/regularizations/${id}/review`,
  },

  // Task Reports
  TASK_REPORTS: {
    BASE: '/task-reports',
    SUBMIT: '/task-reports/submit',
    MY_REPORTS: '/task-reports/my',
    ALL_REPORTS: '/task-reports',
  },

  // Holiday Management
  HOLIDAYS: {
    BASE: '/holidays',
    CREATE: '/holidays',
    UPDATE: (id: string) => `/holidays/${id}`,
    DELETE: (id: string) => `/holidays/${id}`,
  },

  // Announcements
  ANNOUNCEMENTS: {
    BASE: '/announcements',
    CREATE: '/announcements',
    GET_BY_ID: (id: string) => `/announcements/${id}`,
    UPDATE: (id: string) => `/announcements/${id}`,
    DELETE: (id: string) => `/announcements/${id}`,
  },

  // Help/Support
  HELP: {
    BASE: '/help',
    SUBMIT: '/help',
    MY_INQUIRIES: '/help/my',
    ALL_INQUIRIES: '/help/all',
    UPDATE: (id: string) => `/help/${id}`,
  },

  // User Management
  USERS: {
    BASE: '/users',
    GET_ALL: '/users',
    GET_BY_ID: (id: string) => `/users/${encodeURIComponent(id)}`,
    CREATE: '/users',
    UPDATE: (id: string) => `/users/${encodeURIComponent(id)}`,
    UPDATE_ROLE: (id: string) => `/users/${encodeURIComponent(id)}/role`,
    DELETE: (id: string) => `/users/${encodeURIComponent(id)}`,
    LINK_EMPLOYEE: '/employees/link',
    UNLINK_EMPLOYEE: '/employees/unlink',
    MISSING_EMPLOYEES: '/users/missing-employees',
  },

  // Documents
  DOCUMENTS: {
    BASE: '/documents',
    UPLOAD: '/documents/upload',
    GET_BY_EMPLOYEE: (employeeId: string) => `/documents/employee/${encodeURIComponent(employeeId)}`,
    DELETE: (id: string) => `/documents/${id}`,
  },

  // Dashboard
  DASHBOARD: {
    ADMIN: '/dashboard/admin',
    ADMIN_SUMMARY: '/dashboard/admin-summary',
    ALERTS: '/dashboard/alerts',
  },

  // Activity Feed
  ACTIVITY: {
    BASE: '/activity',
    FEED: '/activity/feed',
  },

  // Password Reset
  PASSWORD_RESET: {
    REQUEST: '/password-reset/request',
    REQUESTS: '/password-reset/requests',
    APPROVE: (id: string) => `/password-reset/request/${id}/approve`,
    REJECT: (id: string) => `/password-reset/request/${id}/reject`,
  },

  // Salary Slips
  SALARY_SLIPS: {
    BASE: '/salary-slips',
    CREATE_OR_UPDATE: '/salary-slips',
    GET_ALL: '/salary-slips',
    GET_BY_EMPLOYEE_MONTH_YEAR: (employeeId: string, month: number, year: number) =>
      `/salary-slips/${encodeURIComponent(employeeId)}/${month}/${year}`,
    GET_EMPLOYEE_SLIPS: (employeeId: string) => `/salary-slips/employee/${encodeURIComponent(employeeId)}`,
    DELETE: (employeeId: string, month: number, year: number) =>
      `/salary-slips/${encodeURIComponent(employeeId)}/${month}/${year}`,
    TAX_CALCULATION: '/salary-slips/tax-calculation',
  },

  // Salary Structures
  SALARY_STRUCTURES: {
    BASE: '/salary-structures',
    CREATE_OR_UPDATE: '/salary-structures',
    GET_ALL: '/salary-structures',
    GET_BY_EMPLOYEE: (employeeId: string) => `/salary-structures/${encodeURIComponent(employeeId)}`,
    DELETE: (employeeId: string) => `/salary-structures/${encodeURIComponent(employeeId)}`,
    EMPLOYEES_WITHOUT_STRUCTURE: '/salary-structures/employees-without-structure',
    STATISTICS: '/salary-structures/stats/overview',
  },

  // Policies
  POLICIES: {
    BASE: '/policies',
    CREATE: '/policies',
    GET_ALL: '/policies',
    GET_ACTIVE: '/policies/active',
    GET_BY_ID: (id: string) => `/policies/${id}`,
    UPDATE: (id: string) => `/policies/${id}`,
    UPDATE_STATUS: (id: string) => `/policies/${id}/status`,
    DELETE: (id: string) => `/policies/${id}`,
    STATISTICS: '/policies/statistics',
  },

  // Settings
  SETTINGS: {
    BASE: '/settings',
    GLOBAL: '/settings/global',
    DEPARTMENT: (department: string) => `/settings/department/${encodeURIComponent(department)}`,
    EFFECTIVE: '/settings/effective',
    DEPARTMENTS: '/settings/departments/list',
    DEPARTMENT_STATS: '/settings/departments/stats',
    ADD_DEPARTMENT: '/settings/departments',
    RENAME_DEPARTMENT: (oldName: string) => `/settings/departments/${encodeURIComponent(oldName)}/rename`,
    DELETE_DEPARTMENT: (name: string) => `/settings/departments/${encodeURIComponent(name)}`,
    DEPARTMENT_EMPLOYEES: (name: string) => `/settings/departments/${encodeURIComponent(name)}/employees`,
    RESCHEDULE_HR_REPORT: '/settings/daily-hr-attendance-report/reschedule',
    TEST_HR_REPORT: '/settings/daily-hr-attendance-report/test',
    RUN_REGULARIZATION_CLEANUP: '/settings/regularization-retention/run-now',
  },

  // Notifications
  NOTIFICATIONS: {
    BASE: '/notifications',
    TEST: '/notifications/test',
    STATUS: '/notifications/status',
    SUBSCRIBE: '/notifications/subscribe',
    UNSUBSCRIBE: '/notifications/unsubscribe',
    VAPID_KEY: '/notifications/vapid-key',
  },
} as const;

// Helper function to build query string
export const buildQueryString = (params: Record<string, string | number | boolean | undefined | null> = {}): string => {
  const filteredParams = Object.entries(params)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

  const queryString = new URLSearchParams(filteredParams as Record<string, string>).toString();
  return queryString ? `?${queryString}` : '';
};

// Helper function to build full URL with query params
export const buildEndpointWithQuery = (endpoint: string, params: Record<string, string | number | boolean | undefined | null> = {}): string => {
  const queryString = buildQueryString(params);
  return `${endpoint}${queryString}`;
};

export default API_ENDPOINTS;
