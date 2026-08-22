/**
 * Security Utilities - Input Sanitization and XSS Prevention
 *
 * These utilities help prevent XSS (Cross-Site Scripting) attacks by sanitizing
 * user input before rendering it in the DOM.
 */

/**
 * Sanitize HTML string to prevent XSS attacks
 * Removes dangerous HTML tags and attributes
 *
 * @param input - The HTML string to sanitize
 * @returns Sanitized string
 */
export const sanitizeHTML = (input: unknown): string => {
  if (typeof input !== 'string') return '';

  // Create a temporary div element
  const temp = document.createElement('div');
  temp.textContent = input;
  return temp.innerHTML;
};

/**
 * Sanitize user text input - escapes HTML special characters
 *
 * @param input - Text input to sanitize
 * @returns Sanitized text
 */
export const sanitizeText = (input: unknown): string => {
  if (typeof input !== 'string') return '';

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Sanitize URL to prevent javascript: and data: URI attacks
 *
 * @param url - URL to sanitize
 * @returns Sanitized URL or '#' if dangerous
 */
export const sanitizeURL = (url: unknown): string => {
  if (typeof url !== 'string') return '#';

  const trimmedURL = url.trim().toLowerCase();

  // Block dangerous protocols
  if (trimmedURL.startsWith('javascript:') ||
      trimmedURL.startsWith('data:') ||
      trimmedURL.startsWith('vbscript:')) {
    return '#';
  }

  return url;
};

/**
 * Sanitize filename to prevent directory traversal attacks
 *
 * @param filename - Filename to sanitize
 * @returns Sanitized filename
 */
export const sanitizeFilename = (filename: unknown): string => {
  if (typeof filename !== 'string') return '';

  return filename
    .replace(/\.\./g, '')  // Remove parent directory references
    .replace(/[/\\]/g, '') // Remove path separators
    .replace(/[^a-zA-Z0-9._-]/g, '_'); // Replace special chars with underscore
};

/**
 * Sanitize object by sanitizing all string properties
 *
 * @param obj - Object to sanitize
 * @param excludeKeys - Keys to exclude from sanitization
 * @returns Sanitized object
 */
export const sanitizeObject = <T extends Record<string, unknown>>(
  obj: T,
  excludeKeys: string[] = []
): T => {
  if (typeof obj !== 'object' || obj === null) return obj;

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (excludeKeys.includes(key)) {
      sanitized[key] = value;
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>, excludeKeys);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
};

/**
 * Mask sensitive data for display
 *
 * @param value - Value to mask
 * @param visibleChars - Number of characters to show at the end
 * @returns Masked value
 */
export const maskSensitiveData = (value: string, visibleChars: number = 4): string => {
  if (typeof value !== 'string' || value.length === 0) return '';

  if (value.length <= visibleChars) return value;

  const masked = 'X'.repeat(value.length - visibleChars);
  const visible = value.slice(-visibleChars);

  return `${masked}${visible}`;
};

/**
 * Mask bank account number (show only last 4 digits)
 *
 * @param accountNumber - Bank account number
 * @returns Masked account number
 */
export const maskBankAccount = (accountNumber: unknown): string => {
  if (typeof accountNumber !== 'string') return '';

  if (accountNumber.length <= 4) return accountNumber;

  return `XXXXXXXX${accountNumber.slice(-4)}`;
};

/**
 * Mask PAN number (show only last 4 characters)
 * Format: XXXXX1234
 *
 * @param pan - PAN number
 * @returns Masked PAN
 */
export const maskPAN = (pan: unknown): string => {
  if (typeof pan !== 'string') return '';

  if (pan.length !== 10) return pan; // Invalid format

  return `XXXXX${pan.slice(-4)}`;
};

/**
 * Validate and sanitize email
 *
 * @param email - Email to validate
 * @returns Sanitized email or empty string if invalid
 */
export const sanitizeEmail = (email: unknown): string => {
  if (typeof email !== 'string') return '';

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitized = email.trim().toLowerCase();

  return emailRegex.test(sanitized) ? sanitized : '';
};

/**
 * Sanitize phone number (remove non-numeric characters)
 *
 * @param phone - Phone number
 * @returns Sanitized phone number
 */
export const sanitizePhone = (phone: unknown): string => {
  if (typeof phone !== 'string') return '';

  return phone.replace(/[^0-9+]/g, '');
};

/**
 * Check if string contains potential XSS patterns
 *
 * @param input - String to check
 * @returns True if potentially dangerous
 */
export const containsXSS = (input: unknown): boolean => {
  if (typeof input !== 'string') return false;

  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\(/i,
    /expression\(/i
  ];

  return xssPatterns.some(pattern => pattern.test(input));
};

/**
 * Safe text printer - sanitizes text before display
 * Use this function to safely render user-provided text
 *
 * @param text - Text to sanitize
 * @returns Sanitized text safe for display
 *
 * Example:
 * const displayName = safePrint(employee.firstName);
 */
export const safePrint = (text: unknown): string => {
  if (typeof text !== 'string') return '';
  return sanitizeText(text);
};

export default {
  sanitizeHTML,
  sanitizeText,
  sanitizeURL,
  sanitizeFilename,
  sanitizeObject,
  maskSensitiveData,
  maskBankAccount,
  maskPAN,
  sanitizeEmail,
  sanitizePhone,
  containsXSS,
  safePrint
};
