'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Factory,
  Download,
  CheckCircle,
  Clock,
  Printer,
  ShieldCheck,
  ChevronRight,
  Layers,
  MapPin,
  RefreshCw,
} from 'lucide-react';

export interface SupplierInfo {
  id: string;
  slug: string;
  companyName: string;
  location: string;
  leadTimeDays: number;
  printingServices?: Array<{
    code: string;
    name: string;
    maxPrintWidthCm: number;
    maxPrintHeightCm: number;
  }>;
}

export interface SupplierDashboardClientProps {
  suppliers: SupplierInfo[];
  currentSupplierSlug: string;
  initialOrders: any[];
}

export const SupplierDashboardClient: React.FC<SupplierDashboardClientProps> = ({
  suppliers,
  currentSupplierSlug,
  initialOrders,
}) => {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [inspectPackage, setInspectPackage] = useState<any | null>(null);
  const [isLoadingSpec, setIsLoadingSpec] = useState(false);

  const currentSupplier =
    suppliers.find((s) => s.slug === currentSupplierSlug) || suppliers[0];

  const handleSupplierChange = (newSlug: string) => {
    router.push(`/supplier/dashboard?supplier=${encodeURIComponent(newSlug)}`);
  };

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error('Status update failed');
      const data = await res.json();

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
      router.refresh();
    } catch (err) {
      console.error('[SupplierDashboard] Status update error:', err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleInspectSpec = async (orderIdOrNumber: string) => {
    setIsLoadingSpec(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderIdOrNumber)}/production`);
      if (!res.ok) throw new Error('Failed to load spec');
      const data = await res.json();
      setInspectPackage(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingSpec(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'QA') {
      return o.status === 'QA' || o.status === 'QA_PASSED';
    }
    return o.status === statusFilter;
  });

  return (
    <div className="space-y-8 w-full">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-borderCol pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <Factory className="w-6 h-6 text-ink" />
            <h1 className="text-2xl font-bold font-sans text-ink">
              {currentSupplier?.companyName}
            </h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
              VERIFIED FACILITY
            </span>
          </div>
          <div className="flex items-center space-x-3 font-mono text-xs text-mutedGray mt-1 flex-wrap">
            <span className="flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{currentSupplier?.location}</span>
            </span>
            <span>&bull;</span>
            <span>Standard SLA: {currentSupplier?.leadTimeDays} Days</span>
            <span>&bull;</span>
            <span>Primary RIP: Kornit HD DTG (35x45 cm)</span>
          </div>
        </div>

        {/* Switch Supplier Facility */}
        {suppliers.length > 1 && (
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs text-mutedGray">Facility:</span>
            <select
              aria-label="Select facility"
              value={currentSupplierSlug}
              onChange={(e) => handleSupplierChange(e.target.value)}
              className="px-3 py-2 bg-paper border border-borderCol rounded-lg text-xs font-mono text-ink focus:outline-none focus:border-warm"
            >
              {suppliers.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.companyName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Production Queue Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
        <div className="p-4 bg-paper-light border border-borderCol rounded-xl">
          <span className="text-mutedGray uppercase text-[10px]">Total Active Jobs</span>
          <div data-testid="stat-total-jobs" className="text-2xl font-bold text-ink mt-1">
            {orders.length}
          </div>
        </div>
        <div className="p-4 bg-paper-light border border-borderCol rounded-xl">
          <span className="text-mutedGray uppercase text-[10px]">Queued / Ready</span>
          <div data-testid="stat-queued-jobs" className="text-2xl font-bold text-amber-700 mt-1">
            {orders.filter((o) => o.status === 'PAYMENT_CONFIRMED').length}
          </div>
        </div>
        <div className="p-4 bg-paper-light border border-borderCol rounded-xl">
          <span className="text-mutedGray uppercase text-[10px]">Printing / In Prep</span>
          <div data-testid="stat-printing-jobs" className="text-2xl font-bold text-indigo-700 mt-1">
            {orders.filter((o) => o.status === 'IN_PRODUCTION' || o.status === 'QA' || o.status === 'QA_PASSED').length}
          </div>
        </div>
        <div className="p-4 bg-paper-light border border-borderCol rounded-xl">
          <span className="text-mutedGray uppercase text-[10px]">Dispatched / Shipped</span>
          <div data-testid="stat-shipped-jobs" className="text-2xl font-bold text-emerald-700 mt-1">
            {orders.filter((o) => o.status === 'SHIPPED' || o.status === 'DELIVERED').length}
          </div>
        </div>
      </div>

      {/* Queue Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-borderCol pb-2 overflow-x-auto">
        {[
          { key: 'ALL', label: 'All Jobs' },
          { key: 'PAYMENT_CONFIRMED', label: 'Queued' },
          { key: 'IN_PRODUCTION', label: 'Printing' },
          { key: 'QA', label: 'QA Check' },
          { key: 'SHIPPED', label: 'Shipped' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-1.5 font-mono text-xs rounded-lg transition-colors whitespace-nowrap ${
              statusFilter === tab.key
                ? 'bg-ink text-paper font-bold'
                : 'text-mutedGray hover:text-ink hover:bg-paper-dark'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Job Cards Queue */}
      <div data-testid="supplier-job-queue" className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div
            data-testid="no-jobs-placeholder"
            className="p-12 text-center bg-paper-light border border-borderCol rounded-xl font-mono text-xs text-mutedGray"
          >
            No production jobs in this queue.
          </div>
        ) : (
          filteredOrders.map((order) => {
            const garment = order.design?.garmentProduct;
            return (
              <div
                key={order.id}
                data-testid={`job-card-${order.orderNumber}`}
                className="p-6 bg-paper-light border border-borderCol rounded-xl shadow-sm space-y-4 hover:border-warm transition-colors"
              >
                {/* Job Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-borderCol/60 pb-3">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-sm font-black text-ink">
                      JOB-{order.orderNumber}
                    </span>
                    <span className="font-mono text-xs text-mutedGray">
                      Order: {order.orderNumber}
                    </span>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-warm/20 text-ink font-semibold">
                      Target Lead: {currentSupplier?.leadTimeDays}d
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* 1-Click Production Spec Download */}
                    <a
                      data-testid={`download-spec-${order.orderNumber}`}
                      href={`/api/orders/${order.id}/production`}
                      download={`JOB-${order.orderNumber}.json`}
                      className="px-3 py-1.5 bg-paper hover:bg-paper-dark border border-borderCol rounded-lg font-mono text-xs font-bold text-ink flex items-center space-x-1.5 transition-colors shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Spec (.json)</span>
                    </a>

                    <button
                      type="button"
                      data-testid={`inspect-spec-${order.orderNumber}`}
                      onClick={() => handleInspectSpec(order.id)}
                      className="px-3 py-1.5 bg-ink hover:bg-ink-light text-paper rounded-lg font-mono text-xs font-bold transition-colors"
                    >
                      Inspect RIP
                    </button>
                  </div>
                </div>

                {/* Garment Details & Print Spec Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                  {/* Garment Details */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase text-mutedGray font-bold">
                      Garment Specifications
                    </span>
                    <div className="font-bold text-ink">{garment?.name || 'Apex Heavyweight Tee'}</div>
                    <div className="text-mutedGray">Blank SKU: {garment?.sku || 'APX-HVY-001'}</div>
                    <div className="flex items-center space-x-2 pt-1">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-borderCol"
                        style={{ backgroundColor: order.design?.garmentColorHex || '#131718' }}
                      />
                      <span>Size: {order.design?.garmentSize || 'L'}</span>
                      <span>&bull;</span>
                      <span>Qty: {order.quantity} pc(s)</span>
                    </div>
                  </div>

                  {/* Print Technique */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase text-mutedGray font-bold">
                      Print Technique & Surfaces
                    </span>
                    <div className="font-bold text-ink">Kornit Digital DTG</div>
                    <div className="text-mutedGray">Platen: 35.0 x 45.0 cm</div>
                    <div className="flex items-center space-x-1 pt-1 text-ink font-semibold">
                      <Layers className="w-3.5 h-3.5 text-warm-dark" />
                      <span>{order.obligations?.length || 1} Artwork Layer(s) Licensed</span>
                    </div>
                  </div>

                  {/* Shipping Recipient */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase text-mutedGray font-bold">
                      Delivery Destination
                    </span>
                    <div className="font-bold text-ink">{order.shippingName}</div>
                    <div className="text-mutedGray truncate">{order.shippingAddress}</div>
                    <div className="text-mutedGray">
                      {order.shippingCity} {order.shippingPostal}
                    </div>
                  </div>
                </div>

                {/* Status Stepper & Transition Actions */}
                <div className="pt-3 border-t border-borderCol/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Status Visual Stepper */}
                  <div className="flex items-center space-x-2 font-mono text-xs flex-wrap">
                    <span className="text-mutedGray text-[11px] uppercase mr-1">Workflow:</span>
                    {[
                      { key: 'PAYMENT_CONFIRMED', label: 'Queued' },
                      { key: 'IN_PRODUCTION', label: 'Printing' },
                      { key: 'QA', altKey: 'QA_PASSED', label: 'QA Check' },
                      { key: 'SHIPPED', altKey: 'DELIVERED', label: 'Shipped' },
                    ].map((step, idx) => {
                      const isCurrent =
                        order.status === step.key ||
                        (step.altKey && order.status === step.altKey);
                      return (
                        <React.Fragment key={step.key}>
                          {idx > 0 && <span className="text-borderCol">&rarr;</span>}
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              isCurrent
                                ? 'bg-ink text-paper'
                                : 'bg-paper text-mutedGray border border-borderCol'
                            }`}
                          >
                            {step.label}
                          </span>
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Status Action Button */}
                  <div className="flex items-center space-x-2">
                    {order.status === 'PAYMENT_CONFIRMED' && (
                      <button
                        type="button"
                        data-testid={`action-start-printing-${order.orderNumber}`}
                        disabled={updatingOrderId === order.id}
                        onClick={() => handleUpdateStatus(order.id, 'IN_PRODUCTION')}
                        className="px-3 py-1.5 bg-ink text-paper hover:bg-ink-light rounded font-mono text-xs font-bold transition-colors shadow-sm"
                      >
                        Start Printing &rarr;
                      </button>
                    )}
                    {order.status === 'IN_PRODUCTION' && (
                      <button
                        type="button"
                        data-testid={`action-move-qa-${order.orderNumber}`}
                        disabled={updatingOrderId === order.id}
                        onClick={() => handleUpdateStatus(order.id, 'QA_PASSED')}
                        className="px-3 py-1.5 bg-indigo-700 text-paper hover:bg-indigo-800 rounded font-mono text-xs font-bold transition-colors shadow-sm"
                      >
                        Move to QA &rarr;
                      </button>
                    )}
                    {(order.status === 'QA' || order.status === 'QA_PASSED') && (
                      <button
                        type="button"
                        data-testid={`action-ship-${order.orderNumber}`}
                        disabled={updatingOrderId === order.id}
                        onClick={() => handleUpdateStatus(order.id, 'SHIPPED')}
                        className="px-3 py-1.5 bg-emerald-700 text-paper hover:bg-emerald-800 rounded font-mono text-xs font-bold transition-colors shadow-sm"
                      >
                        Dispatch / Ship &rarr;
                      </button>
                    )}
                    {order.status === 'SHIPPED' && (
                      <span className="font-mono text-xs text-emerald-700 font-bold flex items-center space-x-1">
                        <CheckCircle className="w-4 h-4" />
                        <span>Dispatched to Courier</span>
                      </span>
                    )}
                    {order.status === 'DELIVERED' && (
                      <span className="font-mono text-xs text-emerald-700 font-bold flex items-center space-x-1">
                        <CheckCircle className="w-4 h-4" />
                        <span>Delivered</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Spec Inspection Modal */}
      {inspectPackage && (
        <div
          data-testid="spec-inspection-modal"
          className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-paper-light border border-borderCol rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-borderCol pb-3">
              <h3 className="font-sans font-bold text-base text-ink">
                RIP Production Package &bull; {inspectPackage.jobId}
              </h3>
              <button
                onClick={() => setInspectPackage(null)}
                className="text-mutedGray hover:text-ink font-mono text-sm"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-paper p-4 rounded-xl border border-borderCol">
              <div>
                <span className="text-mutedGray">Garment SKU:</span>{' '}
                <span className="font-bold">{inspectPackage.garment?.blankSku}</span>
              </div>
              <div>
                <span className="text-mutedGray">Variant SKU:</span>{' '}
                <span className="font-bold">{inspectPackage.garment?.variantSku}</span>
              </div>
              <div>
                <span className="text-mutedGray">Color:</span>{' '}
                <span>{inspectPackage.garment?.colorName} ({inspectPackage.garment?.colorHex})</span>
              </div>
              <div>
                <span className="text-mutedGray">Size:</span>{' '}
                <span className="font-bold">{inspectPackage.garment?.size}</span>
              </div>
              <div>
                <span className="text-mutedGray">Print Platen:</span>{' '}
                <span>
                  {inspectPackage.printingTechnique?.maxPrintWidthCm} x {inspectPackage.printingTechnique?.maxPrintHeightCm} cm
                </span>
              </div>
              <div>
                <span className="text-mutedGray">Target Dispatch:</span>{' '}
                <span className="font-bold text-warm-dark">
                  {inspectPackage.targetShipDate ? new Date(inspectPackage.targetShipDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-mono text-xs uppercase font-bold text-ink">Surface Print Coordinates</h4>
              {inspectPackage.surfaces?.map((surf: any) => (
                <div key={surf.surface} className="border border-borderCol rounded-lg p-3 bg-paper space-y-2">
                  <div className="flex justify-between font-mono text-xs font-bold text-ink">
                    <span>{surf.surfaceName} ({surf.surface})</span>
                    <span>{surf.artworkCount} artwork(s)</span>
                  </div>
                  {surf.artworks?.map((art: any, idx: number) => (
                    <div key={idx} className="text-xs font-mono pl-2 border-l-2 border-warm space-y-0.5">
                      <div className="font-bold text-ink">{art.title} (by {art.creatorName})</div>
                      <div className="text-mutedGray">
                        Dimensions: {art.placement?.calculatedWidthCm} x {art.placement?.calculatedHeightCm} cm
                        (Center: X {art.placement?.xCenterCm}cm, Y {art.placement?.yCenterCm}cm)
                      </div>
                      <div className="text-[11px] text-mutedGray truncate">
                        Asset: <span className="text-warm-dark">{art.highResAssetUrl}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end space-x-3">
              <a
                href={`/api/orders/${inspectPackage.orderId}/production`}
                download={`${inspectPackage.jobId}.json`}
                className="px-4 py-2 bg-ink text-paper rounded-lg font-mono text-xs font-bold hover:bg-ink-light transition-colors"
              >
                Download Full JSON
              </a>
              <button
                onClick={() => setInspectPackage(null)}
                className="px-4 py-2 border border-borderCol rounded-lg font-mono text-xs text-mutedGray hover:text-ink"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierDashboardClient;
