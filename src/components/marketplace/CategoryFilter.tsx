'use client';

import React, { useState, useMemo } from 'react';
import { Search, X, Sparkles } from 'lucide-react';
import { ArtworkCard, MarketplaceArtworkDTO } from './ArtworkCard';

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
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  sortBy = 'featured',
  onSortChange,
  categoryCounts = {},
}) => {
  return (
    <div className="w-full bg-paper border-b border-borderCol sticky top-16 z-30 py-4 mb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-4">
        {/* Top Row: Search and Sort */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-mutedGray absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Search artworks"
              placeholder="Search by title, tag, or creator name..."
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

          {/* Sort Dropdown */}
          {onSortChange && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="font-mono text-xs uppercase text-mutedGray">Sort:</span>
              <select
                aria-label="Sort artworks"
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                className="text-xs font-mono uppercase bg-paper-light border border-borderCol rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-ink transition-colors"
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="title">Alphabetical</option>
              </select>
            </div>
          )}
        </div>

        {/* Bottom Row: Category Filter Tabs */}
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
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
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
      </div>
    </div>
  );
};

interface MarketplaceCatalogProps {
  initialArtworks: MarketplaceArtworkDTO[];
}

export const MarketplaceCatalog: React.FC<MarketplaceCatalogProps> = ({
  initialArtworks,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('featured');

  // Filter & Search Logic
  const filteredArtworks = useMemo(() => {
    return initialArtworks
      .filter((art) => {
        // Category Filter
        const normArtCategory = (art.category || '').toUpperCase();
        const matchesCategory =
          selectedCategory === 'ALL' || normArtCategory === selectedCategory;

        // Search Filter (Title, Tag, Creator Name, Creator Slug)
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          art.title.toLowerCase().includes(q) ||
          (art.creator && art.creator.displayName.toLowerCase().includes(q)) ||
          (art.creator && art.creator.slug.toLowerCase().includes(q)) ||
          (art.tags && art.tags.toLowerCase().includes(q));

        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.baseLicensePrice - b.baseLicensePrice;
        if (sortBy === 'price-desc') return b.baseLicensePrice - a.baseLicensePrice;
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        return 0;
      });
  }, [initialArtworks, selectedCategory, searchQuery, sortBy]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: initialArtworks.length };
    for (const art of initialArtworks) {
      const cat = (art.category || 'ILLUSTRATION').toUpperCase();
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [initialArtworks]);

  return (
    <div className="w-full">
      <CategoryFilter
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        categoryCounts={categoryCounts}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Results Bar */}
        <div className="flex items-center justify-between mb-6">
          <span className="font-mono text-xs text-mutedGray">
            Showing <strong className="text-ink">{filteredArtworks.length}</strong> of{' '}
            {initialArtworks.length} artworks
          </span>
          {(selectedCategory !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategory('ALL');
                setSearchQuery('');
              }}
              className="font-mono text-xs text-warm-dark hover:underline uppercase"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Artwork Grid */}
        {filteredArtworks.length > 0 ? (
          <div
            data-testid="artwork-grid"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          >
            {filteredArtworks.map((art) => (
              <ArtworkCard key={art.id} artwork={art} />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div
            data-testid="artwork-empty-state"
            className="py-20 text-center flex flex-col items-center justify-center border border-dashed border-borderCol rounded-xl bg-paper-light/50"
          >
            <Sparkles className="w-10 h-10 text-mutedGray mb-3 stroke-[1.5]" />
            <h3 className="font-sans font-bold text-lg text-ink mb-1">
              No matching artworks found
            </h3>
            <p className="font-sans text-sm text-mutedGray max-w-sm mb-6">
              Try adjusting your search terms or selecting a different category filter.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('ALL');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-ink text-paper font-mono text-xs uppercase tracking-wider font-bold rounded-lg hover:bg-ink-light transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

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
      const matchesCategory =
        selectedCategory === 'ALL' || normCat === selectedCategory;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        art.title.toLowerCase().includes(q) ||
        (art.tags && art.tags.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [artworks, selectedCategory, searchQuery]);

  return (
    <div className="w-full">
      {/* Portfolio Filter & Search */}
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

        {/* Search */}
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

      {/* Grid */}
      {filteredArtworks.length > 0 ? (
        <div
          data-testid="creator-artwork-grid"
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        >
          {filteredArtworks.map((art) => (
            <ArtworkCard key={art.id} artwork={art} />
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
    </div>
  );
};

export default CategoryFilter;
