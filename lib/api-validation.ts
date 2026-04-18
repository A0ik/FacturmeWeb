import { NextResponse } from 'next/server';

/**
 * API Input Validation Utilities
 * Provides common validation functions for API routes
 */

export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'email' | 'url' | 'uuid';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate a single value against rules
 */
function validateValue(value: unknown, rules: ValidationRule, fieldName: string): string | null {
  const { required, type, minLength, maxLength, min, max, pattern, enum: enumValues } = rules;

  // Check required
  if (required && (value === null || value === undefined || value === '')) {
    return `${fieldName} est requis`;
  }

  // If not required and empty, skip other validations
  if (!required && (value === null || value === undefined || value === '')) {
    return null;
  }

  // Type validation
  if (type) {
    switch (type) {
      case 'string':
        if (typeof value !== 'string') return `${fieldName} doit être une chaîne de caractères`;
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) return `${fieldName} doit être un nombre`;
        break;
      case 'boolean':
        if (typeof value !== 'boolean') return `${fieldName} doit être un booléen`;
        break;
      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) return `${fieldName} doit être un objet`;
        break;
      case 'array':
        if (!Array.isArray(value)) return `${fieldName} doit être un tableau`;
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (typeof value !== 'string' || !emailRegex.test(value)) return `${fieldName} doit être un email valide`;
        break;
      case 'url':
        try {
          new URL(value as string);
        } catch {
          return `${fieldName} doit être une URL valide`;
        }
        break;
      case 'uuid':
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (typeof value !== 'string' || !uuidRegex.test(value)) return `${fieldName} doit être un UUID valide`;
        break;
    }
  }

  // String validations
  if (typeof value === 'string') {
    if (minLength !== undefined && value.length < minLength) {
      return `${fieldName} doit contenir au moins ${minLength} caractères`;
    }
    if (maxLength !== undefined && value.length > maxLength) {
      return `${fieldName} ne peut pas dépasser ${maxLength} caractères`;
    }
    if (pattern && !pattern.test(value)) {
      return `${fieldName} a un format invalide`;
    }
  }

  // Number validations
  if (typeof value === 'number') {
    if (min !== undefined && value < min) {
      return `${fieldName} doit être supérieur ou égal à ${min}`;
    }
    if (max !== undefined && value > max) {
      return `${fieldName} doit être inférieur ou égal à ${max}`;
    }
  }

  // Enum validation
  if (enumValues && !enumValues.includes(value as string)) {
    return `${fieldName} doit être l'une de ces valeurs: ${enumValues.join(', ')}`;
  }

  return null;
}

/**
 * Validate request body against schema
 */
export function validateBody(body: any, schema: Record<string, ValidationRule>): ValidationResult {
  const errors: Record<string, string> = {};

  for (const [field, rules] of Object.entries(schema)) {
    const error = validateValue(body[field], rules, field);
    if (error) {
      errors[field] = error;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Return error response if validation fails
 */
export function validationErrorResponse(validation: ValidationResult): NextResponse | null {
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.errors },
      { status: 400 }
    );
  }
  return null;
}

/**
 * File upload validation
 */
export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  required?: boolean;
}

export function validateFile(file: File | null | undefined, options: FileValidationOptions = {}): string | null {
  const { maxSize = 10 * 1024 * 1024, allowedTypes = [], required = false } = options;

  if (!file) {
    if (required) {
      return 'Un fichier est requis';
    }
    return null;
  }

  // Check size
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    return `Le fichier dépasse la taille maximale de ${maxSizeMB}MB`;
  }

  // Check type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return `Type de fichier non autorisé. Types acceptés: ${allowedTypes.join(', ')}`;
  }

  return null;
}

/**
 * Rate limiting (in-memory, for production use Redis)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; remaining: number; resetTime?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    // New window
    const resetTime = now + windowMs;
    rateLimitMap.set(identifier, { count: 1, resetTime });
    return { allowed: true, remaining: maxRequests - 1, resetTime };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetTime: record.resetTime };
}

/**
 * Sanitize string input (basic XSS prevention)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  email: { required: true, type: 'email' as const, maxLength: 255 },
  uuid: { required: true, type: 'uuid' as const },
  amount: { required: true, type: 'number' as const, min: 0 },
  date: { required: true, type: 'string' as const, pattern: /^\d{4}-\d{2}-\d{2}$/ },
  workspaceInvite: {
    email: { required: true, type: 'email' as const, maxLength: 255 },
    role: { required: true, type: 'string' as const, enum: ['admin', 'member', 'viewer'] },
  },
};
