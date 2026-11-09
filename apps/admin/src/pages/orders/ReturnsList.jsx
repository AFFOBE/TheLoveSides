import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Search, Eye, Filter, Loader2, RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import SearchBar from '../../components/ui/SearchBar';

export default function ReturnsList() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReturns();
    }, 300);
    return () => clearTimeout(timer);
  }, [page, statusFilter, typeFilter, searchTerm]);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/returns', {
        params: {
          page,
          limit: 20,
          status: statusFilter || undefined,
          type: typeFilter || undefined,
          search: searchTerm || undefined,
        }
      });
      setReturns(data.data);
      setTotalPages(data.meta?.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch returns:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED':
      case 'RECEIVED':
      case 'QC_PASSED':
      case 'REFUNDED':
      case 'CLOSED':
        return 'bg-green-100 text-green-700';
      case 'REQUESTED':
      case 'PICKUP_SCHEDULED':
      case 'QC_PENDING':
      case 'REFUND_PENDING':
        return 'bg-blue-100 text-blue-700';
      case 'REJECTED':
      case 'QC_FAILED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-serif font-bold text-charcoal flex items-center gap-2">
          <RotateCcw className="w-6 h-6 text-brand" />
          Returns & Replacements
        </h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-charcoal/5">
        {/* Filters */}
        <div className="p-4 border-b border-charcoal/5 flex flex-wrap gap-4 items-center justify-between">
          <SearchBar
            value={searchTerm}
            onChange={(v) => { setSearchTerm(v); setPage(1); }}
            placeholder="Search by request ID, order number, or customer..."
          />
          <div className="flex items-center gap-4">
            <div className="relative">
              <Filter className="w-4 h-4 text-charcoal/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="pl-9 pr-8 py-2 bg-ivory/50 border border-charcoal/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand appearance-none"
              >
                <option value="">All Statuses</option>
                <option value="REQUESTED">Requested</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="PICKUP_SCHEDULED">Pickup Scheduled</option>
                <option value="RECEIVED">Received</option>
                <option value="QC_PENDING">QC Pending</option>
                <option value="QC_PASSED">QC Passed</option>
                <option value="QC_FAILED">QC Failed</option>
                <option value="REFUND_PENDING">Refund Pending</option>
                <option value="REFUNDED">Refunded</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div className="relative">
              <Filter className="w-4 h-4 text-charcoal/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                className="pl-9 pr-8 py-2 bg-ivory/50 border border-charcoal/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand appearance-none"
              >
                <option value="">All Types</option>
                <option value="RETURN">Return</option>
                <option value="REPLACEMENT">Replacement</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-ivory/50 text-charcoal/60 font-medium">
              <tr>
                <th className="px-6 py-4">Request ID</th>
                <th className="px-6 py-4">Order</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal/5">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-charcoal/60">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading requests...
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-charcoal/60">
                    No return or replacement requests found.
                  </td>
                </tr>
              ) : (
                returns.map((ret) => (
                  <tr key={ret._id} className="hover:bg-ivory/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono font-medium text-charcoal">
                        {ret._id.substring(ret._id.length - 8).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link to={`/orders/${ret.orderId?._id}`} className="font-mono text-brand hover:underline">
                        #{ret.orderId?.orderNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        ret.type === 'REPLACEMENT' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      )}>
                        {ret.type || 'RETURN'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-charcoal">{ret.userId?.firstName} {ret.userId?.lastName}</p>
                        <p className="text-xs text-charcoal/60">{ret.userId?.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ret.status)}`}>
                        {ret.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-charcoal/60">
                      {new Date(ret.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/orders/returns/${ret._id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand/5 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-charcoal/5 flex items-center justify-between">
            <p className="text-sm text-charcoal/60">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 border border-charcoal/10 rounded-lg text-sm font-medium hover:bg-ivory transition-colors disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 border border-charcoal/10 rounded-lg text-sm font-medium hover:bg-ivory transition-colors disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
