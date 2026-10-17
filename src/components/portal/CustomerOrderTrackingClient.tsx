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
  Ruler,
  AlertTriangle,
  XCircle,
  X,
  MessageSquare,
  Lock,
  Star,
} from 'lucide-react';
import { ProductionBlueprintSheet } from '@/components/portal/ProductionBlueprintSheet';
import { OrderChatBox } from '@/components/portal/OrderChatBox';
import { useSettings } from '@/components/providers/SettingsProvider';

export interface CustomerOrderTrackingClientProps {
  order: any;
}

export const CustomerOrderTrackingClient: React.FC<CustomerOrderTrackingClientProps> = ({
  order,
}) => {
  const { formatPrice, currency, t } = useSettings();
  const [activePreviewSurface, setActivePreviewSurface] = useState<'FRONT' | 'BACK'>('FRONT');
  const [isBlueprintOpen, setIsBlueprintOpen] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  // Cancellation State
  const [currentStatus, setCurrentStatus] = useState<string>(order.status || 'PAYMENT_CONFIRMED');
  const [paymentStatus, setPaymentStatus] = useState<string>(order.paymentStatus || 'PAID');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('Ordered incorrect garment size or color');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [cancelSuccessMessage, setCancelSuccessMessage] = useState<string | null>(null);

  // Cancellation request parsed from order.snapshotData
  const initialCancellationRequest = (() => {
    try {
      if (order.snapshotData) {
        const parsed =
          typeof order.snapshotData === 'string'
            ? JSON.parse(order.snapshotData)
            : order.snapshotData;
        return parsed?.cancellationRequest || null;
      }
    } catch {
      return null;
    }
    return null;
  })();

  const [cancellationRequest, setCancellationRequest] = useState<any>(
    initialCancellationRequest
  );

  const isPendingCancellation = cancellationRequest?.status === 'PENDING';
  const isDirectlyCancellable =
    currentStatus === 'PAYMENT_CONFIRMED' || currentStatus === 'AWAITING_PAYMENT';
  const canRequestCancel = currentStatus === 'IN_PRODUCTION' && !isPendingCancellation;
  const isCancellable = isDirectlyCancellable || canRequestCancel;

  const isCancelled = currentStatus === 'CANCELLED';
  const isPaid =
    paymentStatus === 'PAID' ||
    ['PAYMENT_CONFIRMED', 'IN_PRODUCTION', 'QA', 'QA_PASSED', 'READY_TO_PACK', 'SHIPPED', 'DELIVERED'].includes(
      currentStatus
    );

  const handleConfirmCancel = async () => {
    setIsCancelling(true);
    setCancelError(null);
    try {
      const action = isDirectlyCancellable ? 'CANCEL' : 'REQUEST_CANCEL';
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: cancelReason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Cancellation failed (${res.status})`);
      }
      const data = await res.json();
      if (isDirectlyCancellable) {
        setCurrentStatus('CANCELLED');
        setPaymentStatus('REFUNDED');
      } else {
        const newReq = {
          status: 'PENDING',
          reason: cancelReason,
          requestedAt: new Date().toISOString(),
          slaHours: 24,
        };
        setCancellationRequest(newReq);
        setCancelSuccessMessage(
          'ส่งคำขอยกเลิกไปยังโรงงานผู้ผลิตเรียบร้อยแล้ว โดยโรงงานจะตรวจสอบว่าเริ่มพิมพ์แล้วหรือไม่และตอบกลับภายใน 24 ชม. (หากเกินกำหนด ระบบจะอนุมัติและคืนเงิน 100% ให้อัตโนมัติ)'
        );
      }
      setIsCancelModalOpen(false);
    } catch (err: unknown) {
      setCancelError(err instanceof Error ? err.message : 'Error cancelling order');
    } finally {
      setIsCancelling(false);
    }
  };

  // ── Post-Delivery Review State ──
  const [supplierRating, setSupplierRating] = useState<number>(5);
  const [supplierComment, setSupplierComment] = useState<string>('');
  const [isSubmittingSupplierReview, setIsSubmittingSupplierReview] = useState<boolean>(false);
  const [supplierReviewSuccess, setSupplierReviewSuccess] = useState<boolean>(false);
  const [supplierReviewError, setSupplierReviewError] = useState<string | null>(null);

  const [artworkReviews, setArtworkReviews] = useState<
    Record<
      string,
      { rating: number; comment: string; isSuccess: boolean; isSubmitting: boolean; error: string | null }
    >
  >({});

  const uniqueArtworks = React.useMemo(() => {
    const map = new Map<string, any>();
    if (order.obligations) {
      for (const ob of order.obligations) {
        if (ob.artwork && !map.has(ob.artwork.id)) {
          map.set(ob.artwork.id, ob.artwork);
        }
      }
    }
    return Array.from(map.values());
  }, [order.obligations]);

  const handleSubmitSupplierReview = async () => {
    if (!order.supplierId) return;
    setIsSubmittingSupplierReview(true);
    setSupplierReviewError(null);
    try {
      const res = await fetch(`/api/suppliers/${order.supplierId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          rating: supplierRating,
          comment: supplierComment,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Review failed (${res.status})`);
      }
      setSupplierReviewSuccess(true);
    } catch (err: any) {
      setSupplierReviewError(err.message || 'Failed to submit supplier review');
    } finally {
      setIsSubmittingSupplierReview(false);
    }
  };

  const handleArtworkRatingChange = (artId: string, rating: number) => {
    setArtworkReviews((prev) => ({
      ...prev,
      [artId]: {
        ...(prev[artId] || { comment: '', isSuccess: false, isSubmitting: false, error: null }),
        rating,
      },
    }));
  };

  const handleArtworkCommentChange = (artId: string, comment: string) => {
    setArtworkReviews((prev) => ({
      ...prev,
      [artId]: {
        ...(prev[artId] || { rating: 5, isSuccess: false, isSubmitting: false, error: null }),
        comment,
      },
    }));
  };

  const handleSubmitArtworkReview = async (artworkId: string) => {
    const current = artworkReviews[artworkId] || {
      rating: 5,
      comment: '',
      isSuccess: false,
      isSubmitting: false,
      error: null,
    };
    setArtworkReviews((prev) => ({
      ...prev,
      [artworkId]: { ...current, isSubmitting: true, error: null },
    }));
    try {
      const res = await fetch(`/api/artworks/${artworkId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          rating: current.rating || 5,
          comment: current.comment || '',
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Review failed (${res.status})`);
      }
      setArtworkReviews((prev) => ({
        ...prev,
        [artworkId]: { ...current, isSubmitting: false, isSuccess: true, error: null },
      }));
    } catch (err: any) {
      setArtworkReviews((prev) => ({
        ...prev,
        [artworkId]: {
          ...current,
          isSubmitting: false,
          error: err.message || 'Failed to submit review',
        },
      }));
    }
  };

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
    { key: 'IN_PRODUCTION', label: 'In Production', desc: 'Blank garment loaded & precision printing in progress' },
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

  const currentStepIdx = isCancelled ? -1 : getStepIndex(currentStatus);

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

      {/* Cancelled Alert Banner */}
      {isCancelled && (
        <div
          data-testid="order-cancelled-banner"
          className="p-5 bg-red-50 border border-red-300 rounded-2xl text-red-900 font-mono text-xs flex items-start space-x-3 shadow-xs"
        >
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-red-800">Order Cancelled & Items Restocked</h4>
            <p className="text-red-700 leading-relaxed">
              This order was successfully cancelled prior to workshop printing. The blank garments have been returned to the supplier&apos;s live inventory, payment status marked as REFUNDED, and creator royalty obligations reversed.
            </p>
          </div>
        </div>
      )}

      {/* Pending Cancellation Alert Banner */}
      {(isPendingCancellation || cancelSuccessMessage) && !isCancelled && (
        <div
          data-testid="cancellation-pending-banner"
          className="p-5 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 font-mono text-xs flex items-start space-x-3 shadow-xs"
        >
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-amber-900">
                คำขอยกเลิกคำสั่งซื้ออยู่ระหว่างการพิจารณา (SLA 24 ชั่วโมง)
              </h4>
              <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-bold text-[10px]">
                PENDING REVIEW
              </span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              {cancelSuccessMessage ||
                `คุณได้ส่งคำขอยกเลิกคำสั่งซื้อด้วยเหตุผล: "${cancellationRequest?.reason || 'ขอยกเลิกคำสั่งซื้อ'}". โรงงานผู้ผลิตกำลังตรวจสอบว่าชิ้นงานเริ่มฉีดหมึก/พ่นน้ำยารองพื้นแล้วหรือไม่`}
            </p>
            <div className="pt-1 flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsChatOpen(true)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-mono text-xs font-bold transition-colors shadow-xs flex items-center space-x-1"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>แชทติดตามกับโรงงานผู้ผลิต</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Alert Banner */}
      {cancellationRequest?.status === 'REJECTED' && !isCancelled && (
        <div
          data-testid="cancellation-rejected-banner"
          className="p-5 bg-orange-50 border border-orange-300 rounded-2xl text-orange-900 font-mono text-xs flex items-start space-x-3 shadow-xs"
        >
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1.5 flex-1">
            <h4 className="font-bold text-sm text-orange-900">
              โรงงานไม่สามารถยกเลิกคำสั่งซื้อได้ เนื่องจากเริ่มกระบวนการสกรีนแล้ว
            </h4>
            <p className="text-orange-800 leading-relaxed">
              <strong>เหตุผลจากโรงงาน:</strong> {cancellationRequest.rejectionReason}
            </p>
            {cancellationRequest.proofImageUrl && (
              <div className="pt-1">
                <a
                  href={cancellationRequest.proofImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 underline text-orange-900 hover:text-orange-950 font-bold"
                >
                  <span>📷 ดูภาพถ่ายหลักฐานการพิมพ์ของโรงงาน</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Order Card Header */}
      <div className="p-6 bg-paper-light border border-borderCol rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold font-sans text-ink">
              Order #{order.orderNumber}
            </h1>
            <span
              data-testid="order-payment-status"
              className={`font-mono text-xs px-2 py-0.5 rounded font-bold border ${
                isCancelled
                  ? 'bg-red-100 text-red-800 border-red-200'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}
            >
              {paymentStatus}
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

        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          {/* Customer Cancellation Action Button */}
          {isCancelled ? null : isPendingCancellation ? (
            <div
              data-testid="cancellation-pending-badge"
              className="px-3.5 py-2 border border-amber-300 bg-amber-50 rounded-lg font-mono text-xs font-bold text-amber-900 flex items-center space-x-1.5 shadow-xs"
              title="คำขอยกเลิกอยู่ระหว่างการพิจารณาของโรงงานผู้ผลิต (SLA 24 ชม.)"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
              <span>รอผลการขอยกเลิก (SLA 24 ชม.)</span>
            </div>
          ) : isCancellable ? (
            <button
              type="button"
              data-testid="cancel-order-btn"
              onClick={() => setIsCancelModalOpen(true)}
              className={`px-3.5 py-2 border rounded-lg font-mono text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-xs ${
                isDirectlyCancellable
                  ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100'
                  : 'border-amber-400 text-amber-900 bg-amber-50 hover:bg-amber-100'
              }`}
            >
              {isDirectlyCancellable ? (
                <>
                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                  <span>ยกเลิกคำสั่งซื้อ (Cancel Order)</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>ส่งคำขอยกเลิก (Request Cancel)</span>
                </>
              )}
            </button>
          ) : null}

          <button
            type="button"
            data-testid="customer-chat-supplier-btn"
            onClick={() => setIsChatOpen(true)}
            className="px-3.5 py-2 bg-ink text-paper hover:bg-ink-light rounded-lg font-mono text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-sm"
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            <span>แชทกับผู้ผลิต</span>
          </button>

          {isPaid ? (
            <>
              <button
                type="button"
                data-testid="customer-view-blueprint-btn"
                onClick={() => setIsBlueprintOpen(true)}
                className="px-3.5 py-2 border border-borderCol rounded-lg font-mono text-xs font-bold text-ink hover:bg-paper-dark transition-colors flex items-center space-x-1.5 shadow-sm"
              >
                <Ruler className="w-3.5 h-3.5 text-warm-dark" />
                <span>Placement Blueprint</span>
              </button>
              <a
                data-testid="customer-download-spec"
                href={`/api/orders/${order.id}/production`}
                className="px-3.5 py-2 border border-borderCol rounded-lg font-mono text-xs font-bold text-ink hover:bg-paper-dark transition-colors flex items-center space-x-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Spec</span>
              </a>
            </>
          ) : (
            <div
              data-testid="customer-blueprint-locked-badge"
              className="px-3.5 py-2 border border-amber-500/40 bg-amber-500/10 rounded-lg font-mono text-xs font-semibold text-amber-900 flex items-center space-x-1.5 select-none"
              title="Print Placement Guide & Ruler require completed payment"
            >
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Blueprint Locked (Requires Payment)</span>
            </div>
          )}
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
          <span
            className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
              isCancelled
                ? 'text-red-700 bg-red-50 border-red-200'
                : 'text-emerald-700 bg-emerald-50 border-emerald-200'
            }`}
          >
            CURRENT: {currentStatus}
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

      {/* ── Post-Delivery Rating & Reviews Card ── */}
      {currentStatus === 'DELIVERED' && (
        <div
          data-testid="post-delivery-review-card"
          className="p-6 bg-gradient-to-br from-amber-50/70 via-paper to-amber-50/40 border-2 border-amber-300 rounded-2xl shadow-sm space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 pb-3">
            <div className="flex items-center space-x-2.5">
              <span className="w-8 h-8 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-bold text-sm shadow-xs">
                ⭐
              </span>
              <div>
                <h3 className="font-sans font-bold text-base text-ink">
                  สินค้าจัดส่งสำเร็จแล้ว! ร่วมให้คะแนนและรีวิวความพึงพอใจ
                </h3>
                <p className="font-mono text-xs text-mutedGray">
                  เสียงตอบรับของคุณช่วยพัฒนามาตรฐานโรงงานและสนับสนุนครีเอเตอร์ไทย
                </p>
              </div>
            </div>
            <span className="inline-flex items-center font-mono text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-full shrink-0">
              ✓ Verified Buyer Review
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Review Supplier */}
            <div className="p-4 bg-paper rounded-xl border border-borderCol shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-[10px] uppercase text-mutedGray block">
                    โรงงานผู้ผลิต (Supplier)
                  </span>
                  <span className="font-sans font-bold text-sm text-ink">
                    {order.supplier?.companyName || 'Bangkok Garment Craft'}
                  </span>
                </div>
                {supplierReviewSuccess && (
                  <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    ✓ รีวิวสำเร็จ
                  </span>
                )}
              </div>

              {supplierReviewSuccess ? (
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg text-xs font-mono text-emerald-900">
                  ขอบคุณที่ให้คะแนน {supplierRating} ดาวแก่โรงงานผู้ผลิต คะแนนของคุณถูกบันทึกในระบบเรียบร้อยแล้ว
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Star rating buttons */}
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setSupplierRating(star)}
                        className="p-1 hover:scale-110 transition-transform"
                        title={`${star} Star`}
                      >
                        <Star
                          className={`w-5 h-5 ${
                            star <= supplierRating
                              ? 'fill-amber-400 text-amber-500'
                              : 'text-zinc-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="font-mono text-xs font-bold text-amber-900 ml-2">
                      {supplierRating} / 5 ดาว
                    </span>
                  </div>

                  <textarea
                    rows={2}
                    placeholder="เขียนรีวิวคุณภาพผ้า, การตัดเย็บ, และการสกรีนของโรงงาน..."
                    value={supplierComment}
                    onChange={(e) => setSupplierComment(e.target.value)}
                    className="w-full text-xs font-sans p-2.5 rounded-lg border border-borderCol bg-paper-light focus:outline-none focus:border-ink transition-colors"
                  />

                  {supplierReviewError && (
                    <div className="text-[11px] font-mono text-red-600">{supplierReviewError}</div>
                  )}

                  <button
                    type="button"
                    disabled={isSubmittingSupplierReview}
                    onClick={handleSubmitSupplierReview}
                    className="px-4 py-2 bg-ink hover:bg-ink-light disabled:bg-mutedGray text-paper font-mono text-xs font-bold uppercase rounded-lg transition-colors shadow-2xs"
                  >
                    {isSubmittingSupplierReview ? 'กำลังส่งรีวิว...' : 'ส่งรีวิวโรงงานผู้ผลิต'}
                  </button>
                </div>
              )}
            </div>

            {/* 2. Review Artwork Creators */}
            <div className="p-4 bg-paper rounded-xl border border-borderCol shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-[10px] uppercase text-mutedGray block">
                    ผลงานลายกราฟิก (Creator Artworks)
                  </span>
                  <span className="font-sans font-bold text-sm text-ink">
                    ให้ดาวผลงานครีเอเตอร์ ({uniqueArtworks.length} ลาย)
                  </span>
                </div>
              </div>

              {uniqueArtworks.length === 0 ? (
                <div className="text-xs font-mono text-mutedGray italic py-2">
                  คำสั่งซื้อนี้ไม่มีชิ้นงานครีเอเตอร์
                </div>
              ) : (
                <div className="space-y-4">
                  {uniqueArtworks.map((art: any) => {
                    const rev = artworkReviews[art.id] || {
                      rating: 5,
                      comment: '',
                      isSuccess: false,
                      isSubmitting: false,
                      error: null,
                    };

                    return (
                      <div
                        key={art.id}
                        className="p-3 bg-paper-light rounded-lg border border-borderCol space-y-2.5"
                      >
                        <div className="flex items-center space-x-2.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={art.previewUrl}
                            alt={art.title}
                            className="w-8 h-8 rounded border border-borderCol object-cover bg-paper-dark"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-sans font-bold text-xs text-ink block truncate">
                              {art.title}
                            </span>
                            <span className="font-mono text-[10px] text-mutedGray">
                              @{art.creator?.slug || 'creator'}
                            </span>
                          </div>
                          {rev.isSuccess && (
                            <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">
                              ✓ ให้คะแนนแล้ว
                            </span>
                          )}
                        </div>

                        {rev.isSuccess ? (
                          <div className="p-2 bg-emerald-50/60 border border-emerald-200 rounded text-[11px] font-mono text-emerald-900">
                            ขอบคุณที่ให้คะแนน {rev.rating} ดาวแก่ลายผลงานนี้
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => handleArtworkRatingChange(art.id, star)}
                                  className="p-0.5 hover:scale-110 transition-transform"
                                  title={`${star} Star`}
                                >
                                  <Star
                                    className={`w-4 h-4 ${
                                      star <= (rev.rating || 5)
                                        ? 'fill-amber-400 text-amber-500'
                                        : 'text-zinc-300'
                                    }`}
                                  />
                                </button>
                              ))}
                              <span className="font-mono text-[11px] font-bold text-amber-900 ml-1.5">
                                {rev.rating || 5} ดาว
                              </span>
                            </div>

                            <input
                              type="text"
                              placeholder="รีวิวความคมชัด, สี, หรือไอเดียของลาย..."
                              value={rev.comment || ''}
                              onChange={(e) => handleArtworkCommentChange(art.id, e.target.value)}
                              className="w-full text-xs font-sans p-2 rounded border border-borderCol bg-paper focus:outline-none focus:border-ink transition-colors"
                            />

                            {rev.error && (
                              <div className="text-[11px] font-mono text-red-600">{rev.error}</div>
                            )}

                            <button
                              type="button"
                              disabled={rev.isSubmitting}
                              onClick={() => handleSubmitArtworkReview(art.id)}
                              className="px-3 py-1.5 bg-ink hover:bg-ink-light disabled:bg-mutedGray text-paper font-mono text-[11px] font-bold uppercase rounded transition-colors"
                            >
                              {rev.isSubmitting ? 'กำลังส่ง...' : 'ส่งคะแนนให้ครีเอเตอร์'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                    <span className="font-bold text-ink">{formatPrice(ob.totalAmount)}</span>
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
                  {t.livePricing.breakdownTitle || 'Authoritative Price Breakdown'}
                </h3>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-warm/30 text-ink font-bold border border-warm/50">
                {t.livePricing.verifiedContract || 'SERVER VERIFIED'}
              </span>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex justify-between items-center text-ink">
                <span className="text-mutedGray">1. {t.livePricing.garmentBase}</span>
                <span data-testid="cost-garment" className="font-semibold">
                  {formatPrice(order.garmentCost)}
                </span>
              </div>

              <div className="flex justify-between items-center text-ink">
                <span className="text-mutedGray">2. {t.livePricing.printFee}</span>
                <span data-testid="cost-printing" className="font-semibold">
                  {formatPrice(order.printingCost)}
                </span>
              </div>

              <div className="flex justify-between items-center text-ink">
                <span className="text-mutedGray">3. {t.livePricing.packaging}</span>
                <span data-testid="cost-packaging" className="font-semibold">
                  {formatPrice(order.packagingCost)}
                </span>
              </div>

              <div className="flex justify-between items-center text-ink">
                <span className="text-mutedGray">4. {t.livePricing.shipping}</span>
                <span data-testid="cost-shipping" className="font-semibold">
                  {formatPrice(order.shippingCost)}
                </span>
              </div>

              <div className="flex justify-between items-center text-ink">
                <span className="text-mutedGray">5. {t.livePricing.artworkLicenses}</span>
                <span data-testid="cost-licensing" className="font-semibold text-warm-dark">
                  {formatPrice(order.licensingCost)}
                </span>
              </div>

              {/* Total Calculation */}
              <div className="pt-3 border-t-2 border-borderCol flex justify-between items-baseline">
                <div>
                  <span className="font-sans font-bold text-sm text-ink uppercase">
                    {t.livePricing.total}
                  </span>
                  {currency !== 'THB' && (
                    <p className="text-[10px] text-mutedGray">
                      {t.livePricing.approxEquivalent} ฿{order.totalAmount.toLocaleString()} THB
                    </p>
                  )}
                </div>
                <span
                  data-testid="cost-total"
                  className="font-mono text-2xl font-black text-ink"
                >
                  {formatPrice(order.totalAmount)}
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

      {/* Production Blueprint Sheet & Physical Ruler Guide Modal */}
      <ProductionBlueprintSheet
        isOpen={isBlueprintOpen}
        onClose={() => setIsBlueprintOpen(false)}
        orderNumber={order.orderNumber}
        garment={{
          sku: order.design?.garmentProduct?.sku || 'APX-HVY-001',
          name: order.design?.garmentProduct?.name || 'Apex Heavyweight Tee',
          colorHex: order.design?.garmentColorHex || '#131718',
          colorName: order.design?.garmentColorName,
          size: order.design?.garmentSize || 'L',
          fabric: order.design?.garmentProduct?.fabric,
        }}
        frontElements={frontElements}
        backElements={backElements}
        initialSurface={activePreviewSurface}
        frontSnapshotDataUrl={order.design?.previewFrontUrl}
        backSnapshotDataUrl={order.design?.previewBackUrl}
      />

      {/* Order Cancellation Confirmation Modal */}
      {isCancelModalOpen && (
        <div
          data-testid="cancel-order-modal"
          className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-paper-light border border-borderCol w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-borderCol pb-3">
              <div className="flex items-center space-x-2 text-ink font-bold font-mono text-sm uppercase">
                <AlertTriangle className={`w-4 h-4 ${isDirectlyCancellable ? 'text-red-600' : 'text-amber-500'}`} />
                <span>
                  {isDirectlyCancellable
                    ? 'ยกเลิกคำสั่งซื้อทันที (Instant Cancel)'
                    : 'ส่งคำขอยกเลิกคำสั่งซื้อ (Request Cancel)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="p-1 text-mutedGray hover:text-ink rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs font-mono text-ink/80 leading-relaxed">
              {isDirectlyCancellable ? (
                <>
                  คุณแน่ใจหรือไม่ว่าต้องการยกเลิกคำสั่งซื้อ <strong>#{order.orderNumber}</strong>? เนื่องจากคำสั่งซื้อยังไม่ได้เริ่มฉีดหมึก/เข้าไลน์ผลิต ระบบจะทำการ<strong>คืนเงินให้คุณเต็มจำนวน 100% ทันที</strong> พร้อมคืนสต็อกเสื้อเปล่ากลับเข้าคลัง
                </>
              ) : (
                <>
                  คำสั่งซื้อ <strong>#{order.orderNumber}</strong> อยู่ในขั้นตอนผลิต (In Production) ระบบจะส่งคำขอไปยังโรงงานผู้ผลิต หากตัวเสื้อยังไม่ได้ถูกฉีดหมึก/พ่นน้ำยารองพื้น โรงงานจะอนุมัติคำขอและ<strong>คืนเงินให้คุณเต็มจำนวน 100%</strong> (กำหนดเวลาพิจารณาภายใน 24 ชม. หากเกินกำหนดระบบจะอนุมัติให้อัตโนมัติ)
                </>
              )}
            </p>

            <div>
              <label className="block text-[11px] font-mono uppercase text-mutedGray mb-1">
                เหตุผลในการยกเลิก (Reason for Cancellation)
              </label>
              <select
                data-testid="cancel-reason-select"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 bg-paper border border-borderCol rounded-lg text-xs font-mono text-ink focus:outline-none"
              >
                <option value="Ordered incorrect garment size or color">สั่งขนาดหรือสีเสื้อผิด (Ordered incorrect garment size or color)</option>
                <option value="Changed design preference">ต้องการเปลี่ยนดีไซน์หรือลายใหม่ (Changed design preference)</option>
                <option value="Found alternative artwork design">พบงานศิลปะ/ลายอื่นที่ถูกใจกว่า (Found alternative artwork design)</option>
                <option value="Delivery lead time too long">ระยะเวลาจัดส่งนานเกินไป (Delivery lead time too long)</option>
                <option value="Customer requested cancellation">ลูกค้าขอยกเลิกคำสั่งซื้อ (Customer requested cancellation)</option>
              </select>
            </div>

            {cancelError && (
              <div className="p-2 bg-red-100 text-red-800 text-xs font-mono rounded">
                {cancelError}
              </div>
            )}

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancel}
                data-testid="confirm-cancel-order-btn"
                className={`flex-1 py-2.5 text-paper rounded-lg font-mono text-xs uppercase font-bold transition-colors disabled:opacity-50 ${
                  isDirectlyCancellable
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {isCancelling
                  ? 'กำลังประมวลผล...'
                  : isDirectlyCancellable
                  ? 'ยืนยันยกเลิกคำสั่งซื้อ (คืนเงิน 100%)'
                  : 'ส่งคำขอไปยังโรงงาน (SLA 24 ชม.)'}
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2.5 border border-borderCol rounded-lg font-mono text-xs text-mutedGray hover:text-ink transition-colors"
              >
                เก็บคำสั่งซื้อไว้ (Keep Order)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Communication Chatbox with Supplier */}
      <OrderChatBox
        orderId={order.id}
        orderNumber={order.orderNumber}
        partnerName={order.supplier?.companyName || 'ผู้ผลิตที่ได้รับมอบหมาย'}
        orderStatus={currentStatus}
        currentUserRole="CUSTOMER"
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  );
};

export default CustomerOrderTrackingClient;
