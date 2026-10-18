import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// Mock auth helper to prevent NextAuth Node ESM module resolution in Vitest
let currentMockSession: any = null;
vi.mock('@/auth', () => ({
  auth: vi.fn(async () => currentMockSession),
}));

import { GET, PATCH } from '@/app/api/artworks/[id]/route';

describe('Artwork Edit, License Pricing In-Place Update & Strict Moderation Suite', () => {
  const testRunId = Date.now().toString().slice(-6);

  let creatorUser: any;
  let otherUser: any;
  let creatorProfile: any;
  let artwork: any;
  let perGarmentLic: any;
  let lifetimeLic: any;

  beforeEach(async () => {
    // 1. Creator User & Profile
    creatorUser = await prisma.user.create({
      data: {
        email: `artist_${testRunId}_${Math.random().toString(36).substring(7)}@ape-parel.test`,
        name: 'Ape Art Director',
        role: 'CREATOR',
      },
    });

    otherUser = await prisma.user.create({
      data: {
        email: `stranger_${testRunId}_${Math.random().toString(36).substring(7)}@ape-parel.test`,
        name: 'Random Imposter',
        role: 'CREATOR',
      },
    });

    creatorProfile = await prisma.creatorProfile.create({
      data: {
        userId: creatorUser.id,
        displayName: 'Ape Art Director Studio',
        slug: `ape-studio-${testRunId}-${Math.random().toString(36).substring(7)}`,
      },
    });

    // 2. Artwork with APPROVED & PUBLISHED status
    artwork = await prisma.artwork.create({
      data: {
        creatorId: creatorProfile.id,
        title: 'Original Cyber Ape Design',
        description: 'Original vintage cyber ape art piece',
        previewUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800',
        originalUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=2400',
        status: 'PUBLISHED',
        moderationStatus: 'APPROVED',
        moderatedAt: new Date(),
        licenseOptions: {
          create: [
            {
              name: 'Standard License (Per Garment)',
              terms: 'Standard single garment print royalty',
              price: 40,
              scope: 'PER_GARMENT',
            },
            {
              name: 'Lifetime License (Buyout)',
              terms: 'Unlimited personal prints without per-garment royalty',
              price: 500,
              scope: 'UNLIMITED',
            },
          ],
        },
      },
      include: {
        licenseOptions: true,
      },
    });

    perGarmentLic = artwork.licenseOptions.find((l: any) => l.scope === 'PER_GARMENT');
    lifetimeLic = artwork.licenseOptions.find((l: any) => l.scope === 'UNLIMITED');
  });

  it('GET /api/artworks/[id] retrieves artwork with creator and license options', async () => {
    const req = new NextRequest(`http://localhost:3000/api/artworks/${artwork.id}`);
    const res = await GET(req, { params: { id: artwork.id } });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.artwork.id).toBe(artwork.id);
    expect(body.artwork.title).toBe('Original Cyber Ape Design');
    expect(body.artwork.creator.displayName).toBe('Ape Art Director Studio');
    expect(body.artwork.licenseOptions.length).toBe(2);
  });

  it('PATCH /api/artworks/[id] enforces strict moderation: editing title transitions to PENDING and DRAFT', async () => {
    const req = new NextRequest(`http://localhost:3000/api/artworks/${artwork.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-creator-id': creatorProfile.id,
      },
      body: JSON.stringify({
        title: 'Renamed Cyber Gorilla 2026',
      }),
    });

    const res = await PATCH(req, { params: { id: artwork.id } });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.requiresRemoderation).toBe(true);
    expect(body.artwork.title).toBe('Renamed Cyber Gorilla 2026');
    expect(body.artwork.moderationStatus).toBe('PENDING');
    expect(body.artwork.status).toBe('DRAFT');

    // Confirm directly in database
    const dbArtwork = await prisma.artwork.findUnique({ where: { id: artwork.id } });
    expect(dbArtwork?.moderationStatus).toBe('PENDING');
    expect(dbArtwork?.status).toBe('DRAFT');
  });

  it('PATCH /api/artworks/[id] enforces strict moderation: editing description transitions to PENDING and DRAFT', async () => {
    const req = new NextRequest(`http://localhost:3000/api/artworks/${artwork.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-creator-id': creatorProfile.id,
      },
      body: JSON.stringify({
        description: 'Newly altered provocative backstory text',
      }),
    });

    const res = await PATCH(req, { params: { id: artwork.id } });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.requiresRemoderation).toBe(true);
    expect(body.artwork.moderationStatus).toBe('PENDING');
    expect(body.artwork.status).toBe('DRAFT');
  });

  it('PATCH /api/artworks/[id] updating only prices keeps APPROVED & PUBLISHED status and updates in-place', async () => {
    const req = new NextRequest(`http://localhost:3000/api/artworks/${artwork.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-creator-id': creatorProfile.id,
      },
      body: JSON.stringify({
        perGarmentPrice: 65,
        lifetimePrice: 750,
      }),
    });

    const res = await PATCH(req, { params: { id: artwork.id } });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.requiresRemoderation).toBe(false);
    expect(body.artwork.moderationStatus).toBe('APPROVED');
    expect(body.artwork.status).toBe('PUBLISHED');

    // Verify in-place update preserved existing IDs
    const updatedPerGarment = body.artwork.licenseOptions.find((l: any) => l.scope === 'PER_GARMENT');
    const updatedLifetime = body.artwork.licenseOptions.find((l: any) => l.scope === 'UNLIMITED');

    expect(updatedPerGarment.id).toBe(perGarmentLic.id);
    expect(updatedPerGarment.price).toBe(65);

    expect(updatedLifetime.id).toBe(lifetimeLic.id);
    expect(updatedLifetime.price).toBe(750);
  });

  it('PATCH /api/artworks/[id] preserves Foreign Key integrity for existing UserArtworkLicense and LicenseOption', async () => {
    // Create a buyer and a UserArtworkLicense referencing existing licenseOption
    const buyer = await prisma.user.create({
      data: {
        email: `buyer_${testRunId}_${Math.random().toString(36).substring(7)}@ape-parel.test`,
        name: 'Historical License Holder',
        role: 'CUSTOMER',
      },
    });

    const userLicense = await prisma.userArtworkLicense.create({
      data: {
        userId: buyer.id,
        artworkId: artwork.id,
        licenseOptionId: lifetimeLic.id, // FK references this lifetime license option!
        certificateNumber: `LIC-HIST-${testRunId}-${Math.floor(Math.random() * 100000)}`,
        agreementSnapshot: JSON.stringify({ scope: 'UNLIMITED', price: 500 }),
        sha256Hash: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      },
    });

    // Now execute PATCH to update lifetime price from 500 to 1200
    const req = new NextRequest(`http://localhost:3000/api/artworks/${artwork.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-creator-id': creatorProfile.id,
      },
      body: JSON.stringify({
        lifetimePrice: 1200,
      }),
    });

    const res = await PATCH(req, { params: { id: artwork.id } });
    expect(res.status).toBe(200);

    // UserArtworkLicense must still point to the same licenseOptionId without foreign key violation!
    const checkLicense = await prisma.userArtworkLicense.findUnique({
      where: { id: userLicense.id },
      include: { licenseOption: true },
    });

    expect(checkLicense).not.toBeNull();
    expect(checkLicense?.licenseOptionId).toBe(lifetimeLic.id);
    expect(checkLicense?.licenseOption?.price).toBe(1200);
  });

  it('PATCH /api/artworks/[id] rejects unauthorized user with 403 Forbidden', async () => {
    const req = new NextRequest(`http://localhost:3000/api/artworks/${artwork.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-creator-id': otherUser.id,
      },
      body: JSON.stringify({
        title: 'Hacked by unauthorized user',
      }),
    });

    const res = await PATCH(req, { params: { id: artwork.id } });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('PATCH /api/artworks/[id] rejects invalid price or empty title with 400 Bad Request', async () => {
    const req = new NextRequest(`http://localhost:3000/api/artworks/${artwork.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-creator-id': creatorProfile.id,
      },
      body: JSON.stringify({
        title: '   ',
        perGarmentPrice: -50,
      }),
    });

    const res = await PATCH(req, { params: { id: artwork.id } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation Error');
  });

  afterAll(async () => {
    try {
      await prisma.auditEvent.deleteMany({
        where: { entityId: { startsWith: 'cmvd' } },
      });
      await prisma.userArtworkLicense.deleteMany({
        where: { certificateNumber: { startsWith: 'LIC-HIST-' } },
      });
      await prisma.licenseOption.deleteMany({
        where: { artwork: { title: { in: ['Original Cyber Ape Design', 'Renamed Cyber Gorilla 2026'] } } },
      });
      await prisma.artwork.deleteMany({
        where: { title: { in: ['Original Cyber Ape Design', 'Renamed Cyber Gorilla 2026'] } },
      });
      await prisma.creatorProfile.deleteMany({
        where: { slug: { startsWith: 'ape-studio-' } },
      });
    } catch {
      // Ignore cleanup error
    } finally {
      await prisma.$disconnect();
    }
  });
});
