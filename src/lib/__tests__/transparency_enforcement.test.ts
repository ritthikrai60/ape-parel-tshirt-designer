import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { validateAndProcessArtwork } from '@/lib/assetValidation';

describe('Transparency Enforcement & Format Support Suite', () => {
  it('strictly rejects PNG artwork without alpha channel (hasAlpha === false)', async () => {
    // 3-channel solid RGB without alpha
    const solidPng = await sharp({
      create: {
        width: 1200,
        height: 1200,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .withMetadata({ density: 300 })
      .png()
      .toBuffer();

    const result = await validateAndProcessArtwork(solidPng, 'solid-white.png', 'image/png', {
      skipStorage: true,
    });

    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/must include a transparent background/i);
  });

  it('accepts PNG artwork with genuine alpha channel (hasAlpha === true)', async () => {
    // 4-channel RGBA with semi-transparent background
    const transparentPng = await sharp({
      create: {
        width: 1200,
        height: 1200,
        channels: 4,
        background: { r: 255, g: 100, b: 0, alpha: 0.8 },
      },
    })
      .withMetadata({ density: 300 })
      .png()
      .toBuffer();

    const result = await validateAndProcessArtwork(transparentPng, 'artwork.png', 'image/png', {
      skipStorage: true,
    });

    expect(result.isValid).toBe(true);
    expect(result.metadata?.hasTransparency).toBe(true);
    expect(result.metadata?.format).toBe('png');
  });

  it('strictly rejects WebP artwork without alpha channel', async () => {
    const solidWebp = await sharp({
      create: {
        width: 1200,
        height: 1200,
        channels: 3,
        background: { r: 20, g: 20, b: 20 },
      },
    })
      .withMetadata({ density: 300 })
      .webp()
      .toBuffer();

    const result = await validateAndProcessArtwork(solidWebp, 'solid-graphic.webp', 'image/webp', {
      skipStorage: true,
    });

    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/WEBP artwork must include a transparent background/i);
  });

  it('accepts WebP artwork with alpha channel', async () => {
    const transparentWebp = await sharp({
      create: {
        width: 1200,
        height: 1200,
        channels: 4,
        background: { r: 0, g: 200, b: 255, alpha: 0.5 },
      },
    })
      .withMetadata({ density: 300 })
      .webp()
      .toBuffer();

    const result = await validateAndProcessArtwork(transparentWebp, 'transparent-graphic.webp', 'image/webp', {
      skipStorage: true,
    });

    expect(result.isValid).toBe(true);
    expect(result.metadata?.hasTransparency).toBe(true);
    expect(result.metadata?.format).toBe('webp');
  });

  it('exempts SVG vectors from raster DPI check while granting native transparency', async () => {
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
      <circle cx="250" cy="250" r="200" fill="#FF5500" />
    </svg>`;
    const svgBuffer = Buffer.from(svgContent, 'utf-8');

    const result = await validateAndProcessArtwork(svgBuffer, 'vector-mark.svg', 'image/svg+xml', {
      skipStorage: true,
    });

    expect(result.isValid).toBe(true);
    expect(result.metadata?.isVector).toBe(true);
    expect(result.metadata?.hasTransparency).toBe(true);
    expect(result.metadata?.format).toBe('svg');
  });
});
