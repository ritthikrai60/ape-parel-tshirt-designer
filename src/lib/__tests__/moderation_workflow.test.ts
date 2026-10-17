import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { GET as getModeration, PATCH as patchModeration } from '@/app/api/admin/moderation/route';
import { GET as getNotifications, PATCH as patchNotifications } from '@/app/api/notifications/route';
import { NextRequest } from 'next/server';

// Mock auth helper
let currentMockSession: any = null;
vi.mock('@/auth', () => ({
  auth: vi.fn(async () => currentMockSession),
}));

describe('Admin Moderation & Notification System', () => {
  let adminUser: any;
  let creatorUser: any;
  let creatorProfile: any;
  let testArtwork: any;

  beforeEach(async () => {
    // Clean up test data
    await prisma.notification.deleteMany();
    await prisma.auditEvent.deleteMany();
    await prisma.artwork.deleteMany({
      where: { title: { startsWith: 'Test Moderation Artwork' } },
    });
    await prisma.creatorProfile.deleteMany({
      where: { slug: 'test-creator-mod' },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ['admin-mod@example.com', 'creator-mod@example.com'] } },
    });

    // Seed test users
    adminUser = await prisma.user.create({
      data: {
        email: 'admin-mod@example.com',
        name: 'Super Admin',
        role: 'ADMIN',
      },
    });

    creatorUser = await prisma.user.create({
      data: {
        email: 'creator-mod@example.com',
        name: 'Artist Jane',
        role: 'CREATOR',
      },
    });

    creatorProfile = await prisma.creatorProfile.create({
      data: {
        userId: creatorUser.id,
        slug: 'test-creator-mod',
        displayName: 'Artist Jane',
        payoutDetails: 'PromptPay 0812345678',
      },
    });

    // Seed test artwork in DRAFT + PENDING
    testArtwork = await prisma.artwork.create({
      data: {
        creatorId: creatorProfile.id,
        title: 'Test Moderation Artwork 1',
        description: 'Test transparent sticker',
        previewUrl: 'https://example.com/preview.png',
        originalUrl: 'https://example.com/original.png',
        status: 'DRAFT',
        moderationStatus: 'PENDING',
      },
    });
  });

  it('blocks non-admin users from moderation API', async () => {
    // Set non-admin session
    currentMockSession = {
      user: {
        id: creatorUser.id,
        email: creatorUser.email,
        role: 'CREATOR',
      },
    };

    const req = new NextRequest('http://localhost:3000/api/admin/moderation');
    const res = await getModeration(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Forbidden');
  });

  it('allows admin to query pending moderation queue', async () => {
    currentMockSession = {
      user: {
        id: adminUser.id,
        email: adminUser.email,
        role: 'ADMIN',
      },
    };

    const req = new NextRequest('http://localhost:3000/api/admin/moderation?status=PENDING');
    const res = await getModeration(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.artworks).toBeDefined();
    expect(data.counts.pending).toBeGreaterThanOrEqual(1);

    const found = data.artworks.find((a: any) => a.id === testArtwork.id);
    expect(found).toBeDefined();
    expect(found.title).toBe('Test Moderation Artwork 1');
  });

  it('approves artwork and dispatches in-app notification to creator', async () => {
    currentMockSession = {
      user: {
        id: adminUser.id,
        email: adminUser.email,
        role: 'ADMIN',
      },
    };

    const patchReq = new NextRequest('http://localhost:3000/api/admin/moderation', {
      method: 'PATCH',
      body: JSON.stringify({
        artworkId: testArtwork.id,
        action: 'APPROVE',
      }),
    });

    const res = await patchModeration(patchReq);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.artwork.moderationStatus).toBe('APPROVED');
    expect(data.artwork.status).toBe('PUBLISHED');

    // Verify DB update
    const updated = await prisma.artwork.findUnique({ where: { id: testArtwork.id } });
    expect(updated?.status).toBe('PUBLISHED');
    expect(updated?.moderationStatus).toBe('APPROVED');
    expect(updated?.moderatedById).toBe(adminUser.id);

    // Verify creator received notification
    const notifications = await prisma.notification.findMany({
      where: { userId: creatorUser.id },
    });
    expect(notifications.length).toBe(1);
    expect(notifications[0].type).toBe('ARTWORK_APPROVED');
    expect(notifications[0].title).toContain('Approved');
    expect(notifications[0].isRead).toBe(false);
  });

  it('rejects artwork with violation reason and notifies creator', async () => {
    currentMockSession = {
      user: {
        id: adminUser.id,
        email: adminUser.email,
        role: 'ADMIN',
      },
    };

    const rejectionReason = 'Solid background detected: graphic contains non-transparent white canvas.';
    const patchReq = new NextRequest('http://localhost:3000/api/admin/moderation', {
      method: 'PATCH',
      body: JSON.stringify({
        artworkId: testArtwork.id,
        action: 'REJECT',
        reason: rejectionReason,
      }),
    });

    const res = await patchModeration(patchReq);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.artwork.moderationStatus).toBe('REJECTED');
    expect(data.artwork.status).toBe('DRAFT');
    expect(data.artwork.moderationReason).toBe(rejectionReason);

    // Verify creator receives notification with reason
    const notifications = await prisma.notification.findMany({
      where: { userId: creatorUser.id },
    });
    expect(notifications.length).toBe(1);
    expect(notifications[0].type).toBe('ARTWORK_REJECTED');
    expect(notifications[0].title).toContain('Rejected');
    expect(notifications[0].message).toContain(rejectionReason);

    // Test creator fetching their notifications via API
    currentMockSession = {
      user: {
        id: creatorUser.id,
        email: creatorUser.email,
        role: 'CREATOR',
      },
    };

    const notifGetReq = new NextRequest('http://localhost:3000/api/notifications');
    const notifRes = await getNotifications(notifGetReq);
    expect(notifRes.status).toBe(200);
    const notifData = await notifRes.json();
    expect(notifData.unreadCount).toBe(1);
    expect(notifData.notifications[0].id).toBe(notifications[0].id);

    // Test marking as read
    const markReq = new NextRequest('http://localhost:3000/api/notifications', {
      method: 'PATCH',
      body: JSON.stringify({
        notificationId: notifications[0].id,
      }),
    });
    const markRes = await patchNotifications(markReq);
    expect(markRes.status).toBe(200);

    const afterRead = await prisma.notification.findUnique({
      where: { id: notifications[0].id },
    });
    expect(afterRead?.isRead).toBe(true);
  });
});
