'use client';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const MAX_FILE_SIZE_MB = 50;
const MAX_FILES = 10;
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp']);

/** Validate a single file before upload */
export const validateFile = (file: File): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Type check
  if (!ALLOWED_TYPES.has(file.type)) {
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      errors.push(
        `"${file.name}" is not supported. Allowed: PDF, PNG, JPG, WEBP`
      );
    }
  }

  // Size check
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > MAX_FILE_SIZE_MB) {
    errors.push(
      `"${file.name}" is ${sizeMB.toFixed(1)}MB — maximum is ${MAX_FILE_SIZE_MB}MB`
    );
  }

  // Warn on very small files (likely not a real report)
  if (file.size < 10 * 1024) {
    warnings.push(`"${file.name}" is very small (${(file.size / 1024).toFixed(0)}KB) — is this a complete report?`);
  }

  // Warn on images that might have low OCR quality
  if (file.type.startsWith('image/') && file.size < 200 * 1024) {
    warnings.push(`"${file.name}" is a small image — ensure it is high resolution for best OCR accuracy`);
  }

  return { valid: errors.length === 0, errors, warnings };
};

/** Validate a batch of files */
export const validateFiles = (files: File[]): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (files.length === 0) {
    errors.push('No files selected');
    return { valid: false, errors, warnings };
  }

  if (files.length > MAX_FILES) {
    errors.push(`Too many files — maximum ${MAX_FILES} per upload (you selected ${files.length})`);
  }

  // Check for duplicates by name+size
  const seen = new Map<string, boolean>();
  files.forEach((f) => {
    const key = `${f.name}:${f.size}`;
    if (seen.has(key)) {
      warnings.push(`"${f.name}" appears to be a duplicate`);
    }
    seen.set(key, true);
  });

  // Validate each file
  files.forEach((f) => {
    const result = validateFile(f);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  });

  return { valid: errors.length === 0, errors, warnings };
};

/** Returns a user-friendly file size string */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
