import React from 'react';

export type FabricColor = 'black' | 'white' | 'heather' | 'vintage';

export interface FabricConfig {
  id: FabricColor;
  name: string;
  bgClass: string;
  dotColor: string;
  strokeColor: string;
  gridColor: string;
  textColor: string;
  isDark: boolean;
}

export const FABRICS: Record<FabricColor, FabricConfig> = {
  black: {
    id: 'black',
    name: 'Pitch Black Heavy Cotton',
    bgClass: 'bg-[#121516]',
    dotColor: '#121516',
    strokeColor: 'rgba(255,255,255,0.12)',
    gridColor: 'rgba(255,255,255,0.06)',
    textColor: 'text-white',
    isDark: true,
  },
  white: {
    id: 'white',
    name: 'Optic White Combed Cotton',
    bgClass: 'bg-[#FBF9F5]',
    dotColor: '#FBF9F5',
    strokeColor: 'rgba(0,0,0,0.10)',
    gridColor: 'rgba(0,0,0,0.05)',
    textColor: 'text-zinc-900',
    isDark: false,
  },
  heather: {
    id: 'heather',
    name: 'Heather Grey Athletic',
    bgClass: 'bg-[#5D656B]',
    dotColor: '#5D656B',
    strokeColor: 'rgba(255,255,255,0.20)',
    gridColor: 'rgba(255,255,255,0.08)',
    textColor: 'text-white',
    isDark: true,
  },
  vintage: {
    id: 'vintage',
    name: 'Vintage Oatmeal Heavyweight',
    bgClass: 'bg-[#ECE3D2]',
    dotColor: '#ECE3D2',
    strokeColor: 'rgba(60,50,40,0.14)',
    gridColor: 'rgba(60,50,40,0.06)',
    textColor: 'text-stone-900',
    isDark: false,
  },
};

/**
 * Intelligent fabric detector:
 * If an artwork graphic has black/dark ink in its title or tags, default to white fabric
 * so the black design does not disappear into a black background.
 * If it has white/light ink, default to black fabric.
 */
export function getRecommendedFabric(title: string, tags?: string | null): FabricColor {
  const text = `${title} ${tags || ''}`.toLowerCase();
  if (/\b(blk|black|dark|noir|night|shadow)\b/.test(text)) {
    return 'white';
  }
  if (/\b(wht|white|light|bright|snow)\b/.test(text)) {
    return 'black';
  }
  return 'black';
}

/**
 * Minimal vector silhouette of a heavyweight streetwear crewneck T-shirt
 * to give immediate context that the graphic is printed on an actual garment.
 */
export const TShirtSilhouette: React.FC<{ strokeColor?: string; className?: string }> = ({
  strokeColor = 'currentColor',
  className = 'w-full h-full pointer-events-none select-none',
}) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    preserveAspectRatio="xMidYMid meet"
  >
    {/* Collar / Crewneck Ribbing */}
    <path
      d="M37 13 C43 20, 57 20, 63 13 C59 9, 41 9, 37 13 Z"
      stroke={strokeColor}
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <path
      d="M40 15 C45 19, 55 19, 60 15"
      stroke={strokeColor}
      strokeWidth="0.8"
      strokeLinecap="round"
    />
    {/* Body & Sleeves Outline */}
    <path
      d="M37 13 L20 18 L10 38 L22 43 L27 34 L27 90 L73 90 L73 34 L78 43 L90 38 L80 18 L63 13"
      stroke={strokeColor}
      strokeWidth="1.2"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
    {/* Bottom Hem Stitches */}
    <path
      d="M27 86 L73 86"
      stroke={strokeColor}
      strokeWidth="0.8"
      strokeDasharray="2 2"
    />
    {/* Sleeve Hem Stitches */}
    <path
      d="M12 36 L24 41"
      stroke={strokeColor}
      strokeWidth="0.8"
      strokeDasharray="2 2"
    />
    <path
      d="M88 36 L76 41"
      stroke={strokeColor}
      strokeWidth="0.8"
      strokeDasharray="2 2"
    />
  </svg>
);

/**
 * Interactive mini fabric swatch picker
 */
export const FabricSwatchPicker: React.FC<{
  current: FabricColor;
  onChange: (color: FabricColor) => void;
  className?: string;
  size?: 'sm' | 'md';
}> = ({ current, onChange, className = '', size = 'sm' }) => {
  const dotSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <div
      className={`inline-flex items-center gap-1 bg-ink/75 backdrop-blur-md px-1.5 py-1 rounded-full border border-white/15 shadow-sm ${className}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {(Object.keys(FABRICS) as FabricColor[]).map((key) => {
        const fab = FABRICS[key];
        const isActive = current === key;
        return (
          <button
            key={key}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange(key);
            }}
            title={`Preview on ${fab.name}`}
            className={`${dotSize} rounded-full border transition-all duration-150 ${
              isActive
                ? 'scale-125 border-amber-400 ring-2 ring-amber-400/50 shadow-xs'
                : 'border-white/30 hover:scale-110 opacity-75 hover:opacity-100'
            }`}
            style={{ backgroundColor: fab.dotColor }}
            aria-label={fab.name}
          />
        );
      })}
    </div>
  );
};
