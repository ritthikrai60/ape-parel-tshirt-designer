import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export interface AgreementSnapshot {
  certificateNumber: string;
  issuedAt: string;
  platform: string;
  licensor: {
    creatorId: string;
    displayName: string;
    slug: string;
  };
  licensee: {
    userId: string;
    name: string;
    email?: string;
  };
  licensedAsset: {
    artworkId: string;
    title: string;
    previewUrl: string;
    category: string;
  };
  licenseTerms: {
    scope: 'UNLIMITED';
    type: 'PERMANENT_IP';
    perpetualRights: boolean;
    zeroPlatformReprintFee: boolean;
    commercialGarmentAllowed: boolean;
    digitalAssetResaleAllowed: boolean;
    legalSummary: string;
  };
  cryptographicProof: {
    hashAlgorithm: 'SHA-256';
    sha256Hash: string;
  };
}

/**
 * Generate a unique, professional Permanent IP License Certificate Number
 * Format: LIC-PIP-YYYY-XXXX-XXXX
 */
export function generateCertificateNumber(): string {
  const year = new Date().getFullYear();
  const randomChars = crypto.randomBytes(4).toString('hex').toUpperCase();
  const randomChars2 = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `LIC-PIP-${year}-${randomChars}-${randomChars2}`;
}

/**
 * Computes deterministic SHA-256 hash for agreement verification
 */
export function calculateAgreementHash(payload: {
  certificateNumber: string;
  userId: string;
  artworkId: string;
  licenseOptionId: string;
  issuedAt: string;
}): string {
  const serialized = JSON.stringify({
    cert: payload.certificateNumber,
    user: payload.userId,
    art: payload.artworkId,
    lic: payload.licenseOptionId,
    date: payload.issuedAt,
    salt: 'ape-parel-permanent-ip-v1',
  });
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

export interface IssueLicenseInput {
  userId: string;
  artworkId: string;
  licenseOptionId: string;
  orderId?: string;
}

/**
 * Issue or grant Permanent IP License atomically to user
 */
export async function issuePermanentLicenseAtomic(
  input: IssueLicenseInput,
  txClient?: any
) {
  const db = txClient || prisma;
  const [user, artwork, licenseOption] = await Promise.all([
    db.user.findUnique({
      where: { id: input.userId },
      select: { id: true, name: true, email: true },
    }),
    db.artwork.findUnique({
      where: { id: input.artworkId },
      include: { creator: true },
    }),
    db.licenseOption.findUnique({
      where: { id: input.licenseOptionId },
    }),
  ]);

  if (!user) throw new Error(`User not found: ${input.userId}`);
  if (!artwork) throw new Error(`Artwork not found: ${input.artworkId}`);
  if (!licenseOption) throw new Error(`License option not found: ${input.licenseOptionId}`);

  // Check if existing active license already owned
  const existingLicense = await db.userArtworkLicense.findUnique({
    where: {
      userId_artworkId: {
        userId: input.userId,
        artworkId: input.artworkId,
      },
    },
  });

  if (existingLicense && existingLicense.status === 'ACTIVE') {
    return {
      success: true,
      alreadyOwned: true,
      license: existingLicense,
      certificateNumber: existingLicense.certificateNumber,
      message: 'User already holds an active Permanent IP license for this artwork.',
    };
  }

  const certificateNumber = generateCertificateNumber();
  const issuedAt = new Date().toISOString();
  const sha256Hash = calculateAgreementHash({
    certificateNumber,
    userId: input.userId,
    artworkId: input.artworkId,
    licenseOptionId: input.licenseOptionId,
    issuedAt,
  });

  const agreementSnapshot: AgreementSnapshot = {
    certificateNumber,
    issuedAt,
    platform: 'ape-parel Decentralized Streetwear Platform',
    licensor: {
      creatorId: artwork.creator.id,
      displayName: artwork.creator.displayName,
      slug: artwork.creator.slug,
    },
    licensee: {
      userId: user.id,
      name: user.name || 'Anonymous Collector',
      email: user.email || undefined,
    },
    licensedAsset: {
      artworkId: artwork.id,
      title: artwork.title,
      previewUrl: artwork.previewUrl,
      category: artwork.category,
    },
    licenseTerms: {
      scope: 'UNLIMITED',
      type: 'PERMANENT_IP',
      perpetualRights: true,
      zeroPlatformReprintFee: true,
      commercialGarmentAllowed: true,
      digitalAssetResaleAllowed: false,
      legalSummary:
        'ผู้ให้อนุญาต (Creator) ตกลงมอบสิทธิ์การใช้งานผลงานศิลปะแก่ผู้ได้รับอนุญาต (Licensee) แบบไม่จำกัดระยะเวลาตลอดชีพ เพื่อสั่งผลิตสินค้าสกรีนบนแพลตฟอร์ม ape-parel โดยได้รับยกเว้นค่าลิขสิทธิ์ซ้ำซ้อน (฿0) ตลอดไป โดยไม่อนุญาตให้นำไฟล์ดิจิทัลดิบไปจำหน่ายต่อโดยตรง',
    },
    cryptographicProof: {
      hashAlgorithm: 'SHA-256',
      sha256Hash,
    },
  };

  const license = await db.userArtworkLicense.upsert({
    where: {
      userId_artworkId: {
        userId: input.userId,
        artworkId: input.artworkId,
      },
    },
    update: {
      licenseOptionId: input.licenseOptionId,
      orderId: input.orderId || null,
      certificateNumber,
      agreementSnapshot: JSON.stringify(agreementSnapshot),
      sha256Hash,
      status: 'ACTIVE',
      acquiredAt: new Date(issuedAt),
    },
    create: {
      userId: input.userId,
      artworkId: input.artworkId,
      licenseOptionId: input.licenseOptionId,
      orderId: input.orderId || null,
      certificateNumber,
      agreementSnapshot: JSON.stringify(agreementSnapshot),
      sha256Hash,
      status: 'ACTIVE',
      acquiredAt: new Date(issuedAt),
    },
  });

  return {
    success: true,
    alreadyOwned: false,
    license,
    certificateNumber,
    agreementSnapshot,
    message: 'Permanent IP license certificate successfully issued.',
  };
}

/**
 * Verify a Permanent IP License Certificate by certificate number
 */
export async function verifyLicenseCertificate(certificateNumber: string) {
  const cleanNumber = certificateNumber.trim();
  const record = await prisma.userArtworkLicense.findUnique({
    where: { certificateNumber: cleanNumber },
    include: {
      user: { select: { id: true, name: true, email: true } },
      artwork: {
        include: {
          creator: { select: { id: true, displayName: true, slug: true } },
        },
      },
      order: { select: { id: true, orderNumber: true, createdAt: true } },
    },
  });

  if (!record) {
    return {
      isValid: false,
      message: 'Certificate not found in authoritative ape-parel ledger.',
    };
  }

  let snapshot: AgreementSnapshot | null = null;
  try {
    snapshot = JSON.parse(record.agreementSnapshot);
  } catch {}

  const dateForHash = snapshot?.issuedAt || record.acquiredAt.toISOString();
  const expectedHash = calculateAgreementHash({
    certificateNumber: record.certificateNumber,
    userId: record.userId,
    artworkId: record.artworkId,
    licenseOptionId: record.licenseOptionId,
    issuedAt: dateForHash,
  });

  const isHashAuthentic =
    record.sha256Hash === expectedHash &&
    Boolean(snapshot?.cryptographicProof?.sha256Hash) &&
    snapshot?.cryptographicProof?.sha256Hash === record.sha256Hash;

  return {
    isValid: record.status === 'ACTIVE' && isHashAuthentic,
    record,
    snapshot,
    isHashAuthentic,
    status: record.status,
  };
}
