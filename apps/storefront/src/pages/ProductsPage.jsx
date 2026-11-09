import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react';
import ProductCard from '../components/ui/ProductCard';
import RevealOnScroll from '../components/ui/RevealOnScroll';
import Button from '../components/ui/Button';
import { useProducts } from '../hooks/useProducts';
import { useCollections } from '../hooks/useCollections';
import { useRooms } from '../hooks/useRooms';
import { useColors } from '../hooks/useColors';
import { useCategories } from '../hooks/useCategories';
import { useSubCategories } from '../hooks/useSubCategories';
import clsx from 'clsx';

const Accordion = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-charcoal/10 py-4 last:border-b-0">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex w-full items-center justify-between text-sm font-semibold text-charcoal uppercase tracking-wider group"
      >
        {title}
        <span className="text-charcoal/50 group-hover:text-charcoal transition-colors">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      <div className={clsx("overflow-hidden transition-all duration-300 ease-in-out", isOpen ? "max-h-[500px] opacity-100 mt-4 overflow-y-auto" : "max-h-0 opacity-0")}>
        {children}
      </div>
    </div>
  );
};

export default function ProductsPage() {
  const [visibleCount, setVisibleCount] = useState(12);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  
  const [searchParams, setSearchParams] = useSearchParams();
  
  const selectedCollection = searchParams.get('collection') || '';
  const selectedRoom = searchParams.get('room') || '';
  const selectedCategory = searchParams.get('category') || '';
  const selectedSubcategory = searchParams.get('subcategory') || '';
  const selectedColor = searchParams.get('color') || '';
  const searchQuery = searchParams.get('q') || '';
  const selectedSort = searchParams.get('sort') || 'newest';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const inStock = searchParams.get('inStock') === 'true';

  const [priceInput, setPriceInput] = useState({ min: minPrice, max: maxPrice });

  // Sync internal state if URL changes externally
  useEffect(() => {
    setPriceInput({ min: minPrice, max: maxPrice });
  }, [minPrice, maxPrice]);

  const updateParams = (updates) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, value]) => {
        if (value) newParams.set(key, value);
        else newParams.delete(key);
      });
      return newParams;
    });
  };

  const updateParam = (key, value) => {
    updateParams({ [key]: value });
  };

  const removeFilter = (key) => {
    updateParam(key, '');
  };

  const removeFilters = (keys) => {
    const updates = {};
    keys.forEach(k => updates[k] = '');
    updateParams(updates);
  };

  const applyPriceFilter = () => {
    let { min, max } = priceInput;
    // If the user typed the range backwards, fix it automatically.
    if (min !== '' && max !== '' && Number(min) > Number(max)) {
      [min, max] = [max, min];
      setPriceInput({ min, max });
    }
    updateParams({ minPrice: min, maxPrice: max });
  };

  const { collections, loading: collectionsLoading } = useCollections();
  const { rooms, loading: roomsLoading } = useRooms();
  const { colors, loading: colorsLoading } = useColors();
  const { categories, loading: categoriesLoading } = useCategories();
  const { subCategories, loading: subCategoriesLoading } = useSubCategories();

  const query = {};
  if (selectedCollection) query.collection = selectedCollection;
  if (selectedRoom) query.room = selectedRoom;
  if (selectedCategory) query.category = selectedCategory;
  if (selectedSubcategory) query.subcategory = selectedSubcategory;
  if (selectedColor) query.color = selectedColor;
  if (searchQuery) query.q = searchQuery;
  if (selectedSort) query.sort = selectedSort;
  if (minPrice) query.minPrice = minPrice;
  if (maxPrice) query.maxPrice = maxPrice;
  if (inStock) query.inStock = 'true';
  // The API returns at most `limit` products. Fetching the full catalogue (it
  // is ~0.5 MB for 126 products) lets Low→High / High→Low sorting work across
  // every product instead of only the first 100.
  query.limit = 500;

  const { products, loading: productsLoading } = useProducts(query);

  const visibleProducts = products.slice(0, visibleCount);
  const hasMore = visibleProducts.length < products.length;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 12);
  };

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(12);
  }, [selectedCollection, selectedRoom, selectedCategory, selectedSubcategory, selectedSort, selectedColor, searchQuery, minPrice, maxPrice, inStock]);

  const FilterSidebarContent = () => (
    <div className="font-sans">
      {/* Availability Filter */}
      <Accordion title="Availability">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative flex items-center">
            <input 
              type="checkbox" 
              className="w-5 h-5 border-2 border-charcoal/20 rounded bg-transparent appearance-none checked:bg-pink-primary checked:border-pink-primary transition-colors cursor-pointer"
              checked={inStock}
              onChange={(e) => updateParam('inStock', e.target.checked ? 'true' : '')}
            />
            {inStock && (
              <svg className="absolute w-3 h-3 left-1 text-white pointer-events-none" viewBox="0 0 14 14" fill="none">
                <path d="M3 8L6 11L11 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <span className="text-sm text-charcoal/70 group-hover:text-charcoal transition-colors">In Stock Only</span>
        </label>
      </Accordion>

      {/* Price Filter */}
      <Accordion title="Price">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/50 text-sm">₹</span>
              <input
                type="number"
                placeholder="Min"
                value={priceInput.min}
                onChange={(e) => setPriceInput(p => ({ ...p, min: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') applyPriceFilter(); }}
                className="w-full pl-7 pr-3 py-2 border border-charcoal/20 rounded text-sm focus:outline-none focus:border-pink-primary"
              />
            </div>
            <span className="text-charcoal/40">-</span>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/50 text-sm">₹</span>
              <input
                type="number"
                placeholder="Max"
                value={priceInput.max}
                onChange={(e) => setPriceInput(p => ({ ...p, max: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') applyPriceFilter(); }}
                className="w-full pl-7 pr-3 py-2 border border-charcoal/20 rounded text-sm focus:outline-none focus:border-pink-primary"
              />
            </div>
          </div>
          <Button variant="outline" className="w-full py-2 text-xs" onClick={applyPriceFilter}>
            Apply Price
          </Button>
        </div>
      </Accordion>

      {/* Categories Filter */}
      <Accordion title="Categories" defaultOpen={false}>
        {categoriesLoading ? (
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-4 bg-charcoal/10 rounded w-2/3"></div>)}
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => updateParams({ category: '', subcategory: '' })}
              className={clsx(
                "block text-sm transition-colors text-left",
                selectedCategory === '' ? "text-pink-primary font-medium" : "text-charcoal/70 hover:text-charcoal"
              )}
            >
              All Categories
            </button>
            {categories.map(category => (
              <button
                key={category._id}
                onClick={() => updateParams({ category: category.slug, subcategory: '' })}
                className={clsx(
                  "block text-sm transition-colors text-left",
                  selectedCategory === category.slug ? "text-pink-primary font-medium" : "text-charcoal/70 hover:text-charcoal"
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}
      </Accordion>

      {/* Subcategories Filter */}
      <Accordion title="Subcategories" defaultOpen={false}>
        {subCategoriesLoading ? (
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-4 bg-charcoal/10 rounded w-2/3"></div>)}
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => updateParam('subcategory', '')}
              className={clsx(
                "block text-sm transition-colors text-left",
                selectedSubcategory === '' ? "text-pink-primary font-medium" : "text-charcoal/70 hover:text-charcoal"
              )}
            >
              All Subcategories
            </button>
            {subCategories
              .filter(sub => {
                if (!selectedCategory) return true;
                const cat = categories.find(c => c.slug === selectedCategory);
                if (!cat) return true;
                const ids = (sub.categoryIds || []).map(String);
                return ids.includes(String(cat._id));
              })
              .map(subcategory => (
              <button
                key={subcategory._id}
                onClick={() => updateParam('subcategory', subcategory.slug)}
                className={clsx(
                  "block text-sm transition-colors text-left",
                  selectedSubcategory === subcategory.slug ? "text-pink-primary font-medium" : "text-charcoal/70 hover:text-charcoal"
                )}
              >
                {subcategory.name}
              </button>
            ))}
          </div>
        )}
      </Accordion>

      {/* Collections Filter */}
      <Accordion title="Collections" defaultOpen={false}>
        {collectionsLoading ? (
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-4 bg-charcoal/10 rounded w-2/3"></div>)}
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => updateParam('collection', '')}
              className={clsx(
                "block text-sm transition-colors text-left",
                selectedCollection === '' ? "text-pink-primary font-medium" : "text-charcoal/70 hover:text-charcoal"
              )}
            >
              All Collections
            </button>
            {collections.map(collection => (
              <button
                key={collection._id}
                onClick={() => updateParam('collection', collection.slug)}
                className={clsx(
                  "block text-sm transition-colors text-left",
                  selectedCollection === collection.slug ? "text-pink-primary font-medium" : "text-charcoal/70 hover:text-charcoal"
                )}
              >
                {collection.name}
              </button>
            ))}
          </div>
        )}
      </Accordion>

      {/* Rooms Filter */}
      <Accordion title="Rooms" defaultOpen={false}>
        {roomsLoading ? (
          <div className="animate-pulse space-y-2">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-4 bg-charcoal/10 rounded w-2/3"></div>)}
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => updateParam('room', '')}
              className={clsx(
                "block text-sm transition-colors text-left",
                selectedRoom === '' ? "text-pink-primary font-medium" : "text-charcoal/70 hover:text-charcoal"
              )}
            >
              All Rooms
            </button>
            {rooms.map(room => (
              <button
                key={room._id}
                onClick={() => updateParam('room', room.slug)}
                className={clsx(
                  "block text-sm transition-colors text-left",
                  selectedRoom === room.slug ? "text-pink-primary font-medium" : "text-charcoal/70 hover:text-charcoal"
                )}
              >
                {room.name}
              </button>
            ))}
          </div>
        )}
      </Accordion>

      {/* Colors Filter */}
      <Accordion title="Colors" defaultOpen={false}>
        {colorsLoading ? (
          <div className="flex gap-3 animate-pulse">
            {[1, 2, 3, 4].map(i => <div key={i} className="w-8 h-8 rounded-full bg-charcoal/10"></div>)}
          </div>
        ) : colors.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {colors.map(color => (
              <button
                key={color.id}
                onClick={() => updateParam('color', selectedColor === color.label ? '' : color.label)}
                className={clsx(
                  "w-8 h-8 rounded-full border-2 transition-all duration-300",
                  selectedColor === color.label ? "border-pink-primary scale-110" : "border-transparent hover:scale-110 shadow-sm"
                )}
                style={{ backgroundColor: color.hex }}
                title={color.label}
                aria-label={`Filter by ${color.label}`}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-charcoal/60">No colors available</p>
        )}
      </Accordion>
    </div>
  );

  const activeFiltersCount = [selectedCollection, selectedRoom, selectedCategory, selectedSubcategory, selectedColor, minPrice, maxPrice, inStock].filter(Boolean).length;

  return (
    <div className="bg-cream min-h-screen pt-32 md:pt-40 pb-16 md:pb-24">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        
        {/* Header Section */}
        <div className="mb-8 md:mb-12">
          <div className="flex items-center gap-2 text-xs md:text-sm text-charcoal/60 mb-4 font-sans">
            <Link to="/" className="hover:text-pink-primary transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
            <span className="text-charcoal">Shop All</span>
          </div>
          <h1 className="font-serif text-3xl md:text-5xl text-charcoal mb-3">
            {searchQuery ? `Search Results for "${searchQuery}"` : "Shop All Products"}
          </h1>
          {!searchQuery && (
            <p className="text-charcoal/60 font-sans max-w-2xl text-sm md:text-base">
              Discover our curated collection of premium products, designed to elevate your space with timeless elegance.
            </p>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          
          {/* Desktop Sidebar */}
          <div className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-32">
              <div className="flex items-center justify-between mb-4 border-b border-charcoal/20 pb-4">
                <h2 className="font-serif text-xl text-charcoal">Filters</h2>
                {activeFiltersCount > 0 && (
                  <button 
                    onClick={() => setSearchParams({})}
                    className="text-xs text-charcoal/60 hover:text-pink-primary font-sans transition-colors uppercase tracking-wider"
                  >
                    Clear All
                  </button>
                )}
              </div>
              {FilterSidebarContent()}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            
            {/* Sort & Mobile Filter Toggle Bar */}
            <div className="flex flex-col gap-4 py-4 border-y border-charcoal/10 mb-6">
              <div className="flex justify-between items-center">
                <button 
                  onClick={() => setIsFilterDrawerOpen(true)}
                  className="lg:hidden flex items-center gap-2 text-sm text-charcoal font-medium font-sans hover:text-pink-primary transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                </button>

                <span className="hidden lg:inline-block text-sm text-charcoal font-medium font-sans">
                  Showing {visibleProducts.length} of {products.length} products
                </span>

                <div className="flex items-center gap-3">
                  <label htmlFor="sort" className="text-sm text-charcoal/60 hidden sm:block font-sans">Sort by:</label>
                  <select 
                    id="sort" 
                    value={selectedSort}
                    onChange={(e) => updateParam('sort', e.target.value)}
                    className="bg-transparent border border-charcoal/20 rounded px-3 py-1.5 text-sm text-charcoal focus:outline-none focus:border-pink-primary cursor-pointer font-sans"
                  >
                    <option value="newest">Newest</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="bestseller_auto">Best Sellers</option>
                  </select>
                </div>
              </div>

              {/* Active Filters Chips */}
              {activeFiltersCount > 0 && (
                <div className="flex flex-wrap gap-2 font-sans text-sm items-center pt-2 border-t border-charcoal/5 lg:border-t-0 lg:pt-0">
                  <span className="text-charcoal/60 text-xs uppercase tracking-wider mr-2 hidden lg:inline-block">Active:</span>
                  {selectedCollection && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-charcoal/10 rounded-full text-charcoal">
                      Collection: {collections?.find(c => c.slug === selectedCollection)?.name || selectedCollection}
                      <button onClick={() => removeFilter('collection')} className="hover:text-pink-primary"><X className="w-3.5 h-3.5" /></button>
                    </span>
                  )}
                  {selectedRoom && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-charcoal/10 rounded-full text-charcoal">
                      Room: {rooms?.find(r => r.slug === selectedRoom)?.name || selectedRoom}
                      <button onClick={() => removeFilter('room')} className="hover:text-pink-primary"><X className="w-3.5 h-3.5" /></button>
                    </span>
                  )}
                  {selectedCategory && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-charcoal/10 rounded-full text-charcoal">
                      Category: {categories?.find(c => c.slug === selectedCategory)?.name || selectedCategory}
                      <button onClick={() => removeFilters(['category', 'subcategory'])} className="hover:text-pink-primary"><X className="w-3.5 h-3.5" /></button>
                    </span>
                  )}
                  {selectedSubcategory && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-charcoal/10 rounded-full text-charcoal">
                      Subcategory: {subCategories?.find(s => s.slug === selectedSubcategory)?.name || selectedSubcategory}
                      <button onClick={() => removeFilter('subcategory')} className="hover:text-pink-primary"><X className="w-3.5 h-3.5" /></button>
                    </span>
                  )}
                  {selectedColor && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-charcoal/10 rounded-full text-charcoal">
                      Color: {selectedColor}
                      <button onClick={() => removeFilter('color')} className="hover:text-pink-primary"><X className="w-3.5 h-3.5" /></button>
                    </span>
                  )}
                  {(minPrice || maxPrice) && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-charcoal/10 rounded-full text-charcoal">
                      Price: {minPrice ? `₹${minPrice}` : '0'} - {maxPrice ? `₹${maxPrice}` : 'Any'}
                      <button onClick={() => removeFilters(['minPrice', 'maxPrice'])} className="hover:text-pink-primary"><X className="w-3.5 h-3.5" /></button>
                    </span>
                  )}
                  {inStock && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-charcoal/10 rounded-full text-charcoal">
                      In Stock
                      <button onClick={() => removeFilter('inStock')} className="hover:text-pink-primary"><X className="w-3.5 h-3.5" /></button>
                    </span>
                  )}
                  {activeFiltersCount > 1 && (
                     <button onClick={() => setSearchParams({})} className="text-xs text-charcoal/60 hover:text-pink-primary underline ml-2">Clear all</button>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Filter Drawer Overlay */}
            {isFilterDrawerOpen && (
              <div 
                className="fixed inset-0 bg-charcoal/50 z-[60] lg:hidden transition-opacity" 
                onClick={() => setIsFilterDrawerOpen(false)}
              />
            )}

            {/* Mobile Filter Drawer */}
            <div 
              className={clsx(
                "fixed inset-y-0 left-0 w-[300px] bg-cream z-[70] shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col",
                isFilterDrawerOpen ? "translate-x-0" : "-translate-x-full"
              )}
            >
              <div className="p-6 border-b border-charcoal/10 flex justify-between items-center sticky top-0 bg-cream z-10 shrink-0">
                <h2 className="font-serif text-xl text-charcoal">Filters</h2>
                <div className="flex items-center gap-4">
                  {activeFiltersCount > 0 && (
                    <button onClick={() => setSearchParams({})} className="text-xs text-charcoal/60 hover:text-pink-primary font-sans uppercase">Clear All</button>
                  )}
                  <button onClick={() => setIsFilterDrawerOpen(false)} className="text-charcoal/60 hover:text-charcoal">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6 flex-1 overflow-y-auto">
                {FilterSidebarContent()}
              </div>
              <div className="p-6 border-t border-charcoal/10 sticky bottom-0 bg-cream shrink-0">
                <Button variant="primary" className="w-full" onClick={() => setIsFilterDrawerOpen(false)}>
                  Show {products.length} Products
                </Button>
              </div>
            </div>

            {/* Product Grid or Empty State */}
            {productsLoading ? (
              <div className="flex justify-center items-center py-32">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-primary"></div>
              </div>
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                  {visibleProducts.map((product, idx) => (
                    <RevealOnScroll key={product.id} delay={(idx % 12) * 0.05} className="h-full">
                      <ProductCard product={product} layout="vertical" />
                    </RevealOnScroll>
                  ))}
                </div>

                {hasMore && (
                  <div className="flex justify-center mt-12 md:mt-16">
                    <Button variant="outline" onClick={handleLoadMore} className="px-8 py-3">
                      Load More
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-charcoal/20 rounded-lg bg-white/30">
                <h2 className="font-serif text-2xl text-charcoal mb-3">No products found</h2>
                <p className="text-charcoal/60 mb-6 max-w-sm font-sans text-sm">
                  We couldn't find any products matching your selected filters. Try clearing some filters or searching for something else.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setSearchParams({})}
                >
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
