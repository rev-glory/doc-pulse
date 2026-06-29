import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

/**
 * Normalizes documentation directory inputs:
 * - Trims whitespace
 * - Resolves empty, '.', '/', '\' inputs as '.' (meaning repository root)
 * - Standardizes all backslashes to forward slashes
 * - Collapses consecutive forward slashes
 * - Trims starting and trailing slashes
 */
export function normalizeDocumentationDirectory(dir: string): string {
  if (!dir || typeof dir !== 'string') {
    return '.';
  }
  
  const trimmed = dir.trim();
  if (trimmed === '' || trimmed === '.' || trimmed === '/' || trimmed === '\\') {
    return '.';
  }

  // Replace backslashes with forward slashes
  let normalized = trimmed.replace(/\\/g, '/');

  // Collapse duplicate slashes
  normalized = normalized.replace(/\/+/g, '/');

  // Strip leading slash
  normalized = normalized.replace(/^\//, '');

  // Strip trailing slash
  normalized = normalized.replace(/\/$/, '');

  if (normalized === '' || normalized === '.') {
    return '.';
  }

  return normalized;
}

/**
 * Validates documentation directory input:
 * - Must not escape the repository root (no directory traversal via '..')
 * - Must not be absolute (no leading slash, and no Windows drive letter patterns)
 */
export function isValidDocumentationDirectory(dir: string): boolean {
  if (!dir || typeof dir !== 'string') {
    return false;
  }

  const normalized = normalizeDocumentationDirectory(dir);

  // Reject traversal
  if (normalized.startsWith('..') || normalized.includes('/../') || normalized.includes('\\..\\')) {
    return false;
  }

  // Reject absolute paths
  if (dir.trim().startsWith('/') || dir.trim().startsWith('\\') || /^[a-zA-Z]:/.test(dir.trim())) {
    return false;
  }

  return true;
}

export function IsDocumentationDirectory(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isDocumentationDirectory',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (value === undefined || value === null) return true;
          return isValidDocumentationDirectory(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid relative directory path within the repository root (e.g. 'docs', 'project/docs', or '.').`;
        },
      },
    });
  };
}
