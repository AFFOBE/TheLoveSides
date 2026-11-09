import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Upload, Plus, Trash2, Tag, Box, Info, Image as ImageIcon, Loader2, AlertCircle, GripVertical, Save, Bookmark, Film } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TagInput } from '../../components/TagInput';
import { SortableGridItem } from '../../components/SortableGridItem';
import { MultiSelect } from '../../components/MultiSelect';

const formatErrorMessages = (errorText) => {
  if (typeof errorText !== 'string') return ['An unexpected error occurred.'];
  const errors = errorText.split(';').map(e => e.trim()).filter(Boolean);
  const groupedErrors = {};
  const standardErrors = [];

  errors.forEach(err => {
    let [path, ...msgParts] = err.split(':');
    if (msgParts.length === 0) { standardErrors.push(err); return; }
    let message = msgParts.join(':').trim();
    if (message.includes('String must contain at least 1 character(s)')) message = 'is required';
    if (message.includes('Required')) message = 'is required';
    if (message.includes('Expected number, received nan')) message = 'must be a valid number';
    if (message.includes('Expected number')) message = 'must be a valid number';

    let fieldName = path.trim();
    const variantMatch = fieldName.match(/variants\.(\d+)\.([a-zA-Z0-9_]+)/);
    if (variantMatch) {
      const index = parseInt(variantMatch[1]) + 1;
      const rawField = variantMatch[2];
      const field = rawField.toUpperCase() === 'SKU' ? 'SKU' : rawField.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase());
      const groupKey = `${field} ${message}`;
      if (!groupedErrors[groupKey]) groupedErrors[groupKey] = [];
      groupedErrors[groupKey].push(`Variant ${index}`);
    } else {
      fieldName = fieldName.replace(/([A-Z])/g, ' $1').trim();
      fieldName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
      standardErrors.push(`${fieldName}: ${message}`);
    }
  });

  const formattedErrors = [...standardErrors];
  for (const [key, variants] of Object.entries(groupedErrors)) {
    if (variants.length > 3) formattedErrors.push(`${key} for ${variants.length} variants`);
    else formattedErrors.push(`${key} for ${variants.join(', ')}`);
  }
  return formattedErrors.length > 0 ? formattedErrors : [errorText];
};

const ColorAttributeInput = ({ values, onChange, usedColors = [] }) => {
  const [colorValue, setColorValue] = useState('#000000');
  const [colorName, setColorName] = useState('');
  const handleAdd = () => {
    if (!colorName.trim()) return;
    const formatted = `${colorName.trim()} (${colorValue})`;
    if (!values.includes(formatted)) { onChange([...values, formatted]); setColorName(''); }
  };
  const availableColors = usedColors.filter(c => !values.includes(c));

  return (
    <div className="flex flex-col gap-3 w-full">
      {availableColors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableColors.map(colorStr => {
            const hexMatch = colorStr.match(/\((#[0-9A-Fa-f]{6})\)/i);
            const hex = hexMatch ? hexMatch[1] : '#cccccc';
            return (
              <button key={colorStr} type="button" onClick={() => { if (!values.includes(colorStr)) onChange([...values, colorStr]); }} className="flex items-center gap-1.5 px-2 py-1 text-xs bg-white border border-gray-200 rounded-md hover:border-pink-primary transition-colors">
                <span className="w-3 h-3 rounded-full border border-gray-300 shadow-inner" style={{ backgroundColor: hex }} />
                <span className="font-medium text-gray-700">{colorStr.replace(/\s*\([^)]*\)/, '')}</span>
                <Plus className="w-3 h-3 text-gray-400" />
              </button>
            );
          })}
        </div>
      )}
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-2">
        <input type="color" value={colorValue} onChange={e => setColorValue(e.target.value)} className="w-8 h-8 p-0 border-0 rounded cursor-pointer shrink-0" />
        <input type="text" value={colorName} onChange={e => setColorName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())} placeholder="Color Name (e.g. Navy Blue)" className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-pink-primary" />
        <button type="button" onClick={handleAdd} disabled={!colorName.trim()} className="px-3 py-1.5 text-xs font-semibold bg-charcoal text-white hover:bg-black rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Add Color</button>
      </div>
      <TagInput tags={values || []} onChange={onChange} placeholder="Or type raw format (Name (#Hex))" />
    </div>
  );
};

const SortableAttributeItem = ({ attr, index, usedColors, handleUpdateAttribute, handleRemoveAttribute }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: attr.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : 1 };

  return (
    <div ref={setNodeRef} style={style} className={`flex flex-col sm:flex-row items-start gap-4 p-4 bg-gray-50/50 rounded-xl border ${isDragging ? 'border-pink-primary shadow-lg' : 'border-gray-200'} relative`}>
      <div className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-charcoal bg-white rounded shadow-sm border border-gray-200" {...attributes} {...listeners}>
        <GripVertical className="w-5 h-5" />
      </div>
      <div className="w-full sm:w-1/3 pl-8">
        <label className="block text-xs font-semibold text-charcoal mb-1.5">Option Name</label>
        <input type="text" required placeholder="e.g. Size, Material" value={attr.name} onChange={(e) => handleUpdateAttribute(index, 'name', e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-pink-primary focus:ring-1 focus:ring-pink-primary/20" />
      </div>
      <div className="w-full sm:w-2/3">
        <label className="block text-xs font-semibold text-charcoal mb-1.5">Values (Press Enter to add)</label>
        <div className="flex items-start gap-3">
          <div className="flex-1 flex">
            {attr.name.toLowerCase().includes('color') ? (
              <ColorAttributeInput values={attr.values || []} onChange={(newTags) => handleUpdateAttribute(index, 'values', newTags)} usedColors={usedColors} />
            ) : (
              <TagInput tags={attr.values || []} onChange={(newTags) => handleUpdateAttribute(index, 'values', newTags)} placeholder="e.g. Small, Medium" />
            )}
          </div>
          <div className="flex flex-col gap-1 mt-1 shrink-0">
            <button type="button" onClick={() => handleRemoveAttribute(index)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors w-full flex justify-center"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(isEditing);
  const [rooms, setRooms] = useState([]);
  const [collections, setCollections] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [usedColors, setUsedColors] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [formError, setFormError] = useState(null);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [attributeTemplates, setAttributeTemplates] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    status: 'draft',
    isFeatured: false,
    isBestSeller: false,
    isNewArrival: false, // NAYA FIELD ADD KIYA HAI
    roomIds: [],
    collectionIds: [],
    categoryIds: [],
    subCategoryIds: [],
    tags: [],
    images: [],
    videos: [],
    attributes: [{ id: 'attr-size-init', name: 'Size', values: ['1 Seater', '2 Seater', '3 Seater', '4 Seater', '2+2 Seater', '3+2 Seater', '2+1+1 Seater', '2+2+1 Seater', '3+1+1 Seater', '3+2+1+1 Seater'] }],
    highlights: [],
    specifications: '',
    specificationTable: [{ name: 'Color', value: 'Pastel Shades' }, { name: 'Material', value: 'Georgette Ruffle Cotton Base' }, { name: 'Opacity', value: 'Blackout' }, { name: 'Special Feature', value: 'Easy Hanging' }, { name: 'Room Type', value: 'Any' }, { name: 'Style', value: 'Simple' }, { name: 'Pattern', value: 'Solid' }, { name: 'Theme', value: 'Ruffle' }],
    sku: '',
    price: '',
    compareAtPrice: '',
    inventory: 0,
    variants: [],
  });

  useEffect(() => {
    const init = async () => {
      try {
        const [roomRes, colRes, catRes, subCatRes, colorsRes, templatesRes] = await Promise.all([
          api.get('/admin/catalog/rooms'), api.get('/admin/catalog/collections'), api.get('/admin/catalog/categories'),
          api.get('/admin/catalog/subcategories'), api.get('/admin/catalog/products/colors'), api.get('/admin/catalog/attribute-templates')
        ]);
        setRooms(roomRes.data.data || []); setCollections(colRes.data.data || []); setCategories(catRes.data.data || []); setSubCategories(subCatRes.data.data || []); setUsedColors(colorsRes.data.data || []); setAttributeTemplates(templatesRes.data.data || []);

        if (isEditing) {
          const res = await api.get(`/admin/catalog/products/${id}`);
          const product = res.data.data;
          if (product.attributes) product.attributes = product.attributes.map(a => ({ ...a, id: a.id || a._id || Math.random().toString(36).substr(2, 9), values: a.values || [] }));
          const baseVariant = product.variants?.[0] || {};
          setFormData({
            ...product,
            isFeatured: !!product.isFeatured, isBestSeller: !!product.isBestSeller,
            isNewArrival: !!product.isNewArrival, // EDIT KARTE WAQT DATA LOAD KARNE KE LIYE
            roomIds: (product.roomIds || []).map(r => typeof r === 'object' ? r._id : r),
            collectionIds: (product.collectionIds || []).map(c => typeof c === 'object' ? c._id : c),
            categoryIds: (product.categoryIds || []).map(c => typeof c === 'object' ? c._id : c),
            subCategoryIds: (product.subCategoryIds || []).map(c => typeof c === 'object' ? c._id : c),
            highlights: product.highlights || [], specifications: product.specifications || '', specificationTable: product.specificationTable || [],
            sku: baseVariant.sku || '', price: baseVariant.price || '', compareAtPrice: baseVariant.compareAtPrice || '', inventory: baseVariant.inventory?.available || 0, variants: product.variants || [],
          });
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    init();
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const updates = { ...prev, [name]: type === 'checkbox' ? checked : (type === 'number' && value !== '' ? Number(value) : value) };
      if (name === 'name' && !isEditing) {
        const expectedOldSlug = prev.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        if (!prev.slug || prev.slug === expectedOldSlug) updates.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      } else if (name === 'slug') updates.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return updates;
    });
  };

  const handleAddAttribute = () => setFormData(prev => ({ ...prev, attributes: [...(prev.attributes || []), { id: Math.random().toString(36).substr(2, 9), name: '', values: [] }] }));
  const handleUpdateAttribute = (index, field, value) => setFormData(prev => { const newAttributes = [...prev.attributes]; newAttributes[index][field] = value; return { ...prev, attributes: newAttributes }; });
  const handleRemoveAttribute = (index) => setFormData(prev => ({ ...prev, attributes: prev.attributes.filter((_, i) => i !== index) }));

  const handleSaveTemplate = async () => {
    const name = window.prompt("Enter a name for this template:"); if (!name) return;
    const validAttributes = formData.attributes.filter(a => a.name.trim() !== '' && a.values.length > 0);
    if (validAttributes.length === 0) { alert("No valid attributes to save."); return; }
    try {
      const payload = { name, attributes: validAttributes.map(a => ({ name: a.name, values: [...a.values] })) };
      const res = await api.post('/admin/catalog/attribute-templates', payload);
      setAttributeTemplates(prev => [res.data.data, ...prev]); setShowTemplateMenu(false);
    } catch (e) { console.error(e); alert("Failed to save template to the server."); }
  };

  const handleLoadTemplate = (template) => {
    if (!window.confirm(`Load template "${template.name}"? This will overwrite your current options.`)) return;
    setFormData(prev => ({ ...prev, attributes: template.attributes.map(a => ({ id: Math.random().toString(36).substr(2, 9), name: a.name, values: [...a.values] })) }));
    setShowTemplateMenu(false);
  };
  
  const handleDeleteTemplate = async (e, templateId) => {
    e.stopPropagation(); if (!window.confirm("Are you sure you want to delete this template?")) return;
    try { await api.delete(`/admin/catalog/attribute-templates/${templateId}`); setAttributeTemplates(prev => prev.filter(t => (t._id || t.id) !== templateId)); } catch (err) { console.error(err); alert("Failed to delete template."); }
  };

  const handleAttributeDragEnd = (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setFormData((prev) => {
        const oldIndex = prev.attributes.findIndex((a, i) => (a.id || `attr-${i}`) === active.id);
        const newIndex = prev.attributes.findIndex((a, i) => (a.id || `attr-${i}`) === over.id);
        if (oldIndex !== -1 && newIndex !== -1) return { ...prev, attributes: arrayMove(prev.attributes, oldIndex, newIndex) };
        return prev;
      });
    }
  };

  const handleAddHighlight = () => setFormData(prev => ({ ...prev, highlights: [...(prev.highlights || []), ''] }));
  const handleUpdateHighlight = (index, value) => setFormData(prev => { const newHighlights = [...(prev.highlights || [])]; newHighlights[index] = value; return { ...prev, highlights: newHighlights }; });
  const handleRemoveHighlight = (index) => setFormData(prev => ({ ...prev, highlights: (prev.highlights || []).filter((_, i) => i !== index) }));
  const handleAddSpecRow = () => setFormData(prev => ({ ...prev, specificationTable: [...(prev.specificationTable || []), { name: '', value: '' }] }));
  const handleUpdateSpecRow = (index, field, val) => setFormData(prev => { const newTable = [...(prev.specificationTable || [])]; newTable[index] = { ...newTable[index], [field]: val }; return { ...prev, specificationTable: newTable }; });
  const handleRemoveSpecRow = (index) => setFormData(prev => ({ ...prev, specificationTable: (prev.specificationTable || []).filter((_, i) => i !== index) }));

  useEffect(() => {
    if (!formData.attributes || formData.attributes.length === 0) {
      if (formData.variants && formData.variants.length > 0 && formData.variants[0].attributes?.length > 0) setFormData(prev => ({ ...prev, variants: [] }));
      return;
    }
    const validAttrs = formData.attributes.filter(a => a.name && a.values && a.values.length > 0);
    if (validAttrs.length === 0) return;
    const getCombinations = (attrs, current = []) => {
      if (attrs.length === 0) return [current];
      const first = attrs[0], rest = attrs.slice(1), combos = [];
      for (const val of first.values) combos.push(...getCombinations(rest, [...current, { name: first.name, value: val }]));
      return combos;
    };
    const combinations = getCombinations(validAttrs);
    setFormData(prev => {
      const existingVariants = prev.variants || [];
      const newVariants = combinations.map(combo => {
        const comboStr = combo.map(c => `${c.name}:${c.value}`).sort().join('|');
        const existing = existingVariants.find(v => { if (!v.attributes) return false; const vStr = v.attributes.map(a => `${a.name}:${a.value}`).sort().join('|'); return vStr === comboStr; });
        if (existing) return existing;
        const skuSuffix = combo.map(c => c.value.substring(0, 3).toUpperCase()).join('-');
        return { attributes: combo, price: prev.price !== '' ? Number(prev.price) : '', compareAtPrice: prev.compareAtPrice !== '' ? Number(prev.compareAtPrice) : '', sku: prev.slug ? `${prev.slug.toUpperCase()}-${skuSuffix}` : '', inventory: { available: 0, trackInventory: true, lowStockThreshold: 5 } };
      });
      return { ...prev, variants: newVariants };
    });
  }, [formData.attributes]);

  const handleVariantChange = (index, field, value) => {
    setFormData(prev => {
      const newVariants = [...prev.variants];
      if (field === 'inventory') newVariants[index].inventory = { ...newVariants[index].inventory, available: Number(value) };
      else newVariants[index][field] = field === 'price' || field === 'compareAtPrice' ? (value ? Number(value) : '') : value;
      return { ...prev, variants: newVariants };
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files); if (!files.length) return;
    setUploading(true);
    try {
      const uploadPromises = files.map(async (file) => { const fd = new FormData(); fd.append('file', file); const { data } = await api.post('/admin/upload/single', fd); return data.data.url; });
      const uploadedUrls = await Promise.all(uploadPromises);
      setFormData(prev => ({ ...prev, images: [...(prev.images || []), ...uploadedUrls] }));
    } catch (err) { console.error('Image upload error:', err); alert(`Upload failed: ${err.message}`); } finally { setUploading(false); }
  };

  const handleRemoveImage = (urlToRemove) => setFormData(prev => ({ ...prev, images: prev.images.filter(url => url !== urlToRemove) }));

  const handleVideoUpload = async (e) => {
    const files = Array.from(e.target.files); if (!files.length) return;
    const MAX_VIDEOS = 6, currentVideos = formData.videos || [], remaining = MAX_VIDEOS - currentVideos.length;
    if (remaining <= 0) { alert(`You can upload a maximum of ${MAX_VIDEOS} videos.`); e.target.value = ''; return; }
    if (files.length > remaining) alert(`Only ${MAX_VIDEOS} videos allowed. Adding ${remaining} more.`);
    const filesToUpload = files.slice(0, remaining);
    setUploadingVideo(true);
    try {
      const uploadPromises = filesToUpload.map(async (file) => { const fd = new FormData(); fd.append('file', file); const { data } = await api.post('/admin/upload/video', fd); return data.data.url; });
      const uploadedUrls = await Promise.all(uploadPromises);
      setFormData(prev => ({ ...prev, videos: [...(prev.videos || []), ...uploadedUrls].slice(0, MAX_VIDEOS) }));
    } catch (err) { console.error('Video upload error:', err); alert(`Video upload failed: ${err.message}`); } finally { setUploadingVideo(false); e.target.value = ''; }
  };

  const handleRemoveVideo = (urlToRemove) => setFormData(prev => ({ ...prev, videos: (prev.videos || []).filter(url => url !== urlToRemove) }));

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) setFormData((prev) => { const oldIndex = prev.images.indexOf(active.id); const newIndex = prev.images.indexOf(over.id); return { ...prev, images: arrayMove(prev.images, oldIndex, newIndex) }; });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (!isEditing && !payload.slug) payload.slug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      else if (payload.slug) payload.slug = payload.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      if (payload.roomIds) payload.roomIds = payload.roomIds.map(r => typeof r === 'object' ? r._id : r).filter(Boolean);
      if (payload.collectionIds) payload.collectionIds = payload.collectionIds.map(c => typeof c === 'object' ? c._id : c).filter(Boolean);
      if (payload.categoryIds) payload.categoryIds = payload.categoryIds.map(c => typeof c === 'object' ? c._id : c).filter(Boolean);
      if (payload.subCategoryIds) payload.subCategoryIds = payload.subCategoryIds.map(c => typeof c === 'object' ? c._id : c).filter(Boolean);
      if (payload.highlights) payload.highlights = payload.highlights.filter(h => h.trim() !== '');
      if (payload.attributes) payload.attributes = payload.attributes.filter(a => a.name.trim() !== '' && a.values.length > 0);
      if (payload.specificationTable) payload.specificationTable = payload.specificationTable.filter(row => row.name.trim() !== '' && row.value.trim() !== '');

      const existingBaseVariant = payload.variants?.find(v => !v.attributes || v.attributes.length === 0) || payload.variants?.[0] || {};
      const baseVariant = { ...(existingBaseVariant._id ? { _id: existingBaseVariant._id } : {}), sku: payload.sku || (payload.slug + '-01'), price: Number(payload.price) || 0, attributes: [] };
      if (payload.compareAtPrice) baseVariant.compareAtPrice = Number(payload.compareAtPrice);
      if (payload.inventory !== undefined && payload.inventory !== '') baseVariant.inventory = { available: Number(payload.inventory), trackInventory: true };

      const hasDynamicVariants = payload.variants && payload.variants.length > 0 && payload.variants[0].attributes?.length > 0;
      const finalVariants = hasDynamicVariants ? payload.variants : [baseVariant];
      payload.variants = finalVariants.map(v => ({ ...v, price: Number(v.price) || 0, compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : undefined }));

      delete payload.sku; delete payload.price; delete payload.compareAtPrice; delete payload.inventory;

      if (isEditing) {
        await api.patch(`/admin/catalog/products/${id}`, payload);
        await api.put(`/admin/catalog/products/${id}/variants`, { variants: payload.variants });
      } else {
        await api.post('/admin/catalog/products', payload);
      }
      navigate('/products');
    } catch (err) {
      console.error(err);
      const apiError = err.response?.data?.error;
      let rawErrorMessage = 'Failed to save product';
      if (typeof apiError === 'string') rawErrorMessage = apiError;
      else if (apiError && typeof apiError === 'object' && apiError.message) rawErrorMessage = typeof apiError.message === 'string' ? apiError.message : JSON.stringify(apiError.message);
      else if (err.response?.data?.message && typeof err.response.data.message === 'string') rawErrorMessage = err.response.data.message;
      else if (err.message) rawErrorMessage = err.message;
      setFormError(formatErrorMessages(rawErrorMessage));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) return <div className="animate-pulse p-8 text-center text-charcoal/50 font-medium">Loading product data...</div>;
    return (
    <form onSubmit={handleSubmit} className="relative pb-20">
      {formError && (
        <div className="mb-6 mx-auto max-w-6xl p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-red-800">
              {Array.isArray(formError) && formError.length > 0 ? 'Please fix the following errors:' : 'Error saving product'}
            </h3>
            {Array.isArray(formError) ? (
              <ul className="list-disc list-inside text-sm text-red-700 mt-1 space-y-0.5">
                {formError.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-red-700 mt-1">{formError}</p>
            )}
          </div>
        </div>
      )}
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 -mx-8 px-8 py-4 mb-8 bg-[#fdfdfc]/80 backdrop-blur-md border-b border-charcoal/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-charcoal">
            {isEditing ? 'Edit Product' : 'Add Product'}
          </h1>
          <p className="text-sm text-charcoal/60 mt-1">
            {isEditing ? `Editing ${formData.name}` : 'Create a new product for your catalog'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-charcoal hover:bg-gray-100 transition-colors"
          >
            Discard
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 bg-charcoal text-white rounded-lg text-sm font-medium hover:bg-black transition-colors shadow-sm"
          >
            {isEditing ? 'Save Changes' : 'Publish Product'}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Main Content */}
        <div className="lg:col-span-2 space-y-6 min-w-0">

          {/* Basic Info Card */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-charcoal/5">
            <div className="flex items-center gap-2 mb-6 text-charcoal">
              <Info className="w-5 h-5 text-pink-primary" />
              <h2 className="text-lg font-serif font-bold">Basic Information</h2>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-1.5">Product Name</label>
                <input
                  type="text" name="name" required
                  value={formData.name} onChange={handleChange}
                  placeholder="e.g. Classic Diamond Ring"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-primary/20 focus:border-pink-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-charcoal mb-1.5">Product URL Slug</label>
                <input
                  type="text" name="slug"
                  value={formData.slug} onChange={handleChange}
                  placeholder="e.g. classic-diamond-ring"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-primary/20 focus:border-pink-primary transition-all font-mono text-sm"
                />
                <p className="text-xs text-charcoal/50 mt-1.5">This will be auto-generated from the product name, but you can customize it.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-charcoal mb-1.5">Description (HTML supported)</label>
                <textarea
                  name="description" rows="5"
                  value={formData.description || ''} onChange={handleChange}
                  placeholder="Describe the product details, materials, and care instructions..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-primary/20 focus:border-pink-primary transition-all resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-charcoal mb-1.5">Specifications (HTML supported)</label>
                <textarea
                  name="specifications" rows="3"
                  value={formData.specifications || ''} onChange={handleChange}
                  placeholder="e.g. 100% premium fabric. Dry clean only."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-primary/20 focus:border-pink-primary transition-all resize-y"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-charcoal">"Why You'll Love It" Highlights</label>
                  <button type="button" onClick={handleAddHighlight} className="text-xs text-pink-primary font-semibold hover:underline">
                    + Add Highlight
                  </button>
                </div>
                <div className="space-y-3">
                  {(formData.highlights || []).map((highlight, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={highlight}
                        onChange={(e) => handleUpdateHighlight(index, e.target.value)}
                        placeholder="e.g. Hand-finished edges for a perfect drape."
                        className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-primary/20 focus:border-pink-primary transition-all"
                      />
                      <button type="button" onClick={() => handleRemoveHighlight(index)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  {(!formData.highlights || formData.highlights.length === 0) && (
                    <div className="text-sm text-gray-400 italic py-2">No highlights added. Storefront will use default fallback text.</div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-charcoal/10">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-charcoal">Specifications Table</label>
                  <button type="button" onClick={handleAddSpecRow} className="text-xs text-pink-primary font-semibold hover:underline">
                    + Add Row
                  </button>
                </div>
                <div className="space-y-3 mt-3">
                  {(formData.specificationTable || []).map((row, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => handleUpdateSpecRow(index, 'name', e.target.value)}
                        placeholder="e.g. Material"
                        className="w-1/3 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-primary/20 focus:border-pink-primary transition-all"
                      />
                      <input
                        type="text"
                        value={row.value}
                        onChange={(e) => handleUpdateSpecRow(index, 'value', e.target.value)}
                        placeholder="e.g. 100% Solid Wood"
                        className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-primary/20 focus:border-pink-primary transition-all"
                      />
                      <button type="button" onClick={() => handleRemoveSpecRow(index)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  {(!formData.specificationTable || formData.specificationTable.length === 0) && (
                    <div className="text-sm text-gray-400 italic py-2">No table specifications added.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Media Card */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-charcoal/5">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-charcoal">
                <ImageIcon className="w-5 h-5 text-pink-primary" />
                <h2 className="text-lg font-serif font-bold">Media</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-2.5 py-1 bg-gray-100 text-charcoal/60 rounded-full">
                  {formData.images?.length || 0} Images
                </span>
                <span className="text-xs font-medium px-2.5 py-1 bg-gray-100 text-charcoal/60 rounded-full">
                  {(formData.videos?.length || 0)}/6 Videos
                </span>
              </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={formData.images || []} strategy={horizontalListSortingStrategy}>
                <div className="flex items-start gap-3 sm:gap-4 overflow-x-auto pb-2">
                  <label className={`shrink-0 w-24 h-24 sm:w-32 sm:h-32 flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-colors ${uploading ? 'bg-gray-50 border-gray-200' : 'border-gray-300 hover:bg-pink-50/50 hover:border-pink-primary/50 text-charcoal/40 hover:text-pink-primary'}`}>
                    <div className="flex flex-col items-center justify-center p-2 text-center">
                      {uploading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-pink-primary mb-2" />
                      ) : (
                        <Upload className="w-6 h-6 mb-2" />
                      )}
                      <p className="text-[11px] font-medium leading-tight">{uploading ? 'Uploading...' : 'Add Images'}</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} disabled={uploading} />
                  </label>

                  {(formData.images || []).map((url, index) => (
                    <div key={url} className="shrink-0 w-24 h-24 sm:w-32 sm:h-32">
                      <SortableGridItem id={url} url={url} onRemove={handleRemoveImage} isMain={index === 0} />
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <p className="text-xs text-charcoal/50 mt-4">Drag and drop images to reorder. The first image will be used as the cover.</p>

            {/* Product Videos */}
            <div className="mt-8 pt-6 border-t border-charcoal/5">
              <div className="flex items-center gap-2 text-charcoal mb-4">
                <Film className="w-5 h-5 text-pink-primary" />
                <h3 className="text-base font-serif font-bold">Product Videos</h3>
              </div>

              <div className="flex items-start gap-3 sm:gap-4 overflow-x-auto pb-2">
                {(formData.videos || []).length < 6 ? (
                  <label className={`shrink-0 w-24 h-24 sm:w-32 sm:h-32 flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${uploadingVideo ? 'bg-gray-50 border-gray-200' : 'border-gray-300 hover:bg-pink-50/50 hover:border-pink-primary/50 text-charcoal/40 hover:text-pink-primary'}`}>
                    {uploadingVideo ? (
                      <Loader2 className="w-5 h-5 animate-spin text-pink-primary" />
                    ) : (
                      <Film className="w-5 h-5" />
                    )}
                    <span className="text-[11px] font-medium text-center px-2 leading-tight">
                      {uploadingVideo ? 'Uploading video...' : 'Add Video'}
                    </span>
                    <input type="file" className="hidden" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoUpload} disabled={uploadingVideo} />
                  </label>
                ) : (
                  <div className="shrink-0 w-24 h-24 sm:w-32 sm:h-32 flex flex-col items-center justify-center gap-1 rounded-xl border border-charcoal/10 bg-gray-50 text-charcoal/40 text-center px-2">
                    <span className="text-[11px] font-semibold">Limit reached</span>
                    <span className="text-[10px] leading-tight">Max 6 videos</span>
                  </div>
                )}

                {(formData.videos || []).map((url, index) => (
                  <div key={url} className="group relative shrink-0 w-40 sm:w-52 h-24 sm:h-32 rounded-xl overflow-hidden border border-charcoal/10 bg-black">
                    <video src={url} controls preload="metadata" className="w-full h-full object-cover bg-black" />
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={url} target="_blank" rel="noopener noreferrer" title="Open video" className="p-1.5 bg-black/60 text-white rounded-lg hover:bg-black/80 transition-colors">
                        <Film className="w-3.5 h-3.5" />
                      </a>
                      <button type="button" onClick={() => handleRemoveVideo(url)} title="Remove video" className="p-1.5 bg-black/60 text-white rounded-lg hover:bg-red-600 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="absolute bottom-2 left-2 text-[10px] font-semibold text-white bg-black/60 px-2 py-0.5 rounded">
                      Video {index + 1}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-charcoal/50 mt-3">
                MP4, WEBM or MOV · up to 50 MB · max 6 videos · the first video is shown as the product video on the storefront.
              </p>
            </div>
          </div>

          {/* Dynamic Attributes Card */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-charcoal/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 relative z-10">
              <div className="flex items-center gap-2 text-charcoal">
                <Box className="w-5 h-5 text-pink-primary" />
                <h2 className="text-lg font-serif font-bold">Variants & Attributes</h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm font-semibold transition-colors"
                  >
                    <Bookmark className="w-4 h-4" /> Templates
                  </button>
                  {showTemplateMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowTemplateMenu(false)}></div>
                      <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                        <div className="p-2 max-h-60 overflow-y-auto">
                          {attributeTemplates.length === 0 ? (
                            <p className="text-xs text-gray-500 p-2 text-center">No templates saved.</p>
                          ) : (
                            attributeTemplates.map(template => {
                              const tid = template._id || template.id;
                              return (
                                <div key={tid} className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 rounded-lg group cursor-pointer transition-colors" onClick={() => handleLoadTemplate(template)}>
                                  <div className="min-w-0 pr-2">
                                    <div className="text-sm font-semibold text-gray-700 truncate">{template.name}</div>
                                    <div className="text-xs text-gray-400 mt-0.5 truncate">{template.attributes.map(a => a.name).join(', ')}</div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteTemplate(e, tid)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                    title="Delete Template"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                        <div className="p-2 border-t border-gray-100 bg-gray-50">
                          <button
                            type="button"
                            onClick={handleSaveTemplate}
                            disabled={!formData.attributes || formData.attributes.length === 0}
                            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-white border border-gray-200 text-charcoal rounded-lg text-sm font-semibold hover:border-pink-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                          >
                            <Save className="w-4 h-4" /> Save Current as Template
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleAddAttribute}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 text-pink-700 hover:bg-pink-100 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Option
                </button>
              </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleAttributeDragEnd}>
              <SortableContext items={(formData.attributes || []).map((a, i) => a.id || `attr-${i}`)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {formData.attributes?.map((attr, index) => {
                    const stableAttr = { ...attr, id: attr.id || `attr-${index}` };
                    return (
                      <SortableAttributeItem
                        key={stableAttr.id}
                        attr={stableAttr}
                        index={index}
                        usedColors={usedColors}
                        handleUpdateAttribute={handleUpdateAttribute}
                        handleRemoveAttribute={handleRemoveAttribute}
                      />
                    );
                  })}
                  {(!formData.attributes || formData.attributes.length === 0) && (
                    <div className="text-center py-8 px-4 border-2 border-dashed border-gray-200 rounded-xl">
                      <p className="text-sm text-gray-500 font-medium">No variant options configured.</p>
                      <p className="text-xs text-gray-400 mt-1">Add options like Size or Color if this product has multiple variations.</p>
                    </div>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* Dedicated Variant Matrix Card */}
          {(formData.variants && formData.variants.length > 0 && formData.variants[0].attributes?.length > 0) && (
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-charcoal/5 mt-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-charcoal">
                  <Tag className="w-5 h-5 text-pink-primary" />
                  <h2 className="text-lg font-serif font-bold">Variant Stocks & Pricing</h2>
                </div>
                <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-500 rounded-full">{formData.variants.length} combinations</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <th className="p-3">Variant</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Price (₹)</th>
                      <th className="p-3">Compare (₹)</th>
                      <th className="p-3">Available Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.variants.map((variant, idx) => (
                      <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                        <td className="p-3">
                          <span className="text-sm font-medium text-charcoal">
                            {variant.attributes?.map(a => a.value).join(' / ')}
                          </span>
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={variant.sku || ''}
                            onChange={(e) => handleVariantChange(idx, 'sku', e.target.value)}
                            placeholder="SKU"
                            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:border-pink-primary focus:ring-1 focus:ring-pink-primary/20 uppercase"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number" min="0" step="0.01" required
                            value={variant.price === 0 ? 0 : (variant.price || '')}
                            onChange={(e) => handleVariantChange(idx, 'price', e.target.value)}
                            placeholder={formData.price || '0.00'}
                            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:border-pink-primary focus:ring-1 focus:ring-pink-primary/20"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number" min="0" step="0.01"
                            value={variant.compareAtPrice || ''}
                            onChange={(e) => handleVariantChange(idx, 'compareAtPrice', e.target.value)}
                            placeholder="0.00"
                            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:border-pink-primary focus:ring-1 focus:ring-pink-primary/20"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number" min="0"
                            value={variant.inventory?.available ?? ''}
                            onChange={(e) => handleVariantChange(idx, 'inventory', e.target.value)}
                            placeholder="0"
                            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:border-pink-primary focus:ring-1 focus:ring-pink-primary/20"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pricing & Inventory Card */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-charcoal/5 mt-6">
            <div className="flex items-center gap-2 mb-6 text-charcoal">
              <Tag className="w-5 h-5 text-pink-primary" />
              <h2 className="text-lg font-serif font-bold">Pricing & Inventory</h2>
            </div>

            {formData.attributes && formData.attributes.length > 0 && formData.attributes[0].name ? (
              <div className="p-4 bg-pink-primary/5 border border-pink-primary/20 rounded-xl">
                <p className="text-sm text-charcoal font-medium">
                  This product has multiple options. Pricing and inventory are managed for each variant individually in the dedicated section above.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-charcoal mb-1.5">Price (₹)</label>
                  <input
                    type="number" name="price" required min="0" step="0.01"
                    value={formData.price} onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-primary/20 focus:border-pink-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-charcoal mb-1.5 flex items-center gap-1">
                    Compare-at Price <span className="text-[10px] font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Optional</span>
                  </label>
                  <input
                    type="number" name="compareAtPrice" min="0" step="0.01"
                    value={formData.compareAtPrice} onChange={handleChange}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-primary/20 focus:border-pink-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-charcoal mb-1.5">Available Stock</label>
                  <input
                    type="number" name="inventory" min="0"
                    value={formData.inventory} onChange={handleChange}
                    placeholder="0"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-primary/20 focus:border-pink-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-charcoal mb-1.5 flex items-center gap-1">
                    SKU <span className="text-[10px] font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Optional</span>
                  </label>
                  <input
                    type="text" name="sku"
                    value={formData.sku} onChange={handleChange}
                    placeholder="e.g. RNG-01"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-primary/20 focus:border-pink-primary transition-all uppercase"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Metadata & Organization */}
        <div className="space-y-6 min-w-0">

          {/* Status Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-charcoal/5">
            <h2 className="text-base font-serif font-bold text-charcoal mb-4">Status</h2>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-primary/20 focus:border-pink-primary transition-all font-medium text-charcoal"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">
              Published products are immediately visible to customers.
            </p>

            <div className="mt-6 space-y-4 pt-4 border-t border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isFeatured}
                  onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                  className="rounded border-gray-300 text-pink-primary focus:ring-pink-primary"
                />
                <span className="text-sm font-medium text-charcoal">Featured Product</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isBestSeller}
                  onChange={(e) => setFormData({ ...formData, isBestSeller: e.target.checked })}
                  className="rounded border-gray-300 text-pink-primary focus:ring-pink-primary"
                />
                <span className="text-sm font-medium text-charcoal">Best Seller</span>
              </label>

              {/* NAYA CHECKBOX YAHAN ADD KIYA HAI */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isNewArrival}
                  onChange={(e) => setFormData({ ...formData, isNewArrival: e.target.checked })}
                  className="rounded border-gray-300 text-pink-primary focus:ring-pink-primary"
                />
                <span className="text-sm font-medium text-charcoal">New Arrivals</span>
              </label>

            </div>
          </div>

          {/* Organization Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-charcoal/5 space-y-5">
            <h2 className="text-base font-serif font-bold text-charcoal mb-2">Organization</h2>

            <div>
              <label className="block text-xs font-semibold text-charcoal mb-2 uppercase tracking-wider">Categories</label>
              <MultiSelect
                options={categories}
                selectedIds={formData.categoryIds || []}
                onChange={(ids) => setFormData(prev => ({ ...prev, categoryIds: ids }))}
                placeholder="Assign to categories..."
              />
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-charcoal mb-2 uppercase tracking-wider">Sub-Categories</label>
              <MultiSelect
                options={subCategories}
                selectedIds={formData.subCategoryIds || []}
                onChange={(ids) => setFormData(prev => ({ ...prev, subCategoryIds: ids }))}
                placeholder="Assign to sub-categories..."
              />
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-charcoal mb-2 uppercase tracking-wider">Rooms</label>
              <MultiSelect
                options={rooms}
                selectedIds={formData.roomIds || []}
                onChange={(ids) => setFormData(prev => ({ ...prev, roomIds: ids }))}
                placeholder="Assign to rooms..."
              />
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-charcoal mb-2 uppercase tracking-wider">Collections</label>
              <MultiSelect
                options={collections}
                selectedIds={formData.collectionIds || []}
                onChange={(ids) => setFormData(prev => ({ ...prev, collectionIds: ids }))}
                placeholder="Add to collections..."
              />
            </div>
          </div>

          {/* SEO / URL Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-charcoal/5 space-y-4">
            <h2 className="text-base font-serif font-bold text-charcoal mb-2">Search Engine</h2>
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1.5 uppercase tracking-wider flex items-center justify-between">
                URL Slug
                <span className="text-[10px] font-normal text-gray-400 normal-case bg-gray-100 px-1.5 py-0.5 rounded">Optional</span>
              </label>
              <input
                type="text" name="slug"
                value={formData.slug} onChange={handleChange}
                placeholder="Leave empty to auto-generate"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-primary/20 focus:border-pink-primary transition-all text-sm"
              />
              <p className="text-xs text-gray-400 mt-2">
                A unique identifier for the product URL.
              </p>
            </div>
          </div>

        </div>
      </div>
    </form>
  );
}