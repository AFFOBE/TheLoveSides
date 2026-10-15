import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export function useProducts(query = {}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/catalog/products', { params: { limit: 100, ...query } });
        if (active) {
          // Transform backend data to match frontend's expected ProductCard schema
          const formatted = (data || []).map(p => ({
            id: p._id, // backend _id is a string
            slug: p.slug,
            name: p.name,
            price: p.variants?.[0]?.price || 0,
            image: p.images?.[0] || p.variants?.[0]?.images?.[0] || 'https://via.placeholder.com/400x500',
            images: p.images?.length > 0 ? p.images : (p.variants?.[0]?.images || []),
            rating: p.averageRating || 0,
            isNewArrival: !!p.isFeatured,
            isBestSeller: !!p.isBestSeller, 
            isFeatured: !!p.isFeatured, 
            category: p.category?.slug,
            description: p.description,
            highlights: p.highlights || [],
            specifications: p.specifications || '',
            specificationTable: p.specificationTable || [],
            attributes: p.attributes || [],
            variants: p.variants || [],
          }));
          if (query.sort === 'price_asc') {
            formatted.sort((a, b) => (a.price || 0) - (b.price || 0));
          } else if (query.sort === 'price_desc') {
            formatted.sort((a, b) => (b.price || 0) - (a.price || 0));
          }
          setProducts(formatted);
        }
      } catch (e) {
        if (active) setError(e);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchProducts();
    return () => { active = false; };
  }, [JSON.stringify(query)]);

  return { products, loading, error };
}

export function useProduct(identifier) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!identifier) return;

    let active = true;
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/catalog/products/${identifier}`);
        if (active) {
          const p = data;
          const formatted = {
            id: p._id,
            slug: p.slug,
            name: p.name,
            price: p.variants?.[0]?.price || 0,
            image: p.images?.[0] || p.variants?.[0]?.images?.[0] || 'https://via.placeholder.com/400x500',
            images: p.images?.length > 0 ? p.images : (p.variants?.[0]?.images?.length > 0 ? p.variants[0].images : ['https://via.placeholder.com/400x500', 'https://via.placeholder.com/400x500', 'https://via.placeholder.com/400x500', 'https://via.placeholder.com/400x500']),
            rating: p.averageRating || 0,
            isNewArrival: !!p.isFeatured,
            isBestSeller: !!p.isBestSeller, 
            isFeatured: !!p.isFeatured, 
            category: p.category?.slug,
            description: p.description,
            highlights: p.highlights || [],
            specifications: p.specifications || '',
            specificationTable: p.specificationTable || [],
            attributes: p.attributes || [],
            variants: p.variants || [],
          };
          setProduct(formatted);
        }
      } catch (e) {
        if (active) setError(e);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchProduct();
    return () => { active = false; };
  }, [identifier]);

  return { product, loading, error };
}
