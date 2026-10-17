'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Ruler,
  Download,
  Printer,
  X,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Maximize2,
  FileDown,
  Loader2,
} from 'lucide-react';
import { DesignElement, PrintSurface } from '@/lib/types';
import {
  computeSurfaceBlueprint,
  generateBlueprintSvg,
  downloadBlueprintAsPng,
  downloadBlueprintAsSvg,
  DEFAULT_PLATEN_CONFIG,
} from '@/lib/productionBlueprint';
import { renderOffscreenGarment3D } from '@/lib/offscreen3dRenderer';
import { bakeLosslessBlueprintCanvas } from '@/lib/productionBlueprintCanvas';

export interface ProductionBlueprintSheetProps {
  orderNumber?: string;
  jobId?: string;
  garment: {
    sku: string;
    name: string;
    colorHex: string;
    colorName?: string;
    size?: string;
    fabric?: string;
  };
  printingTechnique?: {
    name?: string;
    code?: string;
    maxPrintWidthCm?: number;
    maxPrintHeightCm?: number;
  };
  frontElements?: DesignElement[];
  backElements?: DesignElement[];
  initialSurface?: PrintSurface;
  garmentSnapshotDataUrl?: string | null;
  frontSnapshotDataUrl?: string | null;
  backSnapshotDataUrl?: string | null;
  isOpen?: boolean;
  onClose?: () => void;
  isStandalonePage?: boolean;
}

export const ProductionBlueprintSheet: React.FC<ProductionBlueprintSheetProps> = ({
  orderNumber = 'APX-STUDIO-DRAFT',
  jobId,
  garment,
  printingTechnique = {
    name: 'High-Definition Kornit Digital DTG',
    code: 'DTG',
    maxPrintWidthCm: 35.0,
    maxPrintHeightCm: 45.0,
  },
  frontElements = [],
  backElements = [],
  initialSurface = 'FRONT',
  garmentSnapshotDataUrl = null,
  frontSnapshotDataUrl = null,
  backSnapshotDataUrl = null,
  isOpen = true,
  onClose,
  isStandalonePage = false,
}) => {
  const [activeSurface, setActiveSurface] = useState<PrintSurface>(initialSurface);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isBakingCanvas, setIsBakingCanvas] = useState<boolean>(true);
  const [bakedDataUrl, setBakedDataUrl] = useState<string>('');
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  // Synchronize active surface with initialSurface whenever modal opens or prop changes
  useEffect(() => {
    if (isOpen) {
      setActiveSurface(initialSurface);
    }
  }, [isOpen, initialSurface]);

  const activeElements = activeSurface === 'FRONT' ? frontElements : backElements;

  const currentSnapshot =
    activeSurface === 'FRONT'
      ? (frontSnapshotDataUrl ?? garmentSnapshotDataUrl)
      : (backSnapshotDataUrl ?? garmentSnapshotDataUrl);

  const platenConfig = useMemo(
    () => ({
      platenWidthCm: printingTechnique.maxPrintWidthCm || DEFAULT_PLATEN_CONFIG.platenWidthCm,
      platenHeightCm: printingTechnique.maxPrintHeightCm || DEFAULT_PLATEN_CONFIG.platenHeightCm,
      collarDipYCm: DEFAULT_PLATEN_CONFIG.collarDipYCm,
      garmentLengthCm: printingTechnique.maxPrintHeightCm || DEFAULT_PLATEN_CONFIG.garmentLengthCm,
    }),
    [printingTechnique]
  );

  const blueprint = useMemo(
    () => computeSurfaceBlueprint(activeSurface, activeElements, platenConfig),
    [activeSurface, activeElements, platenConfig]
  );

  // Auto-bake lossless 3D canvas whenever inputs change
  useEffect(() => {
    if (!isOpen && !isStandalonePage) return;
    let isMounted = true;
    setIsBakingCanvas(true);

    const bake = async () => {
      try {
        let snapshotUrl = currentSnapshot;

        // If no pre-baked 3D snapshot exists, trigger on-demand Three.js render
        if (!snapshotUrl) {
          snapshotUrl = await renderOffscreenGarment3D({
            garmentColorHex: garment.colorHex,
            frontElements,
            backElements,
            surface: activeSurface,
            width: 2048,
            height: 2048,
            cleanBlank: false,
          });
        }

        let img: HTMLImageElement | null = null;
        if (snapshotUrl) {
          img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((resolve) => {
            if (!img) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = snapshotUrl!;
          });
        }

        const targetCanvas = canvasRef.current || document.createElement('canvas');
        await bakeLosslessBlueprintCanvas(targetCanvas, {
          surface: activeSurface,
          blueprint,
          image3D: img,
          garment,
          orderNumber,
          jobId,
          printingTechnique: printingTechnique.name,
          monochrome: false,
          width: 2000,
          height: 2500,
        });

        if (isMounted) {
          const dataUrl = targetCanvas.toDataURL('image/png');
          setBakedDataUrl(dataUrl);
          setIsBakingCanvas(false);
        }
      } catch (err) {
        console.error('[ProductionBlueprintSheet] Canvas bake failed:', err);
        if (isMounted) {
          setIsBakingCanvas(false);
        }
      }
    };

    bake();

    return () => {
      isMounted = false;
    };
  }, [
    isOpen,
    isStandalonePage,
    activeSurface,
    blueprint,
    garment,
    orderNumber,
    jobId,
    printingTechnique,
    currentSnapshot,
    frontElements,
    backElements,
  ]);

  const svgContent = useMemo(() => {
    return generateBlueprintSvg({
      surface: activeSurface,
      blueprint,
      garmentColorHex: garment.colorHex,
      garmentSku: garment.sku,
      garmentName: garment.name,
      orderNumber,
      jobId: jobId || `JOB-${orderNumber}`,
      garmentSize: garment.size || 'L',
      printingTechnique: printingTechnique.name || 'Digital DTG',
      includeRulers: true,
      includeCenterAxis: true,
      includeDimensionCallouts: true,
      includeBoundingBoxes: true,
      renderWidth: 1000,
      renderHeight: 1250,
      garmentSnapshotDataUrl: currentSnapshot,
      monochrome: false,
    });
  }, [
    activeSurface,
    blueprint,
    garment,
    orderNumber,
    jobId,
    printingTechnique,
    currentSnapshot,
  ]);

  const handleDownloadPng = async () => {
    setIsDownloading(true);
    try {
      const filename = `blueprint-${orderNumber}-${activeSurface.toLowerCase()}.png`;
      if (bakedDataUrl) {
        const a = document.createElement('a');
        a.href = bakedDataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        await downloadBlueprintAsPng(svgContent, filename, 2000, 2500);
      }
    } catch (err) {
      console.error('[ProductionBlueprint] PNG export failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadSvg = async () => {
    try {
      const filename = `blueprint-${orderNumber}-${activeSurface.toLowerCase()}.svg`;
      await downloadBlueprintAsSvg(svgContent, filename);
    } catch (err) {
      console.error('[ProductionBlueprint] SVG export failed:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen && !isStandalonePage) return null;

  const content = (
    <div
      data-testid="production-blueprint-sheet"
      className="bg-paper-light border border-borderCol rounded-2xl w-full max-w-6xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
    >
      <style jsx global>{`
        @media print {
          body, html {
            background: #FFFFFF !important;
            color: #0F172A !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          [data-testid="production-blueprint-modal-backdrop"] {
            position: static !important;
            padding: 0 !important;
            background: #FFFFFF !important;
            display: block !important;
          }
          [data-testid="production-blueprint-sheet"] {
            max-height: none !important;
            height: auto !important;
            border: none !important;
            box-shadow: none !important;
            background: #FFFFFF !important;
            color: #0F172A !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }
          .blueprint-sheet-grid {
            display: block !important;
            padding: 0 !important;
            background: #FFFFFF !important;
          }
          .blueprint-print-preview-col {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #FFFFFF !important;
            border: none !important;
            box-shadow: none !important;
          }
          .blueprint-print-preview-box {
            max-width: 100% !important;
            width: 100% !important;
            height: auto !important;
            aspect-ratio: auto !important;
            border: none !important;
            box-shadow: none !important;
          }
          .blueprint-print-preview-box img {
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            display: block !important;
            margin: 0 auto !important;
          }
          .blueprint-sidebar-column {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
        }
      `}</style>

      {/* 1. Modal Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-borderCol bg-paper no-print">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-warm/30 flex items-center justify-center text-ink">
            <Ruler className="w-4 h-4 text-warm-dark" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-sans font-bold text-lg text-ink">
                ใบระบุตำแหน่งและขนาดงานพิมพ์ (Production Tech Sheet)
              </h2>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold border border-blue-200">
                สเกลจริง 1:1
              </span>
            </div>
            <p className="font-mono text-xs text-mutedGray">
              เลขอ้างอิง: <span className="text-ink font-semibold">{orderNumber}</span> &bull; รหัสสินค้า:{' '}
              <span className="text-ink font-semibold">{garment.sku}</span> &bull; แท่นพิมพ์:{' '}
              <span className="text-ink font-semibold">
                {platenConfig.platenWidthCm} x {platenConfig.platenHeightCm} ซม.
              </span>
            </p>
          </div>
        </div>

        {/* Action Controls & Close */}
        <div className="flex items-center space-x-2">
          {/* Surface Toggle */}
          <div className="flex items-center space-x-1 bg-paper border border-borderCol p-0.5 rounded-lg mr-2">
            <button
              type="button"
              data-testid="blueprint-tab-front"
              onClick={() => setActiveSurface('FRONT')}
              className={`px-3 py-1 font-sans text-xs tracking-wider rounded transition-colors ${
                activeSurface === 'FRONT'
                  ? 'bg-ink text-paper font-bold'
                  : 'text-mutedGray hover:text-ink'
              }`}
            >
              ด้านหน้า ({frontElements.length})
            </button>
            <button
              type="button"
              data-testid="blueprint-tab-back"
              onClick={() => setActiveSurface('BACK')}
              className={`px-3 py-1 font-sans text-xs tracking-wider rounded transition-colors ${
                activeSurface === 'BACK'
                  ? 'bg-ink text-paper font-bold'
                  : 'text-mutedGray hover:text-ink'
              }`}
            >
              ด้านหลัง ({backElements.length})
            </button>
          </div>

          <button
            type="button"
            data-testid="blueprint-download-btn"
            onClick={handleDownloadPng}
            disabled={isDownloading}
            className="px-3.5 py-1.5 bg-ink text-paper rounded-lg font-sans text-xs font-bold hover:bg-ink-light transition-colors shadow-sm flex items-center space-x-1.5 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isDownloading ? 'กำลังสร้าง...' : 'ดาวน์โหลด PNG'}</span>
          </button>

          <button
            type="button"
            data-testid="blueprint-download-svg-btn"
            onClick={handleDownloadSvg}
            className="px-3.5 py-1.5 border border-borderCol text-ink rounded-lg font-sans text-xs font-bold hover:bg-paper-dark transition-colors shadow-sm flex items-center space-x-1.5"
            title="ดาวน์โหลดไฟล์เวกเตอร์ SVG"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>ดาวน์โหลด SVG</span>
          </button>

          <button
            type="button"
            data-testid="blueprint-print-btn"
            onClick={handlePrint}
            className="px-3.5 py-1.5 border border-borderCol text-ink rounded-lg font-sans text-xs font-bold hover:bg-paper-dark transition-colors shadow-sm flex items-center space-x-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>พิมพ์เอกสาร</span>
          </button>

          {!isStandalonePage && onClose && (
            <button
              type="button"
              data-testid="blueprint-close-btn"
              onClick={onClose}
              className="p-1.5 text-mutedGray hover:text-ink rounded-lg hover:bg-paper transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Sheet Content Grid: Vector Ruler Graphic VS Physical Measurement Spec Table */}
      <div className="blueprint-sheet-grid flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-y-auto bg-paper-light">
        {/* Left Column: Visual Vector Ruler Preview */}
        <div className="blueprint-print-preview-col lg:col-span-7 flex flex-col items-center justify-center bg-slate-100 p-4 rounded-xl border border-slate-200 shadow-sm">
          {/* Hidden Canvas buffer for pure 2D baking */}
          <canvas ref={canvasRef} className="hidden" width={2000} height={2500} />

          <div
            data-testid="blueprint-canvas-preview"
            className="blueprint-print-preview-box w-full max-w-[560px] aspect-[4/5] flex items-center justify-center overflow-hidden rounded-lg shadow-md bg-white border border-slate-200 relative"
          >
            {isBakingCanvas ? (
              <div
                data-testid="blueprint-loading-spinner"
                className="flex flex-col items-center justify-center space-y-3 py-16 text-slate-500"
              >
                <Loader2 className="w-8 h-8 animate-spin text-warm-dark" />
                <span className="font-sans text-xs tracking-wider">
                  กำลังสร้างใบสเปกและเรนเดอร์ภาพเสื้อจริง...
                </span>
              </div>
            ) : bakedDataUrl ? (
              <img
                data-testid="blueprint-baked-canvas-image"
                src={bakedDataUrl}
                alt="Production Blueprint Baked Canvas"
                className="w-full h-full object-contain rounded-lg shadow-sm select-none"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center overflow-hidden rounded-lg shadow-sm"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            )}
          </div>
          <div className="no-print w-full flex items-center justify-between text-[11px] font-sans text-slate-500 mt-3 px-2">
            <span>&bull; หน่วยวัด: เซนติเมตร (ซม.)</span>
            <span>&bull; เส้นกึ่งกลางลำตัว (CL): 17.5 ซม.</span>
            <span>&bull; สีเสื้อและลายพิมพ์จริง (Authentic Real Colors)</span>
          </div>
        </div>

        {/* Right Column: Physical Specifications & Itemized Callouts */}
        <div className="blueprint-sidebar-column lg:col-span-5 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Garment Blank & Machine Specs Card */}
            <div className="p-4 bg-paper rounded-xl border border-borderCol text-xs space-y-2">
              <span className="text-[10px] uppercase font-bold text-mutedGray tracking-wider">
                ข้อมูลเสื้อและงานพิมพ์ (Garment & Print Specs)
              </span>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-mutedGray">รุ่นเสื้อ:</span>{' '}
                  <span className="font-bold text-ink">{garment.name}</span>
                </div>
                <div>
                  <span className="text-mutedGray">รหัสสินค้า:</span>{' '}
                  <span className="font-bold text-ink">{garment.sku}</span>
                </div>
                <div>
                  <span className="text-mutedGray">สีเสื้อ:</span>{' '}
                  <span className="inline-flex items-center space-x-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-borderCol inline-block"
                      style={{ backgroundColor: garment.colorHex }}
                    />
                    <span>{garment.colorName || garment.colorHex}</span>
                  </span>
                </div>
                <div>
                  <span className="text-mutedGray">ไซส์:</span>{' '}
                  <span className="font-bold text-ink">{garment.size || 'L'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-mutedGray">เนื้อผ้า:</span>{' '}
                  <span className="text-ink">{garment.fabric || '100% Combed Cotton, 240 GSM'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-mutedGray">เทคนิคการพิมพ์:</span>{' '}
                  <span className="text-ink font-semibold">{printingTechnique.name}</span>
                </div>
              </div>
            </div>

            {/* Platen Measurements Summary Card */}
            <div className="p-4 bg-paper rounded-xl border border-borderCol text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-mutedGray tracking-wider">
                  ตำแหน่งและขนาดชิ้นงานจริง ({activeSurface === 'FRONT' ? 'ด้านหน้า' : 'ด้านหลัง'})
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded border border-blue-200">
                  {blueprint.measurements.length} ชิ้นงาน
                </span>
              </div>

              {blueprint.hasOverflow && (
                <div
                  data-testid="blueprint-overflow-warning"
                  className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 flex items-center space-x-2 text-[11px]"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>
                    <strong>คำเตือนขอบเขตการพิมพ์:</strong> มีลายพิมพ์บางส่วนชิดหรือเกินขนาดแท่นพิมพ์มาตรฐาน {platenConfig.platenWidthCm} x {platenConfig.platenHeightCm} ซม.
                  </span>
                </div>
              )}

              {blueprint.measurements.length === 0 ? (
                <div className="py-6 text-center text-mutedGray">
                  ไม่มีลายพิมพ์บนตำแหน่ง{activeSurface === 'FRONT' ? 'ด้านหน้า' : 'ด้านหลัง'}
                </div>
              ) : (
                <div className="space-y-3">
                  {blueprint.measurements.map((m, idx) => (
                    <div
                      key={m.elementId || idx}
                      data-testid={`blueprint-item-${idx}`}
                      className="p-3 bg-paper-light border border-borderCol rounded-lg space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold text-ink">
                        <span>
                          #{idx + 1} {m.title}
                        </span>
                        <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono">
                          {m.widthCm} x {m.heightCm} ซม.
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-mutedGray pt-1 border-t border-borderCol/60">
                        {/* Collar Offset */}
                        <div className="flex items-center space-x-1">
                          <ArrowDown className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                          <span>
                            ระยะจากคอ:{' '}
                            <strong className="text-ink font-mono">{m.offsetTopCollarCm} ซม.</strong>
                          </span>
                        </div>

                        {/* Center Offset */}
                        <div className="flex items-center space-x-1">
                          <span className="text-red-600 font-bold font-mono">CL:</span>
                          <span>
                            {m.offsetCenterDirection === 'CENTER' ? (
                              <strong className="text-emerald-700 font-mono">0 ซม. (ตรงกึ่งกลาง)</strong>
                            ) : (
                              <strong className="text-ink font-mono">
                                {m.offsetCenterCm > 0 ? `+${m.offsetCenterCm}` : m.offsetCenterCm} ซม. (
                                {m.offsetCenterDirection === 'LEFT' ? 'เยื้องซ้าย' : 'เยื้องขวา'})
                              </strong>
                            )}
                          </span>
                        </div>

                        {/* Hem Clearance */}
                        <div className="flex items-center space-x-1">
                          <ArrowUp className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                          <span>
                            ระยะจากชายเสื้อ:{' '}
                            <strong className="text-ink font-mono">{m.offsetHemCm} ซม.</strong>
                          </span>
                        </div>

                        {/* Rotation & Layer */}
                        <div>
                          <span>
                            มุมหมุน:{' '}
                            <strong className="text-ink font-mono">{m.rotationDeg}&deg;</strong> &bull; ชั้น:{' '}
                            <strong className="text-ink font-mono">{m.zIndex}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Boundary Status */}
                      <div className="pt-1 flex items-center space-x-1 text-[10px]">
                        {m.isClamped ? (
                          <span className="text-amber-700 flex items-center space-x-1 font-semibold">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>ข้อควรระวัง: ลายพิมพ์อยู่ชิดขอบแท่นพิมพ์</span>
                          </span>
                        ) : (
                          <span className="text-emerald-700 flex items-center space-x-1 font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>ตำแหน่งอยู่ในระยะพิมพ์ที่ปลอดภัย</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Supplier Operator Sign-off Box */}
          <div className="p-3 bg-paper rounded-xl border border-dashed border-borderCol text-[11px] text-mutedGray flex items-center justify-between">
            <div>
              <span className="font-bold text-ink">การตรวจสอบคุณภาพฝ่ายผลิต (QA Checklist):</span>
              <p className="text-[10px] text-mutedGray">
                ตรวจสอบตำแหน่งคอเสื้อ &bull; ปรับระดับแท่นพิมพ์ &bull; สเปกสีและขนาดตรงตามออเดอร์
              </p>
            </div>
            <div className="border border-borderCol px-3 py-1.5 rounded bg-emerald-50 text-center font-bold text-emerald-700 text-[10px]">
              ผ่านเกณฑ์ (QA PASS)
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isStandalonePage) {
    return <div className="w-full flex justify-center py-6 px-4">{content}</div>;
  }

  return (
    <div
      data-testid="production-blueprint-modal-backdrop"
      className="fixed inset-0 z-[70] bg-ink/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
    >
      {content}
    </div>
  );
};

export default ProductionBlueprintSheet;
