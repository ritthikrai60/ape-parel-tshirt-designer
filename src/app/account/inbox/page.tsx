import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { OrderChatInboxClient } from '@/components/portal/OrderChatInboxClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Order Chat Inbox | กล่องข้อความรวมคำสั่งซื้อ | ape-parel',
  description:
    'Centralized order communication inbox between customers and certified apparel manufacturers with 7-day compressed image protection and dispute audit.',
};

export default async function AccountInboxPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login?callbackUrl=/account/inbox');
  }

  return (
    <div className="flex-1 w-full">
      <OrderChatInboxClient />
    </div>
  );
}
