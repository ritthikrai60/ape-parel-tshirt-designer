'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  CheckCircle2,
  Package,
  Coins,
  History,
  FileCheck2,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface OrderItem {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerEmail: string;
  totalPrice: number;
  currency: string;
  createdAt: string;
  garmentName: string;
  garmentColor: string;
  supplierName: string;
}

interface ArtworkModerationItem {
  id: string;
  title: string;
  creatorName: string;
  category: string;
  previewUrl: string;
  moderationStatus: string;
  status: string;
  createdAt: string;
}

interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  payload: string;
}

interface AdminDashboardClientProps {
  initialOrders: OrderItem[];
  initialArtworks: ArtworkModerationItem[];
  initialAuditLogs: AuditLogItem[];
  totalRoyaltyPool: number;
}

export function AdminDashboardClient({
  initialOrders,
  initialArtworks,
  initialAuditLogs,
  totalRoyaltyPool,
}: AdminDashboardClientProps) {
  const [orders, setOrders] = useState<OrderItem[]>(initialOrders);
  const [artworks, setArtworks] = useState<ArtworkModerationItem[]>(initialArtworks);
  const [auditLogs] = useState<AuditLogItem[]>(initialAuditLogs);
  const [activeTab, setActiveTab] = useState<'orders' | 'moderation' | 'audit'>('orders');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
      }
    } catch (err) {
      console.error('Failed to update order status:', err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const totalGMV = orders.reduce((sum, o) => sum + o.totalPrice, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center space-x-2 font-mono text-xs uppercase tracking-widest text-mutedGray mb-1">
            <ShieldAlert className="w-4 h-4 text-warm" />
            <span>PLATFORM ADMINISTRATION // MODERATION</span>
          </div>
          <h1 className="text-3xl font-black font-sans tracking-tight text-ink">
            Admin Governance & Moderation
          </h1>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-paper-light border border-borderCol p-3 rounded">
            <span className="text-[10px] font-mono uppercase tracking-wider text-mutedGray block">
              Gross Volume
            </span>
            <span className="text-lg font-mono font-bold text-ink">
              ฿{totalGMV.toLocaleString()}
            </span>
          </div>
          <div className="bg-paper-light border border-borderCol p-3 rounded">
            <span className="text-[10px] font-mono uppercase tracking-wider text-mutedGray block">
              Royalty Pool
            </span>
            <span className="text-lg font-mono font-bold text-warm-dark">
              ฿{totalRoyaltyPool.toLocaleString()}
            </span>
          </div>
          <div className="bg-paper-light border border-borderCol p-3 rounded col-span-2 sm:col-span-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-mutedGray block">
              Total Orders
            </span>
            <span className="text-lg font-mono font-bold text-ink">
              {orders.length}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-borderCol mb-6">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 font-mono text-xs uppercase tracking-wider font-semibold border-b-2 transition-colors ${
            activeTab === 'orders'
              ? 'border-ink text-ink'
              : 'border-transparent text-mutedGray hover:text-ink'
          }`}
        >
          <Package className="w-3.5 h-3.5 inline mr-1.5" />
          Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('moderation')}
          className={`px-4 py-2 font-mono text-xs uppercase tracking-wider font-semibold border-b-2 transition-colors ${
            activeTab === 'moderation'
              ? 'border-ink text-ink'
              : 'border-transparent text-mutedGray hover:text-ink'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 inline mr-1.5" />
          Artwork Moderation ({artworks.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 font-mono text-xs uppercase tracking-wider font-semibold border-b-2 transition-colors ${
            activeTab === 'audit'
              ? 'border-ink text-ink'
              : 'border-transparent text-mutedGray hover:text-ink'
          }`}
        >
          <History className="w-3.5 h-3.5 inline mr-1.5" />
          Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* Tab: Orders */}
      {activeTab === 'orders' && (
        <div className="bg-paper-light border border-borderCol rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-borderCol text-left font-sans">
              <thead className="bg-paper-dark font-mono text-[11px] uppercase tracking-wider text-mutedGray">
                <tr>
                  <th className="px-4 py-3">Order Number</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Garment & Specs</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderCol text-xs font-sans">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-paper-dark/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-ink">
                      <Link
                        href={`/account/orders/${o.orderNumber}`}
                        className="hover:underline flex items-center space-x-1"
                      >
                        <span>{o.orderNumber}</span>
                        <ExternalLink className="w-3 h-3 text-mutedGray" />
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink">{o.customerName}</div>
                      <div className="text-mutedGray font-mono text-[10px]">{o.customerEmail}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-ink font-medium">{o.garmentName}</div>
                      <div className="text-mutedGray font-mono text-[10px]">{o.garmentColor}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-mutedGray">
                      {o.supplierName}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-ink">
                      ฿{o.totalPrice.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded font-bold bg-warm/20 text-warm-dark border border-warm/40">
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <select
                        value={o.status}
                        disabled={updatingOrderId === o.id}
                        onChange={(e) => handleUpdateStatus(o.id, e.target.value)}
                        className="font-mono text-[11px] bg-paper border border-borderCol rounded px-2 py-1 text-ink focus:outline-none"
                      >
                        <option value="PAYMENT_CONFIRMED">PAYMENT_CONFIRMED</option>
                        <option value="IN_PRODUCTION">IN_PRODUCTION</option>
                        <option value="QA">QA</option>
                        <option value="QA_PASSED">QA_PASSED</option>
                        <option value="SHIPPED">SHIPPED</option>
                        <option value="DELIVERED">DELIVERED</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Moderation */}
      {activeTab === 'moderation' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {artworks.map((art) => (
            <div
              key={art.id}
              className="bg-paper-light border border-borderCol rounded-lg overflow-hidden p-4 flex flex-col justify-between"
            >
              <div>
                <div className="aspect-square bg-paper-dark rounded flex items-center justify-center p-4 mb-4">
                  <img
                    src={art.previewUrl}
                    alt={art.title}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] uppercase text-mutedGray tracking-wider">
                    {art.category}
                  </span>
                  <span className="font-mono text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                    {art.moderationStatus}
                  </span>
                </div>
                <h3 className="font-bold text-ink text-base">{art.title}</h3>
                <p className="text-xs text-mutedGray font-mono">By {art.creatorName}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-borderCol flex items-center justify-between">
                <span className="text-[10px] font-mono text-mutedGray">
                  Status: {art.status}
                </span>
                <span className="text-xs text-emerald-700 font-bold flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Approved
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Audit */}
      {activeTab === 'audit' && (
        <div className="bg-paper-light border border-borderCol rounded-lg overflow-hidden p-4">
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-paper border border-borderCol rounded font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-ink">{log.action}</span>
                    <span className="text-mutedGray text-[10px]">
                      {log.entityType} ({log.entityId})
                    </span>
                  </div>
                  <div className="text-[11px] text-mutedGray truncate max-w-xl mt-0.5">
                    {log.payload}
                  </div>
                </div>
                <div className="text-[10px] text-mutedGray shrink-0">
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
