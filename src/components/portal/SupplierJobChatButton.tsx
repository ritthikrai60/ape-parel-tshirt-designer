'use client';

import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { OrderChatBox } from '@/components/portal/OrderChatBox';

interface SupplierJobChatButtonProps {
  orderId: string;
  orderNumber: string;
  customerName?: string;
  orderStatus?: string;
}

export const SupplierJobChatButton: React.FC<SupplierJobChatButtonProps> = ({
  orderId,
  orderNumber,
  customerName,
  orderStatus,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-paper hover:bg-paper-dark border border-borderCol rounded font-mono text-xs font-semibold text-ink transition-colors shadow-xs"
      >
        <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
        <span>แชทกับลูกค้า</span>
      </button>

      <OrderChatBox
        orderId={orderId}
        orderNumber={orderNumber}
        partnerName={customerName || 'ลูกค้าคำสั่งซื้อ'}
        orderStatus={orderStatus}
        currentUserRole="SUPPLIER"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};
