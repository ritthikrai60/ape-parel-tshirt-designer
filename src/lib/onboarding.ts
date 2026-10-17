import { prisma } from '@/lib/prisma';

export interface OnboardCreatorInput {
  userId: string;
  displayName: string;
  slug: string;
  bio?: string;
  avatarUrl?: string;
  website?: string;
  payoutDetails: string;
}

export interface OnboardSupplierInput {
  userId: string;
  companyName: string;
  slug: string;
  description?: string;
  location: string;
  contactEmail?: string;
  contactPhone?: string;
  taxId?: string;
  dbdDocUrl?: string;
  vatDocUrl?: string;
  bankBookDocUrl?: string;
  machineryPhotos?: string;
  leadTimeDays?: number;
  minOrderQuantity?: number;
  autoApprove?: boolean;
}

/**
 * Normalizes a string to a valid URL-safe slug.
 */
export function formatSlug(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Atomically onboards a CreatorProfile for an existing User.
 * Creates CreatorProfile, double-entry FinancialAccount, initial Storefront Settings,
 * upgrades user.role to CREATOR, and records an AuditEvent.
 */
export async function onboardCreator(input: OnboardCreatorInput) {
  if (!input || typeof input !== 'object') {
    throw new Error('Onboarding input is required');
  }

  if (!input.userId || typeof input.userId !== 'string') {
    throw new Error('User ID is required for creator onboarding');
  }

  const displayName = typeof input.displayName === 'string' ? input.displayName.trim() : '';
  if (!displayName || displayName.length < 2) {
    throw new Error('Display name must be at least 2 characters long');
  }
  if (displayName.length > 100) {
    throw new Error('Display name cannot exceed 100 characters');
  }

  const rawSlug = typeof input.slug === 'string' ? input.slug : displayName;
  const slug = formatSlug(rawSlug);
  if (!slug || slug.length < 2) {
    throw new Error('A valid unique slug is required (minimum 2 characters)');
  }
  if (slug.length > 50) {
    throw new Error('Creator slug cannot exceed 50 characters');
  }

  const payoutDetails = typeof input.payoutDetails === 'string' ? input.payoutDetails.trim() : '';
  if (!payoutDetails || payoutDetails.length < 5) {
    throw new Error('Valid PromptPay or bank payout details are required');
  }
  if (payoutDetails.length > 255) {
    throw new Error('Payout details cannot exceed 255 characters');
  }

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    include: { creatorProfile: true },
  });

  if (!user) {
    throw new Error(`User with ID ${input.userId} does not exist`);
  }

  if (user.creatorProfile) {
    throw new Error('User already has an active Creator profile');
  }

  // Check slug uniqueness
  const existingSlug = await prisma.creatorProfile.findUnique({
    where: { slug },
  });

  if (existingSlug) {
    throw new Error(`Creator handle "${slug}" is already taken. Please choose another slug.`);
  }

  // Atomic transaction with P2002 race protection
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Create CreatorProfile
      const creator = await tx.creatorProfile.create({
        data: {
          userId: user.id,
          slug,
          displayName,
          bio: typeof input.bio === 'string' ? input.bio.trim() || null : null,
          avatarUrl: input.avatarUrl || user.image || null,
          website: typeof input.website === 'string' ? input.website.trim() || null : null,
          payoutDetails,
        },
      });

      // 2. Create double-entry FinancialAccount for royalty ledger
      const accountNumber = `ACC-CREATOR-${slug}`;
      await tx.financialAccount.create({
        data: {
          accountType: 'CREATOR',
          accountNumber,
          balance: 0,
          currency: 'THB',
          creatorId: creator.id,
          status: 'ACTIVE',
        },
      });

      // 3. Create initial Storefront Settings
      await tx.creatorStorefrontSettings.create({
        data: {
          creatorId: creator.id,
          customSlug: slug,
          bio: creator.bio,
          avatarUrl: creator.avatarUrl,
          badgeVerified: false,
        },
      });

      // 4. Update User role
      await tx.user.update({
        where: { id: user.id },
        data: { role: 'CREATOR' },
      });

      // 5. Record audit event
      await tx.auditEvent.create({
        data: {
          userId: user.id,
          actorId: user.id,
          action: 'CREATOR_ONBOARDING_COMPLETED',
          entityType: 'CreatorProfile',
          entityId: creator.id,
          payload: JSON.stringify({ slug, displayName, accountNumber }),
        },
      });

      return creator;
    });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(',')
        : String(error.meta?.target || '');
      if (target.includes('slug')) {
        throw new Error(`Creator handle "${slug}" is already taken. Please choose another slug.`);
      }
      if (target.includes('userId')) {
        throw new Error('User already has an active Creator profile');
      }
      throw new Error(`Creator handle "${slug}" is already taken. Please choose another slug.`);
    }
    throw error;
  }
}

/**
 * Atomically onboards a SupplierProfile for an existing User.
 * Creates SupplierProfile, default PrintingService (DTG), upgrades user.role to SUPPLIER,
 * and records an AuditEvent.
 */
export async function onboardSupplier(input: OnboardSupplierInput) {
  if (!input || typeof input !== 'object') {
    throw new Error('Onboarding input is required');
  }

  if (!input.userId || typeof input.userId !== 'string') {
    throw new Error('User ID is required for supplier onboarding');
  }

  const companyName = typeof input.companyName === 'string' ? input.companyName.trim() : '';
  if (!companyName || companyName.length < 2) {
    throw new Error('Company name must be at least 2 characters long');
  }
  if (companyName.length > 100) {
    throw new Error('Company name cannot exceed 100 characters');
  }

  const rawSlug = typeof input.slug === 'string' ? input.slug : companyName;
  const slug = formatSlug(rawSlug);
  if (!slug || slug.length < 2) {
    throw new Error('A valid unique company slug is required');
  }
  if (slug.length > 50) {
    throw new Error('Supplier company slug cannot exceed 50 characters');
  }

  const location = typeof input.location === 'string' ? input.location.trim() : '';
  if (!location || location.length < 3) {
    throw new Error('Factory / manufacturing location is required');
  }
  if (location.length > 200) {
    throw new Error('Location cannot exceed 200 characters');
  }

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    include: { supplierProfile: true },
  });

  if (!user) {
    throw new Error(`User with ID ${input.userId} does not exist`);
  }

  if (user.supplierProfile) {
    throw new Error('User already has an active Supplier profile');
  }

  // Check slug uniqueness
  const existingSlug = await prisma.supplierProfile.findUnique({
    where: { slug },
  });

  if (existingSlug) {
    throw new Error(`Supplier handle "${slug}" is already taken. Please choose another slug.`);
  }

  const contactEmail = input.contactEmail?.trim().toLowerCase() || user.email || `contact@${slug}.com`;
  const contactPhone = typeof input.contactPhone === 'string' ? input.contactPhone.trim() || null : null;
  const leadTimeDays = typeof input.leadTimeDays === 'number' && input.leadTimeDays > 0 ? input.leadTimeDays : 5;
  const minOrderQuantity = typeof input.minOrderQuantity === 'number' && input.minOrderQuantity > 0 ? input.minOrderQuantity : 1;

  // Atomic transaction with P2002 race protection
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Create SupplierProfile
      const isAutoApprove = input.autoApprove ?? false;
      const supplier = await tx.supplierProfile.create({
        data: {
          userId: user.id,
          slug,
          companyName,
          description: typeof input.description === 'string' ? input.description.trim() || null : null,
          location,
          contactEmail,
          contactPhone,
          taxId: typeof input.taxId === 'string' ? input.taxId.trim() || null : null,
          dbdDocUrl: input.dbdDocUrl || null,
          vatDocUrl: input.vatDocUrl || null,
          bankBookDocUrl: input.bankBookDocUrl || null,
          machineryPhotos: input.machineryPhotos || null,
          leadTimeDays,
          minOrderQuantity,
          verified: isAutoApprove,
          verificationStatus: isAutoApprove ? 'APPROVED' : 'PENDING',
        },
      });

      // 2. Create default Kornit DTG PrintingService
      await tx.printingService.create({
        data: {
          supplierId: supplier.id,
          name: 'Kornit Digital High-Definition DTG',
          code: 'DTG',
          description: 'Industrial water-based pigment direct-to-garment digital print.',
          pricePerSurface: 80,
          maxPrintWidthCm: 35.0,
          maxPrintHeightCm: 45.0,
          supportedSurfaces: 'BOTH',
          minOrderQty: 1,
        },
      });

      // 3. Update User role
      await tx.user.update({
        where: { id: user.id },
        data: { role: 'SUPPLIER' },
      });

      // 4. Record audit event
      await tx.auditEvent.create({
        data: {
          userId: user.id,
          actorId: user.id,
          action: 'SUPPLIER_ONBOARDING_COMPLETED',
          entityType: 'SupplierProfile',
          entityId: supplier.id,
          payload: JSON.stringify({ slug, companyName, leadTimeDays }),
        },
      });

      return supplier;
    });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(',')
        : String(error.meta?.target || '');
      if (target.includes('slug')) {
        throw new Error(`Supplier handle "${slug}" is already taken. Please choose another slug.`);
      }
      if (target.includes('userId')) {
        throw new Error('User already has an active Supplier profile');
      }
      throw new Error(`Supplier handle "${slug}" is already taken. Please choose another slug.`);
    }
    throw error;
  }
}

/**
 * Returns complete user role and profile information for role switching & progressive onboarding.
 */
export async function getUserRoleProfiles(userId: string) {
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      creatorProfile: true,
      supplierProfile: true,
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    phone: user.phone,
    shippingName: user.shippingName,
    shippingPhone: user.shippingPhone,
    shippingAddress: user.shippingAddress,
    shippingCity: user.shippingCity,
    shippingProvince: user.shippingProvince,
    shippingPostal: user.shippingPostal,
    shippingCountry: user.shippingCountry,
    taxId: user.taxId,
    billingName: user.billingName,
    billingAddress: user.billingAddress,
    hasCreatorProfile: !!user.creatorProfile,
    creatorProfile: user.creatorProfile
      ? {
          id: user.creatorProfile.id,
          slug: user.creatorProfile.slug,
          displayName: user.creatorProfile.displayName,
        }
      : null,
    hasSupplierProfile: !!user.supplierProfile,
    supplierProfile: user.supplierProfile
      ? {
          id: user.supplierProfile.id,
          slug: user.supplierProfile.slug,
          companyName: user.supplierProfile.companyName,
        }
      : null,
  };
}
