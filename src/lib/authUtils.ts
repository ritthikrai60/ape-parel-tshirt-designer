import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export interface UserSafeSummary {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
  createdAt: Date;
}

export interface RegisterUserInput {
  email: string;
  name: string;
  password: string;
  phone?: string;
  role?: 'CUSTOMER' | 'CREATOR' | 'SUPPLIER';
}

/**
 * Hashes a plaintext password using Node.js native crypto.scrypt with a cryptographically
 * secure 16-byte random salt and 64-byte key length.
 * Stored as: `<salt_hex>:<derivedKey_hex>`
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verifies a plaintext password against a stored `<salt_hex>:<derivedKey_hex>` scrypt hash.
 * Utilizes timingSafeEqual to protect against side-channel timing attacks.
 */
export async function verifyPassword(password: string, combinedHash: string | null | undefined): Promise<boolean> {
  if (!password || !combinedHash || typeof combinedHash !== 'string') {
    return false;
  }

  const parts = combinedHash.split(':');
  if (parts.length !== 2) {
    return false;
  }

  const [salt, key] = parts;
  if (!salt || !key) {
    return false;
  }

  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      try {
        const keyBuffer = Buffer.from(key, 'hex');
        if (derivedKey.length !== keyBuffer.length) {
          return resolve(false);
        }
        const match = crypto.timingSafeEqual(derivedKey, keyBuffer);
        resolve(match);
      } catch {
        resolve(false);
      }
    });
  });
}

/**
 * Validates password complexity: minimum 8 characters, maximum 128 characters.
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Password cannot exceed 128 characters' };
  }
  return { valid: true };
}

/**
 * Validates email format and length.
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length > 255) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed);
}

/**
 * Registers a new user with email and hashed password.
 * Enforces email uniqueness and validates role intent.
 */
export async function registerUser(input: RegisterUserInput): Promise<UserSafeSummary> {
  if (!input || typeof input !== 'object') {
    throw new Error('Registration input is required');
  }

  if (!input.email || typeof input.email !== 'string') {
    throw new Error('A valid email address is required');
  }

  const normalizedEmail = input.email.trim().toLowerCase();

  if (!validateEmail(normalizedEmail)) {
    throw new Error('A valid email address is required');
  }

  if (!input.name || typeof input.name !== 'string' || input.name.trim().length < 2) {
    throw new Error('Full name must be at least 2 characters long');
  }

  if (input.name.trim().length > 100) {
    throw new Error('Full name cannot exceed 100 characters');
  }

  const pwdCheck = validatePassword(input.password);
  if (!pwdCheck.valid) {
    throw new Error(pwdCheck.error || 'Invalid password');
  }

  const role = input.role || 'CUSTOMER';
  if (!['CUSTOMER', 'CREATOR', 'SUPPLIER'].includes(role)) {
    throw new Error('Role must be CUSTOMER, CREATOR, or SUPPLIER');
  }

  // Check for duplicate email before insert
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new Error('An account with this email address already exists');
  }

  const passwordHash = await hashPassword(input.password);

  const cleanedPhone = input.phone?.trim() || null;

  try {
    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: input.name.trim(),
        passwordHash,
        phone: cleanedPhone,
        shippingPhone: cleanedPhone,
        shippingName: input.name.trim(),
        role,
      },
    });

    return {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      createdAt: newUser.createdAt,
    };
  } catch (error: any) {
    if (error?.code === 'P2002') {
      throw new Error('An account with this email address already exists');
    }
    throw error;
  }
}

/**
 * Authenticates user credentials (email + password).
 * Rejects nonexistent users, users without passwordHash, and password mismatches.
 */
export async function validateCredentials(email: string, password?: string) {
  if (!email || typeof email !== 'string') return null;
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) return null;

  // If password was supplied, verify it
  if (password !== undefined) {
    if (!password || !user.passwordHash) {
      return null;
    }
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) return null;
    return user;
  }

  // If password was completely omitted:
  // Reject if the account has a passwordHash (cannot bypass password)
  if (user.passwordHash) {
    return null;
  }

  return user;
}

/**
 * NextAuth Credentials Provider authorize callback handler.
 * Verifies email and password against passwordHash, preventing unauthorized logins
 * while maintaining existing development mock fast-login capabilities.
 */
export async function authorizeCredentials(credentials: Record<string, any> | undefined) {
  const rawEmail = (credentials?.email as string)?.trim().toLowerCase();
  const rawPassword = credentials?.password as string | undefined;

  // 1. Password-based authentication (password field explicitly provided)
  if (rawPassword !== undefined) {
    if (!rawPassword || !rawEmail) {
      return null;
    }
    const user = await prisma.user.findUnique({
      where: { email: rawEmail },
    });

    if (!user || !user.passwordHash) {
      return null;
    }

    const isValid = await verifyPassword(rawPassword, user.passwordHash);
    if (!isValid) {
      return null;
    }

    return user;
  }

  // 2. Development Fast Login fallback (password field omitted completely)
  // If a specific email is requested:
  if (rawEmail) {
    const user = await prisma.user.findUnique({ where: { email: rawEmail } });
    // Reject nonexistent users or users protected by a passwordHash
    if (!user || user.passwordHash) {
      return null;
    }
    return user;
  }

  // If no email was provided, default to dev mock customer account
  const defaultDevEmail = "customer@ape-parel.com";
  let devUser = await prisma.user.findUnique({ where: { email: defaultDevEmail } });

  // If the account has a passwordHash, do not allow passwordless login
  if (devUser && devUser.passwordHash) {
    return null;
  }

  if (!devUser) {
    devUser = await prisma.user.create({
      data: {
        email: defaultDevEmail,
        name: "Streetwear Customer",
        role: "CUSTOMER",
      },
    });
  }
  return devUser;
}

