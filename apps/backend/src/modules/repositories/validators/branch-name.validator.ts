import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

/**
 * Validates branch name based on Git reference name rules,
 * and additionally rejects names starting with 'refs/'.
 */
export function isValidGitBranchName(branchName: string): boolean {
  if (!branchName || typeof branchName !== 'string') {
    return false;
  }
  
  const trimmed = branchName.trim();
  if (trimmed === '' || /\s/.test(trimmed)) {
    return false;
  }

  // Reject refs/ prefix (e.g. refs/heads/main)
  if (trimmed.startsWith('refs/')) {
    return false;
  }

  // standard git branch naming rules
  if (/[\x00-\x1F\x7F]/.test(trimmed)) return false;
  if (/[\s~^:\?\*\[\\]/.test(trimmed)) return false;
  if (/\.\./.test(trimmed)) return false;
  if (/@\{/.test(trimmed)) return false;
  if (trimmed.endsWith('.lock') || trimmed.endsWith('.')) return false;
  if (trimmed.startsWith('/') || trimmed.endsWith('/')) return false;
  if (/\/\//.test(trimmed)) return false;

  return true;
}

export function IsGitBranchName(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isGitBranchName',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (value === undefined || value === null) return true;
          return isValidGitBranchName(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid Git reference name (and not start with 'refs/').`;
        },
      },
    });
  };
}
