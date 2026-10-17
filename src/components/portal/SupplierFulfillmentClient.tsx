'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck,
  Package,
  Printer,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  QrCode,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  Download,
} from 'lucide-react';
import { SupplierNav } from '@/components/portal/SupplierNav';
import { SUPPORTED_COURIERS, validateTrackingNumber } from '@/lib/supplier';

export interface SupplierFulfillmentClientProps {
  suppliers: Array<{
    id: string;
    slug: string;
    companyName: string;
    location: string;
    leadTimeDays: number;
  }>;
  currentSupplierSlug: string;
  initialOrders: any[];
}

export const SupplierFulfillmentClient: React.FC<SupplierFulfillmentClientProps> = ({
  suppliers,
  currentSupplierSlug,
  initialOrders,
}) => {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>(initialOrders);

  // Synchronize orders when facility prop changes
  useEffect(() => {
    setOrders(initialOrders);
  }, [currentSupplierSlug, initialOrders]);

  // Selected order for dispatch form
  const [dispatchOrder, setDispatchOrder] = useState<any | null>(null);
  const [selectedCourier, setSelectedCourier] = useState<string>('THAILAND_POST_EMS');
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const [dispatchNotes, setDispatchNotes] = useState<string>('');

  // Selected order for printable packing slip preview
  const [slipData, setSlipData] = useState<any | null>(null);
  const [slipFormat, setSlipFormat] = useState<'A6' | 'A4'>('A4');

  // Status feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleOpenDispatch = (order: any) => {
    setDispatchOrder(order);
    setTrackingNumber('');
    setErrorMessage(null);

    // If order already has fulfillment info in snapshotData, prefill it
    try {
      if (order.snapshotData) {
        const snap = JSON.parse(order.snapshotData);
        if (snap.fulfillment) {
          const matched = SUPPORTED_COURIERS.find(
            (c) =>
              c.code === snap.fulfillment.courier ||
              c.name.toLowerCase() === (snap.fulfillment.courier || '').toLowerCase()
          );
          setSelectedCourier(matched ? matched.code : 'THAILAND_POST_EMS');
          setTrackingNumber(snap.fulfillment.trackingNumber || '');
        }
      }
    } catch {}
  };

  const handleOpenPackingSlip = (order: any) => {
    let fulfillmentInfo: any = null;
    try {
      if (order.snapshotData) {
        const snap = JSON.parse(order.snapshotData);
        fulfillmentInfo = snap.fulfillment || null;
      }
    } catch {}

    const garment = order.design?.garmentProduct;
    let hasFront = false;
    let hasBack = false;
    try {
      if (order.design?.frontElements) {
        const parsed =
          typeof order.design.frontElements === 'string'
            ? JSON.parse(order.design.frontElements)
            : order.design.frontElements;
        hasFront = Array.isArray(parsed) && parsed.length > 0;
      }
      if (order.design?.backElements) {
        const parsed =
          typeof order.design.backElements === 'string'
            ? JSON.parse(order.design.backElements)
            : order.design.backElements;
        hasBack = Array.isArray(parsed) && parsed.length > 0;
      }
    } catch {}

    const surfaces: string[] = [];
    if (hasFront) surfaces.push('FRONT');
    if (hasBack) surfaces.push('BACK');
    if (surfaces.length === 0 && (order.printingCost ?? 0) > 0) {
      surfaces.push('FRONT');
    }

    const slip = {
      slipNumber: `SLIP-${order.orderNumber}`,
      orderNumber: order.orderNumber,
      orderId: order.id,
      date: new Date().toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      customer: {
        name: order.shippingName,
        address: order.shippingAddress,
        city: order.shippingCity,
        postalCode: order.shippingPostal,
        phone: order.shippingPhone || 'N/A',
      },
      supplier: {
        companyName:
          suppliers.find((s) => s.slug === currentSupplierSlug)?.companyName ||
          'Bangkok Garment Craft Co.',
        location:
          suppliers.find((s) => s.slug === currentSupplierSlug)?.location ||
          'Bangkok, Thailand',
      },
      item: {
        sku: garment?.sku || 'APX-HVY-001',
        name: garment?.name || 'Apex Heavyweight Oversized Tee',
        fabric: garment?.fabric || '100% Combed Cotton, 240 GSM',
        colorHex: order.design?.garmentColorHex || '#131718',
        size: order.design?.garmentSize || 'L',
        quantity: order.quantity || 1,
        surfaces,
      },
      fulfillment: {
        courier:
          fulfillmentInfo?.courier ||
          SUPPORTED_COURIERS.find((c) => c.code === selectedCourier)?.name ||
          'Thailand Post EMS',
        trackingNumber: fulfillmentInfo?.trackingNumber || 'READY-FOR-DISPATCH',
      },
      qrCodeUrl: `https://track.ape-parel.com/${order.orderNumber}`,
    };

    setSlipData(slip);
  };

  const handleSubmitDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchOrder) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanTracking = trackingNumber.replace(/\s+/g, '').trim();
    const validation = validateTrackingNumber(selectedCourier, cleanTracking);
    if (!validation.valid) {
      setErrorMessage(validation.message || 'Invalid tracking number format');
      return;
    }

    setIsSubmitting(true);
    try {
      const courierObj = SUPPORTED_COURIERS.find((c) => c.code === selectedCourier);
      const courierName = courierObj?.name || selectedCourier;

      const res = await fetch('/api/supplier/fulfillment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: dispatchOrder.id,
          courier: courierName,
          trackingNumber: cleanTracking,
          notes: dispatchNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Dispatch submission failed');
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === dispatchOrder.id
            ? {
                ...o,
                status: 'SHIPPED',
                snapshotData: JSON.stringify({
                  ...(() => {
                    try {
                      return JSON.parse(o.snapshotData || '{}');
                    } catch {
                      return {};
                    }
                  })(),
                  fulfillment: {
                    courier: courierName,
                    trackingNumber: trackingNumber.trim(),
                    dispatchedAt: new Date().toISOString(),
                    packingSlipGenerated: true,
                  },
                }),
              }
            : o
        )
      );

      setSuccessMessage(
        `Order ${dispatchOrder.orderNumber} successfully marked as SHIPPED with tracking ${trackingNumber.trim()}`
      );
      setDispatchOrder(null);
      router.refresh();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error updating order dispatch status');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 w-full">
      <SupplierNav
        currentSupplierSlug={currentSupplierSlug}
        suppliers={suppliers}
      />

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-paper-light border border-borderCol p-6 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold font-sans text-ink">
              Logistics & Shipping Fulfillment
            </h2>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-warm/20 text-ink font-semibold">
              จัดส่งพัสดุ & ใบปะหน้า
            </span>
          </div>
          <p className="font-mono text-xs text-mutedGray">
            Select couriers (Thailand Post EMS, Flash Express, Kerry, J&T), assign tracking numbers, and print A6/A4 packing slips.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-mono text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Fulfillment Orders Queue */}
      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="p-12 text-center bg-paper-light border border-borderCol rounded-xl font-mono text-xs text-mutedGray">
            No active orders waiting for fulfillment or shipping dispatch.
          </div>
        ) : (
          orders.map((order) => {
            const garment = order.design?.garmentProduct;
            let fulfillment: any = null;
            try {
              if (order.snapshotData) {
                const snap = JSON.parse(order.snapshotData);
                fulfillment = snap.fulfillment || null;
              }
            } catch {}

            const isShipped = order.status === 'SHIPPED' || order.status === 'DELIVERED';

            return (
              <div
                key={order.id}
                className="p-6 bg-paper-light border border-borderCol rounded-xl shadow-sm space-y-4 hover:border-warm transition-colors"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-borderCol/60 pb-3">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-sm font-black text-ink">
                      JOB-{order.orderNumber}
                    </span>
                    <span
                      className={`font-mono text-[11px] px-2 py-0.5 rounded font-bold ${
                        isShipped
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : order.status === 'READY_TO_PACK'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  {/* Top Action Buttons */}
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleOpenPackingSlip(order)}
                      className="px-3 py-1.5 bg-paper hover:bg-paper-dark border border-borderCol rounded-lg font-mono text-xs font-bold text-ink flex items-center space-x-1.5 transition-colors shadow-sm"
                    >
                      <Printer className="w-3.5 h-3.5 text-warm-dark" />
                      <span>Print Packing Slip</span>
                    </button>

                    {!isShipped && (
                      <button
                        type="button"
                        onClick={() => handleOpenDispatch(order)}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-paper rounded-lg font-mono text-xs font-bold transition-colors shadow-sm flex items-center space-x-1.5"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Dispatch / Ship</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                  {/* Delivery Info */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase text-mutedGray font-bold">
                      Delivery Destination
                    </span>
                    <div className="font-bold text-ink">{order.shippingName}</div>
                    <div className="text-mutedGray truncate">{order.shippingAddress}</div>
                    <div className="text-mutedGray">
                      {order.shippingCity} {order.shippingPostal}
                    </div>
                    {order.shippingPhone && (
                      <div className="text-[11px] text-mutedGray">Tel: {order.shippingPhone}</div>
                    )}
                  </div>

                  {/* Garment Details */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase text-mutedGray font-bold">
                      Garment Item
                    </span>
                    <div className="font-bold text-ink">{garment?.name || 'Apex Heavyweight Tee'}</div>
                    <div className="text-mutedGray">SKU: {garment?.sku || 'APX-HVY-001'}</div>
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

                  {/* Tracking Status */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase text-mutedGray font-bold">
                      Logistics Dispatch
                    </span>
                    {fulfillment ? (
                      <div className="p-2.5 bg-paper rounded-lg border border-borderCol/80 space-y-1">
                        <div className="font-bold text-emerald-800 flex items-center space-x-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{fulfillment.courier}</span>
                        </div>
                        <div className="text-ink font-mono font-bold tracking-wider">
                          {fulfillment.trackingNumber}
                        </div>
                        {fulfillment.dispatchedAt && (
                          <div className="text-[10px] text-mutedGray">
                            Dispatched: {new Date(fulfillment.dispatchedAt).toLocaleDateString('th-TH')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-2.5 bg-paper/60 rounded-lg border border-dashed border-borderCol text-mutedGray">
                        Pending courier dispatch assignment.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dispatch Order Modal */}
      {dispatchOrder && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper-light border border-borderCol rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-borderCol pb-3">
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-ink" />
                <h3 className="font-sans font-bold text-base text-ink">
                  Fulfill Order #{dispatchOrder.orderNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDispatchOrder(null)}
                className="text-mutedGray hover:text-ink font-mono text-sm"
              >
                &times;
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 font-mono text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmitDispatch} className="space-y-4 font-mono text-xs">
              {/* Courier Selection */}
              <div className="space-y-1.5">
                <label className="font-bold text-ink">Select Courier Carrier:</label>
                <select
                  value={selectedCourier}
                  onChange={(e) => setSelectedCourier(e.target.value)}
                  className="w-full px-3 py-2 bg-paper border border-borderCol rounded-xl text-ink font-mono focus:outline-none focus:border-warm"
                >
                  {SUPPORTED_COURIERS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.description})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tracking Number Input */}
              <div className="space-y-1.5">
                <label className="font-bold text-ink">Courier Tracking Number:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ED123456789TH or TH0123456789"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-paper border border-borderCol rounded-xl text-ink font-mono uppercase focus:outline-none focus:border-warm font-bold"
                />
                <p className="text-[10px] text-mutedGray">
                  Enter official shipping barcode tracking number from courier dispatch receipt.
                </p>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="font-bold text-ink">Fulfillment Notes (Optional):</label>
                <textarea
                  rows={2}
                  placeholder="Internal warehouse or packaging notes..."
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-paper border border-borderCol rounded-xl text-ink font-mono focus:outline-none focus:border-warm"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setDispatchOrder(null)}
                  className="px-4 py-2 border border-borderCol rounded-xl font-mono text-xs text-mutedGray hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-paper rounded-xl font-mono text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Confirming Dispatch...' : 'Confirm Dispatch & Mark Shipped'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Packing Slip & Shipping Label Modal */}
      {slipData && (
        <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper-light border border-borderCol rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-borderCol pb-3">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-ink" />
                <h3 className="font-sans font-bold text-base text-ink">
                  Printable Dispatch Document &bull; {slipData.slipNumber}
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 bg-paper p-1 rounded-xl border border-borderCol text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setSlipFormat('A4')}
                    className={`px-3 py-1 rounded-lg transition-colors font-bold ${
                      slipFormat === 'A4' ? 'bg-ink text-paper' : 'text-mutedGray hover:text-ink'
                    }`}
                  >
                    A4 Full Slip
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlipFormat('A6')}
                    className={`px-3 py-1 rounded-lg transition-colors font-bold ${
                      slipFormat === 'A6' ? 'bg-ink text-paper' : 'text-mutedGray hover:text-ink'
                    }`}
                  >
                    A6 Thermal Label
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setSlipData(null)}
                  className="text-mutedGray hover:text-ink font-mono text-sm px-2"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Printable Area with A6 vs A4 Adaptive Styling */}
            <div
              id="printable-packing-slip"
              className={`bg-white rounded-xl border border-borderCol text-black font-mono shadow-inner ${
                slipFormat === 'A6'
                  ? 'max-w-md mx-auto p-5 space-y-4 text-xs border-2 border-black'
                  : 'p-6 space-y-6 text-xs'
              }`}
            >
              {slipFormat === 'A6' ? (
                /* Compact A6 Thermal Shipping Label View (100 x 150 mm) */
                <div className="space-y-4">
                  {/* Courier & Barcode Header */}
                  <div className="border-b-2 border-black pb-3 text-center space-y-1">
                    <div className="text-base font-black uppercase tracking-wider">
                      {slipData.fulfillment.courier}
                    </div>
                    <div className="text-lg font-black tracking-widest bg-gray-100 py-1 rounded border border-black">
                      {slipData.fulfillment.trackingNumber}
                    </div>
                    <div className="text-[10px] text-gray-600 font-bold">
                      EXPRESS LOGISTICS DISPATCH &bull; {slipData.date}
                    </div>
                  </div>

                  {/* Ship To Box */}
                  <div className="border-2 border-black p-3 rounded bg-gray-50 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-600 block">
                      DELIVER TO (ผู้รับ):
                    </span>
                    <div className="font-bold text-sm">{slipData.customer.name}</div>
                    <div className="text-xs">{slipData.customer.address}</div>
                    <div className="text-sm font-black">
                      {slipData.customer.city} {slipData.customer.postalCode}
                    </div>
                    <div className="text-xs font-bold pt-1">Tel: {slipData.customer.phone}</div>
                  </div>

                  {/* Sender & Item Summary */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] border border-gray-300 p-2 rounded">
                    <div>
                      <span className="font-bold text-gray-600 block">FROM:</span>
                      <div className="font-bold truncate">{slipData.supplier.companyName}</div>
                      <div className="text-gray-500">{slipData.supplier.location}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-gray-600 block">ORDER:</span>
                      <div className="font-bold">#{slipData.orderNumber}</div>
                      <div className="text-gray-500">
                        {slipData.item.sku} ({slipData.item.size}) x{slipData.item.quantity} [
                        {slipData.item.surfaces?.length > 0
                          ? slipData.item.surfaces.join('+')
                          : 'BLANK'}
                        ]
                      </div>
                    </div>
                  </div>

                  {/* QR Code & Safety Note */}
                  <div className="flex items-center justify-between border-t-2 border-black pt-3">
                    <div className="flex items-center space-x-2">
                      <QrCode className="w-10 h-10 text-black flex-shrink-0" />
                      <div className="text-[9px] text-gray-600 leading-tight">
                        Scan to verify delivery or visit track.ape-parel.com
                      </div>
                    </div>
                    <span className="text-[9px] font-black uppercase border border-black px-1.5 py-0.5 rounded">
                      A6 THERMAL
                    </span>
                  </div>
                </div>
              ) : (
                /* Full A4 Warehouse Packing Slip View */
                <div className="space-y-6">
                  {/* Slip Top Header */}
                  <div className="flex justify-between items-start border-b-2 border-black pb-4">
                    <div>
                      <h1 className="text-xl font-black uppercase tracking-wider">APE-PAREL</h1>
                      <p className="text-[11px] text-gray-600">Premium Streetwear Production Network</p>
                      <p className="text-[10px] text-gray-500 mt-1">Facility: {slipData.supplier.companyName}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm">{slipData.slipNumber}</div>
                      <div className="text-[11px] text-gray-600">Order: #{slipData.orderNumber}</div>
                      <div className="text-[10px] text-gray-500">Date: {slipData.date}</div>
                    </div>
                  </div>

                  {/* Delivery Destination & Courier Banner */}
                  <div className="grid grid-cols-2 gap-4 border border-black p-4 rounded-lg bg-gray-50">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-500 block">
                        SHIP TO (ผู้รับ):
                      </span>
                      <div className="font-bold text-sm mt-1">{slipData.customer.name}</div>
                      <div className="text-xs mt-0.5">{slipData.customer.address}</div>
                      <div className="text-xs">
                        {slipData.customer.city} {slipData.customer.postalCode}
                      </div>
                      <div className="text-xs mt-1">Tel: {slipData.customer.phone}</div>
                    </div>

                    <div className="border-l border-gray-300 pl-4 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-gray-500 block">
                        COURIER DISPATCH:
                      </span>
                      <div className="font-bold text-xs">{slipData.fulfillment.courier}</div>
                      <div className="font-mono font-black text-sm tracking-wider mt-1 text-black">
                        {slipData.fulfillment.trackingNumber}
                      </div>
                      <div className="pt-2 flex items-center space-x-2">
                        <QrCode className="w-8 h-8 text-black" />
                        <span className="text-[9px] text-gray-500 leading-tight">
                          Scan QR code to verify tracking and delivery timeline.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Garment Item Table */}
                  <div>
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-black text-[10px] uppercase font-bold">
                          <th className="py-2">Item SKU</th>
                          <th className="py-2">Description</th>
                          <th className="py-2">Size</th>
                          <th className="py-2 text-right">Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        <tr>
                          <td className="py-3 font-bold">{slipData.item.sku}</td>
                          <td className="py-3">
                            <div className="font-bold">{slipData.item.name}</div>
                            <div className="text-[10px] text-gray-500">
                              {slipData.item.fabric} &bull; Print: {slipData.item.surfaces?.length > 0 ? slipData.item.surfaces.join(', ') : 'Plain Blank Garment'}
                            </div>
                          </td>
                          <td className="py-3 font-bold">{slipData.item.size}</td>
                          <td className="py-3 text-right font-bold">{slipData.item.quantity} pc(s)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Quality Seal */}
                  <div className="border-t border-black pt-3 flex justify-between items-center text-[10px] text-gray-600">
                    <div>
                      Verified QA Passed &bull; Packaged with Eco-Friendly Kraft Materials
                    </div>
                    <div className="font-bold text-black uppercase">
                      ape-parel Certified Dispatch
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-2">
              <span className="font-mono text-xs text-mutedGray">
                Format: <strong className="text-ink">{slipFormat === 'A6' ? 'A6 Thermal Label (100x150mm)' : 'A4 Full Packing Slip'}</strong>
              </span>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setSlipData(null)}
                  className="px-4 py-2 border border-borderCol rounded-xl font-mono text-xs text-mutedGray hover:text-ink"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2 bg-ink hover:bg-ink-light text-paper rounded-xl font-mono text-xs font-bold transition-colors flex items-center space-x-1.5"
                >
                  <Printer className="w-4 h-4 text-warm" />
                  <span>Print {slipFormat} {slipFormat === 'A6' ? 'Label' : 'Slip'}</span>
                </button>
              </div>
            </div>

            {/* Scoped CSS for Isolated Thermal Label / Packing Slip Printing */}
            <style jsx global>{`
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #printable-packing-slip,
                #printable-packing-slip * {
                  visibility: visible !important;
                }
                #printable-packing-slip {
                  position: fixed !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  margin: 0 !important;
                  padding: ${slipFormat === 'A6' ? '8mm' : '15mm'} !important;
                  border: ${slipFormat === 'A6' ? '2px solid black' : 'none'} !important;
                  box-shadow: none !important;
                  background: white !important;
                }
                @page {
                  size: ${slipFormat === 'A6' ? '100mm 150mm' : 'A4 portrait'};
                  margin: 0;
                }
              }
            `}</style>
          </div>
        </div>
      )}
    </div>
  );
};
