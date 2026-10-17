import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import CreatorsDirectoryPage from '@/app/creators/page';

describe('Creators Directory Suite (/creators)', () => {
  it('loads the creators directory and renders published creators with approved artworks', async () => {
    // 1. Verify Prisma database query logic
    const profiles = await prisma.creatorProfile.findMany({
      where: {
        artworks: {
          some: {
            status: 'PUBLISHED',
            moderationStatus: 'APPROVED',
          },
        },
      },
      include: {
        storefrontSettings: true,
        artworks: {
          where: {
            status: 'PUBLISHED',
            moderationStatus: 'APPROVED',
          },
          select: {
            id: true,
            title: true,
            category: true,
            previewUrl: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    expect(profiles.length).toBeGreaterThanOrEqual(3);

    // Verify Dash Ape exists and has published artworks
    const dashApe = profiles.find((p) => p.slug === 'dash-ape');
    expect(dashApe).toBeDefined();
    expect(dashApe?.displayName).toBe('Dash Ape Studio');
    expect(dashApe?.artworks.length).toBe(8);
    expect(dashApe?.avatarUrl).toBe('/uploads/avatars/dash_ape_avatar.png');

    // Verify JTACT DEV exists
    const jtact = profiles.find((p) => p.slug === 'jtact-dev');
    expect(jtact).toBeDefined();
    expect(jtact?.artworks.length).toBeGreaterThanOrEqual(1);

    // Verify creators without approved artworks are excluded
    const unapproved = profiles.find((p) => p.slug === 'test-creator-mod');
    expect(unapproved).toBeUndefined();
  });

  it('renders server component CreatorsDirectoryPage without crashing', async () => {
    const pageComponent = await CreatorsDirectoryPage();
    expect(pageComponent).toBeDefined();
    expect(pageComponent.props.initialCreators).toBeDefined();
    expect(pageComponent.props.initialCreators.length).toBeGreaterThanOrEqual(3);

    const initialCreators = pageComponent.props.initialCreators;
    const dashApe = initialCreators.find((c: any) => c.slug === 'dash-ape');
    expect(dashApe).toBeDefined();
    expect(dashApe.specialties).toContain('MASCOT');
    expect(dashApe.specialties).toContain('LOGO');
    expect(dashApe.previewArtworks.length).toBe(8);
  });
});
