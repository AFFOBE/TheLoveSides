import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Search, Plus, Filter, MoreVertical, Edit, Trash2, Image as ImageIcon } from 'lucide-react';
import SearchBar from '../../components/ui/SearchBar';

export default function ProductsList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // NAYA STATE: Status filter ke liye
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter]); // Status change hone par bhi API call hogi

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/admin/catalog/products', {
        params: { 
          search: searchTerm || undefined,
          status: statusFilter || undefined // Backend ko status bhej rahe hain
        }
      });
      setProducts(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      console.error('Failed to fetch products', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/admin/catalog/products/${id}`);
      setProducts(products.filter(p => p._id !== id));
    } catch (error) {
      alert('Failed to delete product');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif font-bold text-charcoal">Products</h1>
        <Link 
          to="/products/new"
          className="flex items-center gap-2 bg-charcoal text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </Link>
      </div>

      {/* Search aur Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-charcoal/5 flex flex-col sm:flex-row gap-4 items-center">
        
        {/* Search Bar */}
        <div className="flex-1 w-full">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search products by name, slug, SKU, brand, or ID..."
          />
        </div>
        
        {/* NAYA STATUS DROPDOWN */}
        <div className="w-full sm:w-48 relative shrink-0">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/50 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-charcoal/10 rounded-xl text-sm font-medium text-charcoal focus:outline-none focus:ring-2 focus:ring-pink-primary/20 focus:border-pink-primary appearance-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          {/* Custom Arrow */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-charcoal/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-charcoal/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-ivory text-sm text-charcoal/60 border-b border-charcoal/10">
                <th className="p-4 font-medium">Image</th>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Rooms</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && products.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-charcoal/50 text-sm animate-pulse">
                    Loading products...
                  </td>
                </tr>
              ) : products.map((product) => (
                <tr key={product._id} className="border-b border-charcoal/5 hover:bg-ivory/50 transition-colors">
                  <td className="p-4">
                    {(product.images && product.images.length > 0) ? (
                      <img 
                        src={product.images[0]} 
                        alt={product.name} 
                        className="w-10 h-10 min-w-[2.5rem] object-cover rounded-lg border border-charcoal/10"
                      />
                    ) : (
                      <div className="w-10 h-10 min-w-[2.5rem] flex items-center justify-center bg-gray-100 rounded-lg border border-charcoal/10">
                        <ImageIcon className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-medium text-charcoal">{product.name}</p>
                    <p className="text-xs text-charcoal/50">{product.slug}</p>
                    {product.variants?.[0]?.sku && (
                      <p className="text-xs text-charcoal/40">SKU: {product.variants[0].sku}</p>
                    )}
                  </td>
                  <td className="p-4 text-sm text-charcoal/70">
                    {product.roomIds && product.roomIds.length > 0 
                      ? product.roomIds.map(r => r.name).join(', ') 
                      : 'None'}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      product.status === 'published' ? 'bg-green-100 text-green-800' : 
                      product.status === 'archived' ? 'bg-red-100 text-red-800' : 
                      'bg-gray-100 text-gray-800 capitalize'
                    }`}>
                      {product.status || 'Draft'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link 
                        to={`/products/${product._id}`}
                        className="p-2 text-charcoal/60 hover:text-pink-primary transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button 
                        onClick={() => handleDelete(product._id)}
                        className="p-2 text-charcoal/60 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-charcoal/50 text-sm">
                    No products found. Start by adding one!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}