import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_MB,
  ALLOWED_UPLOAD_MIME_TYPES,
} from '../utils/uploadLimits.js';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

class FileValidationService {
  validateFile(file: Express.Multer.File | undefined): ValidationResult {
    const errors: string[] = [];

    if (!file) {
      errors.push('No file provided');
      return { isValid: false, errors };
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      errors.push(`File size exceeds ${MAX_UPLOAD_MB}MB limit`);
    }

    if (!(ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
      errors.push('File type not supported. Please use JPEG, PNG, GIF, or PDF files');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export default new FileValidationService();
