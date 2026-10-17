import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { CustomerOrdersListClient } from '@/components/portal/CustomerOrdersListClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Custom Apparel Orders | ape-parel',
  description:
    'Track your custom streetwear orders, view production status, and inspect garment placement blueprints.',
};

export default async function CustomerOrdersPage() {
  // Layer 2 guard
  const session = await auth();

  if (!session?.user) {
    redirect('/login?callbackUrl=/account/orders');
  }

  const userId = (session.user as any).id as string;

  let orders: any[] = [];

  if (userId) {
    try {
      orders = await prisma.order.findMany({
        where: {
          customerId: userId,
        },
        include: {
          supplier: {
            select: { id: true, companyName: true },
          },
          design: {
            include: {
              garmentProduct: true,
            },
          },
          obligations: {
            include: {
              artwork: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      console.error('[CustomerOrdersPage] Failed to fetch orders:', err);
    }
  }

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <CustomerOrdersListClient orders={orders} />
    </div>
  );
}
