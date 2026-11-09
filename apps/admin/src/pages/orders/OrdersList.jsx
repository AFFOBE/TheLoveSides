import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Eye, Phone, Mail, MessageCircle, Filter, Loader2, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import SearchBar from '../../components/ui/SearchBar';
import { exportToCsv } from '../../lib/exportCsv';

const ORDER_STATUS_OPTIONS = [
  { value: 'PENDING_PAYMENT', label: 'Pending Payment' },
  { value: 'PAYMENT_FAILED', label: 'Payment Failed' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'READY_TO_SHIP', label: 'Ready to Ship' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RETURN_REQUESTED', label: 'Return Requested' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'RTO', label: 'RTO' },
];

const STATUS_BADGE = {
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
  PAYMENT_FAILED: 'bg-red-100 text-red-800',
  PAID: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-indigo-100 text-indigo-800',
  READY_TO_SHIP: 'bg-purple-100 text-purple-800',
  SHIPPED: 'bg-cyan-100 text-cyan-800',
  OUT_FOR_DELIVERY: 'bg-teal-100 text-teal-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  RETURN_REQUESTED: 'bg-amber-100 text-amber-800',
  RETURNED: 'bg-orange-100 text-orange-800',
  REFUNDED: 'bg-lime-100 text-lime-800',
  RTO: 'bg-rose-100 text-rose-800',
};

const PAGE_SIZE = 20;

function whatsappLink(phone) {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

export default function OrdersList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(false);

  // Single source of truth for the status filter — the URL (?status=PENDING_PAYMENT)
  const statusFilter = searchParams.get('status') || '';

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      // No hard-coded status allow-list here — the admin must see every order,
      // including PENDING_PAYMENT ones, so they can contact the customer.
      const { data } = await api.get('/admin/orders', {
        params: {
          page,
          limit: PAGE_SIZE,
          status: statusFilter || undefined,
          search: searchTerm || undefined,
        },
      });
      setOrders(data.data || []);
      const pagination = data.meta?.pagination;
      setTotalPages(pagination?.totalPages || 1);
      setTotal(pagination?.total || 0);
    } catch (error) {
      console.error('Failed to fetch orders', error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchOrders]);

  const handleStatusChange = (value) => {
    setPage(1);
    const next = new URLSearchParams(searchParams);
    if (value) next.set('status', value);
    else next.delete('status');
    setSearchParams(next, { replace: true });
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      // Export every order matching the current status + search filters.
      const { data } = await api.get('/admin/orders', {
        params: {
          page: 1,
          limit: 10000,
          status: statusFilter || undefined,
          search: searchTerm || undefined,
        },
      });
      const rows = data.data || [];
      if (!rows.length) {
        alert('No orders to export.');
        return;
      }
      const date = new Date().toISOString().slice(0, 10);
      exportToCsv(
        `orders-${statusFilter ? `${statusFilter.toLowerCase()}-` : ''}${date}.csv`,
        [
          { label: 'Order #', value: 'orderNumber' },
          { label: 'Date', value: (o) => (o.createdAt ? new Date(o.createdAt).toLocaleString('en-IN') : '') },
          { label: 'Customer', value: (o) => o.shippingAddress?.fullName || `${o.userId?.firstName || ''} ${o.userId?.lastName || ''}`.trim() },
          { label: 'Phone', value: (o) => o.shippingAddress?.phone || o.userId?.phone || '' },
          { label: 'Email', value: (o) => o.userId?.email || '' },
          { label: 'Total', value: (o) => o.grandTotal ?? '' },
          { label: 'Status', value: 'status' },
        ],
        rows,
      );
    } catch (error) {
      console.error('Failed to export orders', error);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-2xl font-serif font-bold text-charcoal">Orders</h1>
        <p className="text-sm text-charcoal/60">
          {loading ? 'Loading...' : `${total} order${total === 1 ? '' : 's'}${statusFilter ? ' matching filter' : ''}`}
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-charcoal/5 flex flex-col lg:flex-row gap-4 items-center justify-between">
        <SearchBar
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder="Search by order #, customer name, email, phone, or date (YYYY-MM-DD)..."
        />
        <div className="flex items-center gap-3">
          <div className="relative">
            <Filter className="w-4 h-4 text-charcoal/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="pl-9 pr-8 py-2 bg-ivory/50 border border-charcoal/10 rounded-lg text-sm font-medium text-charcoal focus:outline-none focus:ring-2 focus:ring-brand appearance-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              {ORDER_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
            title="Export orders to CSV"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-charcoal/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-ivory text-sm text-charcoal/60 border-b border-charcoal/10">
                <th className="p-4 font-medium">Order #</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Contact</th>
                <th className="p-4 font-medium">Total</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan="7" className="p-10 text-center text-charcoal/50 text-sm">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading orders...
                  </td>
                </tr>
              )}
              {!loading && orders.map((order) => {
                const phone = order.shippingAddress?.phone;
                const email = order.userId?.email;
                const wa = whatsappLink(phone);
                return (
                  <tr
                    key={order._id}
                    className={`border-b border-charcoal/5 hover:bg-ivory/50 ${order.status === 'PENDING_PAYMENT' ? 'bg-yellow-50/40' : ''}`}
                  >
                    <td className="p-4 text-sm font-medium text-charcoal">
                      <Link to={`/orders/${order._id}`} className="hover:underline">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="p-4 text-sm text-charcoal/70 whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-sm text-charcoal/70">
                      <p className="font-medium text-charcoal">{order.shippingAddress?.fullName || 'Guest User'}</p>
                      <p className="text-xs text-charcoal/50">{order.shippingAddress?.city}, {order.shippingAddress?.state}</p>
                    </td>
                    <td className="p-4 text-sm text-charcoal/70">
                      {phone ? (
                        <a href={`tel:${phone}`} className="flex items-center gap-1.5 hover:text-brand transition-colors">
                          <Phone className="w-3.5 h-3.5 text-charcoal/40" />
                          {phone}
                        </a>
                      ) : (
                        <span className="text-xs text-charcoal/40">No phone</span>
                      )}
                      {email && (
                        <a href={`mailto:${email}`} className="flex items-center gap-1.5 text-xs text-charcoal/60 hover:text-brand transition-colors mt-1">
                          <Mail className="w-3.5 h-3.5 text-charcoal/40" />
                          {email}
                        </a>
                      )}
                    </td>
                    <td className="p-4 text-sm font-medium text-charcoal whitespace-nowrap">₹{order.grandTotal}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_BADGE[order.status] || 'bg-gray-100 text-gray-800'}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`WhatsApp ${order.shippingAddress?.fullName || 'customer'}`}
                            className="inline-flex p-2 text-charcoal/60 hover:text-green-600 transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
                        <Link
                          to={`/orders/${order._id}`}
                          title="View order"
                          className="inline-flex p-2 text-charcoal/60 hover:text-pink-primary transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && orders.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-charcoal/50 text-sm">
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 && (
          <div className="p-4 border-t border-charcoal/5 flex items-center justify-between">
            <p className="text-sm text-charcoal/60">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-charcoal/10 rounded-lg text-sm font-medium hover:bg-ivory transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-charcoal/10 rounded-lg text-sm font-medium hover:bg-ivory transition-colors disabled:opacity-50"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
