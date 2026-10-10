'use client';

import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { DesignElement } from '@/lib/types';

export interface SeededArtwork {
  artworkId: string;
  licenseOptionId: string;
  title: string;
  category: string;
  previewUrl: string;
  creatorName: string;
  creatorId: string;
  price: number;
}

export const SEEDED_PRESET_ARTWORKS: SeededArtwork[] = [
  {
    artworkId: 'art_dash_ape_classic',
    licenseOptionId: 'lic_dash_ape_std',
    title: 'Dash Ape Classic Head Mark',
    category: 'MASCOT',
    previewUrl: 'https://api.dicebear.com/8.x/bottts/svg?seed=dash-ape-alpha&backgroundColor=131718',
    creatorName: 'Dash Ape Studio',
    creatorId: 'creator_dash_ape',
    price: 40,
  },
  {
    artworkId: 'art_cyber_primate',
    licenseOptionId: 'lic_cyber_primate_std',
    title: 'Cyber Primate Tokyo 2088',
    category: 'ILLUSTRATION',
    previewUrl: 'https://api.dicebear.com/8.x/bottts/svg?seed=cyber-primate-2088&backgroundColor=DABA98',
    creatorName: 'Dash Ape Studio',
    creatorId: 'creator_dash_ape',
    price: 60,
  },
  {
    artworkId: 'art_static_glitch',
    licenseOptionId: 'lic_static_glitch_std',
    title: 'Static Glitch Protocol',
    category: 'PATTERN',
    previewUrl: 'https://api.dicebear.com/8.x/shapes/svg?seed=static-glitch-pattern&backgroundColor=222729',
    creatorName: 'Cyber Monk',
    creatorId: 'creator_cyber_monk',
    price: 25,
  },
  {
    artworkId: 'art_neo_shibuya',
    licenseOptionId: 'lic_neo_shibuya_std',
    title: 'Neo Shibuya Heavy Kanji',
    category: 'TYPOGRAPHY',
    previewUrl: 'https://api.dicebear.com/8.x/shapes/svg?seed=neo-shibuya-kanji&backgroundColor=131718',
    creatorName: 'Cyber Monk',
    creatorId: 'creator_cyber_monk',
    price: 50,
  },
  {
    artworkId: 'art_bonsai_core',
    licenseOptionId: 'lic_bonsai_core_std',
    title: 'Bonsai Core Brutalism',
    category: 'ILLUSTRATION',
    previewUrl: 'https://api.dicebear.com/8.x/identicon/svg?seed=bonsai-core&backgroundColor=F5F0E8',
    creatorName: 'Soma Botanica',
    creatorId: 'creator_soma',
    price: 45,
  },
];

export interface ArtworkCatalogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  surface: 'FRONT' | 'BACK';
  onAddArtwork: (element: DesignElement) => void;
  customArtworks?: SeededArtwork[];
}

export const ArtworkCatalogDrawer: React.FC<ArtworkCatalogDrawerProps> = ({
  isOpen,
  onClose,
  surface,
  onAddArtwork,
  customArtworks,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  if (!isOpen) return null;

  const catalog = customArtworks && customArtworks.length > 0 ? customArtworks : SEEDED_PRESET_ARTWORKS;
  const categories = ['ALL', 'MASCOT', 'ILLUSTRATION', 'PATTERN', 'TYPOGRAPHY'];

  const filtered = catalog.filter((art) => {
    const matchesSearch =
      art.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      art.creatorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || art.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleSelect = (art: SeededArtwork) => {
    const newElement: DesignElement = {
      id: `elem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      artworkId: art.artworkId,
      licenseOptionId: art.licenseOptionId,
      title: art.title,
      previewUrl: art.previewUrl,
      creatorName: art.creatorName,
      creatorId: art.creatorId,
      surface,
      x: 50, // Centered horizontally
      y: surface === 'FRONT' ? 42 : 45, // Torso center
      width: 35,
      height: 35,
      rotation: 0,
      zIndex: Date.now(),
      price: art.price,
    };
    onAddArtwork(newElement);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-paper-light border border-borderCol w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-borderCol flex items-center justify-between">
          <div>
            <h2 className="text-base font-sans font-bold text-ink">Select Artwork Catalog</h2>
            <p className="text-xs font-mono text-mutedGray">
              Adding to {surface} garment surface &bull; Creator royalties applied automatically
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-mutedGray hover:text-ink hover:bg-paper-dark"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="p-4 border-b border-borderCol space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-mutedGray absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search artworks, creators, styles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-paper border border-borderCol rounded-lg text-xs font-mono text-ink placeholder:text-mutedGray focus:outline-none focus:border-warm"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono uppercase tracking-wider font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-ink text-paper'
                    : 'bg-paper border border-borderCol text-mutedGray hover:text-ink'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map((art) => (
            <div
              key={art.artworkId}
              onClick={() => handleSelect(art)}
              className="group p-3 bg-paper border border-borderCol rounded-xl hover:border-warm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="aspect-square w-full rounded-lg bg-ink/5 flex items-center justify-center p-3 mb-2 overflow-hidden">
                <img
                  src={art.previewUrl}
                  alt={art.title}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                />
              </div>
              <div>
                <p className="text-xs font-sans font-bold text-ink truncate">{art.title}</p>
                <p className="text-[10px] font-mono text-mutedGray truncate">{art.creatorName}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-warm-dark">฿{art.price}</span>
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-borderCol/40 text-ink">
                    {art.category}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ArtworkCatalogDrawer;
