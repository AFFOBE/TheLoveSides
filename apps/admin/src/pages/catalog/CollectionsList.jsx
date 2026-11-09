import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableTableRow } from '../../components/SortableTableRow';
import SearchBar from '../../components/ui/SearchBar';

export default function CollectionsList() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCollections();
  }, []);

  const q = searchTerm.trim().toLowerCase();
  const filtered = q
    ? collections.filter(c => (c.name || '').toLowerCase().includes(q) || (c.slug || '').toLowerCase().includes(q))
    : collections;

  const fetchCollections = async () => {
    try {
      const { data } = await api.get('/admin/catalog/collections');
      setCollections(data.data || []);
    } catch (error) {
      console.error('Failed to fetch collections', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this collection?')) return;
    try {
      await api.delete(`/admin/catalog/collections/${id}`);
      setCollections(collections.filter(c => c._id !== id));
    } catch (error) {
      alert('Failed to delete collection');
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
      const oldIndex = collections.findIndex((item) => item._id === active.id);
      const newIndex = collections.findIndex((item) => item._id === over.id);
      
      const newCollections = arrayMove(collections, oldIndex, newIndex);
      
      const reorderedCollections = newCollections.map((collection, index) => ({
        ...collection,
        sortOrder: index,
      }));
      
      setCollections(reorderedCollections);
      
      try {
        await api.patch('/admin/catalog/collections/reorder', {
          items: reorderedCollections.map(r => ({ id: r._id, sortOrder: r.sortOrder }))
        });
      } catch (err) {
        console.error('Failed to save new order', err);
      }
    }
  };

  if (loading) return <div className="animate-pulse">Loading collections...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif font-bold text-charcoal">Collections</h1>
        <Link 
          to="/collections/new"
          className="flex items-center gap-2 bg-charcoal text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Collection
        </Link>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-charcoal/5 flex gap-4">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search collections by name or slug..." />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-charcoal/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-ivory text-sm text-charcoal/60 border-b border-charcoal/10">
                <th className="p-4 font-medium w-10"></th>
                <th className="p-4 font-medium">Image</th>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Slug</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filtered.map(c => c._id)} strategy={verticalListSortingStrategy}>
                <tbody>
                  {filtered.map((collection) => (
                    <SortableTableRow key={collection._id} id={collection._id} className="border-b border-charcoal/5 hover:bg-ivory/50 bg-white">
                  <td className="p-4">
                    <img 
                      src={collection.image || 'https://via.placeholder.com/50'} 
                      alt={collection.name} 
                      className="w-12 h-12 object-cover rounded-lg border border-charcoal/10"
                    />
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-medium text-charcoal">{collection.name}</p>
                    {collection.isFeatured && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded ml-2">Featured</span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-charcoal/70">
                    {collection.slug}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${collection.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {collection.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link 
                        to={`/collections/${collection._id}`}
                        className="p-2 text-charcoal/60 hover:text-pink-primary transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button 
                        onClick={() => handleDelete(collection._id)}
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
                  <td colSpan="5" className="p-8 text-center text-charcoal/50 text-sm">
                    No collections found. Start by adding one!
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
