import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Upload, Trash2, Link as LinkIcon, FileImage } from 'lucide-react';
import SearchBar from '../../components/ui/SearchBar';

export default function MediaList() {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMedia();
  }, []);

  const q = searchTerm.trim().toLowerCase();
  const filtered = q
    ? media.filter(m => (m.originalFilename || '').toLowerCase().includes(q) || (m.alt || '').toLowerCase().includes(q))
    : media;

  const fetchMedia = async () => {
    try {
      const { data } = await api.get('/admin/media');
      setMedia(data.data?.data || data.data || []);
    } catch (error) {
      console.error('Failed to fetch media', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const uploadRes = await api.post('/admin/upload/single', formData);
      const url = uploadRes.data?.data?.url || uploadRes.data?.url;

      await api.post('/admin/media', {
        filename: file.name,
        originalFilename: file.name,
        mimetype: file.type,
        size: file.size,
        url: url,
        alt: file.name
      });
      fetchMedia();
    } catch (error) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this media file?')) return;
    try {
      await api.delete(`/admin/media/${id}`);
      setMedia(media.filter(m => m._id !== id));
    } catch (error) {
      alert('Failed to delete media');
    }
  };

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url);
    alert('URL copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif font-bold text-charcoal">Media Library</h1>
        <div>
          <input 
            type="file" 
            id="file-upload" 
            className="hidden" 
            onChange={handleFileUpload}
            accept="image/*"
            disabled={uploading}
          />
          <label 
            htmlFor="file-upload"
            className="flex items-center gap-2 bg-charcoal text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black transition-colors cursor-pointer disabled:opacity-50"
          >
            {uploading ? <span className="animate-pulse">Uploading...</span> : <><Upload className="w-4 h-4" /> Upload File</>}
          </label>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-charcoal/5 flex gap-4">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search media by filename..." />
      </div>

      {loading ? (
        <div className="animate-pulse text-charcoal/50 p-8 text-center bg-white rounded-2xl">Loading media...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filtered.map((item) => (
            <div key={item._id} className="bg-white rounded-xl shadow-sm border border-charcoal/5 overflow-hidden group">
              <div className="aspect-square bg-ivory/50 flex items-center justify-center relative overflow-hidden">
                {item.mimetype?.startsWith('image/') ? (
                  <img src={item.url} alt={item.alt} className="w-full h-full object-cover" />
                ) : (
                  <FileImage className="w-8 h-8 text-charcoal/20" />
                )}
                <div className="absolute inset-0 bg-charcoal/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={() => copyToClipboard(item.url)} className="p-2 bg-white rounded-lg text-charcoal hover:text-brand transition-colors" title="Copy URL">
                    <LinkIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(item._id)} className="p-2 bg-white rounded-lg text-red-500 hover:text-red-700 transition-colors" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-2">
                <p className="text-xs font-medium text-charcoal truncate" title={item.originalFilename}>{item.originalFilename}</p>
                <p className="text-[10px] text-charcoal/50">{(item.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-charcoal/50 bg-white rounded-2xl border border-charcoal/5 border-dashed">
              No media found. Upload some images to get started.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
