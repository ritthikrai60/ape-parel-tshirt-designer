import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { onboardCreator, updateCreatorProfile } from '@/lib/onboarding';

describe('Creator Profile & Financial Settings Management', () => {
  const testEmailOwner = 'test-creator-profile-owner@ape-parel.test';
  const testEmailAttacker = 'test-creator-profile-attacker@ape-parel.test';
  let ownerUser: any;
  let attackerUser: any;
  let creatorProfile: any;

  beforeEach(async () => {
    // Clean up test records
    await prisma.auditEvent.deleteMany({
      where: {
        entityType: 'CreatorProfile',
      },
    });
    await prisma.creatorProfile.deleteMany({
      where: {
        user: { email: { in: [testEmailOwner, testEmailAttacker] } },
      },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [testEmailOwner, testEmailAttacker] } },
    });

    // Create test owner user
    ownerUser = await prisma.user.create({
      data: {
        email: testEmailOwner,
        name: 'Original Creator',
        role: 'CUSTOMER',
      },
    });

    // Create test attacker user
    attackerUser = await prisma.user.create({
      data: {
        email: testEmailAttacker,
        name: 'Malicious User',
        role: 'CUSTOMER',
      },
    });

    // Onboard creator
    creatorProfile = await onboardCreator({
      userId: ownerUser.id,
      displayName: 'Original Creator',
      slug: 'original-creator',
      bio: 'Initial artist bio',
      payoutDetails: 'PromptPay: 081-111-2222',
      website: 'https://original.art',
    });
  });

  afterEach(async () => {
    await prisma.auditEvent.deleteMany({
      where: {
        entityType: 'CreatorProfile',
      },
    });
    await prisma.financialAccount.deleteMany({
      where: { creatorId: creatorProfile?.id },
    });
    await prisma.creatorStorefrontSettings.deleteMany({
      where: { creatorId: creatorProfile?.id },
    });
    await prisma.creatorProfile.deleteMany({
      where: {
        user: { email: { in: [testEmailOwner, testEmailAttacker] } },
      },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [testEmailOwner, testEmailAttacker] } },
    });
  });

  it('allows creator owner to update financial details (PromptPay / Bank Account)', async () => {
    const updated = await updateCreatorProfile({
      creatorId: creatorProfile.id,
      actorUserId: ownerUser.id,
      payoutDetails: 'KBANK: 012-3-45678-9 (Updated Account)',
    });

    expect(updated.payoutDetails).toBe('KBANK: 012-3-45678-9 (Updated Account)');

    // Verify in DB
    const freshDb = await prisma.creatorProfile.findUnique({
      where: { id: creatorProfile.id },
    });
    expect(freshDb?.payoutDetails).toBe('KBANK: 012-3-45678-9 (Updated Account)');
  });

  it('allows creator owner to update profile display name, bio, and website', async () => {
    const updated = await updateCreatorProfile({
      creatorId: creatorProfile.id,
      actorUserId: ownerUser.id,
      displayName: 'New Studio Name',
      bio: 'Updated bio description with streetwear aesthetics',
      website: 'https://newstudio.design',
    });

    expect(updated.displayName).toBe('New Studio Name');
    expect(updated.bio).toBe('Updated bio description with streetwear aesthetics');
    expect(updated.website).toBe('https://newstudio.design');
  });

  it('validates financial details length and rejects empty/too short payout details', async () => {
    await expect(
      updateCreatorProfile({
        creatorId: creatorProfile.id,
        actorUserId: ownerUser.id,
        payoutDetails: '12', // too short
      })
    ).rejects.toThrow('Valid PromptPay or bank payout details are required');
  });

  it('strictly blocks unauthorized users from modifying another creator payout details (IDOR protection)', async () => {
    await expect(
      updateCreatorProfile({
        creatorId: creatorProfile.id,
        actorUserId: attackerUser.id, // Attacker tries to hijack creator payout
        payoutDetails: 'PromptPay: 089-999-9999 (Attacker)',
      })
    ).rejects.toThrow('Unauthorized');

    // Verify DB remains untouched
    const freshDb = await prisma.creatorProfile.findUnique({
      where: { id: creatorProfile.id },
    });
    expect(freshDb?.payoutDetails).toBe('PromptPay: 081-111-2222');
  });

  it('creates an immutable audit log when financial or profile details are updated', async () => {
    await updateCreatorProfile({
      creatorId: creatorProfile.id,
      actorUserId: ownerUser.id,
      payoutDetails: 'PromptPay: 082-333-4444',
      bio: 'New bio logged in audit',
    });

    const auditLogs = await prisma.auditEvent.findMany({
      where: {
        entityType: 'CreatorProfile',
        entityId: creatorProfile.id,
        action: 'CREATOR_PROFILE_UPDATED',
      },
    });

    expect(auditLogs.length).toBeGreaterThanOrEqual(1);
    const lastLog = auditLogs[auditLogs.length - 1];
    expect(lastLog.actorId).toBe(ownerUser.id);
    expect(lastLog.payload).toContain('payoutUpdated');
  });
});
