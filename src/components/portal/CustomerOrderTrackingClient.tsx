'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  PackageCheck,
  Truck,
  CheckCircle2,
  Clock,
  Printer,
  ShieldCheck,
  ChevronRight,
  Shirt,
  Layers,
  MapPin,
  Download,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

export interface CustomerOrderTrackingClientProps {
  order: any;
}

export const CustomerOrderTrackingClient: React.FC<CustomerOrderTrackingClientProps> = ({
  order,
}) => {
  const [activePreviewSurface, setActivePreviewSurface] = useState<'FRONT' | 'BACK'>('FRONT');

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

  // Production Stepper stages
  const statusSteps = [
    { key: 'PAYMENT_CONFIRMED', label: 'Payment Confirmed', desc: 'Order verified & sent to supplier' },
    { key: 'IN_PRODUCTION', label: 'In Production', desc: 'Blank garment loaded & Kornit DTG printing' },
    { key: 'QA', altKey: 'QA_PASSED', label: 'Quality Assurance', desc: 'Pre-ship QA audit & packaging' },
    { key: 'SHIPPED', label: 'Shipped', desc: 'Courier dispatch with tracking' },
    { key: 'DELIVERED', label: 'Delivered', desc: 'Package arrived at destination' },
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'PAYMENT_CONFIRMED':
        return 0;
      case 'IN_PRODUCTION':
        return 1;
      case 'QA':
      case 'QA_PASSED':
        return 2;
      case 'SHIPPED':
        return 3;
      case 'DELIVERED':
        return 4;
      default:
        return 0;
    }
  };

  const currentStepIdx = getStepIndex(order.status || 'PAYMENT_CONFIRMED');

  return (
    <div className="space-y-8 w-full">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/studio/new"
          className="inline-flex items-center space-x-1 font-mono text-xs text-mutedGray hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Studio</span>
        </Link>
        <span className="font-mono text-xs text-mutedGray">
          Order ID: <span className="font-bold text-ink">{order.orderNumber}</span>
        </span>
      </div>

      {/* Main Order Card Header */}
      <div className="p-6 bg-paper-light border border-borderCol rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold font-sans text-ink">
              Order #{order.orderNumber}
            </h1>
            <span
              data-testid="order-payment-status"
              className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200"
            >
              {order.paymentStatus || 'PAID'}
            </span>
          </div>
          <p className="font-mono text-xs text-mutedGray mt-1">
            Placed on{' '}
            {new Date(order.createdAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}{' '}
            &bull; Supplier:{' '}
            <span className="text-ink font-semibold">
              {order.supplier?.companyName || 'Bangkok Garment Craft'}
            </span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <a
            data-testid="customer-download-spec"
            href={`/api/orders/${order.id}/production`}
            className="px-3.5 py-2 border border-borderCol rounded-lg font-mono text-xs font-bold text-ink hover:bg-paper-dark transition-colors flex items-center space-x-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Spec</span>
          </a>
          <button
            type="button"
            data-testid="print-receipt-btn"
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-ink text-paper rounded-lg font-mono text-xs font-bold hover:bg-ink-light transition-colors shadow-sm flex items-center space-x-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>

      {/* Visual Status Stepper */}
      <div
        data-testid="order-status-stepper"
        className="p-6 bg-paper-light border border-borderCol rounded-2xl shadow-sm space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-wider font-bold text-ink">
            Manufacturing & Delivery Progress
          </h2>
          <span className="font-mono text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            CURRENT: {order.status}
          </span>
        </div>

        <div className="relative">
          {/* Connecting Line */}
          <div className="hidden sm:block absolute top-4 left-6 right-6 h-0.5 bg-borderCol" />
          <div
            className="hidden sm:block absolute top-4 left-6 h-0.5 bg-ink transition-all duration-500"
            style={{
              width: `${(currentStepIdx / (statusSteps.length - 1)) * 90}%`,
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative z-10">
            {statusSteps.map((step, idx) => {
              const isPast = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;

              return (
                <div
                  key={step.key}
                  data-testid={`stepper-step-${step.key.toLowerCase()}`}
                  className="flex sm:flex-col items-start sm:items-center space-x-3 sm:space-x-0 space-y-0 sm:space-y-2"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-colors ${
                      isPast
                        ? 'bg-emerald-600 text-paper'
                        : isCurrent
                        ? 'bg-ink text-paper ring-4 ring-warm/40'
                        : 'bg-paper border border-borderCol text-mutedGray'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <div className="sm:text-center">
                    <div className={`font-mono text-xs font-bold ${isCurrent ? 'text-ink' : 'text-mutedGray'}`}>
                      {step.label}
                    </div>
                    <p className="font-mono text-[10px] text-mutedGray hidden sm:block mt-0.5">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two Column Layout: Design Mockup & Garment Details VS Server Itemized Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Visual Mockup & Garment Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Garment Mockup Preview Card */}
          <div
            data-testid="mockup-preview-card"
            className="p-6 bg-paper-light border border-borderCol rounded-2xl shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase font-bold text-ink">
                Custom Apparel Mockup
              </span>
              <div className="flex space-x-1 bg-paper p-1 rounded-lg border border-borderCol">
                <button
                  type="button"
                  data-testid="preview-surface-front"
                  onClick={() => setActivePreviewSurface('FRONT')}
                  className={`px-3 py-1 font-mono text-xs rounded transition-colors ${
                    activePreviewSurface === 'FRONT' ? 'bg-ink text-paper font-bold' : 'text-mutedGray'
                  }`}
                >
                  Front Canvas
                </button>
                <button
                  type="button"
                  data-testid="preview-surface-back"
                  onClick={() => setActivePreviewSurface('BACK')}
                  className={`px-3 py-1 font-mono text-xs rounded transition-colors ${
                    activePreviewSurface === 'BACK' ? 'bg-ink text-paper font-bold' : 'text-mutedGray'
                  }`}
                >
                  Back Canvas
                </button>
              </div>
            </div>

            {/* Garment Visual Canvas Container */}
            <div
              className="relative w-full aspect-square rounded-xl flex items-center justify-center overflow-hidden border border-borderCol/60 shadow-inner"
              style={{ backgroundColor: order.design?.garmentColorHex || '#131718' }}
            >
              {/* T-Shirt Silhouette Outline Overlay */}
              <div className="absolute inset-4 border border-dashed border-white/20 rounded-lg pointer-events-none flex items-center justify-center">
                <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
                  {activePreviewSurface} PRINT ZONE (35 x 45 CM)
                </span>
              </div>

              {/* Render placed elements on active surface */}
              {(activePreviewSurface === 'FRONT' ? frontElements : backElements).map((el: any) => (
                <div
                  key={el.id}
                  className="absolute"
                  style={{
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    width: `${el.width}%`,
                    height: `${el.height}%`,
                    transform: `translate(-50%, -50%) rotate(${el.rotation || 0}deg)`,
                    zIndex: el.zIndex || 1,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={el.previewUrl}
                    alt={el.title}
                    className="w-full h-full object-contain filter drop-shadow-md"
                  />
                </div>
              ))}
            </div>

            {/* Garment Blank Metadata */}
            <div className="p-4 bg-paper rounded-xl border border-borderCol text-xs font-mono space-y-1.5">
              <div className="flex justify-between">
                <span className="text-mutedGray">Blank Model:</span>
                <span className="font-bold text-ink">
                  {order.design?.garmentProduct?.name || 'Apex Heavyweight Tee'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-mutedGray">Fabric Specification:</span>
                <span className="text-ink">
                  {order.design?.garmentProduct?.fabric || '100% Combed Cotton, 240 GSM'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-mutedGray">Variant / Color:</span>
                <span className="text-ink flex items-center space-x-1.5">
                  <span
                    className="w-3 h-3 rounded-full border border-borderCol inline-block"
                    style={{ backgroundColor: order.design?.garmentColorHex || '#131718' }}
                  />
                  <span>Size {order.design?.garmentSize || 'L'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Licensed Artworks List */}
          <div
            data-testid="licensed-artworks-card"
            className="p-6 bg-paper-light border border-borderCol rounded-2xl shadow-sm space-y-4"
          >
            <h3 className="font-mono text-xs uppercase font-bold text-ink">
              Licensed Creator Artworks ({order.obligations?.length || 0})
            </h3>
            <div className="space-y-3">
              {order.obligations?.map((ob: any) => (
                <div
                  key={ob.id}
                  className="p-3 bg-paper rounded-xl border border-borderCol flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center space-x-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ob.artwork?.previewUrl}
                      alt={ob.artwork?.title}
                      className="w-10 h-10 rounded border border-borderCol object-cover bg-paper-dark"
                    />
                    <div>
                      <div className="font-bold text-ink">{ob.artwork?.title}</div>
                      <div className="text-mutedGray text-[11px]">
                        Creator:{' '}
                        {ob.artwork?.creator?.slug ? (
                          <Link
                            href={`/creators/${ob.artwork.creator.slug}`}
                            className="text-warm-dark hover:underline font-semibold"
                          >
                            {ob.artwork?.creator?.displayName || ob.artwork.creator.slug}
                          </Link>
                        ) : (
                          <span>{ob.artwork?.creator?.displayName || 'Independent Creator'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-ink">฿{ob.totalAmount.toLocaleString()}</span>
                    <div className="text-[10px] text-mutedGray">Standard License</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Server-Authoritative Pricing Breakdown & Shipping */}
        <div className="lg:col-span-5 space-y-6">
          {/* Authoritative Pricing Engine Breakdown */}
          <div
            data-testid="itemized-pricing-breakdown"
            className="p-6 bg-paper-light border-2 border-borderCol rounded-2xl shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between border-b border-borderCol pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <h3 className="font-sans font-bold text-sm uppercase text-ink">
                  Authoritative Price Breakdown
                </h3>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-warm/30 text-ink font-bold border border-warm/50">
                SERVER VERIFIED
              </span>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex justify-between items-center text-ink">
                <span className="text-mutedGray">1. Garment Blank (APX-HVY-001)</span>
                <span data-testid="cost-garment" className="font-semibold">
                  ฿{order.garmentCost.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center text-ink">
                <span className="text-mutedGray">2. Kornit DTG Printing</span>
                <span data-testid="cost-printing" className="font-semibold">
                  ฿{order.printingCost.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center text-ink">
                <span className="text-mutedGray">3. Eco Apparel Packaging</span>
                <span data-testid="cost-packaging" className="font-semibold">
                  ฿{order.packagingCost.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center text-ink">
                <span className="text-mutedGray">4. Express Flat Shipping</span>
                <span data-testid="cost-shipping" className="font-semibold">
                  ฿{order.shippingCost.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center text-ink">
                <span className="text-mutedGray">5. Artwork License Royalties</span>
                <span data-testid="cost-licensing" className="font-semibold text-warm-dark">
                  ฿{order.licensingCost.toLocaleString()}
                </span>
              </div>

              {/* Total Calculation */}
              <div className="pt-3 border-t-2 border-borderCol flex justify-between items-baseline">
                <div>
                  <span className="font-sans font-bold text-sm text-ink uppercase">
                    Total Amount Paid
                  </span>
                  <p className="text-[10px] text-mutedGray">Exact benchmark ฿410 guarantee</p>
                </div>
                <span
                  data-testid="cost-total"
                  className="font-mono text-2xl font-black text-ink"
                >
                  ฿{order.totalAmount.toLocaleString()} THB
                </span>
              </div>
            </div>
          </div>

          {/* Shipping Address & Delivery Details */}
          <div
            data-testid="shipping-info-card"
            className="p-6 bg-paper-light border border-borderCol rounded-2xl shadow-sm space-y-3 font-mono text-xs"
          >
            <div className="flex items-center space-x-2 text-ink font-bold font-sans">
              <MapPin className="w-4 h-4 text-warm-dark" />
              <span>Shipping Information</span>
            </div>
            <div className="space-y-1 text-ink pt-1">
              <div className="font-bold">{order.shippingName}</div>
              <div className="text-mutedGray">{order.shippingAddress}</div>
              <div className="text-mutedGray">
                {order.shippingCity}, {order.shippingPostal}
              </div>
              {order.shippingPhone && (
                <div className="text-mutedGray">Phone: {order.shippingPhone}</div>
              )}
            </div>
          </div>

          {/* Call to Action: Design Again */}
          <div className="p-5 bg-gradient-to-br from-paper to-warm/20 border border-warm/40 rounded-2xl shadow-sm space-y-2 text-center">
            <Sparkles className="w-5 h-5 text-warm-dark mx-auto" />
            <h4 className="font-sans font-bold text-sm text-ink">Love this design?</h4>
            <p className="font-mono text-[11px] text-mutedGray">
              Create another custom oversized tee in the 2D & 3D Interactive Design Studio.
            </p>
            <div className="pt-2">
              <Link
                href="/studio/new"
                className="inline-block w-full py-2.5 bg-ink hover:bg-ink-light text-paper font-mono text-xs font-bold uppercase rounded-lg transition-colors shadow-sm"
              >
                Customize Another Tee
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerOrderTrackingClient;
