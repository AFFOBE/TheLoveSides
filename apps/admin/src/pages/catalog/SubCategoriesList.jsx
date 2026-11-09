import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableTableRow } from '../../components/SortableTableRow';
import SearchBar from '../../components/ui/SearchBar';

export default function SubCategoriesList() {
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSubCategories();
  }, []);

  const q = searchTerm.trim().toLowerCase();
  const filtered = q
    ? subCategories.filter(sc =>
        (sc.name || '').toLowerCase().includes(q) ||
        (sc.categoryIds || []).some(c => (c.name || '').toLowerCase().includes(q)))
    : subCategories;

  const fetchSubCategories = async () => {
    try {
      const { data } = await api.get('/admin/catalog/subcategories');
      setSubCategories(data.data || []);
    } catch (error) {
      console.error('Failed to fetch SubCategories', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this SubCategory?')) return;
    try {
      await api.delete(`/admin/catalog/subcategories/${id}`);
      setSubCategories(subCategories.filter(c => c._id !== id));
    } catch (error) {
      alert('Failed to delete SubCategory');
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      const oldIndex = subCategories.findIndex((item) => item._id === active.id);
      const newIndex = subCategories.findIndex((item) => item._id === over.id);
      
      const newSubCategories = arrayMove(subCategories, oldIndex, newIndex);
      
      const reordered = newSubCategories.map((sc, index) => ({
        ...sc,
        sortOrder: index,
      }));
      
      setSubCategories(reordered);
      
      try {
        await api.patch('/admin/catalog/subcategories/reorder', {
          items: reordered.map(r => ({ id: r._id, sortOrder: r.sortOrder }))
        });
      } catch (err) {
        console.error('Failed to save new order', err);
      }
    }
  };

  if (loading) return <div className="animate-pulse">Loading SubCategories...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif font-bold text-charcoal">Sub-Categories</h1>
        <Link 
          to="/subcategories/new"
          className="flex items-center gap-2 bg-charcoal text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Sub-Category
        </Link>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-charcoal/5 flex gap-4">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search sub-categories by name or parent..." />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-charcoal/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-ivory text-sm text-charcoal/60 border-b border-charcoal/10">
                <th className="p-4 font-medium w-10"></th>
                <th className="p-4 font-medium">Image</th>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Parents</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filtered.map(r => r._id)} strategy={verticalListSortingStrategy}>
                <tbody>
                  {filtered.map((subCategory) => (
                    <SortableTableRow key={subCategory._id} id={subCategory._id} className="border-b border-charcoal/5 hover:bg-ivory/50 bg-white">
                  <td className="p-4">
                    <img 
                      src={subCategory.image || 'https://via.placeholder.com/50'} 
                      alt={subCategory.name} 
                      className="w-12 h-12 object-cover rounded-lg border border-charcoal/10"
                    />
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-medium text-charcoal">{subCategory.name}</p>
                    {subCategory.showInNavigation && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded ml-2">Navigation</span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-charcoal/70">
                    <div className="flex flex-wrap gap-1">
                      {subCategory.categoryIds && subCategory.categoryIds.length > 0 ? (
                        subCategory.categoryIds.map(c => (
                          <span key={c._id} className="bg-charcoal/10 px-2 py-1 rounded text-xs">{c.name}</span>
                        ))
                      ) : (
                        <span className="text-charcoal/40 text-xs">No parents</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${subCategory.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {subCategory.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link 
                        to={`/subcategories/${subCategory._id}`}
                        className="p-2 text-charcoal/60 hover:text-pink-primary transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button 
                        onClick={() => handleDelete(subCategory._id)}
                        className="p-2 text-charcoal/60 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </SortableTableRow>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-charcoal/50 text-sm">
                    No Sub-Categories found. Start by adding one!
                  </td>
                </tr>
              )}
            </tbody>
          </SortableContext>
        </DndContext>
      </table>
        </div>
      </div>
    </div>
  );
}
