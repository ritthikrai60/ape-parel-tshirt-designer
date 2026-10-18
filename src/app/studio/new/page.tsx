import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
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

interface StudioNewPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function StudioNewPage({ searchParams }: StudioNewPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const session = await auth();
  const currentUser = session?.user
    ? { id: ((session.user as any).id || (session.user as any).sub) as string, name: session.user.name || null }
    : null;
  const initialArtworkId =
    typeof resolvedParams?.artworkId === 'string'
      ? resolvedParams.artworkId
      : Array.isArray(resolvedParams?.artworkId)
      ? resolvedParams.artworkId[0]
      : undefined;

  let garments: GarmentProductDTO[] = [];
  let artworks: ArtworkDTO[] = [];

  try {
    const rawGarments = await prisma.garmentProduct.findMany({
      where: {
        supplier: {
          verified: true,
        },
      },
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
      supplierId: g.supplierId,
      supplier: g.supplier
        ? {
            id: g.supplier.id,
            slug: g.supplier.slug,
            companyName: g.supplier.companyName,
            location: g.supplier.location,
            leadTimeDays: g.supplier.leadTimeDays,
            description: g.supplier.description,
            verified: g.supplier.verified,
            minOrderQuantity: g.supplier.minOrderQuantity,
            printingServices: g.supplier.printingServices.map((p) => ({
              id: p.id,
              name: p.name,
              code: p.code,
              pricePerSurface: p.pricePerSurface,
              supportedSurfaces: p.supportedSurfaces,
            })),
          }
        : undefined,
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

    if (initialArtworkId && !artworks.some((a) => a.id === initialArtworkId)) {
      const specificArt = await prisma.artwork.findUnique({
        where: { id: initialArtworkId },
        include: { creator: true, licenseOptions: true },
      });
      if (specificArt) {
        artworks.unshift({
          id: specificArt.id,
          title: specificArt.title,
          description: specificArt.description,
          category: specificArt.category,
          previewUrl: specificArt.previewUrl,
          mimeType: specificArt.mimeType,
          tags: specificArt.tags,
          creator: {
            id: specificArt.creator.id,
            displayName: specificArt.creator.displayName,
            slug: specificArt.creator.slug,
            avatarUrl: specificArt.creator.avatarUrl,
          },
          licenseOptions: specificArt.licenseOptions.map((l) => ({
            id: l.id,
            name: l.name,
            price: l.price,
            scope: l.scope,
          })),
        });
      }
    }
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
        supplierId: 'supplier-fallback-1',
        supplier: {
          id: 'supplier-fallback-1',
          slug: 'bangkok-garment-craft',
          companyName: 'Bangkok Garment Craft Co., Ltd.',
          location: 'Phra Khanong, Bangkok, Thailand',
          leadTimeDays: 4,
          description:
            'Specialty streetwear garment manufacturer offering heavyweight combed cotton blanks and precision digital printing.',
          verified: true,
          minOrderQuantity: 1,
          printingServices: [
            {
              id: 'svc-dtg-1',
              name: 'High-Definition Digital DTG',
              code: 'DTG',
              pricePerSurface: 80,
              supportedSurfaces: 'BOTH',
            },
          ],
        },
        variants: [
          {
            id: 'var-blk-l',
            sku: 'APX-HVY-001-BLK-L',
            colorName: 'Ink Black',
            colorHex: '#131718',
            size: 'L',
            stock: 120,
            priceAdjustment: 0,
          },
          {
            id: 'var-blk-xl',
            sku: 'APX-HVY-001-BLK-XL',
            colorName: 'Ink Black',
            colorHex: '#131718',
            size: 'XL',
            stock: 80,
            priceAdjustment: 0,
          },
          {
            id: 'var-wht-l',
            sku: 'APX-HVY-001-WHT-L',
            colorName: 'Optic White',
            colorHex: '#FFFFFF',
            size: 'L',
            stock: 90,
            priceAdjustment: 0,
          },
          {
            id: 'var-bge-l',
            sku: 'APX-HVY-001-BGE-L',
            colorName: 'Paper Beige',
            colorHex: '#F5F0E8',
            size: 'L',
            stock: 65,
            priceAdjustment: 0,
          },
          {
            id: 'var-wrm-l',
            sku: 'APX-HVY-001-WRM-L',
            colorName: 'Warm Kraft',
            colorHex: '#DABA98',
            size: 'L',
            stock: 55,
            priceAdjustment: 0,
          },
        ],
      },
    ];
  }

  return (
    <div className="flex-1 flex flex-col w-full min-h-[calc(100vh-4rem)]">
      <DesignStudioClient
        initialGarments={garments}
        initialArtworks={artworks}
        initialArtworkId={initialArtworkId}
        currentUser={currentUser}
      />
    </div>
  );
}
