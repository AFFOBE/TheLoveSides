import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Eye, Trash2, CheckCircle, Clock, Search, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import clsx from 'clsx';

export default function ContactLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);

  useEffect(() => {
    fetchLeads();
  }, [pagination.page, statusFilter]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/leads', {
        params: { page: pagination.page, limit: pagination.limit, status: statusFilter }
      });
      setLeads(data.data.leads);
      setPagination(data.data.pagination);
    } catch (error) {
      console.error('Failed to fetch contact leads', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.patch(`/admin/leads/${id}/status`, { status });
      if (selectedLead && selectedLead._id === id) {
        setSelectedLead({ ...selectedLead, status });
      }
      setLeads(leads.map(lead => lead._id === id ? { ...lead, status } : lead));
    } catch (error) {
      alert('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await api.delete(`/admin/leads/${id}`);
      if (selectedLead && selectedLead._id === id) setSelectedLead(null);
      setLeads(leads.filter(lead => lead._id !== id));
    } catch (error) {
      alert('Failed to delete lead');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">Contact Leads</h1>
          <p className="text-sm text-gray-500 mt-1">Manage inquiries and messages from customers.</p>
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent"
          >
            <option value="">All Statuses</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No leads found</h3>
            <p className="text-gray-500">You don't have any contact messages yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Name & Email</th>
                  <th className="px-6 py-4">Subject</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leads.map((lead) => (
                  <tr key={lead._id} className={clsx("hover:bg-gray-50/50 transition-colors cursor-pointer", lead.status === 'unread' && "bg-blue-50/30")}>
                    <td className="px-6 py-4 whitespace-nowrap" onClick={() => setSelectedLead(lead)}>
                      <span className={clsx(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                        lead.status === 'unread' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                      )}>
                        {lead.status === 'unread' ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4" onClick={() => setSelectedLead(lead)}>
                      <div className="font-medium text-gray-900">{lead.name}</div>
                      <div className="text-gray-500 text-xs mt-0.5">{lead.email}</div>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate" onClick={() => setSelectedLead(lead)}>
                      {lead.subject || <span className="text-gray-400 italic">No subject</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500" onClick={() => setSelectedLead(lead)}>
                      {new Date(lead.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedLead(lead)}
                          className="p-1.5 text-gray-400 hover:text-brand-accent hover:bg-brand-accent/10 rounded-md transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(lead._id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 mt-auto">
            <span className="text-sm text-gray-500">
              Showing page {pagination.page} of {pagination.pages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page === 1}
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                disabled={pagination.page === pagination.pages}
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lead Details Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-serif font-bold text-gray-900">Message Details</h2>
              <button onClick={() => setSelectedLead(null)} className="text-gray-400 hover:text-gray-600">
                <Search className="w-5 h-5 rotate-45" /> {/* Just using an X icon would be better but this works */}
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">From</label>
                  <p className="text-gray-900 font-medium">{selectedLead.name}</p>
                  <a href={`mailto:${selectedLead.email}`} className="text-brand-accent text-sm hover:underline">{selectedLead.email}</a>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Date Received</label>
                  <p className="text-gray-900">{new Date(selectedLead.createdAt).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Subject</label>
                <p className="text-gray-900 font-medium">{selectedLead.subject || 'No subject'}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Message</label>
                <div className="bg-gray-50 p-4 rounded-xl text-gray-700 whitespace-pre-wrap border border-gray-100">
                  {selectedLead.message}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center rounded-b-2xl">
              <div>
                {selectedLead.status === 'unread' ? (
                  <button
                    onClick={() => handleUpdateStatus(selectedLead._id, 'read')}
                    className="flex items-center gap-2 text-sm font-medium text-brand-accent hover:text-brand-accent/80 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" /> Mark as Read
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpdateStatus(selectedLead._id, 'unread')}
                    className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <Clock className="w-4 h-4" /> Mark as Unread
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDelete(selectedLead._id)}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
