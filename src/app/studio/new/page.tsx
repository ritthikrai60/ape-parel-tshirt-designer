import { prisma } from '@/lib/prisma';
import {
  DesignStudioClient,
  GarmentProductDTO,
  ArtworkDTO,
} from '@/components/studio/DesignStudioClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Interactive 2D & 3D Design Studio | ape-parel',
  description:
    'Design custom creator apparel with real-time 3D Three.js preview, authentic garment colors, and server-authoritative live pricing.',
};

export default async function StudioNewPage() {
  let garments: GarmentProductDTO[] = [];
  let artworks: ArtworkDTO[] = [];

  try {
    const rawGarments = await prisma.garmentProduct.findMany({
      include: {
        variants: true,
        supplier: {
          include: {
            printingServices: true,
          },
        },
      },
      orderBy: { sku: 'asc' },
    });

    garments = rawGarments.map((g) => ({
      id: g.id,
      sku: g.sku,
      name: g.name,
      description: g.description,
      fabric: g.fabric,
      weightGsm: g.weightGsm,
      fit: g.fit,
      neckline: g.neckline,
      basePrice: g.basePrice,
      packagingPrice: g.packagingPrice,
      shippingPrice: g.shippingPrice,
      variants: g.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        colorName: v.colorName,
        colorHex: v.colorHex,
        size: v.size,
        stock: v.stock,
        priceAdjustment: v.priceAdjustment,
      })),
    }));

    const rawArtworks = await prisma.artwork.findMany({
      where: {
        status: 'PUBLISHED',
        moderationStatus: 'APPROVED',
      },
      include: {
        creator: true,
        licenseOptions: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    artworks = rawArtworks.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      category: a.category,
      previewUrl: a.previewUrl,
      mimeType: a.mimeType,
      tags: a.tags,
      creator: {
        id: a.creator.id,
        displayName: a.creator.displayName,
        slug: a.creator.slug,
        avatarUrl: a.creator.avatarUrl,
      },
      licenseOptions: a.licenseOptions.map((l) => ({
        id: l.id,
        name: l.name,
        price: l.price,
        scope: l.scope,
      })),
    }));
  } catch (err) {
    console.error('[StudioNewPage] Database query error:', err);
  }

  // Resilient fallback data if database is empty or unseeded
  if (garments.length === 0) {
    garments = [
      {
        id: 'garment-fallback-1',
        sku: 'APX-HVY-001',
        name: 'Apex Heavyweight Oversized Tee',
        description: 'Heavy 240 GSM combed cotton featuring a drop-shoulder cut.',
        fabric: '100% Combed Cotton, 240 GSM',
        weightGsm: 240,
        fit: 'oversized',
        neckline: 'crew',
        basePrice: 150,
        packagingPrice: 15,
        shippingPrice: 40,
        variants: [
          {
            id: 'var-blk-l',
            sku: 'APX-HVY-001-BLK-L',
            colorName: 'Ink Black',
            colorHex: '#131718',
            size: 'L',
            stock: 100,
            priceAdjustment: 0,
          },
          {
            id: 'var-wht-l',
            sku: 'APX-HVY-001-WHT-L',
            colorName: 'Optic White',
            colorHex: '#FFFFFF',
            size: 'L',
            stock: 100,
            priceAdjustment: 0,
          },
          {
            id: 'var-bge-l',
            sku: 'APX-HVY-001-BGE-L',
            colorName: 'Paper Beige',
            colorHex: '#F5F0E8',
            size: 'L',
            stock: 100,
            priceAdjustment: 0,
          },
          {
            id: 'var-wrm-l',
            sku: 'APX-HVY-001-WRM-L',
            colorName: 'Warm Kraft',
            colorHex: '#DABA98',
            size: 'L',
            stock: 100,
            priceAdjustment: 0,
          },
        ],
      },
    ];
  }

  return (
    <div className="flex-1 flex flex-col w-full min-h-[calc(100vh-4rem)]">
      <DesignStudioClient initialGarments={garments} initialArtworks={artworks} />
    </div>
  );
}
