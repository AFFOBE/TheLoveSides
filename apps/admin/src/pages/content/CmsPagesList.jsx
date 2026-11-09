import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Plus, Edit, Trash2, Link as LinkIcon, Check } from 'lucide-react';
import SearchBar from '../../components/ui/SearchBar';

export default function CmsPagesList() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPages();
  }, []);

  const q = searchTerm.trim().toLowerCase();
  const filtered = q
    ? pages.filter(p => (p.title || '').toLowerCase().includes(q) || (p.slug || '').toLowerCase().includes(q))
    : pages;

  const fetchPages = async () => {
    try {
      const { data } = await api.get('/admin/cms');
      setPages(data.data || []);
    } catch (error) {
      console.error('Failed to fetch CMS pages', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this page?')) return;
    try {
      await api.delete(`/admin/cms/${id}`);
      setPages(pages.filter(p => p._id !== id));
    } catch (error) {
      alert('Failed to delete page');
    }
  };

  const copyFrontendLink = (slug) => {
    const baseUrl = import.meta.env.VITE_STOREFRONT_URL || 'http://localhost:5173';
    navigator.clipboard.writeText(`${baseUrl}/pages/${slug}`);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  if (loading) return <div className="animate-pulse">Loading pages...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif font-bold text-charcoal">CMS Pages</h1>
        <Link 
          to="/cms/new"
          className="flex items-center gap-2 bg-charcoal text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Page
        </Link>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-charcoal/5 flex gap-4">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search pages by title or slug..." />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-charcoal/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-ivory text-sm text-charcoal/60 border-b border-charcoal/10">
                <th className="p-4 font-medium">Title</th>
                <th className="p-4 font-medium">Slug</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Last Updated</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((page) => (
                <tr key={page._id} className="border-b border-charcoal/5 hover:bg-ivory/50">
                  <td className="p-4">
                    <p className="text-sm font-medium text-charcoal">{page.title}</p>
                  </td>
                  <td className="p-4 text-sm text-charcoal/70">
                    /{page.slug}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${page.isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {page.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-charcoal/70">
                    {new Date(page.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => copyFrontendLink(page.slug)}
                        title="Copy frontend link"
                        className="p-2 text-charcoal/60 hover:text-brand transition-colors"
                      >
                        {copiedSlug === page.slug ? <Check className="w-4 h-4 text-green-500" /> : <LinkIcon className="w-4 h-4" />}
                      </button>
                      <Link 
                        to={`/cms/${page._id}`}
                        title="Edit page"
                        className="p-2 text-charcoal/60 hover:text-pink-primary transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button 
                        onClick={() => handleDelete(page._id)}
                        className="p-2 text-charcoal/60 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-charcoal/50 text-sm">
                    No pages found. Start by creating one!
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
