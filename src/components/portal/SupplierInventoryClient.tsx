'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Grid,
  Save,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Minus,
  Sparkles,
  Palette,
  Package,
  X,
  Check,
  ChevronDown,
} from 'lucide-react';
import { SupplierNav } from '@/components/portal/SupplierNav';
import {
  SupplierInventoryMatrix,
  InventoryMatrixVariant,
  LOW_STOCK_THRESHOLD,
  isLowStock,
  STANDARD_GARMENT_PALETTE,
} from '@/lib/supplier';

export interface SupplierInventoryClientProps {
  suppliers: Array<{
    id: string;
    slug: string;
    companyName: string;
    location: string;
    leadTimeDays: number;
  }>;
  currentSupplierSlug: string;
  products?: Array<{
    id: string;
    name: string;
    sku: string;
  }>;
  initialMatrix: SupplierInventoryMatrix;
  needsOnboarding?: boolean;
}

const AVAILABLE_SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

export const SupplierInventoryClient: React.FC<SupplierInventoryClientProps> = ({
  suppliers,
  currentSupplierSlug,
  products = [],
  initialMatrix,
  needsOnboarding,
}) => {
  const router = useRouter();

  // Local grid stock state keyed by variantId
  const [stockMap, setStockMap] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const row of initialMatrix.colorRows) {
      for (const size of initialMatrix.availableSizes) {
        const item = row.sizes[size];
        if (item) {
          map[item.id] = item.stock;
        }
      }
    }
    return map;
  });

  // Synchronize stockMap state when initialMatrix prop updates
  useEffect(() => {
    const map: Record<string, number> = {};
    for (const row of initialMatrix.colorRows) {
      for (const size of initialMatrix.availableSizes) {
        const item = row.sizes[size];
        if (item) {
          map[item.id] = item.stock;
        }
      }
    }
    setStockMap(map);
    setHasChanges(false);
  }, [currentSupplierSlug, initialMatrix]);

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [successBannerMessage, setSuccessBannerMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  // ── Modal states ─────────────────────────────────────────────────────────────
  const [isAddColorModalOpen, setIsAddColorModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);

  // Add Colorway form state
  const [newColorName, setNewColorName] = useState('Pitch Black');
  const [newColorHex, setNewColorHex] = useState('#131718');
  const [newColorInitialStock, setNewColorInitialStock] = useState(50);
  const [isSubmittingColor, setIsSubmittingColor] = useState(false);
  const [colorModalError, setColorModalError] = useState<string | null>(null);

  // Add Garment Product form state
  const [newProdName, setNewProdName] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdFabric, setNewProdFabric] = useState('100% Combed Cotton');
  const [newProdWeightGsm, setNewProdWeightGsm] = useState(240);
  const [newProdFit, setNewProdFit] = useState('oversized');
  const [newProdNeckline, setNewProdNeckline] = useState('crew');
  const [newProdBasePrice, setNewProdBasePrice] = useState(160);
  const [newProdPackagingPrice, setNewProdPackagingPrice] = useState(15);
  const [newProdShippingPrice, setNewProdShippingPrice] = useState(40);
  const [newProdSizes, setNewProdSizes] = useState<string[]>(['S', 'M', 'L', 'XL', '2XL']);
  const [newProdColorName, setNewProdColorName] = useState('Pitch Black');
  const [newProdColorHex, setNewProdColorHex] = useState('#131718');
  const [newProdInitialStock, setNewProdInitialStock] = useState(50);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [productModalError, setProductModalError] = useState<string | null>(null);

  const handleStockChange = (variantId: string, val: number) => {
    const num = Number.isFinite(val) ? val : 0;
    const clamped = Math.min(1_000_000, Math.max(0, Math.floor(num)));
    setStockMap((prev) => ({ ...prev, [variantId]: clamped }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleQuickAdjust = (variantId: string, delta: number) => {
    const current = stockMap[variantId] ?? 0;
    handleStockChange(variantId, current + delta);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    const updates = Object.entries(stockMap).map(([variantId, stock]) => ({
      variantId,
      stock,
    }));

    try {
      const res = await fetch('/api/supplier/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update inventory');
      }

      setSaveSuccess(true);
      setSuccessBannerMessage('บันทึกสต็อกสินค้าเรียบร้อยแล้ว ข้อมูลสต็อกอัปเดตลงระบบพร้อมใช้งาน');
      setHasChanges(false);
      router.refresh();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error updating stock matrix');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Handlers: Add Colorway ───────────────────────────────────────────────────
  const handleOpenAddColorModal = () => {
    setNewColorName('Pitch Black');
    setNewColorHex('#131718');
    setNewColorInitialStock(50);
    setColorModalError(null);
    setIsAddColorModalOpen(true);
  };

  const handleSubmitAddColorway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColorName.trim()) {
      setColorModalError('กรุณากรอกชื่อสีเสื้อ (Color Name)');
      return;
    }
    if (!initialMatrix.productId || !initialMatrix.supplierId) {
      setColorModalError('ไม่พบข้อมูล Supplier หรือ รุ่นเสื้อ');
      return;
    }

    setIsSubmittingColor(true);
    setColorModalError(null);

    try {
      const res = await fetch('/api/supplier/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_COLORWAY',
          supplierId: initialMatrix.supplierId,
          productId: initialMatrix.productId,
          colorName: newColorName.trim(),
          colorHex: newColorHex.trim(),
          initialStock: Number(newColorInitialStock) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to add colorway');
      }

      setIsAddColorModalOpen(false);
      setSuccessBannerMessage(`เพิ่มสี "${newColorName}" สำเร็จ และระบบได้สร้างขนาดครบทุกไซส์เรียบร้อยแล้ว`);
      setSaveSuccess(true);
      router.refresh();
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (err: any) {
      setColorModalError(err?.message || 'เกิดข้อผิดพลาดในการเพิ่มสีเสื้อ');
    } finally {
      setIsSubmittingColor(false);
    }
  };

  // ── Handlers: Add Garment Product ────────────────────────────────────────────
  const handleOpenAddProductModal = () => {
    setNewProdName('');
    setNewProdSku('');
    setNewProdFabric('100% Combed Cotton');
    setNewProdWeightGsm(240);
    setNewProdFit('oversized');
    setNewProdNeckline('crew');
    setNewProdBasePrice(160);
    setNewProdPackagingPrice(15);
    setNewProdShippingPrice(40);
    setNewProdSizes(['S', 'M', 'L', 'XL', '2XL']);
    setNewProdColorName('Pitch Black');
    setNewProdColorHex('#131718');
    setNewProdInitialStock(50);
    setProductModalError(null);
    setIsAddProductModalOpen(true);
  };

  const handleToggleSize = (size: string) => {
    setNewProdSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const handleSubmitAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) {
      setProductModalError('กรุณากรอกชื่อรุ่นเสื้อ (Product Name)');
      return;
    }
    if (!newProdSku.trim()) {
      setProductModalError('กรุณากรอกรหัสรุ่นเสื้อ (Base SKU)');
      return;
    }
    if (newProdSizes.length === 0) {
      setProductModalError('กรุณาเลือกขนาดไซส์อย่างน้อย 1 ไซส์');
      return;
    }
    if (!newProdColorName.trim()) {
      setProductModalError('กรุณากรอกชื่อสีแรกเริ่ม (Initial Color Name)');
      return;
    }

    setIsSubmittingProduct(true);
    setProductModalError(null);

    try {
      const res = await fetch('/api/supplier/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_PRODUCT',
          supplierId: initialMatrix.supplierId || suppliers[0]?.id,
          name: newProdName.trim(),
          sku: newProdSku.trim().toUpperCase(),
          fabric: newProdFabric.trim(),
          weightGsm: Number(newProdWeightGsm) || 240,
          fit: newProdFit,
          neckline: newProdNeckline,
          basePrice: Number(newProdBasePrice) || 150,
          packagingPrice: Number(newProdPackagingPrice) || 15,
          shippingPrice: Number(newProdShippingPrice) || 40,
          availableSizes: newProdSizes,
          initialColorName: newProdColorName.trim(),
          initialColorHex: newProdColorHex.trim(),
          initialStock: Number(newProdInitialStock) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create garment product');
      }

      setIsAddProductModalOpen(false);
      setSuccessBannerMessage(`สร้างรุ่นเสื้อ "${newProdName}" และสร้าง Matrix เรียบร้อยแล้ว`);
      setSaveSuccess(true);
      
      // Navigate to the newly created product
      const newProductId = data?.data?.product?.id;
      if (newProductId) {
        router.push(`/supplier/inventory?supplier=${currentSupplierSlug}&productId=${newProductId}`);
      } else {
        router.refresh();
      }
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (err: any) {
      setProductModalError(err?.message || 'เกิดข้อผิดพลาดในการสร้างเสื้อรุ่นใหม่');
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  // Compute live aggregates from local state
  const totalUnits = Object.values(stockMap).reduce((a, b) => a + b, 0);
  const lowStockCount = Object.values(stockMap).filter((s) => isLowStock(s)).length;

  return (
    <div className="space-y-8 w-full">
      <SupplierNav
        currentSupplierSlug={currentSupplierSlug}
        suppliers={suppliers}
        needsOnboarding={needsOnboarding}
      />

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-paper-light border border-borderCol p-6 rounded-2xl shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center flex-wrap gap-2">
            <h2 className="text-xl font-bold font-sans text-ink">
              Colorway × Size Inventory Matrix Grid
            </h2>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-warm/20 text-ink font-semibold">
              ตารางสต็อกเสื้อเปล่า
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-3 text-xs font-mono text-mutedGray">
            <span>
              Real-time multi-dimensional stock tracking for{' '}
              <strong className="text-ink">{initialMatrix.productName || 'Blank Garment'}</strong>{' '}
              ({initialMatrix.productSku || 'SKU'}).
            </span>

            {/* Product Switcher Dropdown */}
            {products.length > 0 && (
              <div className="flex items-center space-x-2 bg-paper border border-borderCol px-2.5 py-1 rounded-lg">
                <span className="text-[11px] text-mutedGray font-semibold">รุ่นเสื้อ:</span>
                <select
                  value={initialMatrix.productId}
                  onChange={(e) => {
                    const targetId = e.target.value;
                    router.push(
                      `/supplier/inventory?supplier=${currentSupplierSlug}&productId=${targetId}`
                    );
                  }}
                  className="bg-transparent font-mono text-xs font-bold text-ink focus:outline-none cursor-pointer"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id} className="bg-paper text-ink">
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Add Product Button */}
          <button
            type="button"
            onClick={handleOpenAddProductModal}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 bg-paper hover:bg-paper-dark border border-borderCol text-ink rounded-xl font-mono text-xs font-bold transition-all shadow-xs"
            title="เพิ่มรุ่นเสื้อใหม่ลงในแคตตาล็อกสต็อก"
          >
            <Package className="w-4 h-4 text-warm" />
            <span>+ เพิ่มรุ่นเสื้อใหม่</span>
          </button>

          {/* Add Colorway Button */}
          {initialMatrix.productId && (
            <button
              type="button"
              onClick={handleOpenAddColorModal}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 bg-warm/15 hover:bg-warm/25 border border-warm/40 text-ink rounded-xl font-mono text-xs font-bold transition-all shadow-xs"
              title="เพิ่มสีเสื้อใหม่สำหรับรุ่นนี้"
            >
              <Palette className="w-4 h-4 text-warm-dark" />
              <span>+ เพิ่มสีเสื้อใหม่</span>
            </button>
          )}

          {/* Filter Low Stock Button */}
          <button
            type="button"
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            className={`px-3 py-2.5 rounded-xl font-mono text-xs font-bold border transition-colors flex items-center space-x-1.5 ${
              filterLowStockOnly
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-paper text-mutedGray border-borderCol hover:text-ink'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Low Stock (&lt; 10)</span>
          </button>

          {/* Save Matrix Button */}
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={!hasChanges || isSaving}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-ink hover:bg-ink-light text-paper rounded-xl font-mono text-xs font-bold transition-all shadow-sm disabled:opacity-40"
          >
            {isSaving ? (
              <span>Saving...</span>
            ) : saveSuccess ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-warm" />
                <span>Save Matrix Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-mono text-xs flex items-center space-x-2 shadow-xs">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successBannerMessage || 'บันทึกข้อมูลเรียบร้อยแล้ว'}</span>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 font-mono text-xs flex items-center space-x-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
        <div className="p-4 bg-paper-light border border-borderCol rounded-xl">
          <span className="text-mutedGray uppercase text-[10px]">Total Active Variants</span>
          <div className="text-2xl font-bold text-ink mt-1">
            {initialMatrix.totalVariants} SKUs
          </div>
        </div>
        <div className="p-4 bg-paper-light border border-borderCol rounded-xl">
          <span className="text-mutedGray uppercase text-[10px]">Total Available Stock</span>
          <div className="text-2xl font-bold text-ink mt-1">
            {totalUnits.toLocaleString()} units
          </div>
        </div>
        <div className="p-4 bg-paper-light border border-borderCol rounded-xl">
          <span className="text-mutedGray uppercase text-[10px]">Low-Stock Alerts (&lt; 10)</span>
          <div
            className={`text-2xl font-bold mt-1 ${
              lowStockCount > 0 ? 'text-amber-700' : 'text-emerald-700'
            }`}
          >
            {lowStockCount} items
          </div>
        </div>
        <div className="p-4 bg-paper-light border border-borderCol rounded-xl">
          <span className="text-mutedGray uppercase text-[10px]">Blank Base Rate</span>
          <div className="text-2xl font-bold text-warm-dark mt-1">
            ฿{initialMatrix.basePrice ?? 150} THB
          </div>
        </div>
      </div>

      {/* Low-Stock Warning Banner if any */}
      {lowStockCount > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 font-mono text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Warning:</strong> {lowStockCount} variant(s) have fallen below the minimum
              safety threshold of 10 units. Consider replenishing blank inventory.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-200/80 text-amber-950 font-bold text-[10px]">
            &lt; 10 Units Warning
          </span>
        </div>
      )}

      {/* Matrix Table */}
      <div className="bg-paper-light border border-borderCol rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-borderCol flex items-center justify-between bg-paper">
          <div className="flex items-center space-x-3">
            <span className="font-bold font-sans text-sm text-ink">
              {initialMatrix.productName || 'Garment Model'}
            </span>
            <span className="font-mono text-xs text-mutedGray">
              {initialMatrix.colorRows.length} Colorways • {initialMatrix.availableSizes.length} Sizes
            </span>
          </div>

          {initialMatrix.productId && (
            <button
              type="button"
              onClick={handleOpenAddColorModal}
              className="inline-flex items-center space-x-1 text-xs font-mono font-bold text-ink hover:text-warm-dark transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มสีใหม่ในรุ่นนี้</span>
            </button>
          )}
        </div>

        {initialMatrix.colorRows.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-paper border border-borderCol flex items-center justify-center mx-auto text-mutedGray">
              <Palette className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-sans font-bold text-ink">ยังไม่มีสีเสื้อในรุ่นนี้</h3>
              <p className="font-mono text-xs text-mutedGray max-w-md mx-auto">
                เริ่มต้นเพิ่มสีเสื้อแรกเพื่อสร้างตารางขนาดไซส์และสต็อกสินค้าพร้อมใช้งาน
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddColorModal}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-ink text-paper rounded-xl font-mono text-xs font-bold hover:bg-ink-light transition-all"
            >
              <Plus className="w-4 h-4 text-warm" />
              <span>+ เพิ่มสีเสื้อแรก</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="bg-paper border-b border-borderCol text-mutedGray text-[11px] uppercase">
                  <th className="py-3 px-4 font-bold">Colorway</th>
                  {initialMatrix.availableSizes.map((size) => (
                    <th key={size} className="py-3 px-4 text-center font-bold">
                      Size: {size}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-borderCol/60">
                {initialMatrix.colorRows
                  .filter((row) => {
                    if (!filterLowStockOnly) return true;
                    return initialMatrix.availableSizes.some((size) => {
                      const item = row.sizes[size];
                      return item && isLowStock(stockMap[item.id] ?? item.stock);
                    });
                  })
                  .map((row) => (
                    <tr key={row.colorName} className="hover:bg-paper/60 transition-colors">
                      {/* Color Swatch & Name Column */}
                      <td className="py-4 px-4 align-top w-48">
                        <div className="flex items-center space-x-2.5">
                          <span
                            className="w-4 h-4 rounded-full border border-borderCol shadow-xs flex-shrink-0"
                            style={{ backgroundColor: row.colorHex }}
                            title={row.colorHex}
                          />
                          <div>
                            <div className="font-bold text-ink">{row.colorName}</div>
                            <span className="text-[10px] text-mutedGray">{row.colorHex}</span>
                          </div>
                        </div>
                      </td>

                      {/* Size Cells */}
                      {initialMatrix.availableSizes.map((size) => {
                        const item = row.sizes[size];
                        if (!item) {
                          return (
                            <td
                              key={size}
                              className="py-4 px-4 text-center text-mutedGray/50 bg-paper/20"
                            >
                              -
                            </td>
                          );
                        }

                        const currentStock = stockMap[item.id] ?? item.stock;
                        const isLow = isLowStock(currentStock);

                        return (
                          <td key={size} className="py-4 px-3 align-top min-w-[130px]">
                            <div
                              className={`p-2.5 rounded-xl border transition-all ${
                                isLow
                                  ? 'bg-red-50/70 border-red-300'
                                  : 'bg-paper border-borderCol/70 hover:border-warm'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] text-mutedGray mb-1">
                                <span className="truncate" title={item.sku}>
                                  {item.sku.split('-').slice(-2).join('-')}
                                </span>
                                {isLow && (
                                  <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-700 font-bold text-[9px] border border-red-200">
                                    LOW
                                  </span>
                                )}
                              </div>

                              {/* Inline Quantity Input */}
                              <input
                                type="number"
                                min="0"
                                value={currentStock}
                                onChange={(e) =>
                                  handleStockChange(item.id, Number(e.target.value))
                                }
                                className={`w-full py-1 px-2 font-mono text-sm font-bold text-center rounded-lg border focus:outline-none ${
                                  isLow
                                    ? 'bg-red-100/40 text-red-900 border-red-300 focus:border-red-500'
                                    : 'bg-paper-light text-ink border-borderCol focus:border-warm'
                                }`}
                              />

                              {/* Rapid +/- Buttons */}
                              <div className="flex items-center justify-between gap-1 mt-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleQuickAdjust(item.id, -1)}
                                  className="flex-1 py-0.5 rounded bg-paper-dark hover:bg-ink hover:text-paper font-bold text-ink text-[11px] transition-colors"
                                  title="Decrease by 1"
                                >
                                  -1
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickAdjust(item.id, 1)}
                                  className="flex-1 py-0.5 rounded bg-paper-dark hover:bg-ink hover:text-paper font-bold text-ink text-[11px] transition-colors"
                                  title="Increase by 1"
                                >
                                  +1
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickAdjust(item.id, 10)}
                                  className="flex-1 py-0.5 rounded bg-paper-dark hover:bg-ink hover:text-paper font-bold text-ink text-[10px] transition-colors"
                                  title="Increase by 10"
                                >
                                  +10
                                </button>
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL: Add Colorway ──────────────────────────────────────────────── */}
      {isAddColorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs">
          <div className="bg-paper-light border border-borderCol w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-borderCol flex items-center justify-between bg-paper">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-warm/20 flex items-center justify-center text-ink">
                  <Palette className="w-4 h-4 text-warm-dark" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-base text-ink">
                    เพิ่มสีเสื้อใหม่ (Add Colorway)
                  </h3>
                  <p className="font-mono text-xs text-mutedGray">
                    สำหรับรุ่น: {initialMatrix.productName} ({initialMatrix.productSku})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddColorModalOpen(false)}
                className="p-1 rounded-lg text-mutedGray hover:text-ink hover:bg-paper-dark transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitAddColorway} className="p-6 space-y-5">
              {colorModalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 font-mono text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{colorModalError}</span>
                </div>
              )}

              {/* Standard Swatches */}
              <div className="space-y-2">
                <label className="block font-mono text-xs font-bold text-ink uppercase">
                  เลือกจากพาเลตต์สียอดนิยม (Standard Garment Palette)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {STANDARD_GARMENT_PALETTE.map((item) => {
                    const isSelected =
                      newColorHex.toLowerCase() === item.hex.toLowerCase();
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => {
                          setNewColorName(item.name);
                          setNewColorHex(item.hex);
                        }}
                        className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                          isSelected
                            ? 'border-warm bg-warm/10 shadow-xs'
                            : 'border-borderCol hover:border-ink/40 bg-paper'
                        }`}
                      >
                        <span
                          className="w-6 h-6 rounded-full border border-borderCol shadow-xs"
                          style={{ backgroundColor: item.hex }}
                        />
                        <span className="font-mono text-[10px] text-ink truncate w-full">
                          {item.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Name & Hex input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-mono text-xs font-semibold text-ink">
                    ชื่อสีเสื้อ (Color Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newColorName}
                    onChange={(e) => setNewColorName(e.target.value)}
                    placeholder="เช่น Vintage Sand, Pitch Black"
                    className="w-full px-3 py-2 bg-paper border border-borderCol rounded-xl font-mono text-xs text-ink focus:outline-none focus:border-warm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-mono text-xs font-semibold text-ink">
                    รหัสสี Hex Code *
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={newColorHex}
                      onChange={(e) => setNewColorHex(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-borderCol cursor-pointer p-0.5 bg-paper"
                    />
                    <input
                      type="text"
                      required
                      value={newColorHex}
                      onChange={(e) => setNewColorHex(e.target.value)}
                      placeholder="#131718"
                      className="flex-1 px-3 py-2 bg-paper border border-borderCol rounded-xl font-mono text-xs text-ink uppercase focus:outline-none focus:border-warm"
                    />
                  </div>
                </div>
              </div>

              {/* Initial Stock Input */}
              <div className="space-y-1.5">
                <label className="block font-mono text-xs font-semibold text-ink">
                  สต็อกเริ่มต้นต่อไซส์ (Initial Stock per Size)
                </label>
                <input
                  type="number"
                  min="0"
                  max="1000000"
                  value={newColorInitialStock}
                  onChange={(e) => setNewColorInitialStock(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-paper border border-borderCol rounded-xl font-mono text-xs text-ink focus:outline-none focus:border-warm"
                />
                <p className="font-mono text-[11px] text-mutedGray">
                  ระบบจะสร้าง SKU สำหรับขนาด {initialMatrix.availableSizes.join(', ')} พร้อมใส่สต็อกเริ่มต้นนี้ให้ทันที
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-borderCol">
                <button
                  type="button"
                  onClick={() => setIsAddColorModalOpen(false)}
                  className="px-4 py-2 font-mono text-xs font-bold text-mutedGray hover:text-ink transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingColor}
                  className="px-5 py-2 bg-ink hover:bg-ink-light text-paper rounded-xl font-mono text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isSubmittingColor ? 'กำลังเพิ่มสี...' : '+ บันทึกและสร้างไซส์ทันที'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Add Garment Product ───────────────────────────────────────── */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-paper-light border border-borderCol w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-borderCol flex items-center justify-between bg-paper">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-warm/20 flex items-center justify-center text-ink">
                  <Package className="w-4 h-4 text-warm-dark" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-base text-ink">
                    เพิ่มรุ่นเสื้อใหม่ (Create Garment Product)
                  </h3>
                  <p className="font-mono text-xs text-mutedGray">
                    กำหนดรุ่นเสื้อเปล่า ขนาดที่รองรับ และสีแรกเริ่มเพื่อเปิดสต็อกสินค้า
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddProductModalOpen(false)}
                className="p-1 rounded-lg text-mutedGray hover:text-ink hover:bg-paper-dark transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitAddProduct} className="p-6 space-y-5">
              {productModalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 font-mono text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{productModalError}</span>
                </div>
              )}

              {/* Section 1: Product Specs */}
              <div className="space-y-4">
                <span className="font-mono text-xs font-bold uppercase text-mutedGray tracking-wider">
                  1. ข้อมูลรุ่นเสื้อและคุณลักษณะ (Garment Specifications)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block font-mono text-xs font-semibold text-ink">
                      ชื่อรุ่นเสื้อ (Product Name) *
                    </label>
                    <input
                      type="text"
                      required
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                      placeholder="เช่น Heavyweight Boxy Tee 240 GSM"
                      className="w-full px-3 py-2 bg-paper border border-borderCol rounded-xl font-mono text-xs text-ink focus:outline-none focus:border-warm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-mono text-xs font-semibold text-ink">
                      รหัส SKU สินค้า (Base SKU) *
                    </label>
                    <input
                      type="text"
                      required
                      value={newProdSku}
                      onChange={(e) => setNewProdSku(e.target.value.toUpperCase())}
                      placeholder="เช่น APX-BOX-240"
                      className="w-full px-3 py-2 bg-paper border border-borderCol rounded-xl font-mono text-xs text-ink uppercase focus:outline-none focus:border-warm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <label className="block font-mono text-[11px] font-semibold text-ink">
                      เนื้อผ้า (Fabric)
                    </label>
                    <input
                      type="text"
                      value={newProdFabric}
                      onChange={(e) => setNewProdFabric(e.target.value)}
                      className="w-full px-2.5 py-2 bg-paper border border-borderCol rounded-xl font-mono text-xs text-ink focus:outline-none focus:border-warm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-mono text-[11px] font-semibold text-ink">
                      น้ำหนักผ้า (GSM)
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="600"
                      value={newProdWeightGsm}
                      onChange={(e) => setNewProdWeightGsm(Number(e.target.value))}
                      className="w-full px-2.5 py-2 bg-paper border border-borderCol rounded-xl font-mono text-xs text-ink focus:outline-none focus:border-warm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-mono text-[11px] font-semibold text-ink">
                      ทรงเสื้อ (Fit)
                    </label>
                    <select
                      value={newProdFit}
                      onChange={(e) => setNewProdFit(e.target.value)}
                      className="w-full px-2.5 py-2 bg-paper border border-borderCol rounded-xl font-mono text-xs text-ink focus:outline-none focus:border-warm"
                    >
                      <option value="oversized">Oversized</option>
                      <option value="boxy">Boxy</option>
                      <option value="regular">Regular</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-mono text-[11px] font-semibold text-ink">
                      คอเสื้อ (Neckline)
                    </label>
                    <select
                      value={newProdNeckline}
                      onChange={(e) => setNewProdNeckline(e.target.value)}
                      className="w-full px-2.5 py-2 bg-paper border border-borderCol rounded-xl font-mono text-xs text-ink focus:outline-none focus:border-warm"
                    >
                      <option value="crew">Crew Neck</option>
                      <option value="v-neck">V-Neck</option>
                      <option value="polo">Polo</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="block font-mono text-[11px] font-semibold text-ink">
                      ราคาเสื้อเปล่า (THB) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newProdBasePrice}
                      onChange={(e) => setNewProdBasePrice(Number(e.target.value))}
                      className="w-full px-2.5 py-2 bg-paper border border-borderCol rounded-xl font-mono text-xs text-ink focus:outline-none focus:border-warm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block font-mono text-[11px] font-semibold text-ink">
                      ค่าแพ็กเกจ (THB)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newProdPackagingPrice}
                      onChange={(e) => setNewProdPackagingPrice(Number(e.target.value))}
                      className="w-full px-2.5 py-2 bg-paper border border-borderCol rounded-xl font-mono text-xs text-ink focus:outline-none focus:border-warm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block font-mono text-[11px] font-semibold text-ink">
                      ค่าส่งเริ่มต้น (THB)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newProdShippingPrice}
                      onChange={(e) => setNewProdShippingPrice(Number(e.target.value))}
                      className="w-full px-2.5 py-2 bg-paper border border-borderCol rounded-xl font-mono text-xs text-ink focus:outline-none focus:border-warm"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Supported Sizes */}
              <div className="space-y-2 pt-2 border-t border-borderCol">
                <span className="font-mono text-xs font-bold uppercase text-mutedGray tracking-wider">
                  2. ขนาดไซส์ที่รองรับการผลิต (Supported Sizes) *
                </span>
                <div className="flex items-center flex-wrap gap-2">
                  {AVAILABLE_SIZE_OPTIONS.map((size) => {
                    const isChecked = newProdSizes.includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleToggleSize(size)}
                        className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all ${
                          isChecked
                            ? 'bg-ink text-paper border-ink shadow-xs'
                            : 'bg-paper text-mutedGray border-borderCol hover:border-ink/50'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Initial Colorway */}
              <div className="space-y-3 pt-2 border-t border-borderCol">
                <span className="font-mono text-xs font-bold uppercase text-mutedGray tracking-wider">
                  3. สีเสื้อแรกเริ่มสำหรับ Matrix (Initial Colorway & Stock)
                </span>

                <div className="grid grid-cols-5 gap-2">
                  {STANDARD_GARMENT_PALETTE.slice(0, 5).map((item) => {
                    const isSelected =
                      newProdColorHex.toLowerCase() === item.hex.toLowerCase();
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => {
                          setNewProdColorName(item.name);
                          setNewProdColorHex(item.hex);
                        }}
                        className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                          isSelected
                            ? 'border-warm bg-warm/10 shadow-xs'
                            : 'border-borderCol hover:border-ink/40 bg-paper'
                        }`}
                      >
                        <span
                          className="w-5 h-5 rounded-full border border-borderCol shadow-xs"
                          style={{ backgroundColor: item.hex }}
                        />
                        <span className="font-mono text-[9px] text-ink truncate w-full">
                          {item.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block font-mono text-[11px] font-semibold text-ink">
                      ชื่อสีแรก
                    </label>
                    <input
                      type="text"
                      required
                      value={newProdColorName}
                      onChange={(e) => setNewProdColorName(e.target.value)}
                      className="w-full px-2.5 py-2 bg-paper border border-borderCol rounded-xl font-mono text-xs text-ink focus:outline-none focus:border-warm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-mono text-[11px] font-semibold text-ink">
                      รหัสสี Hex
                    </label>
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="color"
                        value={newProdColorHex}
                        onChange={(e) => setNewProdColorHex(e.target.value)}
                        className="w-8 h-8 rounded-lg border border-borderCol cursor-pointer bg-paper p-0.5"
                      />
                      <input
                        type="text"
                        required
                        value={newProdColorHex}
                        onChange={(e) => setNewProdColorHex(e.target.value)}
                        className="flex-1 px-2.5 py-2 bg-paper border border-borderCol rounded-xl font-mono text-xs text-ink uppercase focus:outline-none focus:border-warm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-mono text-[11px] font-semibold text-ink">
                      สต็อกเริ่มต้นต่อไซส์
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newProdInitialStock}
                      onChange={(e) => setNewProdInitialStock(Number(e.target.value))}
                      className="w-full px-2.5 py-2 bg-paper border border-borderCol rounded-xl font-mono text-xs text-ink focus:outline-none focus:border-warm"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-borderCol">
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="px-4 py-2 font-mono text-xs font-bold text-mutedGray hover:text-ink transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProduct}
                  className="px-5 py-2 bg-ink hover:bg-ink-light text-paper rounded-xl font-mono text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isSubmittingProduct ? 'กำลังสร้างรุ่นเสื้อ...' : '+ บันทึกและสร้าง Matrix'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
