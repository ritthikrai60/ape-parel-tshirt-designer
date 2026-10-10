import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getOrderByIdOrNumber } from '@/lib/orders';
import { CustomerOrderTrackingClient } from '@/components/portal/CustomerOrderTrackingClient';

export const dynamic = 'force-dynamic';

interface OrderTrackingPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({
  params,
}: OrderTrackingPageProps): Promise<Metadata> {
  const { id } = params;
  return {
    title: `Order Tracking #${id} | ape-parel`,
    description: `Track your custom ape-parel apparel order with live production status and itemized pricing breakdown.`,
  };
}

export default async function OrderTrackingPage({
  params,
}: OrderTrackingPageProps) {
  const { id } = params;
  const order = await getOrderByIdOrNumber(id);

  if (!order) {
    notFound();
  }

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <CustomerOrderTrackingClient order={order} />
    </div>
  );
}
