'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PriceCalculationResult, PricingPayload, ArtworkLicenseLine } from '@/lib/types';
import { Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';

export interface LivePricingCardProps {
  garmentProductId: string;
  garmentVariantId?: string;
  garmentTitle: string;
  quantity: number;
  userId?: string;
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
  userId,
  onQuantityChange,
  frontLicenses,
  backLicenses,
  onPricingCalculated,
  onCheckoutClick,
  isOrdering = false,
  onLoadBenchmark,
}) => {
  const { formatPrice, currency, t } = useSettings();
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
      userId,
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
    userId,
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

  const [isBreakdownOpen, setIsBreakdownOpen] = useState<boolean>(false);

  const isBenchmarkMatch =
    quantity === 1 &&
    pricing?.totalAmount === 410 &&
    pricing?.breakdown.artworkLicenses.length === 3;

  return (
    <div className="bg-paper border border-borderCol rounded-xl shadow-sm flex flex-col overflow-hidden">
      {/* 1. Compact Header & Breakdown Toggle */}
      <div className="px-3 py-2 bg-paper-light border-b border-borderCol/60 flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 min-w-0">
          <span className="font-mono text-xs font-bold uppercase tracking-tight text-ink truncate">
            {t.livePricing.title}
          </span>
          {isBenchmarkMatch ? (
            <span className="inline-flex items-center space-x-1 font-mono text-[9px] uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded font-bold shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <span>฿410 Verified</span>
            </span>
          ) : (
            <span className="inline-flex items-center font-mono text-[9px] uppercase tracking-wider bg-warm/20 text-ink border border-warm/40 px-1.5 py-0.5 rounded shrink-0">
              <span>{isLoading ? t.livePricing.calculating : 'Live'}</span>
            </span>
          )}
        </div>

        {/* Collapsible Accordion Toggle */}
        <button
          type="button"
          onClick={() => setIsBreakdownOpen((prev) => !prev)}
          className="inline-flex items-center space-x-1 font-mono text-[10px] text-mutedGray hover:text-ink transition-colors px-1.5 py-0.5 rounded hover:bg-paper-dark shrink-0"
          title={isBreakdownOpen ? 'Hide breakdown' : 'Show breakdown'}
        >
          <span>{isBreakdownOpen ? t.livePricing.hideDetails : t.livePricing.viewDetails}</span>
          {isBreakdownOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* 2. Collapsible Itemized Breakdown Section */}
      {isBreakdownOpen && (
        <div className="p-3 border-b border-borderCol/60 bg-paper-light/30 space-y-2.5 text-xs font-mono max-h-56 overflow-y-auto">
          {/* 1-Click Benchmark Button */}
          {onLoadBenchmark && (
            <button
              type="button"
              onClick={onLoadBenchmark}
              className="w-full py-1.5 px-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded text-amber-900 font-mono text-[11px] font-bold flex items-center justify-center space-x-1.5 transition-colors shadow-2xs"
            >
              <Zap className="w-3 h-3 text-amber-600 fill-amber-500" />
              <span>⚡ Load ฿410 Benchmark</span>
            </button>
          )}

          {error ? (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-[11px] font-mono text-red-700">
              {error}
            </div>
          ) : (
            <div className="space-y-1.5">
              {/* Garment Line */}
              <div className="flex justify-between items-center text-ink">
                <span className="text-mutedGray truncate max-w-[170px]" title={garmentTitle}>
                  {t.livePricing.garmentBase} ({garmentTitle})
                </span>
                <span className="font-semibold">
                  {pricing ? formatPrice(pricing.garmentCost) : '---'}
                </span>
              </div>

              {/* Printing Line */}
              <div className="flex justify-between items-center text-ink">
                <span className="text-mutedGray">
                  {t.livePricing.printFee} ({pricing?.surfacesUsed.length || 1} {pricing?.surfacesUsed.length !== 1 ? 'Surfaces' : 'Surface'})
                </span>
                <span className="font-semibold">
                  {pricing ? formatPrice(pricing.printingCost) : '---'}
                </span>
              </div>

              {/* Packaging Line */}
              <div className="flex justify-between items-center text-ink">
                <span className="text-mutedGray">{t.livePricing.packaging}</span>
                <span className="font-semibold">
                  {pricing ? formatPrice(pricing.packagingCost) : '---'}
                </span>
              </div>

              {/* Shipping Line */}
              <div className="flex justify-between items-center text-ink">
                <span className="text-mutedGray">{t.livePricing.shipping}</span>
                <span className="font-semibold">
                  {pricing ? formatPrice(pricing.shippingCost) : '---'}
                </span>
              </div>

              {/* Artwork License Lines */}
              <div className="pt-1.5 border-t border-borderCol/40 space-y-1">
                <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-mutedGray">
                  <span>{t.livePricing.artworkLicenses}</span>
                  <span>
                    {pricing?.breakdown.artworkLicenses.length ?? 0} Layer
                    {(pricing?.breakdown.artworkLicenses.length ?? 0) !== 1 ? 's' : ''}
                  </span>
                </div>

                {pricing && pricing.breakdown.artworkLicenses.length > 0 ? (
                  pricing.breakdown.artworkLicenses.map((lic, idx) => (
                    <div
                      key={`${lic.artworkId}-${idx}`}
                      className="flex justify-between items-center pl-1 text-[11px] text-ink"
                    >
                      <span className="truncate max-w-[170px]" title={lic.title}>
                        • {lic.title} ({lic.creatorName})
                      </span>
                      {lic.isPermanentIp ? (
                        <span className="inline-flex items-center space-x-1 text-amber-700 font-bold">
                          <span className="text-[9px] bg-amber-100 border border-amber-300 text-amber-900 px-1 py-0.2 rounded uppercase font-mono">
                            Permanent IP
                          </span>
                          <span>฿0</span>
                        </span>
                      ) : (
                        <span className="font-semibold text-warm-dark">
                          +{formatPrice(lic.totalPrice)}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-[10px] text-mutedGray italic pl-1">
                    No licensed artwork layers added yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Sleek Permanent Action & Checkout Bar (Always visible) */}
      <div className="p-3 bg-paper flex items-center justify-between gap-2.5">
        {/* Quantity Controls */}
        <div className="flex flex-col">
          <span className="text-[9px] font-mono uppercase text-mutedGray leading-none mb-1">
            {t.livePricing.quantity}
          </span>
          <div className="flex items-center border border-borderCol rounded bg-paper-light">
            <button
              type="button"
              disabled={quantity <= 1 || isLoading}
              onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
              className="px-2 py-1 text-xs font-mono font-bold hover:bg-paper-dark disabled:opacity-30 transition-colors"
              aria-label="Decrease quantity"
            >
              -
            </button>
            <span className="px-2 py-1 font-mono text-xs font-bold text-ink min-w-[22px] text-center">
              {quantity}
            </span>
            <button
              type="button"
              disabled={quantity >= 100 || isLoading}
              onClick={() => onQuantityChange(quantity + 1)}
              className="px-2 py-1 text-xs font-mono font-bold hover:bg-paper-dark disabled:opacity-30 transition-colors"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>

        {/* Total Price Display */}
        <div className="flex flex-col items-end min-w-0">
          <span className="font-mono text-lg sm:text-xl font-black tracking-tight text-ink leading-tight">
            {pricing ? formatPrice(pricing.totalAmount) : '---'}
          </span>
          {quantity > 1 && pricing && (
            <span className="font-mono text-[9px] text-mutedGray">
              ({formatPrice(Math.round(pricing.totalAmount / quantity))}/{t.livePricing.pieces})
            </span>
          )}
          {currency !== 'THB' && pricing && (
            <span className="font-mono text-[8px] text-mutedGray">
              ({t.livePricing.approxEquivalent} ฿{pricing.totalAmount.toLocaleString()} THB)
            </span>
          )}
        </div>

        {/* Order CTA Button */}
        <button
          type="button"
          disabled={isLoading || isOrdering || !pricing}
          onClick={onCheckoutClick}
          className="px-3.5 py-2.5 bg-ink hover:bg-ink-light disabled:bg-mutedGray text-paper font-mono text-xs uppercase tracking-wider font-bold rounded transition-colors shadow-sm flex items-center justify-center space-x-1 shrink-0"
        >
          {isOrdering ? (
            <>
              <span className="w-3 h-3 border-2 border-paper border-t-transparent rounded-full animate-spin" />
              <span>Ordering...</span>
            </>
          ) : (
            <span>{t.studio.orderNow}</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default LivePricingCard;
