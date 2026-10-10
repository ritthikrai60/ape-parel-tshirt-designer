'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { DesignElement } from '@/lib/types';
import { RotateCw } from 'lucide-react';

export interface Garment2DCanvasProps {
  surface: 'FRONT' | 'BACK';
  garmentColorHex: string;
  elements: DesignElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<DesignElement>) => void;
  onDeleteElement: (id: string) => void;
  interactive?: boolean;
  className?: string;
}

// Authentic SVG Vector Silhouettes for Apex Heavyweight Oversized Tee
const GARMENT_SILHOUETTES = {
  FRONT: {
    viewBox: '0 0 1000 1000',
    outlinePath:
      'M 390 130 ' + // Left collar point
      'C 440 210, 560 210, 610 130 ' + // Front neckline dip
      'L 810 220 ' + // Right shoulder drop
      'L 920 420 ' + // Right sleeve outer
      'L 790 490 ' + // Right sleeve cuff
      'L 740 430 ' + // Right armpit
      'L 730 870 ' + // Right side torso hem
      'L 270 870 ' + // Bottom hem
      'L 260 430 ' + // Left side torso
      'L 210 490 ' + // Left armpit / sleeve cuff
      'L 80 420 ' + // Left sleeve outer
      'L 190 220 ' + // Left shoulder drop
      'Z',
    collarPath: 'M 390 130 C 440 210, 560 210, 610 130 C 560 110, 440 110, 390 130 Z',
    collarRibPath: 'M 395 140 C 445 200, 555 200, 605 140',
    seamLines: [
      { d: 'M 190 220 L 390 130', strokeWidth: 2, opacity: 0.15 }, // Left shoulder seam
      { d: 'M 610 130 L 810 220', strokeWidth: 2, opacity: 0.15 }, // Right shoulder seam
      { d: 'M 190 220 L 260 430', strokeWidth: 2, opacity: 0.12 }, // Left armhole drop seam
      { d: 'M 810 220 L 740 430', strokeWidth: 2, opacity: 0.12 }, // Right armhole drop seam
      { d: 'M 80 420 L 210 490', strokeWidth: 2, opacity: 0.2 }, // Left cuff hem
      { d: 'M 920 420 L 790 490', strokeWidth: 2, opacity: 0.2 }, // Right cuff hem
      { d: 'M 270 855 L 730 855', strokeWidth: 2, opacity: 0.2 }, // Bottom double-stitch hem
    ],
  },
  BACK: {
    viewBox: '0 0 1000 1000',
    outlinePath:
      'M 390 130 ' +
      'C 450 155, 550 155, 610 130 ' + // Shallow nape curve for back
      'L 810 220 ' +
      'L 920 420 ' +
      'L 790 490 ' +
      'L 740 430 ' +
      'L 730 870 ' +
      'L 270 870 ' +
      'L 260 430 ' +
      'L 210 490 ' +
      'L 80 420 ' +
      'L 190 220 ' +
      'Z',
    collarPath: 'M 390 130 C 450 155, 550 155, 610 130 C 550 120, 450 120, 390 130 Z',
    collarRibPath: 'M 395 136 C 450 150, 550 150, 605 136',
    seamLines: [
      { d: 'M 190 220 L 390 130', strokeWidth: 2, opacity: 0.15 },
      { d: 'M 610 130 L 810 220', strokeWidth: 2, opacity: 0.15 },
      { d: 'M 190 220 L 260 430', strokeWidth: 2, opacity: 0.12 },
      { d: 'M 810 220 L 740 430', strokeWidth: 2, opacity: 0.12 },
      { d: 'M 390 180 C 500 190, 500 190, 610 180', strokeWidth: 1.5, opacity: 0.1 },
      { d: 'M 270 855 L 730 855', strokeWidth: 2, opacity: 0.2 },
    ],
  },
};

export const Garment2DCanvas: React.FC<Garment2DCanvasProps> = ({
  surface,
  garmentColorHex,
  elements,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  interactive = true,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const silhouette = GARMENT_SILHOUETTES[surface];

  // Active interaction drag state
  const [dragState, setDragState] = useState<{
    mode: 'translate' | 'scale' | 'rotate' | null;
    elementId: string | null;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
    initialRotation: number;
  }>({
    mode: null,
    elementId: null,
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    initialWidth: 0,
    initialHeight: 0,
    initialRotation: 0,
  });

  const selectedElement = elements.find((el) => el.id === selectedElementId);

  // Keyboard navigation & deletion
  useEffect(() => {
    if (!interactive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedElement) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDeleteElement(selectedElement.id);
      } else if (e.key === 'Escape') {
        onSelectElement(null);
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 3 : 1;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;
        onUpdateElement(selectedElement.id, {
          x: Math.max(5, Math.min(95, selectedElement.x + dx)),
          y: Math.max(5, Math.min(95, selectedElement.y + dy)),
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [interactive, selectedElement, onDeleteElement, onSelectElement, onUpdateElement]);

  // Pointer drag/scale/rotate handling
  const handlePointerDown = (
    e: React.PointerEvent,
    mode: 'translate' | 'scale' | 'rotate',
    el: DesignElement
  ) => {
    if (!interactive) return;
    e.stopPropagation();
    onSelectElement(el.id);

    setDragState({
      mode,
      elementId: el.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: el.x,
      initialY: el.y,
      initialWidth: el.width,
      initialHeight: el.height,
      initialRotation: el.rotation,
    });
  };

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragState.mode || !dragState.elementId || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      if (dragState.mode === 'translate') {
        const dxPx = e.clientX - dragState.startX;
        const dyPx = e.clientY - dragState.startY;
        const dxPct = (dxPx / rect.width) * 100;
        const dyPct = (dyPx / rect.height) * 100;

        onUpdateElement(dragState.elementId, {
          x: Math.round(Math.max(5, Math.min(95, dragState.initialX + dxPct))),
          y: Math.round(Math.max(5, Math.min(95, dragState.initialY + dyPct))),
        });
      } else if (dragState.mode === 'scale') {
        const dxPx = e.clientX - dragState.startX;
        const scaleFactor = 1 + (dxPx / rect.width) * 2;
        const newWidth = Math.max(
          10,
          Math.min(85, Math.round(dragState.initialWidth * scaleFactor))
        );
        const aspect = dragState.initialWidth / dragState.initialHeight || 1;
        const newHeight = Math.round(newWidth / aspect);

        onUpdateElement(dragState.elementId, {
          width: newWidth,
          height: newHeight,
        });
      } else if (dragState.mode === 'rotate') {
        const centerXPx = rect.left + (dragState.initialX / 100) * rect.width;
        const centerYPx = rect.top + (dragState.initialY / 100) * rect.height;
        const radians = Math.atan2(e.clientY - centerYPx, e.clientX - centerXPx);
        let degrees = Math.round((radians * 180) / Math.PI + 90);
        if (degrees < 0) degrees += 360;
        if (degrees >= 360) degrees -= 360;

        // Snapping to 0, 90, 180, 270
        if (Math.abs(degrees - 0) < 4 || Math.abs(degrees - 360) < 4) degrees = 0;
        if (Math.abs(degrees - 90) < 4) degrees = 90;
        if (Math.abs(degrees - 180) < 4) degrees = 180;
        if (Math.abs(degrees - 270) < 4) degrees = 270;

        onUpdateElement(dragState.elementId, { rotation: degrees });
      }
    },
    [dragState, onUpdateElement]
  );

  const handlePointerUp = useCallback(() => {
    setDragState((prev) => ({ ...prev, mode: null, elementId: null }));
  }, []);

  useEffect(() => {
    if (dragState.mode) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [dragState.mode, handlePointerMove, handlePointerUp]);

  return (
    <div
      ref={containerRef}
      onClick={() => onSelectElement(null)}
      className={`relative w-full aspect-square max-w-[620px] mx-auto select-none overflow-hidden rounded-xl bg-transparent flex items-center justify-center ${className}`}
    >
      {/* 1. T-Shirt SVG Silhouette on Transparent Backdrop */}
      <svg
        viewBox={silhouette.viewBox}
        className="w-full h-full drop-shadow-xl transition-all duration-300"
      >
        <defs>
          <filter id="softShade" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="8" stdDeviation="16" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* Garment Base Body */}
        <path
          d={silhouette.outlinePath}
          fill={garmentColorHex}
          className="transition-colors duration-300"
          filter="url(#softShade)"
        />

        {/* Collar & Ribbing */}
        <path d={silhouette.collarPath} fill={garmentColorHex} />
        <path
          d={silhouette.collarRibPath}
          fill="none"
          stroke={
            garmentColorHex === '#131718' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.18)'
          }
          strokeWidth="3"
        />

        {/* Garment Seams & Construction Lines */}
        {silhouette.seamLines.map((seam, i) => (
          <path
            key={i}
            d={seam.d}
            fill="none"
            stroke={garmentColorHex === '#131718' ? '#FFFFFF' : '#000000'}
            strokeWidth={seam.strokeWidth}
            strokeOpacity={seam.opacity}
          />
        ))}
      </svg>

      {/* 2. Interactive Artwork Layers (NO INTRUSIVE BOUNDING BOXES) */}
      {elements.map((el) => {
        const isSelected = el.id === selectedElementId;

        return (
          <div
            key={el.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectElement(el.id);
            }}
            onPointerDown={(e) => handlePointerDown(e, 'translate', el)}
            style={{
              position: 'absolute',
              left: `${el.x}%`,
              top: `${el.y}%`,
              width: `${el.width}%`,
              height: `${el.height}%`,
              transform: `translate(-50%, -50%) rotate(${el.rotation}deg)`,
              zIndex: el.zIndex,
              cursor: interactive ? (isSelected ? 'grab' : 'pointer') : 'default',
            }}
            className={`group transition-shadow ${
              isSelected
                ? 'ring-1 ring-warm/80 ring-offset-1'
                : 'hover:ring-1 hover:ring-borderCol/50'
            }`}
          >
            {/* Artwork Graphic */}
            <img
              src={el.previewUrl}
              alt={el.title}
              draggable={false}
              className="w-full h-full object-contain pointer-events-none drop-shadow-sm"
            />

            {/* Transform Controls ONLY shown on active selection */}
            {isSelected && interactive && (
              <>
                {/* Center subtle label */}
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-ink/90 text-paper text-[10px] font-mono px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
                  {el.title} ({Math.round(el.width)}%)
                </div>

                {/* Top Rotation Knob */}
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'rotate', el)}
                  className="absolute -top-6 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-warm text-ink flex items-center justify-center shadow-md cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
                >
                  <RotateCw className="w-3 h-3" />
                </div>

                {/* 4 Corner Scale Handles */}
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'scale', el)}
                  className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-paper border-2 border-warm rounded-sm cursor-se-resize shadow"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'scale', el)}
                  className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-paper border-2 border-warm rounded-sm cursor-sw-resize shadow"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'scale', el)}
                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-paper border-2 border-warm rounded-sm cursor-ne-resize shadow"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'scale', el)}
                  className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-paper border-2 border-warm rounded-sm cursor-nw-resize shadow"
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Garment2DCanvas;
