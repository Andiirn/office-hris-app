export interface PasswordRequirementsState {
  isValid: boolean;
  hasValidLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export function validatePasswordRequirements(password: string): PasswordRequirementsState {
  const length = password.length;
  const hasValidLength = length >= 8 && length <= 12;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

  const isValid =
    hasValidLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecialChar;

  return {
    isValid,
    hasValidLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
  };
}

export function getMissingPasswordRequirements(password: string): string[] {
  const state = validatePasswordRequirements(password);
  const missing: string[] = [];

  if (!state.hasValidLength) {
    if (password.length < 8) {
      missing.push(`8-12 karakter (saat ini ${password.length})`);
    } else {
      missing.push(`Maksimal 12 karakter (saat ini ${password.length})`);
    }
  }
  if (!state.hasUppercase) {
    missing.push('Minimal 1 huruf besar (A-Z)');
  }
  if (!state.hasLowercase) {
    missing.push('Minimal 1 huruf kecil (a-z)');
  }
  if (!state.hasNumber) {
    missing.push('Minimal 1 angka (0-9)');
  }
  if (!state.hasSpecialChar) {
    missing.push('Minimal 1 karakter khusus / simbol (!@#$%^&*()_+-=...)');
  }

  return missing;
}
