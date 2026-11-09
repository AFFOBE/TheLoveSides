import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import ProductCard from '../components/ui/ProductCard';
import RevealOnScroll from '../components/ui/RevealOnScroll';
import Button from '../components/ui/Button';
import { useProducts } from '../hooks/useProducts';
import { api } from '../lib/api';

export default function CategoryPage({ type }) {
  const { categorySlug } = useParams();
  const [visibleCount, setVisibleCount] = useState(12);
  const [selectedSort, setSelectedSort] = useState('newest');
  const [category, setCategory] = useState(null);
  const [subCategories, setSubCategories] = useState([]);
  const [loadingCategory, setLoadingCategory] = useState(false);

  // Fetch Category Details and its SubCategories
  useEffect(() => {
    if (categorySlug) {
      let active = true;
      const fetchCategoryInfo = async () => {
        setLoadingCategory(true);
        try {
          const { data: catData } = await api.get(`/catalog/categories/${categorySlug}`);
          if (active && catData) {
            setCategory(catData);
            // Fetch SubCategories for this category
            const { data: subCatData } = await api.get(`/catalog/subcategories`, {
              params: { categoryId: catData._id }
            });
            if (active) {
              setSubCategories(subCatData || []);
            }
          }
        } catch (err) {
          console.error("Failed to load category", err);
        } finally {
          if (active) setLoadingCategory(false);
        }
      };
      fetchCategoryInfo();
      return () => { active = false; };
    } else {
      setCategory(null);
      setSubCategories([]);
    }
  }, [categorySlug]);

  // Determine query based on route
  const query = {};
  if (type === 'arrivals') query.newArrival = 'true';
  if (type === 'bestsellers') query.bestseller = 'true';
  if (selectedSort && selectedSort !== 'newest') query.sort = selectedSort;
  
  // If it's a category page, only fetch products once we have the category ID
  if (categorySlug && category) query.category = category._id;

  // Don't fetch products if we are on a category page but haven't loaded the category yet
  const shouldFetchProducts = !categorySlug || (categorySlug && category);
  
  // Custom hook that reacts to query changes
  // If shouldFetchProducts is false, we can skip fetching or just pass a dummy query that returns empty. 
  // For simplicity, we'll let it fetch, but if category is null, it won't have the filter.
  // Actually, useProducts might fetch all products if query is empty. We'll handle it.
  const { products, loading: loadingProducts } = useProducts(shouldFetchProducts ? query : { _skip: true });

  const loading = loadingCategory || loadingProducts;

  // Reset visible count when category changes or sort changes
  useEffect(() => {
    setVisibleCount(12);
  }, [categorySlug, type, selectedSort]);

  // Frontend filter for static types
  const filteredProducts = products.filter(product => {
    if (type === 'arrivals') return product.isNewArrival; // Only admin-marked new arrivals
    if (type === 'bestsellers') return product.isBestSeller;
    return true; 
  });

  // Generate readable title
  let pageTitle = 'Collection';
  if (type === 'arrivals') {
    pageTitle = 'New Arrivals';
  } else if (type === 'bestsellers') {
    pageTitle = 'Best Sellers';
  } else if (categorySlug && category) {
    pageTitle = category.name;
  } else if (categorySlug) {
    pageTitle = categorySlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleProducts.length < filteredProducts.length;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 12);
  };

  return (
    <div className="bg-cream min-h-screen pt-32 md:pt-40 pb-16 md:pb-24">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        
        {/* Header Section */}
        <div className="mb-10 md:mb-16 text-center">
          <div className="flex items-center justify-center gap-2 text-xs md:text-sm text-charcoal/60 mb-4 font-sans">
            <Link to="/" className="hover:text-pink-primary transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
            <span className="text-charcoal capitalize">{pageTitle}</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl text-charcoal mb-4">{pageTitle}</h1>
          {category && category.description && (
            <p className="max-w-2xl mx-auto text-charcoal/70 font-sans">{category.description}</p>
          )}
        </div>

        {/* SubCategories Grid */}
        {subCategories.length > 0 && (
          <div className="mb-20 md:mb-24">
            <div className="text-center mb-10 md:mb-12">
              <span className="text-pink-primary font-sans text-xs uppercase tracking-[0.2em] font-semibold mb-2 block">
                Explore Subcategories
              </span>
              <h2 className="font-serif text-3xl md:text-4xl text-charcoal">
                Shop by Subcategory
              </h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {subCategories.map((sub, idx) => (
                <RevealOnScroll key={sub._id} delay={idx * 0.1}>
                  <Link 
                    to={`/subcategory/${sub.slug}`}
                    className="group flex flex-col items-center text-center gap-3 md:gap-4"
                  >
                    <div className="relative overflow-hidden bg-ivory rounded-full aspect-square w-full sm:w-4/5 mx-auto shadow-sm group-hover:shadow-xl transition-shadow duration-500">
                      <img 
                        src={sub.image || 'https://via.placeholder.com/400'} 
                        alt={sub.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"
                      />
                    </div>
                    <div>
                      <h3 className="text-charcoal font-serif text-lg md:text-xl group-hover:text-pink-primary transition-colors duration-300">
                        {sub.name}
                      </h3>
                    </div>
                  </Link>
                </RevealOnScroll>
              ))}
            </div>
          </div>
        )}

        {/* Sort & Filter Bar */}
        <div className="flex justify-between items-center py-4 border-y border-charcoal/10 mb-8 md:mb-12">
          <span className="text-xs md:text-sm text-charcoal font-medium font-sans">
            Showing {visibleProducts.length} of {filteredProducts.length} products
          </span>
          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="text-xs md:text-sm text-charcoal/60 hidden sm:block font-sans">Sort by:</label>
            <select 
              id="sort" 
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="bg-transparent border border-charcoal/20 rounded px-2 py-1 text-xs md:text-sm text-charcoal focus:outline-none focus:border-pink-primary cursor-pointer font-sans"
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="bestseller_auto">Best Sellers</option>
            </select>
          </div>
        </div>

        {/* Product Grid or Empty State */}
        {loading ? (
          <div className="flex justify-center items-center py-32">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-primary"></div>
          </div>
        ) : filteredProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
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
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h2 className="font-serif text-2xl md:text-3xl text-charcoal mb-4">No products found</h2>
            <p className="text-charcoal/60 mb-8 max-w-md font-sans">
              We couldn't find any products in this collection right now. Check back later or explore our other categories.
            </p>
            <Link to="/">
              <Button variant="primary">Back to Home</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
