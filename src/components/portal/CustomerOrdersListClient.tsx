'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Package,
  Clock,
  ArrowRight,
  Shirt,
  Layers,
  ChevronRight,
  MessageSquare,
  Sparkles,
  Inbox,
  Store,
} from 'lucide-react';
import { OrderChatBox } from '@/components/portal/OrderChatBox';
import { useSettings } from '@/components/providers/SettingsProvider';

export interface CustomerOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  quantity: number;
  shippingName: string;
  shippingCity: string;
  createdAt: string | Date;
  supplier?: {
    id: string;
    companyName: string;
  } | null;
  design?: {
    garmentColorHex?: string;
    garmentSize?: string;
    previewFrontUrl?: string | null;
    garmentProduct?: {
      name: string;
      sku: string;
    } | null;
  } | null;
  obligations?: Array<{
    id: string;
  }>;
}

interface CustomerOrdersListClientProps {
  orders: CustomerOrderSummary[];
}

export const CustomerOrdersListClient: React.FC<CustomerOrdersListClientProps> = ({
  orders,
}) => {
  const { formatPrice, t, preferences } = useSettings();
  const [chattingOrder, setChattingOrder] = useState<{
    id: string;
    orderNumber: string;
    partnerName?: string;
    status: string;
  } | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAYMENT_CONFIRMED':
        return { label: t.orders.statusPending, bg: 'bg-amber-500/15 text-amber-900 border-amber-500/30' };
      case 'IN_PRODUCTION':
        return { label: t.orders.statusPrinting, bg: 'bg-indigo-500/15 text-indigo-900 border-indigo-500/30' };
      case 'QA':
      case 'QA_PASSED':
        return { label: 'QA Check', bg: 'bg-purple-500/15 text-purple-900 border-purple-500/30' };
      case 'READY_TO_PACK':
        return { label: 'Ready to Pack', bg: 'bg-blue-500/15 text-blue-900 border-blue-500/30' };
      case 'SHIPPED':
        return { label: t.orders.statusShipped, bg: 'bg-emerald-500/15 text-emerald-900 border-emerald-500/30' };
      case 'DELIVERED':
        return { label: t.orders.statusCompleted, bg: 'bg-emerald-600/20 text-emerald-950 border-emerald-600/40' };
      case 'CANCELLED':
        return { label: t.orders.statusCancelled, bg: 'bg-rose-500/15 text-rose-900 border-rose-500/30' };
      default:
        return { label: status, bg: 'bg-paper-dark text-ink border-borderCol' };
    }
  };

  const dateLocale = preferences.locale === 'th' ? 'th-TH' : preferences.locale === 'ja' ? 'ja-JP' : 'en-US';

  return (
    <div className="space-y-6">
      {/* Top Action Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-borderCol pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-[10px] tracking-widest uppercase bg-warm/30 text-ink border border-warm/60 px-2 py-0.5 rounded font-bold flex items-center space-x-1">
              <ShoppingBag className="w-3 h-3 text-ink" />
              <span>SHOPPING &amp; STUDIO // ORDERS</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold font-sans text-ink mt-1">{t.orders.title}</h1>
          <p className="font-mono text-xs text-mutedGray">
            {t.orders.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Centralized Chat Inbox Link */}
          <Link
            href="/account/inbox"
            className="px-3.5 py-2 bg-paper hover:bg-paper-dark border border-borderCol rounded-xl font-mono text-xs font-bold text-ink flex items-center space-x-1.5 transition-colors shadow-sm"
          >
            <Inbox className="w-3.5 h-3.5 text-amber-500" />
            <span>{t.nav.chatInbox}</span>
          </Link>

          <Link
            href="/studio/new"
            className="px-4 py-2 bg-ink text-paper hover:bg-ink-light rounded-xl font-mono text-xs uppercase tracking-wider font-bold transition-all flex items-center space-x-2 shadow-sm"
          >
            <span>{t.home.startStudio}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {orders.length === 0 ? (
        /* Empty State */
        <div className="p-8 sm:p-12 text-center bg-paper-light border border-borderCol rounded-2xl shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-full bg-paper-dark border border-borderCol flex items-center justify-center mx-auto text-mutedGray">
            <Package className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-sans font-bold text-base text-ink">{t.orders.noOrders}</h3>
            <p className="font-mono text-xs text-mutedGray max-w-md mx-auto">
              {t.home.heroSubtitle}
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/studio/new"
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-ink text-paper rounded-xl font-mono text-xs uppercase tracking-wider font-bold hover:bg-ink-light transition-colors shadow-sm"
            >
              <span>{t.home.startStudio}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        /* Order Cards List with Direct Chat Buttons */
        <div className="space-y-4">
          {orders.map((order) => {
            const badge = getStatusBadge(order.status);
            const garment = order.design?.garmentProduct;
            const supplierName = order.supplier?.companyName || 'โรงงานผู้ผลิต';

            return (
              <div
                key={order.id}
                className="p-5 bg-paper-light border border-borderCol rounded-2xl shadow-sm hover:border-warm/70 transition-all space-y-4"
              >
                {/* Header row: Order number, status, date, actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-borderCol/60 pb-3">
                  <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                    <span className="font-mono text-sm font-bold text-ink">
                      {order.orderNumber}
                    </span>
                    <span
                      className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded border font-bold ${badge.bg}`}
                    >
                      {badge.label}
                    </span>
                    <span className="font-mono text-xs text-mutedGray flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(order.createdAt).toLocaleDateString(dateLocale)}</span>
                    </span>
                  </div>

                  {/* Actions: Price + Chat with Supplier + Track Order */}
                  <div className="flex items-center space-x-2.5 flex-wrap">
                    <span className="font-mono text-sm font-bold text-ink mr-1">
                      {formatPrice(order.totalAmount)}
                    </span>

                    {/* Direct Chat Button on Order Item */}
                    <button
                      type="button"
                      data-testid={`chat-order-${order.orderNumber}`}
                      onClick={() =>
                        setChattingOrder({
                          id: order.id,
                          orderNumber: order.orderNumber,
                          partnerName: supplierName,
                          status: order.status,
                        })
                      }
                      className="px-3 py-1.5 bg-paper hover:bg-paper-dark border border-amber-500/40 hover:border-amber-500 rounded-lg font-mono text-xs font-bold text-ink flex items-center space-x-1.5 transition-colors shadow-xs"
                      title="เปิดกล่องข้อความสนทนากับโรงงานผู้ผลิตสำหรับคำสั่งซื้อนี้"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                      <span>แชทกับผู้ผลิต</span>
                    </button>

                    <Link
                      href={`/account/orders/${order.orderNumber}`}
                      className="px-3 py-1.5 bg-paper hover:bg-paper-dark border border-borderCol rounded-lg font-mono text-xs font-semibold text-ink flex items-center space-x-1 transition-colors"
                    >
                      <span>{t.orders.viewDetails}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                  {/* Garment Details */}
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-12 h-12 rounded-lg border border-borderCol flex-shrink-0 flex items-center justify-center relative overflow-hidden"
                      style={{ backgroundColor: order.design?.garmentColorHex || '#131718' }}
                    >
                      {order.design?.previewFrontUrl ? (
                        <img
                          src={order.design.previewFrontUrl}
                          alt="T-Shirt preview"
                          className="w-full h-full object-contain p-0.5"
                        />
                      ) : (
                        <Shirt className="w-6 h-6 text-paper/80 stroke-1" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-ink truncate">
                        {garment?.name || 'Custom Garment'}
                      </div>
                      <div className="text-mutedGray text-[11px]">
                        Size: {order.design?.garmentSize || 'L'} &bull; Qty: {order.quantity} pc(s)
                      </div>
                    </div>
                  </div>

                  {/* Supplier & Artwork info */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1.5 text-ink font-semibold">
                      <Store className="w-3.5 h-3.5 text-mutedGray flex-shrink-0" />
                      <span className="truncate">ผู้ผลิต: {supplierName}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-mutedGray text-[11px]">
                      <Layers className="w-3 h-3 text-warm-dark flex-shrink-0" />
                      <span>{order.obligations?.length || 1} creator artwork layer(s)</span>
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="text-left sm:text-right text-[11px] text-mutedGray">
                    <span>Delivering to: </span>
                    <span className="font-bold text-ink">{order.shippingName}</span>
                    <div>{order.shippingCity}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Chatbox Modal for the Selected Order */}
      {chattingOrder && (
        <OrderChatBox
          orderId={chattingOrder.id}
          orderNumber={chattingOrder.orderNumber}
          partnerName={chattingOrder.partnerName}
          orderStatus={chattingOrder.status}
          currentUserRole="CUSTOMER"
          isOpen={true}
          onClose={() => setChattingOrder(null)}
        />
      )}
    </div>
  );
};
