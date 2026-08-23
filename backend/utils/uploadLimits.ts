/**
 * Upload limits, defined once.
 *
 * Previously `10 * 1024 * 1024` was written literally in two places — multer's
 * `limits.fileSize` in `controllers/document.controllers.ts` and the size check
 * in `services/fileValidationService.ts` — so raising the cap meant finding
 * both. Anything that needs the limit imports it from here.
 */
export const MAX_UPLOAD_MB = 10;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export const ALLOWED_UPLOAD_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/pdf',
] as const;
