'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PriceCalculationResult, PricingPayload, ArtworkLicenseLine } from '@/lib/types';
import { Zap } from 'lucide-react';

export interface LivePricingCardProps {
  garmentProductId: string;
  garmentVariantId?: string;
  garmentTitle: string;
  quantity: number;
  onQuantityChange: (qty: number) => void;
  frontLicenses: ArtworkLicenseLine[];
  backLicenses: ArtworkLicenseLine[];
  onPricingCalculated?: (result: PriceCalculationResult) => void;
  onCheckoutClick?: () => void;
  isOrdering?: boolean;
  onLoadBenchmark?: () => void;
}

export const LivePricingCard: React.FC<LivePricingCardProps> = ({
  garmentProductId,
  garmentVariantId,
  garmentTitle,
  quantity,
  onQuantityChange,
  frontLicenses,
  backLicenses,
  onPricingCalculated,
  onCheckoutClick,
  isOrdering = false,
  onLoadBenchmark,
}) => {
  const [pricing, setPricing] = useState<PriceCalculationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Debounced API calculation fetch
  const fetchPricing = useCallback(async () => {
    if (!garmentProductId) return;

    setIsLoading(true);
    setError(null);

    const payload: PricingPayload = {
      garmentProductId,
      garmentVariantId,
      quantity,
      frontArtworkLicenses: frontLicenses,
      backArtworkLicenses: backLicenses,
    };

    try {
      const res = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Pricing calculation failed (${res.status})`);
      }

      const data: PriceCalculationResult = await res.json();
      setPricing(data);
      onPricingCalculated?.(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Calculation error';
      setError(msg);
      console.error('[LivePricingCard] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [
    garmentProductId,
    garmentVariantId,
    quantity,
    frontLicenses,
    backLicenses,
    onPricingCalculated,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPricing();
    }, 180);

    return () => clearTimeout(timer);
  }, [fetchPricing]);

  const isBenchmarkMatch =
    quantity === 1 &&
    pricing?.totalAmount === 410 &&
    pricing?.breakdown.artworkLicenses.length === 3;

  return (
    <div className="bg-paper border border-borderCol rounded-xl shadow-sm p-5 flex flex-col space-y-4">
      {/* Header & Benchmark Status */}
      <div className="flex items-start justify-between border-b border-borderCol/60 pb-3">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-mutedGray">
            Server-Authoritative Quote
          </span>
          <h3 className="font-mono text-sm font-bold uppercase tracking-tight text-ink">
            Live Pricing Breakdown
          </h3>
        </div>

        {isBenchmarkMatch ? (
          <span className="inline-flex items-center space-x-1 font-mono text-[10px] uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            <span>Benchmark: ฿410 Verified</span>
          </span>
        ) : (
          <span className="inline-flex items-center space-x-1 font-mono text-[10px] uppercase tracking-wider bg-warm/20 text-ink border border-warm/40 px-2 py-0.5 rounded">
            <span>Live Recalc</span>
          </span>
        )}
      </div>

      {/* 1-Click Benchmark Button */}
      {onLoadBenchmark && (
        <button
          type="button"
          onClick={onLoadBenchmark}
          className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded text-amber-900 font-mono text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors shadow-2xs"
        >
          <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
          <span>⚡ Load ฿410 Benchmark</span>
        </button>
      )}

      {/* Quantity Selector */}
      <div className="flex items-center justify-between py-1">
        <span className="text-xs font-mono uppercase text-ink">Order Quantity</span>
        <div className="flex items-center border border-borderCol rounded bg-paper-light">
          <button
            type="button"
            disabled={quantity <= 1 || isLoading}
            onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
            className="px-2.5 py-1 text-xs font-mono font-bold hover:bg-paper-dark disabled:opacity-30 transition-colors"
          >
            -
          </button>
          <span className="px-3 py-1 font-mono text-xs font-bold text-ink min-w-[28px] text-center">
            {quantity}
          </span>
          <button
            type="button"
            disabled={quantity >= 100 || isLoading}
            onClick={() => onQuantityChange(quantity + 1)}
            className="px-2.5 py-1 text-xs font-mono font-bold hover:bg-paper-dark disabled:opacity-30 transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Itemized Line Items */}
      {error ? (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs font-mono text-red-700">
          {error}
        </div>
      ) : (
        <div className="space-y-2 text-xs font-mono border-t border-b border-borderCol/60 py-3">
          {/* Garment Line */}
          <div className="flex justify-between items-center text-ink">
            <span className="text-mutedGray">Garment ({garmentTitle})</span>
            <span className="font-semibold">
              ฿{pricing ? pricing.garmentCost.toLocaleString() : '---'}
            </span>
          </div>

          {/* Printing Line */}
          <div className="flex justify-between items-center text-ink">
            <span className="text-mutedGray">
              Kornit DTG Print ({pricing?.surfacesUsed.length || 1} Surface
              {pricing?.surfacesUsed.length !== 1 ? 's' : ''})
            </span>
            <span className="font-semibold">
              ฿{pricing ? pricing.printingCost.toLocaleString() : '---'}
            </span>
          </div>

          {/* Packaging Line */}
          <div className="flex justify-between items-center text-ink">
            <span className="text-mutedGray">Standard Packaging</span>
            <span className="font-semibold">
              ฿{pricing ? pricing.packagingCost.toLocaleString() : '---'}
            </span>
          </div>

          {/* Shipping Line */}
          <div className="flex justify-between items-center text-ink">
            <span className="text-mutedGray">Express Flat Shipping</span>
            <span className="font-semibold">
              ฿{pricing ? pricing.shippingCost.toLocaleString() : '---'}
            </span>
          </div>

          {/* Artwork License Lines */}
          <div className="pt-2 border-t border-borderCol/40 space-y-1.5">
            <div className="flex justify-between items-center text-[11px] uppercase tracking-wider text-mutedGray">
              <span>Creator Artwork Licenses</span>
              <span>
                {pricing?.breakdown.artworkLicenses.length ?? 0} Layer
                {(pricing?.breakdown.artworkLicenses.length ?? 0) !== 1 ? 's' : ''}
              </span>
            </div>

            {pricing && pricing.breakdown.artworkLicenses.length > 0 ? (
              pricing.breakdown.artworkLicenses.map((lic, idx) => (
                <div
                  key={`${lic.artworkId}-${idx}`}
                  className="flex justify-between items-center pl-2 text-[11px] text-ink"
                >
                  <span className="truncate max-w-[200px]" title={lic.title}>
                    • {lic.title} ({lic.creatorName})
                  </span>
                  <span className="font-semibold text-warm-dark">
                    +฿{lic.totalPrice.toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-[11px] text-mutedGray italic pl-2">
                No licensed artwork layers added yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subtotal & Total Amount */}
      <div className="flex items-baseline justify-between pt-1">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-mutedGray">
            Total Amount
          </span>
          {quantity > 1 && pricing && (
            <div className="font-mono text-[10px] text-mutedGray">
              (฿{Math.round(pricing.totalAmount / quantity).toLocaleString()} / unit)
            </div>
          )}
        </div>
        <div className="text-right">
          <span className="font-mono text-2xl font-black tracking-tight text-ink">
            ฿{pricing ? pricing.totalAmount.toLocaleString() : '---'}
          </span>
        </div>
      </div>

      {/* Order CTA Button */}
      <button
        type="button"
        disabled={isLoading || isOrdering || !pricing}
        onClick={onCheckoutClick}
        className="w-full py-3 bg-ink hover:bg-ink-light disabled:bg-mutedGray text-paper font-mono text-xs uppercase tracking-wider font-bold rounded transition-colors shadow-sm flex items-center justify-center space-x-2"
      >
        {isOrdering ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-paper border-t-transparent rounded-full animate-spin" />
            <span>Processing Order...</span>
          </>
        ) : (
          <span>Order Custom Tee Now</span>
        )}
      </button>

      {/* Server Protection Notice */}
      <div className="text-center">
        <span className="font-mono text-[10px] text-mutedGray">
          Immutable Royalty Obligations atomically generated upon checkout.
        </span>
      </div>
    </div>
  );
};

export default LivePricingCard;
