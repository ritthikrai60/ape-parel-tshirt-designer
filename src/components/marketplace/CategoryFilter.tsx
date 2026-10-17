'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Search, X, Sparkles, SlidersHorizontal, Tag } from 'lucide-react';
import { ArtworkCard, MarketplaceArtworkDTO } from './ArtworkCard';
import { ArtworkPreviewModal } from './ArtworkPreviewModal';

export const CATEGORY_TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'ILLUSTRATION', label: 'Illustration' },
  { key: 'MASCOT', label: 'Mascot' },
  { key: 'TYPOGRAPHY', label: 'Typography' },
  { key: 'PATTERN', label: 'Pattern' },
  { key: 'LOGO', label: 'Logo' },
] as const;

export type CategoryKey = (typeof CATEGORY_TABS)[number]['key'];

interface CategoryFilterProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy?: string;
  onSortChange?: (sortBy: string) => void;
  categoryCounts?: Record<string, number>;
  maxPrice: number;
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  trendingTags?: string[];
  activeTag?: string;
  onTagClick?: (tag: string) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  sortBy = 'featured',
  onSortChange,
  categoryCounts = {},
  maxPrice,
  priceRange,
  onPriceRangeChange,
  trendingTags = [],
  activeTag,
  onTagClick,
}) => {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="w-full bg-paper border-b border-borderCol sticky top-16 z-30">
      {/* Main Filter Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col gap-3">
        {/* Top Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-mutedGray absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Search artworks"
              placeholder="Search by title, tag, or creator..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-9 py-2 text-sm bg-paper-light border border-borderCol rounded-lg font-sans text-ink placeholder:text-mutedGray focus:outline-none focus:border-ink transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-mutedGray hover:text-ink transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-mono uppercase tracking-wider transition-all ${
                showFilters
                  ? 'bg-ink text-paper border-ink'
                  : 'bg-paper-light text-ink border-borderCol hover:border-ink/50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
            </button>

            {/* Sort */}
            {onSortChange && (
              <select
                aria-label="Sort artworks"
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                className="text-xs font-mono uppercase bg-paper-light border border-borderCol rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-ink transition-colors"
              >
                <option value="featured">Featured</option>
                <option value="most-liked">Most Liked ❤️</option>
                <option value="rating-desc">Highest Rated ⭐</option>
                <option value="newest">Newest</option>
                <option value="price-asc">Price ↑</option>
                <option value="price-desc">Price ↓</option>
                <option value="title">A–Z</option>
              </select>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORY_TABS.map((tab) => {
            const count = categoryCounts[tab.key];
            const isActive = selectedCategory === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                data-testid={`category-tab-${tab.key.toLowerCase()}`}
                onClick={() => onSelectCategory(tab.key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-ink text-paper shadow-sm'
                    : 'bg-paper-light text-ink hover:bg-paper-dark border border-borderCol'
                }`}
              >
                <span>{tab.label}</span>
                {count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 rounded-full ${
                      isActive ? 'bg-paper/20 text-paper' : 'bg-borderCol/60 text-mutedGray'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Expandable Advanced Filters */}
        {showFilters && (
          <div className="border-t border-borderCol pt-3 flex flex-col sm:flex-row gap-6 animate-fade-in">
            {/* Price Range Slider */}
            <div className="flex-1 min-w-[200px]">
              <label className="block font-mono text-[10px] uppercase tracking-widest text-mutedGray mb-2">
                Price Range: ฿{priceRange[0]} — ฿{priceRange[1]}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={maxPrice}
                  value={priceRange[0]}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val <= priceRange[1]) onPriceRangeChange([val, priceRange[1]]);
                  }}
                  className="flex-1 accent-ink"
                />
                <input
                  type="range"
                  min={0}
                  max={maxPrice}
                  value={priceRange[1]}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val >= priceRange[0]) onPriceRangeChange([priceRange[0], val]);
                  }}
                  className="flex-1 accent-ink"
                />
              </div>
              <div className="flex justify-between font-mono text-[9px] text-mutedGray mt-1">
                <span>฿0</span>
                <span>฿{maxPrice}</span>
              </div>
            </div>

            {/* Trending Tags Cloud */}
            {trendingTags.length > 0 && (
              <div className="flex-1">
                <label className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-mutedGray mb-2">
                  <Tag className="w-3 h-3" />
                  Trending Tags
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {trendingTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => onTagClick?.(tag)}
                      className={`font-mono text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                        activeTag === tag
                          ? 'bg-ink text-paper border-ink'
                          : 'bg-paper text-mutedGray border-borderCol hover:border-ink/50 hover:text-ink'
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface MarketplaceCatalogProps {
  initialArtworks: MarketplaceArtworkDTO[];
}

export const MarketplaceCatalog: React.FC<MarketplaceCatalogProps> = ({ initialArtworks }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('featured');
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [previewArtwork, setPreviewArtwork] = useState<MarketplaceArtworkDTO | null>(null);
  const [activeTag, setActiveTag] = useState<string>('');

  // Price range
  const maxPrice = useMemo(
    () => Math.max(...initialArtworks.map((a) => a.baseLicensePrice), 100),
    [initialArtworks]
  );
  const [priceRange, setPriceRange] = useState<[number, number]>([0, maxPrice]);

  // Trending tags (top 12)
  const trendingTags = useMemo(() => {
    const tagCount: Record<string, number> = {};
    for (const art of initialArtworks) {
      if (!art.tags) continue;
      for (const tag of art.tags.split(',').map((t) => t.trim()).filter(Boolean)) {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      }
    }
    return Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([tag]) => tag);
  }, [initialArtworks]);

  const handleTagClick = useCallback(
    (tag: string) => {
      setActiveTag((prev) => (prev === tag ? '' : tag));
      // Also populate search to filter
      setSearchQuery((prev) => {
        if (prev === tag) return '';
        return tag;
      });
    },
    []
  );

  const handleBookmark = useCallback((id: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Filter & sort
  const filteredArtworks = useMemo(() => {
    return initialArtworks
      .filter((art) => {
        const normCat = (art.category || '').toUpperCase();
        const matchesCategory = selectedCategory === 'ALL' || normCat === selectedCategory;

        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          art.title.toLowerCase().includes(q) ||
          (art.creator && art.creator.displayName.toLowerCase().includes(q)) ||
          (art.creator && art.creator.slug.toLowerCase().includes(q)) ||
          (art.tags && art.tags.toLowerCase().includes(q));

        const matchesPrice =
          art.baseLicensePrice >= priceRange[0] && art.baseLicensePrice <= priceRange[1];

        return matchesCategory && matchesSearch && matchesPrice;
      })
      .sort((a, b) => {
        if (sortBy === 'most-liked') return (b.favoriteCount || 0) - (a.favoriteCount || 0);
        if (sortBy === 'rating-desc') return (b.averageRating || 0) - (a.averageRating || 0);
        if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === 'price-asc') return a.baseLicensePrice - b.baseLicensePrice;
        if (sortBy === 'price-desc') return b.baseLicensePrice - a.baseLicensePrice;
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        return 0;
      });
  }, [initialArtworks, selectedCategory, searchQuery, sortBy, priceRange]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: initialArtworks.length };
    for (const art of initialArtworks) {
      const cat = (art.category || 'ILLUSTRATION').toUpperCase();
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [initialArtworks]);

  const hasActiveFilters = selectedCategory !== 'ALL' || searchQuery || priceRange[1] < maxPrice || priceRange[0] > 0;

  const resetAll = () => {
    setSelectedCategory('ALL');
    setSearchQuery('');
    setPriceRange([0, maxPrice]);
    setActiveTag('');
  };

  return (
    <div className="w-full" id="catalog">
      <CategoryFilter
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        categoryCounts={categoryCounts}
        maxPrice={maxPrice}
        priceRange={priceRange}
        onPriceRangeChange={setPriceRange}
        trendingTags={trendingTags}
        activeTag={activeTag}
        onTagClick={handleTagClick}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results bar */}
        <div className="flex items-center justify-between mb-6">
          <span className="font-mono text-xs text-mutedGray">
            Showing <strong className="text-ink">{filteredArtworks.length}</strong> of {initialArtworks.length} artworks
          </span>
          {hasActiveFilters && (
            <button
              onClick={resetAll}
              className="font-mono text-xs text-warm-dark hover:underline uppercase tracking-wider"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Grid */}
        {filteredArtworks.length > 0 ? (
          <div
            data-testid="artwork-grid"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5"
          >
            {filteredArtworks.map((art) => (
              <ArtworkCard
                key={art.id}
                artwork={art}
                onPreview={setPreviewArtwork}
                isBookmarked={bookmarks.has(art.id)}
                onBookmark={handleBookmark}
              />
            ))}
          </div>
        ) : (
          <div
            data-testid="artwork-empty-state"
            className="py-24 text-center flex flex-col items-center justify-center border border-dashed border-borderCol rounded-2xl bg-paper-light/50"
          >
            <Sparkles className="w-10 h-10 text-mutedGray mb-3 stroke-[1.5]" />
            <h3 className="font-sans font-bold text-lg text-ink mb-1">No artworks found</h3>
            <p className="font-sans text-sm text-mutedGray max-w-sm mb-6">
              Try adjusting your filters or search terms.
            </p>
            <button
              onClick={resetAll}
              className="px-4 py-2 bg-ink text-paper font-mono text-xs uppercase tracking-wider font-bold rounded-lg hover:bg-ink-light transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Quick Preview Modal */}
      {previewArtwork && (
        <ArtworkPreviewModal
          artwork={previewArtwork}
          onClose={() => setPreviewArtwork(null)}
          isBookmarked={bookmarks.has(previewArtwork.id)}
          onBookmark={handleBookmark}
        />
      )}
    </div>
  );
};

// ── Re-export for creator portfolio page (unchanged interface) ──
interface CreatorPortfolioGridProps {
  artworks: MarketplaceArtworkDTO[];
  creatorName: string;
}

export const CreatorPortfolioGrid: React.FC<CreatorPortfolioGridProps> = ({
  artworks,
  creatorName,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewArtwork, setPreviewArtwork] = useState<MarketplaceArtworkDTO | null>(null);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const art of artworks) {
      if (art.category) cats.add(art.category.toUpperCase());
    }
    return Array.from(cats);
  }, [artworks]);

  const filteredArtworks = useMemo(() => {
    return artworks.filter((art) => {
      const normCat = (art.category || '').toUpperCase();
      const matchesCategory = selectedCategory === 'ALL' || normCat === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q || art.title.toLowerCase().includes(q) || (art.tags && art.tags.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [artworks, selectedCategory, searchQuery]);

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-ink text-paper shadow-sm'
                : 'bg-paper-light text-ink hover:bg-paper-dark border border-borderCol'
            }`}
          >
            All Works ({artworks.length})
          </button>
          {availableCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold transition-all ${
                selectedCategory === cat
                  ? 'bg-ink text-paper shadow-sm'
                  : 'bg-paper-light text-ink hover:bg-paper-dark border border-borderCol'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-mutedGray absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search this portfolio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-paper-light border border-borderCol rounded-lg font-sans text-ink placeholder:text-mutedGray focus:outline-none focus:border-ink"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mutedGray hover:text-ink"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {filteredArtworks.length > 0 ? (
        <div
          data-testid="creator-artwork-grid"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
        >
          {filteredArtworks.map((art) => (
            <ArtworkCard key={art.id} artwork={art} onPreview={setPreviewArtwork} />
          ))}
        </div>
      ) : (
        <div
          data-testid="creator-empty-state"
          className="py-16 text-center border border-dashed border-borderCol rounded-xl bg-paper-light/50"
        >
          <Sparkles className="w-8 h-8 text-mutedGray mx-auto mb-2" />
          <p className="font-sans text-sm text-mutedGray">
            No artworks found matching your filter in {creatorName}&apos;s portfolio.
          </p>
        </div>
      )}

      {previewArtwork && (
        <ArtworkPreviewModal artwork={previewArtwork} onClose={() => setPreviewArtwork(null)} />
      )}
    </div>
  );
};

export default CategoryFilter;
