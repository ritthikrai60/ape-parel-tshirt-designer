'use client';

import React from 'react';
import { DesignElement } from '@/lib/types';
import {
  Layers,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  Maximize2,
  RotateCw,
  Crown,
  Tag,
} from 'lucide-react';

export interface LayerManagerProps {
  surface: 'FRONT' | 'BACK';
  elements: DesignElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<DesignElement>) => void;
  onDeleteElement: (id: string) => void;
  onOpenCatalog: () => void;
  onClearSurface: () => void;
  artworks?: Array<{
    id: string;
    title: string;
    licenseOptions: Array<{
      id: string;
      name: string;
      price: number;
      scope: string;
    }>;
  }>;
  ownedPermanentArtworkIds?: Set<string>;
}

export const LayerManager: React.FC<LayerManagerProps> = ({
  surface,
  elements,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onOpenCatalog,
  onClearSurface,
  artworks,
  ownedPermanentArtworkIds,
}) => {
  // Sort descending by zIndex so the top layer appears first in the list
  const sortedLayers = [...elements].sort((a, b) => b.zIndex - a.zIndex);
  const selectedElement = elements.find((el) => el.id === selectedElementId);

  const handleMoveUp = (el: DesignElement) => {
    const currentIndex = sortedLayers.findIndex((item) => item.id === el.id);
    if (currentIndex <= 0) return;
    const higherItem = sortedLayers[currentIndex - 1];
    // Swap zIndexes
    onUpdateElement(el.id, { zIndex: higherItem.zIndex });
    onUpdateElement(higherItem.id, { zIndex: el.zIndex });
  };

  const handleMoveDown = (el: DesignElement) => {
    const currentIndex = sortedLayers.findIndex((item) => item.id === el.id);
    if (currentIndex >= sortedLayers.length - 1) return;
    const lowerItem = sortedLayers[currentIndex + 1];
    // Swap zIndexes
    onUpdateElement(el.id, { zIndex: lowerItem.zIndex });
    onUpdateElement(lowerItem.id, { zIndex: el.zIndex });
  };

  return (
    <div className="bg-paper-light border border-borderCol rounded-xl p-4 flex flex-col space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-borderCol pb-3">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-warm-dark" />
          <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-ink">
            {surface} Layers ({elements.length})
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          {elements.length > 0 && (
            <button
              type="button"
              onClick={onClearSurface}
              className="text-[11px] font-mono text-mutedGray hover:text-red-600 transition-colors"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onOpenCatalog}
            className="flex items-center space-x-1 px-2.5 py-1 bg-ink text-paper rounded text-xs font-mono font-semibold hover:bg-ink-light transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Art</span>
          </button>
        </div>
      </div>

      {/* Layer List */}
      {elements.length === 0 ? (
        <div className="py-8 text-center text-mutedGray text-xs font-mono">
          No artwork placed on {surface.toLowerCase()} yet.
          <br />
          Click &ldquo;Add Art&rdquo; to browse catalog.
        </div>
      ) : (
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {sortedLayers.map((el) => {
            const isSelected = el.id === selectedElementId;
            return (
              <div
                key={el.id}
                onClick={() => onSelectElement(el.id)}
                className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-warm/15 border-warm shadow-xs'
                    : 'bg-paper border-borderCol hover:border-warm/50'
                }`}
              >
                {/* Thumbnail & Info */}
                <div className="flex items-center space-x-2.5 min-w-0">
                  <img
                    src={el.previewUrl}
                    alt={el.title}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/8.x/shapes/svg?seed=${encodeURIComponent(el.title)}&backgroundColor=222729`;
                    }}
                    className="w-8 h-8 rounded bg-ink/5 object-contain p-0.5 border border-borderCol"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-sans font-semibold text-ink truncate">{el.title}</p>
                    {(() => {
                      const isOwned = ownedPermanentArtworkIds?.has(el.artworkId);
                      const art = artworks?.find((a) => a.id === el.artworkId);
                      const lic = art?.licenseOptions.find((l) => l.id === el.licenseOptionId);
                      const isUnlimited = lic?.scope === 'UNLIMITED';

                      return (
                        <p className="text-[10px] font-mono text-mutedGray truncate flex items-center gap-1">
                          {isOwned ? (
                            <span className="text-amber-700 font-bold flex items-center gap-0.5">
                              <Crown className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                              <span>฿0 Vault</span>
                            </span>
                          ) : isUnlimited ? (
                            <span className="text-amber-800 font-bold">฿{el.price} (ตลอดชีพ)</span>
                          ) : (
                            <span>฿{el.price}/ชิ้น</span>
                          )}
                          <span>&bull;</span>
                          <span>{el.creatorName}</span>
                        </p>
                      );
                    })()}
                  </div>
                </div>

                {/* Layer Ordering & Delete Actions */}
                <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleMoveUp(el)}
                    title="Move Layer Up"
                    className="p-1 text-mutedGray hover:text-ink rounded hover:bg-paper-dark transition-colors"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(el)}
                    title="Move Layer Down"
                    className="p-1 text-mutedGray hover:text-ink rounded hover:bg-paper-dark transition-colors"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteElement(el.id)}
                    title="Delete Layer"
                    className="p-1 text-mutedGray hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Layer Fine-Tuning Inspector */}
      {selectedElement && (
        <div className="border-t border-borderCol pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-ink uppercase tracking-wider truncate max-w-[200px]">
              Selected: {selectedElement.title}
            </span>
            <button
              type="button"
              onClick={() => {
                // Center alignment shortcut
                onUpdateElement(selectedElement.id, { x: 50, y: 45 });
              }}
              className="text-[10px] font-mono text-warm-dark hover:underline"
            >
              Center on Chest
            </button>
          </div>

          {/* Scale Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-mutedGray">
              <span className="flex items-center space-x-1">
                <Maximize2 className="w-3 h-3" />
                <span>Scale</span>
              </span>
              <span>{Math.round(selectedElement.width)}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="80"
              value={selectedElement.width}
              onChange={(e) => {
                const w = Number(e.target.value);
                const aspect = selectedElement.width / selectedElement.height || 1;
                onUpdateElement(selectedElement.id, {
                  width: w,
                  height: Math.round(w / aspect),
                });
              }}
              className="w-full accent-warm"
            />
          </div>

          {/* Rotation Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-mutedGray">
              <span className="flex items-center space-x-1">
                <RotateCw className="w-3 h-3" />
                <span>Rotation</span>
              </span>
              <span>{selectedElement.rotation}&deg;</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={selectedElement.rotation}
              onChange={(e) =>
                onUpdateElement(selectedElement.id, { rotation: Number(e.target.value) })
              }
              className="w-full accent-warm"
            />
          </div>

          {/* License Scope Selector */}
          {(() => {
            const isOwnedInVault = ownedPermanentArtworkIds?.has(selectedElement.artworkId);
            const selectedArtwork = artworks?.find((a) => a.id === selectedElement.artworkId);

            if (isOwnedInVault) {
              return (
                <div className="bg-amber-50/90 border border-amber-300 rounded-lg p-2.5 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center space-x-1.5 text-amber-900 font-bold">
                    <Crown className="w-4 h-4 text-amber-600 fill-amber-500" />
                    <span>Permanent IP ใน Vault</span>
                  </div>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    ฿0 ผลิตฟรี
                  </span>
                </div>
              );
            }

            if (!selectedArtwork || selectedArtwork.licenseOptions.length === 0) {
              return null;
            }

            return (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-mutedGray font-bold uppercase flex items-center gap-1">
                    <Tag className="w-3 h-3 text-warm-dark" />
                    <span>รูปแบบลิขสิทธิ์ (License Scope)</span>
                  </span>
                  <span className="text-ink font-bold">
                    ฿{selectedElement.price}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {selectedArtwork.licenseOptions.map((opt) => {
                    const isSelected = selectedElement.licenseOptionId === opt.id;
                    const isUnlimited = opt.scope === 'UNLIMITED';

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          onUpdateElement(selectedElement.id, {
                            licenseOptionId: opt.id,
                            price: opt.price,
                          })
                        }
                        className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                          isSelected
                            ? 'bg-paper border-ink ring-1 ring-ink shadow-2xs font-bold'
                            : 'bg-paper-light border-borderCol hover:border-warm/60 opacity-80'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-[10px] font-mono text-ink font-bold flex items-center gap-1">
                            {isUnlimited ? (
                              <>
                                <Crown className="w-3 h-3 text-amber-600" />
                                <span>ตลอดชีพ</span>
                              </>
                            ) : (
                              <>
                                <Tag className="w-3 h-3 text-ink" />
                                <span>รายชิ้น</span>
                              </>
                            )}
                          </span>
                          <span className="text-xs font-mono text-ink font-bold">
                            ฿{opt.price}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-mutedGray">
                          {isUnlimited ? 'ซื้อขาดเข้า Vault' : 'คิดตามจำนวนตัว'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default LayerManager;
