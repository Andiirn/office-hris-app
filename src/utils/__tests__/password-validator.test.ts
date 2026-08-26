import {
  validatePasswordRequirements,
  getMissingPasswordRequirements,
} from '../password-validator';

describe('password-validator', () => {
  it('should pass for a valid password meeting all requirements', () => {
    const password = 'Pass123!';
    const result = validatePasswordRequirements(password);
    expect(result.isValid).toBe(true);
    expect(result.hasValidLength).toBe(true);
    expect(result.hasUppercase).toBe(true);
    expect(result.hasLowercase).toBe(true);
    expect(result.hasNumber).toBe(true);
    expect(result.hasSpecialChar).toBe(true);
    expect(getMissingPasswordRequirements(password)).toEqual([]);
  });

  it('should fail when password is less than 8 characters', () => {
    const password = 'Pa1!';
    const result = validatePasswordRequirements(password);
    expect(result.isValid).toBe(false);
    expect(result.hasValidLength).toBe(false);
    const missing = getMissingPasswordRequirements(password);
    expect(missing).toContain('8-12 karakter (saat ini 4)');
  });

  it('should fail when password is more than 12 characters', () => {
    const password = 'Password12345!';
    const result = validatePasswordRequirements(password);
    expect(result.isValid).toBe(false);
    expect(result.hasValidLength).toBe(false);
    const missing = getMissingPasswordRequirements(password);
    expect(missing).toContain('Maksimal 12 karakter (saat ini 14)');
  });

  it('should fail when missing uppercase letter', () => {
    const password = 'pass1234!';
    const result = validatePasswordRequirements(password);
    expect(result.isValid).toBe(false);
    expect(result.hasUppercase).toBe(false);
    const missing = getMissingPasswordRequirements(password);
    expect(missing).toContain('Minimal 1 huruf besar (A-Z)');
  });

  it('should fail when missing lowercase letter', () => {
    const password = 'PASS1234!';
    const result = validatePasswordRequirements(password);
    expect(result.isValid).toBe(false);
    expect(result.hasLowercase).toBe(false);
    const missing = getMissingPasswordRequirements(password);
    expect(missing).toContain('Minimal 1 huruf kecil (a-z)');
  });

  it('should fail when missing number', () => {
    const password = 'Password!';
    const result = validatePasswordRequirements(password);
    expect(result.isValid).toBe(false);
    expect(result.hasNumber).toBe(false);
    const missing = getMissingPasswordRequirements(password);
    expect(missing).toContain('Minimal 1 angka (0-9)');
  });

  it('should fail when missing special character', () => {
    const password = 'Password123';
    const result = validatePasswordRequirements(password);
    expect(result.isValid).toBe(false);
    expect(result.hasSpecialChar).toBe(false);
    const missing = getMissingPasswordRequirements(password);
    expect(missing).toContain('Minimal 1 karakter khusus / simbol (!@#$%^&*()_+-=...)');
  });
});
