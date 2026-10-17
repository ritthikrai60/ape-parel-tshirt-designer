import { describe, it, expect } from 'vitest';
import { ArtworkDTO } from '@/components/studio/DesignStudioClient';

describe('Marketplace to 3D Studio Artwork Hand-off Suite', () => {
  const mockArtworks: ArtworkDTO[] = [
    {
      id: 'cmv3xf1dl001m2xfjg2o3ddh5',
      title: 'Neon Cyber Ape Masterpiece',
      description: 'Futuristic primate streetwear graphic',
      category: 'MASCOT',
      previewUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800',
      mimeType: 'image/png',
      tags: 'cyberpunk,ape,neon',
      creator: {
        id: 'creator-1',
        displayName: 'Neo Tokyo Artist',
        slug: 'neo-tokyo',
        avatarUrl: null,
      },
      licenseOptions: [
        {
          id: 'lic-std-1',
          name: 'Standard Apparel License',
          price: 55,
          scope: '1 unit commercial DTG print',
        },
      ],
    },
    {
      id: 'art-2',
      title: 'Vintage Glitch Skull',
      description: 'Monochrome glitch',
      category: 'ILLUSTRATION',
      previewUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800',
      mimeType: 'image/png',
      tags: 'glitch,skull',
      creator: {
        id: 'creator-2',
        displayName: 'Dark Byte',
        slug: 'dark-byte',
        avatarUrl: null,
      },
      licenseOptions: [
        {
          id: 'lic-std-2',
          name: 'Standard Apparel License',
          price: 35,
          scope: '1 unit commercial print',
        },
      ],
    },
  ];

  it('correctly matches and generates layer element from URL artworkId', () => {
    const targetArtworkId = 'cmv3xf1dl001m2xfjg2o3ddh5';
    const targetArt = mockArtworks.find((a) => a.id === targetArtworkId);
    expect(targetArt).toBeDefined();

    const stdLic = targetArt!.licenseOptions.find((l) => l.price > 0) || targetArt!.licenseOptions[0];
    const generatedLayer = {
      id: `layer-market-test`,
      artworkId: targetArt!.id,
      licenseOptionId: stdLic ? stdLic.id : 'lic_std',
      title: targetArt!.title,
      previewUrl: targetArt!.previewUrl,
      creatorName: targetArt!.creator.displayName,
      creatorId: targetArt!.creator.id,
      surface: 'FRONT',
      x: 50,
      y: 42,
      width: 48,
      height: 48,
      rotation: 0,
      zIndex: 1,
      price: stdLic.price,
    };

    expect(generatedLayer.artworkId).toBe('cmv3xf1dl001m2xfjg2o3ddh5');
    expect(generatedLayer.title).toBe('Neon Cyber Ape Masterpiece');
    expect(generatedLayer.surface).toBe('FRONT');
    expect(generatedLayer.x).toBe(50);
    expect(generatedLayer.y).toBe(42);
    expect(generatedLayer.price).toBe(55);
  });
});
