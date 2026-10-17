import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getOrderByIdOrNumber } from '@/lib/orders';
import { ProductionBlueprintSheet } from '@/components/portal/ProductionBlueprintSheet';
import { SupplierJobChatButton } from '@/components/portal/SupplierJobChatButton';

export const dynamic = 'force-dynamic';

interface SupplierJobBlueprintPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({
  params,
}: SupplierJobBlueprintPageProps): Promise<Metadata> {
  const { id } = params;
  return {
    title: `Print Placement Blueprint Job #${id} | Supplier Portal | ape-parel`,
    description: `Factory floor DTG Kornit print placement blueprint with centimeter rulers, center chest axis, and collar offset annotations.`,
  };
}

export default async function SupplierJobBlueprintPage({
  params,
}: SupplierJobBlueprintPageProps) {
  const { id } = params;
  const cleanId = id.toUpperCase().startsWith('JOB-') ? id.slice(4) : id;
  const order =
    (await getOrderByIdOrNumber(cleanId)) ||
    (await getOrderByIdOrNumber(cleanId.toUpperCase())) ||
    (await getOrderByIdOrNumber(id));

  if (!order) {
    notFound();
  }

  // Parse design elements
  let frontElements: any[] = [];
  let backElements: any[] = [];
  try {
    if (order.design?.frontElements) {
      frontElements =
        typeof order.design.frontElements === 'string'
          ? JSON.parse(order.design.frontElements)
          : order.design.frontElements;
    }
    if (order.design?.backElements) {
      backElements =
        typeof order.design.backElements === 'string'
          ? JSON.parse(order.design.backElements)
          : order.design.backElements;
    }
  } catch {}

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/supplier/dashboard"
          className="inline-flex items-center space-x-1.5 font-mono text-xs text-mutedGray hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Supplier Dashboard</span>
        </Link>
        <div className="flex items-center space-x-3">
          <SupplierJobChatButton
            orderId={order.id}
            orderNumber={order.orderNumber}
            customerName={(order.customer as any)?.name || 'ลูกค้า'}
            orderStatus={order.status}
          />
          <span className="font-mono text-xs text-mutedGray">
            Job Reference: <span className="font-bold text-ink">JOB-{order.orderNumber}</span>
          </span>
        </div>
      </div>

      {/* Production Blueprint Sheet */}
      <ProductionBlueprintSheet
        isStandalonePage={true}
        orderNumber={order.orderNumber}
        jobId={`JOB-${order.orderNumber}`}
        garment={{
          sku: order.design?.garmentProduct?.sku || 'APX-HVY-001',
          name: order.design?.garmentProduct?.name || 'Apex Heavyweight Tee',
          colorHex: order.design?.garmentColorHex || '#131718',
          size: order.design?.garmentSize || 'L',
          fabric: order.design?.garmentProduct?.fabric,
        }}
        frontElements={frontElements}
        backElements={backElements}
        initialSurface="FRONT"
        frontSnapshotDataUrl={order.design?.previewFrontUrl}
        backSnapshotDataUrl={order.design?.previewBackUrl}
      />
    </div>
  );
}
