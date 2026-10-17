'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldCheck,
  Sparkles,
  Layers,
  Tag,
  DollarSign,
  ArrowRight,
  X,
  RefreshCw,
  Eye,
  Sliders,
  Check,
} from 'lucide-react';

export type ArtworkCategory =
  | 'ILLUSTRATION'
  | 'MASCOT'
  | 'TYPOGRAPHY'
  | 'PATTERN'
  | 'LOGO';

export interface CreatorProfileOption {
  id: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  payoutDetails?: string | null;
}

export interface ArtworkUploadFormProps {
  creators: CreatorProfileOption[];
  defaultCreatorSlug?: string;
  onSuccess?: (artwork: UploadSuccessData) => void;
}

export interface UploadSuccessData {
  artwork: {
    id: string;
    title: string;
    category: string;
    previewUrl: string;
    originalUrl?: string;
  };
  fileSpec: {
    width: number;
    height: number;
    dpi: number;
    mimeType: string;
    colorSpace: string;
    hasTransparency: boolean;
    isVector: boolean;
    fileSize: number;
    previewWatermarkedPath?: string;
  };
  licenseOptions: Array<{
    id: string;
    name: string;
    price: number;
    scope: string;
  }>;
}

const CATEGORIES: Array<{ id: ArtworkCategory; label: string; desc: string }> = [
  { id: 'ILLUSTRATION', label: 'Illustration', desc: 'Graphic art, painted characters, complex scenes' },
  { id: 'MASCOT', label: 'Mascot', desc: 'Brand characters, iconic avatars, ape motifs' },
  { id: 'TYPOGRAPHY', label: 'Typography', desc: 'Lettering, graffiti, bold brutalist statements' },
  { id: 'PATTERN', label: 'Pattern', desc: 'Repeat tiles, textures, all-over abstracts' },
  { id: 'LOGO', label: 'Logo / Insignia', desc: 'Clean vector emblems, streetwear badges' },
];

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export const ArtworkUploadForm: React.FC<ArtworkUploadFormProps> = ({
  creators,
  defaultCreatorSlug,
  onSuccess,
}) => {
  // Select active creator
  const initialCreator =
    creators.find((c) => c.slug === defaultCreatorSlug) ||
    creators[0] || {
      id: 'creator-dash-ape',
      slug: 'dash-ape',
      displayName: 'Dash Ape Studio',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    };

  const [selectedCreatorId, setSelectedCreatorId] = useState<string>(initialCreator.id);

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [fileClientMeta, setFileClientMeta] = useState<{
    width?: number;
    height?: number;
    aspectRatio?: number;
    isVector: boolean;
    sizeFormatted: string;
  } | null>(null);

  // Form fields
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<ArtworkCategory>('ILLUSTRATION');
  const [tagsInput, setTagsInput] = useState<string>('streetwear, print-ready, ape');

  // Licensing tier prices in THB
  const [standardPrice, setStandardPrice] = useState<number>(40);
  const [commercialPrice, setCommercialPrice] = useState<number>(90);
  const [extendedPrice, setExtendedPrice] = useState<number>(200);

  // Upload progress & feedback
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatusStep, setUploadStatusStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successData, setSuccessData] = useState<UploadSuccessData | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format file size
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Process chosen file
  const handleFileSelection = useCallback((file: File) => {
    setErrorMessage(null);
    setFieldErrors((prev) => ({ ...prev, file: '' }));

    // Format & extension verification
    const allowedExtensions = ['.png', '.svg', '.tiff', '.tif', '.jpeg', '.jpg'];
    const fileNameLower = file.name.toLowerCase();
    const hasAllowedExt = allowedExtensions.some((ext) => fileNameLower.endsWith(ext));
    const allowedMimes = [
      'image/png',
      'image/svg+xml',
      'image/tiff',
      'image/jpeg',
      'image/jpg',
    ];
    const hasAllowedMime = allowedMimes.includes(file.type) || file.type === '';

    if (!hasAllowedExt && !hasAllowedMime) {
      setErrorMessage(
        'Format Rejected: Only PNG (with transparency), SVG (vector), TIFF, and JPEG formats are supported.'
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(
        `File Too Large: Uploaded file is ${(file.size / (1024 * 1024)).toFixed(1)}MB. Maximum allowed master size is 50MB.`
      );
      return;
    }

    setSelectedFile(file);

    const isVector =
      fileNameLower.endsWith('.svg') || file.type === 'image/svg+xml';
    const previewUrl = URL.createObjectURL(file);
    setFilePreview(previewUrl);

    // If raster, inspect image client-side for quick feedback
    if (!isVector) {
      const img = new Image();
      img.onload = () => {
        const ar = img.width / img.height;
        setFileClientMeta({
          width: img.width,
          height: img.height,
          aspectRatio: parseFloat(ar.toFixed(2)),
          isVector: false,
          sizeFormatted: formatBytes(file.size),
        });
      };
      img.onerror = () => {
        setFileClientMeta({
          isVector: false,
          sizeFormatted: formatBytes(file.size),
        });
      };
      img.src = previewUrl;
    } else {
      setFileClientMeta({
        isVector: true,
        sizeFormatted: formatBytes(file.size),
      });
    }

    // Auto-fill title if empty
    if (!title) {
      const cleanName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      setTitle(cleanName);
    }
  }, [title]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
    setFileClientMeta(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    // Client pre-validation
    const errors: Record<string, string> = {};
    if (!selectedFile) {
      errors.file = 'Please choose or drop an artwork file to upload.';
    }
    if (!title.trim()) {
      errors.title = 'Artwork title is required.';
    }
    if (!selectedCreatorId) {
      errors.creatorId = 'Creator profile selection is required.';
    }
    if (standardPrice <= 0 || !Number.isInteger(standardPrice)) {
      errors.standardPrice = 'Standard license price must be a positive integer in THB.';
    }
    if (commercialPrice <= 0 || !Number.isInteger(commercialPrice)) {
      errors.commercialPrice = 'Commercial license price must be a positive integer in THB.';
    }
    if (extendedPrice <= 0 || !Number.isInteger(extendedPrice)) {
      errors.extendedPrice = 'Extended license price must be a positive integer in THB.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMessage('Please resolve the highlighted validation issues before proceeding.');
      return;
    }

    setIsUploading(true);
    setUploadStatusStep('Initiating secure multipart upload...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile!);
      formData.append('creatorId', selectedCreatorId);
      formData.append('title', title.trim());
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      formData.append('category', category);
      if (tagsInput.trim()) {
        formData.append('tags', tagsInput.trim());
      }
      formData.append('standardPrice', standardPrice.toString());
      formData.append('commercialPrice', commercialPrice.toString());
      formData.append('extendedPrice', extendedPrice.toString());

      setUploadStatusStep('Validating 300 DPI, alpha channel, and generating watermark preview...');

      const response = await fetch('/api/artworks/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Artwork upload failed.');
      }

      setUploadStatusStep('Upload complete! Graphic master secured.');
      setSuccessData(result);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed due to an unexpected error.';
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetForm = () => {
    clearSelectedFile();
    setTitle('');
    setDescription('');
    setCategory('ILLUSTRATION');
    setTagsInput('streetwear, print-ready, ape');
    setStandardPrice(40);
    setCommercialPrice(90);
    setExtendedPrice(200);
    setSuccessData(null);
    setErrorMessage(null);
    setFieldErrors({});
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Streetwear Header Banner */}
      <div className="bg-paper-light border border-borderCol rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-ink text-paper font-black tracking-wider uppercase">
                M2 INTAKE
              </span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-warm/30 text-ink font-bold border border-warm/50 uppercase">
                STRICT 300 DPI • ALPHA VERIFIED
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black font-sans tracking-tight text-ink uppercase">
              Creator Artwork Upload
            </h1>
            <p className="mt-1 font-mono text-xs text-mutedGray max-w-xl">
              Publish high-resolution streetwear graphics. All uploads undergo automated format verification, alpha transparency enforcement, and secure master separation.
            </p>
          </div>

          {/* Active Creator Persona Selector */}
          <div className="bg-paper border border-borderCol rounded-xl p-3 flex items-center space-x-3 self-start sm:self-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                creators.find((c) => c.id === selectedCreatorId)?.avatarUrl ||
                'https://api.dicebear.com/8.x/bottts/svg?seed=creator'
              }
              alt="Creator"
              className="w-10 h-10 rounded-full border border-borderCol object-cover bg-paper-dark"
            />
            <div>
              <label htmlFor="creator-select" className="block font-mono text-[10px] uppercase text-mutedGray font-semibold">
                Publishing As:
              </label>
              <select
                id="creator-select"
                value={selectedCreatorId}
                onChange={(e) => setSelectedCreatorId(e.target.value)}
                className="bg-transparent font-mono text-xs font-bold text-ink focus:outline-none cursor-pointer"
              >
                {creators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName} (@{c.slug})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Success View */}
      {successData && (
        <div
          data-testid="artwork-upload-success-card"
          className="bg-paper-light border-2 border-warm rounded-2xl p-6 sm:p-8 shadow-md space-y-6 animate-fadeIn"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-sans tracking-tight text-ink uppercase">
                  Artwork Published Successfully
                </h2>
                <p className="font-mono text-xs text-mutedGray">
                  Master secured in local archive &bull; Public watermarked web preview generated
                </p>
              </div>
            </div>
            <button
              onClick={handleResetForm}
              className="px-3 py-1.5 bg-paper border border-borderCol hover:border-warm text-ink font-mono text-xs font-bold uppercase rounded-lg transition-colors flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5 text-warm-dark" />
              <span>Upload Another</span>
            </button>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-borderCol">
            {/* Preview image */}
            <div className="bg-paper border border-borderCol rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="text-[10px] font-mono uppercase tracking-wider text-mutedGray mb-2 self-start flex items-center space-x-1.5">
                <Eye className="w-3.5 h-3.5 text-warm-dark" />
                <span>Watermarked Web Preview</span>
              </div>
              <div className="relative w-full max-h-64 flex items-center justify-center bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] rounded-lg p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={successData.artwork.previewUrl}
                  alt={successData.artwork.title}
                  className="max-h-56 max-w-full object-contain rounded shadow-sm"
                />
              </div>
              <span className="font-mono text-[10px] text-mutedGray mt-2">
                Protected by &ldquo;APE-PAREL • ROYALTY PROTECTED&rdquo; overlay
              </span>
            </div>

            {/* Spec breakdown */}
            <div className="space-y-4">
              <div className="bg-paper border border-borderCol rounded-xl p-4 space-y-3 font-mono text-xs">
                <div className="flex justify-between pb-2 border-b border-borderCol text-ink font-bold">
                  <span>Artwork ID</span>
                  <span className="text-warm-dark">{successData.artwork.id}</span>
                </div>
                <div className="flex justify-between text-mutedGray">
                  <span>Title</span>
                  <span className="text-ink font-medium">{successData.artwork.title}</span>
                </div>
                <div className="flex justify-between text-mutedGray">
                  <span>Category</span>
                  <span className="text-ink font-medium">{successData.artwork.category}</span>
                </div>
                <div className="flex justify-between text-mutedGray">
                  <span>Resolution / DPI</span>
                  <span className="text-emerald-700 font-bold">
                    {successData.fileSpec.isVector
                      ? 'Vector (Scalable)'
                      : `${successData.fileSpec.dpi} DPI (${successData.fileSpec.width} × ${successData.fileSpec.height} px)`}
                  </span>
                </div>
                <div className="flex justify-between text-mutedGray">
                  <span>Alpha Channel</span>
                  <span className="text-ink font-bold">
                    {successData.fileSpec.hasTransparency ? '✓ Transparent' : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between text-mutedGray">
                  <span>Color Space</span>
                  <span className="text-ink font-medium">{successData.fileSpec.colorSpace}</span>
                </div>
              </div>

              {/* License Tiers Summary */}
              <div className="bg-paper border border-borderCol rounded-xl p-4 space-y-2">
                <div className="font-mono text-[11px] uppercase tracking-wider text-mutedGray font-bold">
                  Configured License Options (THB)
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                  {successData.licenseOptions.map((opt) => (
                    <div key={opt.name} className="p-2 bg-paper-light border border-borderCol rounded-lg text-center">
                      <div className="text-[10px] text-mutedGray truncate">{opt.name.replace(' License', '')}</div>
                      <div className="text-sm font-bold text-ink mt-0.5">฿{opt.price}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-3 pt-2">
                <Link
                  href="/studio/new"
                  className="flex-1 py-2.5 px-4 bg-ink hover:bg-ink-light text-paper font-mono text-xs font-bold uppercase rounded-xl transition-colors text-center shadow-sm flex items-center justify-center space-x-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-warm" />
                  <span>Test in 3D Studio</span>
                </Link>
                <Link
                  href="/creator/dashboard"
                  className="py-2.5 px-4 bg-paper border border-borderCol hover:border-warm text-ink font-mono text-xs font-bold uppercase rounded-xl transition-colors text-center"
                >
                  Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Upload Form */}
      {!successData && (
        <form onSubmit={handleSubmit} className="space-y-8" data-testid="artwork-upload-form">
          {/* Section 1: File Dropzone & Real-Time Format Requirements */}
          <div className="bg-paper-light border border-borderCol rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold font-sans tracking-tight text-ink uppercase flex items-center space-x-2">
                  <UploadCloud className="w-5 h-5 text-warm-dark" />
                  <span>1. Graphic Asset Master</span>
                </h2>
                <p className="font-mono text-xs text-mutedGray">
                  Drag and drop or select your master artwork. Sharp validation runs automatically upon upload.
                </p>
              </div>
              <span className="font-mono text-[11px] text-mutedGray">Max 50MB</span>
            </div>

            {/* Real-time Format Hints Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
              <div className="bg-paper border border-borderCol rounded-xl p-3.5 space-y-1">
                <div className="flex items-center space-x-1.5 text-ink font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>PNG Transparency</span>
                </div>
                <p className="text-[11px] text-mutedGray leading-relaxed">
                  Alpha channel strictly required (<code className="text-ink">hasAlpha === true</code>). No flat white box backgrounds on dark shirts.
                </p>
              </div>

              <div className="bg-paper border border-borderCol rounded-xl p-3.5 space-y-1">
                <div className="flex items-center space-x-1.5 text-ink font-bold">
                  <Sparkles className="w-4 h-4 text-warm-dark flex-shrink-0" />
                  <span>300 DPI / Vector</span>
                </div>
                <p className="text-[11px] text-mutedGray leading-relaxed">
                  Raster files must have &ge; 300 DPI density. SVG vectors bypass raster DPI check and scale infinitely.
                </p>
              </div>

              <div className="bg-paper border border-borderCol rounded-xl p-3.5 space-y-1">
                <div className="flex items-center space-x-1.5 text-ink font-bold">
                  <Layers className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>Watermarked Web</span>
                </div>
                <p className="text-[11px] text-mutedGray leading-relaxed">
                  Master is isolated in secure storage. A web preview is generated with automated copyright watermark.
                </p>
              </div>
            </div>

            {/* Dropzone Container */}
            {!selectedFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-warm bg-warm/10 ring-4 ring-warm/20'
                    : 'border-borderCol hover:border-warm bg-paper hover:bg-paper-light'
                }`}
                data-testid="artwork-dropzone"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  id="artwork-file-input"
                  aria-label="Upload artwork file"
                  accept=".png,.svg,.tiff,.tif,.jpeg,.jpg,image/png,image/svg+xml,image/tiff,image/jpeg"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelection(e.target.files[0]);
                    }
                  }}
                />

                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-paper-dark border border-borderCol flex items-center justify-center text-warm-dark">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-mono text-sm font-bold text-ink uppercase tracking-wider">
                      Click to Browse or Drag File Here
                    </p>
                    <p className="font-mono text-xs text-mutedGray">
                      PNG (with alpha), SVG (vector), TIFF, JPEG up to 50MB
                    </p>
                  </div>
                  <div className="inline-flex items-center space-x-2 font-mono text-[11px] px-3 py-1 rounded bg-paper-dark border border-borderCol text-ink font-medium">
                    <span>Recommended Shortest Side: &ge; 1000px</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Selected File Preview Box */
              <div
                className="bg-paper border border-borderCol rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-6"
                data-testid="artwork-selected-file-box"
              >
                <div className="flex items-center space-x-4 w-full sm:w-auto">
                  <div className="w-20 h-20 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:12px_12px] border border-borderCol rounded-lg overflow-hidden flex items-center justify-center p-2 flex-shrink-0">
                    {filePreview && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={filePreview}
                        alt="Selected artwork preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    )}
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    <div className="font-mono text-xs font-bold text-ink truncate max-w-xs sm:max-w-md">
                      {selectedFile.name}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-mutedGray">
                      <span className="px-1.5 py-0.5 rounded bg-paper-dark border border-borderCol text-ink font-semibold uppercase">
                        {selectedFile.name.split('.').pop() || 'FILE'}
                      </span>
                      <span>{fileClientMeta?.sizeFormatted}</span>
                      {fileClientMeta?.width && fileClientMeta?.height && (
                        <span>
                          &bull; {fileClientMeta.width} &times; {fileClientMeta.height} px
                        </span>
                      )}
                      {fileClientMeta?.isVector && (
                        <span className="text-emerald-700 font-bold">&bull; Vector Format</span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] text-emerald-700 font-semibold flex items-center space-x-1">
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>Ready for 300 DPI Sharp pipeline validation</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-paper-light border border-borderCol hover:border-warm text-ink font-mono text-xs font-bold uppercase rounded-lg transition-colors"
                  >
                    Change File
                  </button>
                  <button
                    type="button"
                    onClick={clearSelectedFile}
                    className="p-1.5 text-mutedGray hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Remove file"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {fieldErrors.file && (
              <p className="font-mono text-xs text-rose-600 font-bold">{fieldErrors.file}</p>
            )}
          </div>

          {/* Section 2: Metadata & Category */}
          <div className="bg-paper-light border border-borderCol rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold font-sans tracking-tight text-ink uppercase flex items-center space-x-2">
                <Tag className="w-5 h-5 text-warm-dark" />
                <span>2. Artwork Metadata</span>
              </h2>
              <p className="font-mono text-xs text-mutedGray">
                Provide title, category, and descriptive tags for marketplace discovery.
              </p>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-mutedGray font-bold mb-1.5">
                  Artwork Title <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Cyber Ape Shogun"
                  className="w-full px-4 py-2.5 bg-paper border border-borderCol rounded-xl font-sans font-bold text-ink focus:outline-none focus:border-warm focus:ring-1 focus:ring-warm text-sm"
                  data-testid="artwork-title-input"
                />
                {fieldErrors.title && (
                  <p className="mt-1 font-mono text-xs text-rose-600 font-bold">{fieldErrors.title}</p>
                )}
              </div>

              {/* Category Pills */}
              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-mutedGray font-bold mb-2">
                  Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {CATEGORIES.map((cat) => {
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`p-2.5 rounded-xl border text-center font-mono text-xs transition-all ${
                          isSelected
                            ? 'bg-ink text-paper border-ink font-bold shadow-sm'
                            : 'bg-paper text-ink border-borderCol hover:border-warm'
                        }`}
                      >
                        <div>{cat.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-mutedGray font-bold mb-1.5">
                  Description / Story (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Artwork background, artistic concept, or recommended garment colors..."
                  className="w-full px-4 py-2.5 bg-paper border border-borderCol rounded-xl font-mono text-xs text-ink focus:outline-none focus:border-warm focus:ring-1 focus:ring-warm"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-mutedGray font-bold mb-1.5">
                  Tags (Comma-separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="cyberpunk, vintage, street, ape"
                  className="w-full px-4 py-2 bg-paper border border-borderCol rounded-xl font-mono text-xs text-ink focus:outline-none focus:border-warm focus:ring-1 focus:ring-warm"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Licensing Tiers & THB Pricing */}
          <div className="bg-paper-light border border-borderCol rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold font-sans tracking-tight text-ink uppercase flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-warm-dark" />
                  <span>3. Licensing Tiers & Royalty Pricing (THB)</span>
                </h2>
                <div className="font-mono text-[11px] px-2 py-0.5 rounded bg-warm/30 text-ink border border-warm/50 font-bold">
                  85% CREATOR / 15% PLATFORM
                </div>
              </div>
              <p className="font-mono text-xs text-mutedGray">
                Set custom licensing fee per unit in Thai Baht (THB). Payouts credit 85% directly to your creator ledger upon garment sale.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Tier 1: Standard Apparel License */}
              <div className="bg-paper border border-borderCol rounded-xl p-4 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold uppercase text-ink">
                      Standard Apparel
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-warm/20 text-ink border border-warm/40 font-semibold">
                      PER_GARMENT
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-mutedGray mt-1">
                    Royalty earned on each custom garment printed on marketplace.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-mono text-sm font-bold text-mutedGray">
                      ฿
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={standardPrice}
                      onChange={(e) => setStandardPrice(parseInt(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 bg-paper-light border border-borderCol rounded-lg font-mono text-base font-bold text-ink focus:outline-none focus:border-warm"
                      data-testid="standard-price-input"
                    />
                  </div>
                  <div className="flex justify-between font-mono text-[11px] text-mutedGray pt-1 border-t border-borderCol">
                    <span>Creator Net (85%):</span>
                    <span className="text-emerald-700 font-bold">
                      ฿{Math.round(standardPrice * 0.85)} THB
                    </span>
                  </div>
                  <div className="flex justify-between font-mono text-[10px] text-mutedGray">
                    <span>Platform Fee (15%):</span>
                    <span>฿{Math.round(standardPrice * 0.15)} THB</span>
                  </div>
                </div>
              </div>

              {/* Tier 2: Commercial License */}
              <div className="bg-paper border border-borderCol rounded-xl p-4 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold uppercase text-ink">
                      Commercial License
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-warm/20 text-ink border border-warm/40 font-semibold">
                      BATCH (1-500)
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-mutedGray mt-1">
                    Small brand production runs and independent streetwear drops.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-mono text-sm font-bold text-mutedGray">
                      ฿
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={commercialPrice}
                      onChange={(e) => setCommercialPrice(parseInt(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 bg-paper-light border border-borderCol rounded-lg font-mono text-base font-bold text-ink focus:outline-none focus:border-warm"
                      data-testid="commercial-price-input"
                    />
                  </div>
                  <div className="flex justify-between font-mono text-[11px] text-mutedGray pt-1 border-t border-borderCol">
                    <span>Creator Net (85%):</span>
                    <span className="text-emerald-700 font-bold">
                      ฿{Math.round(commercialPrice * 0.85)} THB
                    </span>
                  </div>
                  <div className="flex justify-between font-mono text-[10px] text-mutedGray">
                    <span>Platform Fee (15%):</span>
                    <span>฿{Math.round(commercialPrice * 0.15)} THB</span>
                  </div>
                </div>
              </div>

              {/* Tier 3: Extended Merchandise License */}
              <div className="bg-paper border border-borderCol rounded-xl p-4 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold uppercase text-ink">
                      Extended Merchandise
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-warm/20 text-ink border border-warm/40 font-semibold">
                      UNLIMITED
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-mutedGray mt-1">
                    Full commercial resale, global distribution, and merchandise packaging.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-mono text-sm font-bold text-mutedGray">
                      ฿
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={extendedPrice}
                      onChange={(e) => setExtendedPrice(parseInt(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 bg-paper-light border border-borderCol rounded-lg font-mono text-base font-bold text-ink focus:outline-none focus:border-warm"
                      data-testid="extended-price-input"
                    />
                  </div>
                  <div className="flex justify-between font-mono text-[11px] text-mutedGray pt-1 border-t border-borderCol">
                    <span>Creator Net (85%):</span>
                    <span className="text-emerald-700 font-bold">
                      ฿{Math.round(extendedPrice * 0.85)} THB
                    </span>
                  </div>
                  <div className="flex justify-between font-mono text-[10px] text-mutedGray">
                    <span>Platform Fee (15%):</span>
                    <span>฿{Math.round(extendedPrice * 0.15)} THB</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Error Banner */}
          {errorMessage && (
            <div
              data-testid="artwork-upload-error-banner"
              className="p-4 sm:p-5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3 text-rose-900"
            >
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 font-mono text-xs">
                <div className="font-bold text-rose-800 uppercase tracking-wider">
                  Validation / Upload Rejection
                </div>
                <div className="text-rose-700 leading-relaxed">{errorMessage}</div>
                <div className="text-[11px] text-rose-600 pt-1">
                  Tip: Ensure raster files have 300 DPI metadata and PNGs have an alpha channel without solid background rectangles.
                </div>
              </div>
            </div>
          )}

          {/* Submission Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-borderCol">
            <Link
              href="/creator/dashboard"
              className="font-mono text-xs uppercase font-bold text-mutedGray hover:text-ink transition-colors"
            >
              &larr; Return to Dashboard
            </Link>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <button
                type="submit"
                disabled={isUploading || !selectedFile || !title.trim()}
                className="w-full sm:w-auto px-8 py-3 bg-ink hover:bg-ink-light disabled:bg-mutedGray/50 disabled:cursor-not-allowed text-paper font-mono text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center space-x-2"
                data-testid="submit-artwork-upload-btn"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-warm" />
                    <span>{uploadStatusStep || 'Validating Asset...'}</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4 text-warm" />
                    <span>Validate & Publish Artwork</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
