import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  hashPassword,
  verifyPassword,
  validatePassword,
  validateEmail,
  registerUser,
  validateCredentials,
} from '@/lib/authUtils';
import {
  onboardCreator,
  onboardSupplier,
  getUserRoleProfiles,
  formatSlug,
} from '@/lib/onboarding';

vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

describe('Unified Authentication and Progressive Onboarding Suite', () => {
  const testRunId = Date.now().toString().slice(-6);

  // Clean up created test entities after tests
  const cleanupUserIds: string[] = [];
  const cleanupCreatorSlugs: string[] = [];
  const cleanupSupplierSlugs: string[] = [];

  afterAll(async () => {
    try {
      for (const slug of cleanupCreatorSlugs) {
        const cp = await prisma.creatorProfile.findUnique({ where: { slug } });
        if (cp) {
          await prisma.creatorStorefrontSettings.deleteMany({ where: { creatorId: cp.id } });
          await prisma.financialAccount.deleteMany({ where: { creatorId: cp.id } });
          await prisma.creatorProfile.delete({ where: { id: cp.id } });
        }
      }
      for (const slug of cleanupSupplierSlugs) {
        const sp = await prisma.supplierProfile.findUnique({ where: { slug } });
        if (sp) {
          await prisma.printingService.deleteMany({ where: { supplierId: sp.id } });
          await prisma.supplierProfile.delete({ where: { id: sp.id } });
        }
      }
      for (const id of cleanupUserIds) {
        await prisma.auditEvent.deleteMany({ where: { userId: id } });
        await prisma.user.deleteMany({ where: { id } });
      }
    } catch (err) {
      console.warn('[cleanup] Warning cleaning test records:', err);
    }
  });

  describe('1. Secure Password Hashing & Verification (R2)', () => {
    it('hashes passwords using scrypt with random salt in <salt>:<key> format', async () => {
      const rawPassword = 'StreetwearSecret2026!';
      const hash = await hashPassword(rawPassword);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      const parts = hash.split(':');
      expect(parts.length).toBe(2);
      expect(parts[0].length).toBe(32); // 16 bytes hex = 32 hex chars
      expect(parts[1].length).toBe(128); // 64 bytes hex = 128 hex chars
    });

    it('generates unique salts across multiple hashes of identical passwords', async () => {
      const password = 'ConsistentPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
      const [salt1] = hash1.split(':');
      const [salt2] = hash2.split(':');
      expect(salt1).not.toBe(salt2);
    });

    it('verifies correct passwords accurately', async () => {
      const password = 'CorrectPassword999';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('rejects incorrect passwords', async () => {
      const password = 'CorrectPassword999';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword('WrongPassword123', hash);
      expect(isValid).toBe(false);
    });

    it('handles malformed, empty, or corrupt combinedHash safely without throwing', async () => {
      expect(await verifyPassword('any', '')).toBe(false);
      expect(await verifyPassword('any', null as any)).toBe(false);
      expect(await verifyPassword('any', undefined as any)).toBe(false);
      expect(await verifyPassword('any', 'invalidsaltwithoutcolon')).toBe(false);
      expect(await verifyPassword('any', 'salt:key:extrapart')).toBe(false);
      expect(await verifyPassword('any', 'corruptsalt:badkey')).toBe(false);
      expect(await verifyPassword('', 'valid:hash')).toBe(false);
    });

    it('throws error when hashPassword is called with empty password', async () => {
      await expect(hashPassword('')).rejects.toThrow('Password must be a non-empty string');
      await expect(hashPassword(null as any)).rejects.toThrow('Password must be a non-empty string');
    });
  });

  describe('2. Client & Server Input Validation Helpers (R1)', () => {
    it('enforces password minimum length of 8 characters', () => {
      expect(validatePassword('1234567').valid).toBe(false);
      expect(validatePassword('1234567').error).toContain('at least 8 characters');
      expect(validatePassword('12345678').valid).toBe(true);
      expect(validatePassword('Streetwear2026').valid).toBe(true);
    });

    it('validates email format properly', () => {
      expect(validateEmail('test@ape-parel.com')).toBe(true);
      expect(validateEmail('user.name+tag@sub.domain.co.th')).toBe(true);
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('missing@domain')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });

    it('formats URL-safe slugs correctly', () => {
      expect(formatSlug('Tokyo Street Lab')).toBe('tokyo-street-lab');
      expect(formatSlug('Bangkok DTG & Garment 2026!')).toBe('bangkok-dtg-garment-2026');
      expect(formatSlug('---Special__Slug---')).toBe('special-slug');
    });
  });

  describe('3. User Registration with Password & Duplicate Email Rejection (R1 & R2)', () => {
    it('successfully registers a customer user and stores secure passwordHash', async () => {
      const email = `test-user-${testRunId}@ape-parel-test.com`;
      const name = 'Neo Tokyo Designer';
      const password = 'SecurePassword2026!';

      const user = await registerUser({
        email,
        name,
        password,
        role: 'CUSTOMER',
      });

      cleanupUserIds.push(user.id);

      expect(user.id).toBeDefined();
      expect(user.email).toBe(email.toLowerCase());
      expect(user.name).toBe(name);
      expect(user.role).toBe('CUSTOMER');

      // Verify that database record stores passwordHash and NOT plain password
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.passwordHash).toBeDefined();
      expect(dbUser?.passwordHash).toContain(':');
      expect((dbUser as any).password).toBeUndefined(); // Plain password field does not exist on User
      expect(dbUser?.passwordHash).not.toBe(password); // Never plain text
    });

    it('rejects registration with duplicate email address', async () => {
      const email = `duplicate-${testRunId}@ape-parel-test.com`;
      const user = await registerUser({
        email,
        name: 'First User',
        password: 'Password123!',
      });
      cleanupUserIds.push(user.id);

      // Attempt second registration with same email
      await expect(
        registerUser({
          email,
          name: 'Second User',
          password: 'AnotherPassword456!',
        })
      ).rejects.toThrow('An account with this email address already exists');
    });

    it('rejects registration with password shorter than 8 characters', async () => {
      const email = `shortpwd-${testRunId}@ape-parel-test.com`;
      await expect(
        registerUser({
          email,
          name: 'Short Pwd User',
          password: 'short',
        })
      ).rejects.toThrow('Password must be at least 8 characters long');
    });

    it('rejects registration with invalid email', async () => {
      await expect(
        registerUser({
          email: 'not-an-email',
          name: 'Invalid Email User',
          password: 'ValidPassword123!',
        })
      ).rejects.toThrow('A valid email address is required');
    });

    it('supports registering with CREATOR or SUPPLIER role intent', async () => {
      const creatorEmail = `creator-intent-${testRunId}@ape-parel-test.com`;
      const supplierEmail = `supplier-intent-${testRunId}@ape-parel-test.com`;

      const cUser = await registerUser({
        email: creatorEmail,
        name: 'Prospective Creator',
        password: 'ValidPassword123!',
        role: 'CREATOR',
      });
      cleanupUserIds.push(cUser.id);
      expect(cUser.role).toBe('CREATOR');

      const sUser = await registerUser({
        email: supplierEmail,
        name: 'Prospective Supplier',
        password: 'ValidPassword123!',
        role: 'SUPPLIER',
      });
      cleanupUserIds.push(sUser.id);
      expect(sUser.role).toBe('SUPPLIER');
    });
  });

  describe('4. Login Credential Validation & Unauthorized Login Prevention (R2)', () => {
    let authUserEmail: string;
    const authUserPassword = 'SuperSecretAuthPass123!';

    beforeAll(async () => {
      authUserEmail = `auth-login-${testRunId}@ape-parel-test.com`;
      const created = await registerUser({
        email: authUserEmail,
        name: 'Auth Test User',
        password: authUserPassword,
      });
      cleanupUserIds.push(created.id);
    });

    it('authenticates successfully with valid email and password', async () => {
      const authenticated = await validateCredentials(authUserEmail, authUserPassword);
      expect(authenticated).not.toBeNull();
      expect(authenticated?.email).toBe(authUserEmail);
    });

    it('rejects invalid password for an existing account', async () => {
      const authenticated = await validateCredentials(authUserEmail, 'WrongPassword!');
      expect(authenticated).toBeNull();
    });

    it('rejects nonexistent user email', async () => {
      const authenticated = await validateCredentials('nonexistent-email@ape-parel.com', 'SomePass123');
      expect(authenticated).toBeNull();
    });

    it('prevents passwordless login on an account protected by passwordHash', async () => {
      // Calling validateCredentials without password on a passwordHash-protected user MUST return null
      const authenticated = await validateCredentials(authUserEmail);
      expect(authenticated).toBeNull();
    });

    it('maintains development mock capabilities for accounts without passwordHash', async () => {
      // Existing seed customer customer@ape-parel.com has no passwordHash
      const devCustomer = await prisma.user.findUnique({
        where: { email: 'customer@ape-parel.com' },
      });

      if (devCustomer) {
        expect(devCustomer.passwordHash).toBeNull();
        const fastLoginUser = await validateCredentials('customer@ape-parel.com');
        expect(fastLoginUser).not.toBeNull();
        expect(fastLoginUser?.email).toBe('customer@ape-parel.com');
      }
    });

    it('validates NextAuth authorizeCredentials provider callback directly', async () => {
      const { authorizeCredentials } = await import('@/lib/authUtils');

      // Valid credentials
      const valid = await authorizeCredentials({
        email: authUserEmail,
        password: authUserPassword,
      });
      expect(valid).not.toBeNull();
      expect(valid?.email).toBe(authUserEmail);

      // Wrong password
      const wrong = await authorizeCredentials({
        email: authUserEmail,
        password: 'IncorrectPassword!',
      });
      expect(wrong).toBeNull();

      // Empty string password attempt MUST be rejected and NOT bypass password check
      const emptyPwd = await authorizeCredentials({
        email: authUserEmail,
        password: '',
      });
      expect(emptyPwd).toBeNull();

      // Password bypass attempt on password-protected user
      const bypass = await authorizeCredentials({
        email: authUserEmail,
      });
      expect(bypass).toBeNull();

      // Fast login attempt on unknown/nonexistent email MUST return null and NEVER hijack another customer account
      const intruderFastLogin = await authorizeCredentials({
        email: `nonexistent-hacker-${Date.now()}@adversary.com`,
      });
      expect(intruderFastLogin).toBeNull();

      // Fast login attempt with empty password on nonexistent email MUST return null
      const intruderEmptyPwd = await authorizeCredentials({
        email: `nonexistent-hacker-${Date.now()}@adversary.com`,
        password: '',
      });
      expect(intruderEmptyPwd).toBeNull();

      // Dev mock fast login for configured dev mock account
      const devUser = await authorizeCredentials({
        email: 'customer@ape-parel.com',
      });
      expect(devUser).not.toBeNull();
      expect(devUser?.email).toBe('customer@ape-parel.com');
    });
  });

  describe('5. Progressive Onboarding: CreatorProfile Creation & Ledger Linking (R3)', () => {
    let candidateUserId: string;

    beforeAll(async () => {
      const candidate = await registerUser({
        email: `onboard-creator-${testRunId}@ape-parel-test.com`,
        name: 'Future Streetwear Artist',
        password: 'Password2026!',
      });
      cleanupUserIds.push(candidate.id);
      candidateUserId = candidate.id;
    });

    it('atomically creates CreatorProfile, FinancialAccount, and updates user role', async () => {
      const slug = `artist-lab-${testRunId}`;
      cleanupCreatorSlugs.push(slug);

      const creator = await onboardCreator({
        userId: candidateUserId,
        displayName: 'Artist Lab Neo',
        slug,
        bio: 'Neo-Tokyo anime graphics and brutalist typography.',
        payoutDetails: 'PromptPay: 081-123-4567 (Artist Lab)',
      });

      expect(creator.id).toBeDefined();
      expect(creator.slug).toBe(slug);
      expect(creator.displayName).toBe('Artist Lab Neo');
      expect(creator.userId).toBe(candidateUserId);

      // Verify User role upgraded to CREATOR
      const updatedUser = await prisma.user.findUnique({ where: { id: candidateUserId } });
      expect(updatedUser?.role).toBe('CREATOR');

      // Verify FinancialAccount created for double-entry royalties
      const financialAcc = await prisma.financialAccount.findUnique({
        where: { accountNumber: `ACC-CREATOR-${slug}` },
      });
      expect(financialAcc).not.toBeNull();
      expect(financialAcc?.accountType).toBe('CREATOR');
      expect(financialAcc?.balance).toBe(0);
      expect(financialAcc?.creatorId).toBe(creator.id);

      // Verify default storefront settings created
      const storefront = await prisma.creatorStorefrontSettings.findUnique({
        where: { creatorId: creator.id },
      });
      expect(storefront).not.toBeNull();
      expect(storefront?.customSlug).toBe(slug);

      // Verify audit event recorded
      const audit = await prisma.auditEvent.findFirst({
        where: {
          userId: candidateUserId,
          action: 'CREATOR_ONBOARDING_COMPLETED',
        },
      });
      expect(audit).not.toBeNull();
    });

    it('rejects creator onboarding with duplicate slug', async () => {
      // Create a second user
      const user2 = await registerUser({
        email: `onboard-creator2-${testRunId}@ape-parel-test.com`,
        name: 'Another Artist',
        password: 'Password2026!',
      });
      cleanupUserIds.push(user2.id);

      const existingSlug = `artist-lab-${testRunId}`;
      await expect(
        onboardCreator({
          userId: user2.id,
          displayName: 'Duplicate Slug Artist',
          slug: existingSlug,
          payoutDetails: 'PromptPay: 089-999-9999',
        })
      ).rejects.toThrow(`Creator handle "${existingSlug}" is already taken`);
    });

    it('rejects onboarding if user already has an active CreatorProfile', async () => {
      await expect(
        onboardCreator({
          userId: candidateUserId,
          displayName: 'Second Attempt',
          slug: `artist-lab-another-${testRunId}`,
          payoutDetails: 'PromptPay: 089-999-9999',
        })
      ).rejects.toThrow('User already has an active Creator profile');
    });

    it('validates minimum length for creator onboarding inputs', async () => {
      const user3 = await registerUser({
        email: `onboard-creator3-${testRunId}@ape-parel-test.com`,
        name: 'Validation Test User',
        password: 'Password2026!',
      });
      cleanupUserIds.push(user3.id);

      await expect(
        onboardCreator({
          userId: user3.id,
          displayName: 'A', // too short
          slug: 'valid-slug',
          payoutDetails: 'PromptPay: 081-123-4567',
        })
      ).rejects.toThrow('Display name must be at least 2 characters long');

      await expect(
        onboardCreator({
          userId: user3.id,
          displayName: 'Valid Name',
          slug: '', // empty slug
          payoutDetails: 'PromptPay: 081-123-4567',
        })
      ).rejects.toThrow('A valid unique slug is required');

      await expect(
        onboardCreator({
          userId: user3.id,
          displayName: 'Valid Name',
          slug: 'valid-slug',
          payoutDetails: '12', // too short
        })
      ).rejects.toThrow('Valid PromptPay or bank payout details are required');
    });
  });

  describe('6. Progressive Onboarding: SupplierProfile Creation & Print Setup (R3)', () => {
    let supplierCandidateUserId: string;

    beforeAll(async () => {
      const candidate = await registerUser({
        email: `onboard-supp-${testRunId}@ape-parel-test.com`,
        name: 'Future Garment Mill Owner',
        password: 'Password2026!',
      });
      cleanupUserIds.push(candidate.id);
      supplierCandidateUserId = candidate.id;
    });

    it('atomically creates SupplierProfile, PrintingService, and updates user role', async () => {
      const slug = `siam-garment-${testRunId}`;
      cleanupSupplierSlugs.push(slug);

      const supplier = await onboardSupplier({
        userId: supplierCandidateUserId,
        companyName: 'Siam Garment Craft Co.',
        slug,
        location: 'Bang Khun Thian, Bangkok, Thailand',
        contactPhone: '+66 2 890 1234',
        leadTimeDays: 4,
      });

      expect(supplier.id).toBeDefined();
      expect(supplier.slug).toBe(slug);
      expect(supplier.companyName).toBe('Siam Garment Craft Co.');
      expect(supplier.userId).toBe(supplierCandidateUserId);
      expect(supplier.leadTimeDays).toBe(4);

      // Verify User role upgraded to SUPPLIER
      const updatedUser = await prisma.user.findUnique({ where: { id: supplierCandidateUserId } });
      expect(updatedUser?.role).toBe('SUPPLIER');

      // Verify default DTG PrintingService is created
      const services = await prisma.printingService.findMany({
        where: { supplierId: supplier.id },
      });
      expect(services.length).toBeGreaterThan(0);
      const dtgService = services.find((s) => s.code === 'DTG');
      expect(dtgService).toBeDefined();
      expect(dtgService?.pricePerSurface).toBe(80);

      // Verify audit event recorded
      const audit = await prisma.auditEvent.findFirst({
        where: {
          userId: supplierCandidateUserId,
          action: 'SUPPLIER_ONBOARDING_COMPLETED',
        },
      });
      expect(audit).not.toBeNull();
    });

    it('rejects supplier onboarding with duplicate slug', async () => {
      const user2 = await registerUser({
        email: `onboard-supp2-${testRunId}@ape-parel-test.com`,
        name: 'Another Mill Owner',
        password: 'Password2026!',
      });
      cleanupUserIds.push(user2.id);

      const existingSlug = `siam-garment-${testRunId}`;
      await expect(
        onboardSupplier({
          userId: user2.id,
          companyName: 'Duplicate Mill',
          slug: existingSlug,
          location: 'Bangkok, Thailand',
        })
      ).rejects.toThrow(`Supplier handle "${existingSlug}" is already taken`);
    });

    it('rejects onboarding if user already has an active SupplierProfile', async () => {
      await expect(
        onboardSupplier({
          userId: supplierCandidateUserId,
          companyName: 'Second Mill',
          slug: `siam-garment-another-${testRunId}`,
          location: 'Bangkok, Thailand',
        })
      ).rejects.toThrow('User already has an active Supplier profile');
    });

    it('validates factory location and company name', async () => {
      const user3 = await registerUser({
        email: `onboard-supp3-${testRunId}@ape-parel-test.com`,
        name: 'Validation Mill User',
        password: 'Password2026!',
      });
      cleanupUserIds.push(user3.id);

      await expect(
        onboardSupplier({
          userId: user3.id,
          companyName: 'A', // too short
          slug: 'valid-mill',
          location: 'Bangkok',
        })
      ).rejects.toThrow('Company name must be at least 2 characters long');

      await expect(
        onboardSupplier({
          userId: user3.id,
          companyName: 'Valid Mill',
          slug: 'valid-mill',
          location: '', // empty location
        })
      ).rejects.toThrow('Factory / manufacturing location is required');
    });
  });

  describe('7. Role Profiles Status & Global Role Switcher Data (R4)', () => {
    it('returns complete role profile capabilities for multi-mode switching', async () => {
      const user = await registerUser({
        email: `roleswitch-${testRunId}@ape-parel-test.com`,
        name: 'Multi Role User',
        password: 'Password2026!',
      });
      cleanupUserIds.push(user.id);

      // Initially CUSTOMER without creator/supplier profiles
      let status = await getUserRoleProfiles(user.id);
      expect(status?.role).toBe('CUSTOMER');
      expect(status?.hasCreatorProfile).toBe(false);
      expect(status?.hasSupplierProfile).toBe(false);

      // Onboard as Creator
      const creatorSlug = `multi-artist-${testRunId}`;
      cleanupCreatorSlugs.push(creatorSlug);
      await onboardCreator({
        userId: user.id,
        displayName: 'Multi Artist',
        slug: creatorSlug,
        payoutDetails: 'PromptPay: 081-000-0000',
      });

      status = await getUserRoleProfiles(user.id);
      expect(status?.hasCreatorProfile).toBe(true);
      expect(status?.creatorProfile?.slug).toBe(creatorSlug);
      expect(status?.role).toBe('CREATOR');

      // Now onboard as Supplier as well (hybrid persona)
      const supplierSlug = `multi-mill-${testRunId}`;
      cleanupSupplierSlugs.push(supplierSlug);
      await onboardSupplier({
        userId: user.id,
        companyName: 'Multi Mill Co.',
        slug: supplierSlug,
        location: 'Samut Prakan, Thailand',
      });

      status = await getUserRoleProfiles(user.id);
      expect(status?.hasCreatorProfile).toBe(true);
      expect(status?.hasSupplierProfile).toBe(true);
      expect(status?.supplierProfile?.slug).toBe(supplierSlug);
    });
  });

  describe('8. End-to-End API Route Handlers (R1 & R3)', () => {
    it('POST /api/auth/register registers account and returns 201', async () => {
      const { POST } = await import('@/app/api/auth/register/route');
      const { NextRequest } = await import('next/server');

      const testEmail = `api-reg-${testRunId}@ape-parel-test.com`;
      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          name: 'API Registered User',
          password: 'Password2026!',
          confirmPassword: 'Password2026!',
          role: 'CUSTOMER',
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.user.email).toBe(testEmail);
      cleanupUserIds.push(data.user.id);
    });

    it('POST /api/auth/register rejects password mismatch with 400', async () => {
      const { POST } = await import('@/app/api/auth/register/route');
      const { NextRequest } = await import('next/server');

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `mismatch-${testRunId}@test.com`,
          name: 'Mismatch User',
          password: 'Password2026!',
          confirmPassword: 'DifferentPassword2026!',
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.message).toContain('Password confirmation does not match');
    });

    it('POST /api/creator/onboard creates creator profile via API route', async () => {
      const { POST } = await import('@/app/api/creator/onboard/route');
      const { NextRequest } = await import('next/server');

      const user = await registerUser({
        email: `api-creator-${testRunId}@ape-parel-test.com`,
        name: 'API Creator',
        password: 'Password2026!',
      });
      cleanupUserIds.push(user.id);

      const creatorSlug = `api-artist-${testRunId}`;
      cleanupCreatorSlugs.push(creatorSlug);

      const req = new NextRequest('http://localhost:3000/api/creator/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          displayName: 'API Creator Studio',
          slug: creatorSlug,
          payoutDetails: 'PromptPay: 081-999-8888',
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.creator.slug).toBe(creatorSlug);
    });

    it('POST /api/supplier/onboard creates supplier profile via API route', async () => {
      const { POST } = await import('@/app/api/supplier/onboard/route');
      const { NextRequest } = await import('next/server');

      const user = await registerUser({
        email: `api-supp-${testRunId}@ape-parel-test.com`,
        name: 'API Supplier',
        password: 'Password2026!',
      });
      cleanupUserIds.push(user.id);

      const supplierSlug = `api-mill-${testRunId}`;
      cleanupSupplierSlugs.push(supplierSlug);

      const req = new NextRequest('http://localhost:3000/api/supplier/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          companyName: 'API Mill Works',
          slug: supplierSlug,
          location: 'Bangkok, Thailand',
          leadTimeDays: 4,
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.supplier.slug).toBe(supplierSlug);
    });
  });

  describe('9. Adversarial Edge Cases & Boundary Security Probes', () => {
    it('handles Unicode, emoji, and multilingual characters in passwords correctly', async () => {
      const unicodePassword = '🔑Streetwear2026!🚀日本語';
      const hash = await hashPassword(unicodePassword);
      expect(hash).toBeDefined();

      const isValid = await verifyPassword(unicodePassword, hash);
      expect(isValid).toBe(true);

      const isWrong = await verifyPassword('🔒Streetwear2026!🚀日本語', hash);
      expect(isWrong).toBe(false);

      const unicodeEmail = `unicode-pwd-${testRunId}@ape-parel-test.com`;
      const registered = await registerUser({
        email: unicodeEmail,
        name: 'Unicode Hacker 👾',
        password: unicodePassword,
      });
      cleanupUserIds.push(registered.id);

      const authenticated = await validateCredentials(unicodeEmail, unicodePassword);
      expect(authenticated).not.toBeNull();
      expect(authenticated?.email).toBe(unicodeEmail);

      const wrongEmoji = await validateCredentials(unicodeEmail, '🔒Streetwear2026!🚀日本語');
      expect(wrongEmoji).toBeNull();
    });

    it('enforces exact password length boundaries (7 rejected, 8 accepted, 128 accepted, 129 rejected)', async () => {
      // 7 characters (rejected)
      const res7 = validatePassword('1234567');
      expect(res7.valid).toBe(false);
      expect(res7.error).toContain('at least 8 characters');

      // 8 characters (accepted)
      const res8 = validatePassword('12345678');
      expect(res8.valid).toBe(true);

      // 128 characters (accepted)
      const pass128 = 'a'.repeat(128);
      const res128 = validatePassword(pass128);
      expect(res128.valid).toBe(true);

      // 129 characters (rejected to prevent scrypt CPU exhaustion DoS)
      const pass129 = 'a'.repeat(129);
      const res129 = validatePassword(pass129);
      expect(res129.valid).toBe(false);
      expect(res129.error).toContain('cannot exceed 128 characters');

      // Attempting registration with 129 characters throws
      await expect(
        registerUser({
          email: `boundary-len-${testRunId}@ape-parel-test.com`,
          name: 'Boundary Tester',
          password: pass129,
        })
      ).rejects.toThrow('Password cannot exceed 128 characters');
    });

    it('enforces input length boundaries for email (>255 chars) and name (>100 chars or <2 chars)', async () => {
      // Email exceeding 255 characters
      const longEmail = 'a'.repeat(245) + '@ape-parel.com';
      expect(validateEmail(longEmail)).toBe(false);

      await expect(
        registerUser({
          email: longEmail,
          name: 'Long Email User',
          password: 'ValidPassword123!',
        })
      ).rejects.toThrow('A valid email address is required');

      // Name exceeding 100 characters
      const longName = 'A'.repeat(101);
      await expect(
        registerUser({
          email: `longname-${testRunId}@ape-parel-test.com`,
          name: longName,
          password: 'ValidPassword123!',
        })
      ).rejects.toThrow('Full name cannot exceed 100 characters');

      // Name under 2 characters
      await expect(
        registerUser({
          email: `shortname-${testRunId}@ape-parel-test.com`,
          name: 'A',
          password: 'ValidPassword123!',
        })
      ).rejects.toThrow('Full name must be at least 2 characters long');
    });

    it('handles database P2002 unique constraint conflicts gracefully during concurrent onboarding', async () => {
      const userA = await registerUser({
        email: `race-a-${testRunId}@ape-parel-test.com`,
        name: 'Race User A',
        password: 'Password2026!',
      });
      const userB = await registerUser({
        email: `race-b-${testRunId}@ape-parel-test.com`,
        name: 'Race User B',
        password: 'Password2026!',
      });
      cleanupUserIds.push(userA.id, userB.id);

      const conflictSlug = `race-conflict-slug-${testRunId}`;
      cleanupCreatorSlugs.push(conflictSlug);

      // First onboarding succeeds
      await onboardCreator({
        userId: userA.id,
        displayName: 'Creator A',
        slug: conflictSlug,
        payoutDetails: 'PromptPay: 081-111-2222',
      });

      // Second onboarding with identical slug fails cleanly
      await expect(
        onboardCreator({
          userId: userB.id,
          displayName: 'Creator B',
          slug: conflictSlug,
          payoutDetails: 'PromptPay: 081-333-4444',
        })
      ).rejects.toThrow(`Creator handle "${conflictSlug}" is already taken`);
    });

    it('POST /api/creator/onboard rejects profile hijacking with 403 when session userId does not match body.userId', async () => {
      const { POST } = await import('@/app/api/creator/onboard/route');
      const { NextRequest } = await import('next/server');
      const { auth } = await import('@/auth');

      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: 'legitimate-session-owner-id', email: 'owner@ape-parel.com', role: 'CUSTOMER' },
        expires: new Date(Date.now() + 3600000).toISOString(),
      } as any);

      const req = new NextRequest('http://localhost:3000/api/creator/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'victim-user-to-hijack',
          displayName: 'Malicious Creator Attempt',
          slug: `hijack-attempt-${testRunId}`,
          payoutDetails: 'Attacker Bank Details',
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toBe('Forbidden');
      expect(data.message).toContain('You cannot create a profile on behalf of another user');
    });

    it('POST /api/supplier/onboard rejects profile hijacking with 403 when session userId does not match body.userId', async () => {
      const { POST } = await import('@/app/api/supplier/onboard/route');
      const { NextRequest } = await import('next/server');
      const { auth } = await import('@/auth');

      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: 'legitimate-supplier-session-id', email: 'supplier-owner@ape-parel.com', role: 'CUSTOMER' },
        expires: new Date(Date.now() + 3600000).toISOString(),
      } as any);

      const req = new NextRequest('http://localhost:3000/api/supplier/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'victim-supplier-to-hijack',
          companyName: 'Malicious Mill Attempt',
          slug: `hijack-supp-${testRunId}`,
          location: 'Attacker Mill Location',
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toBe('Forbidden');
      expect(data.message).toContain('You cannot create a supplier profile on behalf of another user');
    });

    it('POST onboarding API routes reject unauthenticated requests without userId with 401 Unauthorized', async () => {
      const { POST: creatorPost } = await import('@/app/api/creator/onboard/route');
      const { POST: supplierPost } = await import('@/app/api/supplier/onboard/route');
      const { NextRequest } = await import('next/server');

      // Creator onboard without userId
      const cReq = new NextRequest('http://localhost:3000/api/creator/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: 'No User Creator',
          slug: `no-user-creator-${testRunId}`,
          payoutDetails: 'PromptPay: 081-000-0000',
        }),
      });
      const cRes = await creatorPost(cReq);
      expect(cRes.status).toBe(401);

      // Supplier onboard without userId
      const sReq = new NextRequest('http://localhost:3000/api/supplier/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'No User Mill',
          slug: `no-user-mill-${testRunId}`,
          location: 'Bangkok',
        }),
      });
      const sRes = await supplierPost(sReq);
      expect(sRes.status).toBe(401);
    });

    it('POST onboarding API routes return 409 Conflict when slug already exists', async () => {
      const { POST: creatorPost } = await import('@/app/api/creator/onboard/route');
      const { POST: supplierPost } = await import('@/app/api/supplier/onboard/route');
      const { NextRequest } = await import('next/server');

      const user = await registerUser({
        email: `api-conflict-${testRunId}@ape-parel-test.com`,
        name: 'Conflict Tester',
        password: 'Password2026!',
      });
      cleanupUserIds.push(user.id);

      const creatorSlug = `api-artist-${testRunId}`; // already used in previous test

      const cReq = new NextRequest('http://localhost:3000/api/creator/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          displayName: 'Conflict Creator Studio',
          slug: creatorSlug,
          payoutDetails: 'PromptPay: 081-999-8888',
        }),
      });
      const cRes = await creatorPost(cReq);
      expect(cRes.status).toBe(409);

      const supplierSlug = `api-mill-${testRunId}`; // already used in previous test
      const sReq = new NextRequest('http://localhost:3000/api/supplier/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          companyName: 'Conflict Mill Works',
          slug: supplierSlug,
          location: 'Bangkok, Thailand',
        }),
      });
      const sRes = await supplierPost(sReq);
      expect(sRes.status).toBe(409);
    });
  });

  describe('10. Un-onboarded Role Intents, Orders Resolution & Portal Routing (R1, R3, R4)', () => {
    it('accurately identifies un-onboarded state for users registering with SUPPLIER role intent', async () => {
      const prospectiveSupplier = await registerUser({
        email: `supp-intent-unonboarded-${testRunId}@ape-parel-test.com`,
        name: 'Unonboarded Factory Lead',
        password: 'Password2026!',
        role: 'SUPPLIER',
      });
      cleanupUserIds.push(prospectiveSupplier.id);

      // Verify DB role is SUPPLIER but hasSupplierProfile is strictly FALSE
      const profiles = await getUserRoleProfiles(prospectiveSupplier.id);
      expect(profiles?.role).toBe('SUPPLIER');
      expect(profiles?.hasSupplierProfile).toBe(false);
      expect(profiles?.supplierProfile).toBeNull();

      // Completing onboarding should transition hasSupplierProfile to TRUE
      const slug = `factory-intent-${testRunId}`;
      cleanupSupplierSlugs.push(slug);
      const supplier = await onboardSupplier({
        userId: prospectiveSupplier.id,
        companyName: 'Intent Factory Works',
        slug,
        location: 'Samut Prakan, Thailand',
      });

      expect(supplier.id).toBeDefined();
      const updatedProfiles = await getUserRoleProfiles(prospectiveSupplier.id);
      expect(updatedProfiles?.hasSupplierProfile).toBe(true);
      expect(updatedProfiles?.supplierProfile?.slug).toBe(slug);
    });

    it('accurately identifies un-onboarded state for users registering with CREATOR role intent', async () => {
      const prospectiveCreator = await registerUser({
        email: `creator-intent-unonboarded-${testRunId}@ape-parel-test.com`,
        name: 'Unonboarded Graphic Artist',
        password: 'Password2026!',
        role: 'CREATOR',
      });
      cleanupUserIds.push(prospectiveCreator.id);

      // Verify DB role is CREATOR but hasCreatorProfile is strictly FALSE
      const profiles = await getUserRoleProfiles(prospectiveCreator.id);
      expect(profiles?.role).toBe('CREATOR');
      expect(profiles?.hasCreatorProfile).toBe(false);
      expect(profiles?.creatorProfile).toBeNull();

      // Completing onboarding should transition hasCreatorProfile to TRUE
      const slug = `artist-intent-${testRunId}`;
      cleanupCreatorSlugs.push(slug);
      const creator = await onboardCreator({
        userId: prospectiveCreator.id,
        displayName: 'Intent Artist Studio',
        slug,
        payoutDetails: 'PromptPay: 081-555-6666',
      });

      expect(creator.id).toBeDefined();
      const updatedProfiles = await getUserRoleProfiles(prospectiveCreator.id);
      expect(updatedProfiles?.hasCreatorProfile).toBe(true);
      expect(updatedProfiles?.creatorProfile?.slug).toBe(slug);
    });

    it('resolves customer orders query for /account/orders page cleanly', async () => {
      const customer = await registerUser({
        email: `orders-customer-${testRunId}@ape-parel-test.com`,
        name: 'Order Viewer Customer',
        password: 'Password2026!',
        role: 'CUSTOMER',
      });
      cleanupUserIds.push(customer.id);

      // Query orders using Prisma relation as performed in /account/orders page
      const orders = await prisma.order.findMany({
        where: {
          customerId: customer.id,
        },
        include: {
          design: {
            include: {
              garmentProduct: true,
            },
          },
          obligations: {
            include: {
              artwork: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(Array.isArray(orders)).toBe(true);
      expect(orders.length).toBe(0); // Brand new user has 0 orders initially
    });
  });

  describe('11. Security Hardening & Contextual Role Navigation Verification (R1-R5)', () => {
    it('rejects unauthenticated requests with body.userId in production environment (401 Unauthorized)', async () => {
      const prevEnv = process.env.NODE_ENV;
      try {
        (process.env as any).NODE_ENV = 'production';
        const { POST: creatorPost } = await import('@/app/api/creator/onboard/route');
        const { POST: supplierPost } = await import('@/app/api/supplier/onboard/route');
        const { NextRequest } = await import('next/server');

        // Unauthenticated creator onboard attempt passing body.userId
        const cReq = new NextRequest('http://localhost:3000/api/creator/onboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'victim-user-id',
            displayName: 'Attacker Studio',
            slug: `attacker-slug-${testRunId}`,
            payoutDetails: 'PromptPay: 081-111-2222',
          }),
        });
        const cRes = await creatorPost(cReq);
        expect(cRes.status).toBe(401);
        const cData = await cRes.json();
        expect(cData.error).toBe('Unauthorized');
        expect(cData.message).toContain('You must be signed in to set up a Creator profile');

        // Unauthenticated supplier onboard attempt passing body.userId
        const sReq = new NextRequest('http://localhost:3000/api/supplier/onboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'victim-user-id',
            companyName: 'Attacker Mill',
            slug: `attacker-mill-${testRunId}`,
            location: 'Bangkok',
          }),
        });
        const sRes = await supplierPost(sReq);
        expect(sRes.status).toBe(401);
        const sData = await sRes.json();
        expect(sData.error).toBe('Unauthorized');
        expect(sData.message).toContain('You must be signed in to set up a Supplier profile');
      } finally {
        (process.env as any).NODE_ENV = prevEnv;
      }
    });

    it('verifies StudioAuthModal provides links to email/password /login and /register', async () => {
      const { StudioAuthModal } = await import('@/components/studio/StudioAuthModal');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const React = await import('react');

      const html = renderToStaticMarkup(
        React.createElement(StudioAuthModal, {
          isOpen: true,
          onClose: () => {},
          pendingAction: 'SAVE',
        })
      );

      expect(html).toContain('/login?callbackUrl=/studio/new');
      expect(html).toContain('/register?callbackUrl=/studio/new');
      expect(html).toContain('Or sign in with email:');
    });
  });
});

