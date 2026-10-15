import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { 
  Package, Truck, MapPin, CreditCard, Clock, 
  CheckCircle, XCircle, ArrowLeft, User, Phone, 
  Calendar, RefreshCw, Box, ChevronDown, Activity, ShieldCheck, FileText, Ticket
} from 'lucide-react';

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [showTrackingModal, setShowTrackingModal] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const { data } = await api.get(`/admin/orders/${id}`);
      setOrder(data.data);
    } catch (error) {
      alert('Failed to load order');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    if (!window.confirm(`Update order status to ${newStatus}?`)) return;
    
    setUpdating(true);
    try {
      await api.patch(`/admin/orders/${id}/status`, { status: newStatus });
      fetchOrder(); // Reload to get updated timeline
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateShipment = async () => {
    if (!window.confirm('Create shipment for this order?')) return;
    setUpdating(true);
    try {
      await api.post(`/admin/orders/${id}/shipment`);
      fetchOrder();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create shipment');
    } finally {
      setUpdating(false);
    }
  };

  const handleSchedulePickup = async (shipmentId) => {
    if (!window.confirm('Schedule pickup for this shipment?')) return;
    setUpdating(true);
    try {
      await api.post('/admin/shipping/pickup', { shipmentId });
      fetchOrder();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to schedule pickup');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelShipment = async (shipmentId) => {
    if (!window.confirm('Cancel this shipment? This cannot be undone.')) return;
    setUpdating(true);
    try {
      await api.post('/admin/shipping/cancel', { shipmentId });
      fetchOrder();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel shipment');
    } finally {
      setUpdating(false);
    }
  };

  const handleTrackShipment = async (shipmentId) => {
    setUpdating(true);
    try {
      const { data } = await api.get(`/admin/shipping/track/shipment/${shipmentId}`);
      setTrackingData(data.data);
      setShowTrackingModal(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to fetch tracking data');
    } finally {
      setUpdating(false);
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      const response = await api.get(`/admin/orders/${order._id}/invoice`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice-${order.orderNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error('Error downloading invoice', error);
      alert('Failed to download invoice');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-pink-primary/30 border-t-pink-primary rounded-full animate-spin"></div>
        <p className="text-charcoal/60 font-medium animate-pulse">Loading order details...</p>
      </div>
    );
  }

  if (!order) return null;

  const getStatusColor = (status) => {
    const colors = {
      PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      PAYMENT_FAILED: 'bg-red-100 text-red-800 border-red-200',
      PAID: 'bg-blue-100 text-blue-800 border-blue-200',
      PROCESSING: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      READY_TO_SHIP: 'bg-purple-100 text-purple-800 border-purple-200',
      SHIPPED: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      OUT_FOR_DELIVERY: 'bg-teal-100 text-teal-800 border-teal-200',
      DELIVERED: 'bg-green-100 text-green-800 border-green-200',
      CANCELLED: 'bg-red-100 text-red-800 border-red-200',
      RETURN_REQUESTED: 'bg-amber-100 text-amber-800 border-amber-200',
      RETURNED: 'bg-orange-100 text-orange-800 border-orange-200',
      REFUNDED: 'bg-lime-100 text-lime-800 border-lime-200',
      RTO: 'bg-rose-100 text-rose-800 border-rose-200',
      // Shipment specific statuses
      CREATED: 'bg-blue-50 text-blue-700 border-blue-100',
      SHIPMENT_CREATED: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      AWB_ASSIGNED: 'bg-purple-50 text-purple-700 border-purple-100',
      PICKED_UP: 'bg-teal-50 text-teal-700 border-teal-100',
      IN_TRANSIT: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      UNDELIVERED: 'bg-orange-100 text-orange-800 border-orange-200',
      LOST: 'bg-red-100 text-red-800 border-red-200',
      DAMAGED: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status] || 'bg-ivory text-charcoal border-charcoal/10';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/orders" className="p-2 hover:bg-ivory rounded-full transition-colors group">
            <ArrowLeft className="w-5 h-5 text-charcoal/60 group-hover:text-charcoal" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-serif font-bold text-charcoal">
                Order #{order.orderNumber}
              </h1>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(order.status)}`}>
                {order.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-sm text-charcoal/60 mt-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-charcoal/5">
          <button
            onClick={handleDownloadInvoice}
            title="Download Invoice"
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold bg-white border border-charcoal/10 text-charcoal rounded-lg hover:bg-ivory transition-colors"
          >
            <FileText className="w-4 h-4" />
            Invoice
          </button>
          
          <div className="w-px h-6 bg-charcoal/10"></div>
          
          <span className="text-sm font-medium text-charcoal/60 px-2">Update Status:</span>
          <div className="relative">
            <select 
              value={order.status}
              onChange={handleStatusChange}
              disabled={updating}
              className="appearance-none pl-4 pr-10 py-2 bg-ivory/50 border border-charcoal/10 rounded-lg text-sm font-medium text-charcoal focus:outline-none focus:ring-2 focus:ring-pink-primary/50 hover:bg-ivory transition-colors disabled:opacity-50 cursor-pointer"
            >
              <option value="PENDING_PAYMENT">Pending Payment</option>
              <option value="PAYMENT_FAILED">Payment Failed</option>
              <option value="PAID">Paid</option>
              <option value="PROCESSING">Processing</option>
              <option value="READY_TO_SHIP">Ready to Ship</option>
              <option value="SHIPPED">Shipped</option>
              <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="RETURN_REQUESTED">Return Requested</option>
              <option value="RETURNED">Returned</option>
              <option value="REFUNDED">Refunded</option>
              <option value="RTO">RTO</option>
            </select>
            <ChevronDown className="w-4 h-4 text-charcoal/60 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Items & Timeline */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Order Items */}
          <div className="bg-white rounded-2xl shadow-sm border border-charcoal/5 overflow-hidden">
            <div className="px-6 py-5 border-b border-charcoal/5 flex items-center gap-3 bg-ivory/30">
              <div className="p-2 bg-pink-primary/10 text-pink-primary rounded-xl">
                <Package className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-serif font-bold text-charcoal">Order Items</h2>
              <span className="ml-auto bg-ivory text-charcoal/60 py-1 px-3 rounded-full text-xs font-semibold">
                {order.items.length} {order.items.length === 1 ? 'Item' : 'Items'}
              </span>
            </div>
            <div className="p-6 space-y-5">
              {order.items.map((item, idx) => (
                <div key={idx} className="group flex flex-col sm:flex-row gap-5 p-4 rounded-xl border border-transparent hover:border-charcoal/5 hover:bg-ivory/30 transition-colors">
                  <div className="w-24 h-24 sm:w-20 sm:h-20 shrink-0 rounded-lg overflow-hidden bg-ivory border border-charcoal/5">
                    <img src={item.image || 'https://via.placeholder.com/150'} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <h3 className="font-semibold text-charcoal text-base">{item.name}</h3>
                    <p className="text-xs text-charcoal/50 font-mono mt-1 bg-ivory inline-block px-2 py-0.5 rounded">SKU: {item.sku}</p>
                    {item.attributes && item.attributes.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {item.attributes.map(a => (
                          <span key={a.name} className="text-xs text-charcoal/60 bg-white border border-charcoal/5 px-2 py-1 rounded-md shadow-sm">
                            <span className="text-charcoal/40 mr-1">{a.name}:</span>{a.value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex flex-col justify-center sm:items-end mt-2 sm:mt-0">
                    <p className="text-lg font-bold text-charcoal">₹{item.price}</p>
                    <p className="text-sm font-medium text-charcoal/50 mt-1 flex items-center justify-end gap-1">
                      <span className="text-charcoal/40">Qty:</span> {item.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl shadow-sm border border-charcoal/5 overflow-hidden">
            <div className="px-6 py-5 border-b border-charcoal/5 flex items-center gap-3 bg-ivory/30">
              <div className="p-2 bg-charcoal/5 text-charcoal rounded-xl">
                <Activity className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-serif font-bold text-charcoal">Order Timeline</h2>
            </div>
            <div className="p-8">
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[1.4rem] before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-charcoal/10 before:via-charcoal/10 before:to-transparent">
                {order.timeline.map((event, idx) => {
                  const isLast = idx === order.timeline.length - 1;
                  return (
                    <div key={idx} className="relative flex items-start gap-6 group">
                      <div className={`w-[2.8rem] h-[2.8rem] rounded-full border-4 border-white flex items-center justify-center shrink-0 z-10 shadow-sm transition-transform group-hover:scale-110 ${isLast ? 'bg-pink-primary text-white animate-pulse' : 'bg-ivory text-charcoal/50'}`}>
                        {isLast ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      <div className={`flex-1 p-5 rounded-xl border transition-colors ${isLast ? 'bg-pink-primary/5 border-pink-primary/20' : 'bg-white border-charcoal/5 group-hover:border-charcoal/10'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className={`font-bold text-base ${isLast ? 'text-charcoal' : 'text-charcoal/80'}`}>
                            {event.status.replace(/_/g, ' ')}
                          </div>
                          <time className="text-xs font-medium text-charcoal/50 bg-white px-2 py-1 rounded-md border border-charcoal/5">
                            {new Date(event.timestamp).toLocaleString()}
                          </time>
                        </div>
                        <div className="text-sm text-charcoal/60">{event.message}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Customer & Financials */}
        <div className="space-y-8">
          
          {/* Customer Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-charcoal/5 overflow-hidden">
            <div className="px-6 py-5 border-b border-charcoal/5 flex items-center gap-3 bg-ivory/30">
              <div className="p-2 bg-charcoal/5 text-charcoal rounded-xl">
                <User className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-serif font-bold text-charcoal">Customer</h2>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4 p-3 rounded-xl bg-ivory/50 border border-charcoal/5">
                <div className="w-12 h-12 rounded-full bg-charcoal/10 flex items-center justify-center text-charcoal font-bold text-lg shrink-0">
                  {order.shippingAddress?.fullName?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-charcoal">{order.shippingAddress?.fullName}</p>
                  <p className="text-sm text-charcoal/60 flex items-center gap-1 mt-1">
                    <Phone className="w-3.5 h-3.5" />
                    {order.shippingAddress?.phone}
                  </p>
                </div>
              </div>
              
              <div className="relative pt-2">
                <div className="absolute top-4 left-3 w-px h-full bg-charcoal/10"></div>
                <div className="relative z-10 flex items-start gap-4 p-3">
                  <div className="mt-0.5 w-6 h-6 rounded-full bg-white border-2 border-charcoal/20 flex items-center justify-center shrink-0">
                    <MapPin className="w-3 h-3 text-charcoal/40" />
                  </div>
                  <div className="text-sm text-charcoal/70 space-y-1">
                    <p className="font-semibold text-charcoal mb-2">Shipping Address</p>
                    <p>{order.shippingAddress?.addressLine1}</p>
                    {order.shippingAddress?.addressLine2 && <p>{order.shippingAddress?.addressLine2}</p>}
                    <p>{order.shippingAddress?.city}, {order.shippingAddress?.state}</p>
                    <p className="font-medium text-charcoal">{order.shippingAddress?.pincode}</p>
                    <p>{order.shippingAddress?.country}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-charcoal/5 overflow-hidden">
            <div className="px-6 py-5 border-b border-charcoal/5 flex items-center gap-3 bg-ivory/30">
              <div className="p-2 bg-charcoal/5 text-charcoal rounded-xl">
                <CreditCard className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-serif font-bold text-charcoal">Payment Summary</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center text-charcoal/70">
                  <span className="flex items-center gap-2"><Box className="w-4 h-4" /> Subtotal</span>
                  <span className="font-medium">₹{order.subtotal}</span>
                </div>
                <div className="flex justify-between items-center text-charcoal/70">
                  <span className="flex items-center gap-2"><Truck className="w-4 h-4" /> Shipping</span>
                  <span className="font-medium">₹{order.shippingAmount}</span>
                </div>

                {order.discountAmount > 0 && (
                  <div className="flex justify-between items-center text-green-600">
                    <span className="flex items-center gap-2">
                      <Ticket className="w-4 h-4" /> Discount{order.couponCode ? ` (${order.couponCode})` : ''}
                    </span>
                    <span className="font-medium">-₹{order.discountAmount}</span>
                  </div>
                )}
                
                <div className="pt-4 mt-4 border-t border-dashed border-charcoal/10">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-bold text-charcoal">Total Amount</span>
                    <span className="text-2xl font-black text-charcoal">
                      ₹{order.grandTotal}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping & Tracking */}
          <div className="bg-white rounded-2xl shadow-sm border border-charcoal/5 overflow-hidden">
            <div className="px-6 py-5 border-b border-charcoal/5 flex items-center gap-3 bg-ivory/30">
              <div className="p-2 bg-charcoal/5 text-charcoal rounded-xl">
                <Truck className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-serif font-bold text-charcoal">Shipment Tracking</h2>
            </div>
            
            <div className="p-6">
              {order.shipments && order.shipments.length > 0 ? (
                <div className="space-y-6">
                  {order.shipments.map((shipment, idx) => (
                    <div key={shipment._id} className={`${idx !== order.shipments.length - 1 ? 'pb-6 border-b border-charcoal/5' : ''}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-xs text-charcoal/50 uppercase font-semibold tracking-wider mb-1">Shipment #{idx + 1}</p>
                          <span className="text-sm font-bold text-charcoal">
                            ID: {shipment.shiprocketShipmentId || 'Pending'}
                          </span>
                        </div>
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${getStatusColor(shipment.status)}`}>
                          {shipment.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-5 p-3 bg-ivory/50 rounded-xl border border-charcoal/5 text-sm">
                        <div>
                          <p className="text-charcoal/50 text-xs mb-0.5">Courier</p>
                          <p className="font-medium text-charcoal">{shipment.courierName || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-charcoal/50 text-xs mb-0.5">AWB</p>
                          <p className="font-medium text-charcoal">{shipment.awbCode || 'N/A'}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {shipment.awbCode && (
                          <button 
                            onClick={() => handleTrackShipment(shipment._id)}
                            disabled={updating}
                            className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-charcoal text-white rounded-lg hover:bg-charcoal/90 active:scale-95 transition-all shadow-sm disabled:opacity-70 disabled:active:scale-100"
                          >
                            <RefreshCw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
                            Track live
                          </button>
                        )}
                        
                        {['CREATED', 'SHIPMENT_CREATED', 'AWB_ASSIGNED'].includes(shipment.status) && !shipment.pickupScheduled && (
                          <button 
                            onClick={() => handleSchedulePickup(shipment._id)}
                            disabled={updating}
                            className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-white border border-charcoal/10 text-charcoal rounded-lg hover:border-charcoal/20 hover:bg-ivory active:scale-95 transition-all disabled:opacity-50"
                          >
                            Schedule Pickup
                          </button>
                        )}
                        
                        {!['CANCELLED', 'DELIVERED', 'RETURNED'].includes(shipment.status) && (
                          <button 
                            onClick={() => handleCancelShipment(shipment._id)}
                            disabled={updating}
                            className="flex-none px-4 py-2.5 text-sm font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 active:scale-95 transition-all disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto bg-ivory rounded-full flex items-center justify-center mb-4">
                    <Truck className="w-8 h-8 text-charcoal/40" />
                  </div>
                  <p className="text-sm text-charcoal/60 mb-6 font-medium">No shipments created for this order yet.</p>
                  
                  {['PAID', 'PROCESSING'].includes(order.status) && (
                    <button 
                      onClick={handleCreateShipment}
                      disabled={updating}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold bg-charcoal text-white rounded-lg hover:bg-charcoal/90 active:scale-95 transition-all shadow-sm disabled:opacity-70 disabled:active:scale-100"
                    >
                      <Package className="w-5 h-5" />
                      Create Shipment
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tracking Modal */}
      {showTrackingModal && trackingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm" onClick={() => setShowTrackingModal(false)}></div>
          <div className="relative bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 bg-ivory border-b border-charcoal/5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-charcoal/5 text-charcoal rounded-xl">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-serif font-bold text-charcoal">Tracking Info</h2>
              </div>
              <button 
                onClick={() => setShowTrackingModal(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-charcoal/60 hover:text-charcoal hover:bg-charcoal/5 transition-colors border border-charcoal/5"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="bg-ivory/50 rounded-xl p-4 border border-charcoal/5 mb-8">
                <div className="grid grid-cols-2 gap-y-4">
                  <div>
                    <p className="text-xs font-semibold text-charcoal/50 uppercase mb-1">Status</p>
                    <p className="font-bold text-charcoal">{trackingData.liveTracking?.current_status || trackingData.status}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-charcoal/50 uppercase mb-1">AWB</p>
                    <p className="font-bold text-charcoal">{trackingData.awbCode}</p>
                  </div>
                  <div className="col-span-2 pt-3 border-t border-charcoal/10">
                    <p className="text-xs font-semibold text-charcoal/50 uppercase mb-1">Courier</p>
                    <p className="font-medium text-charcoal flex items-center gap-2">
                      <Truck className="w-4 h-4 text-charcoal/40" />
                      {trackingData.courierName}
                    </p>
                  </div>
                </div>
              </div>
              
              <h3 className="font-bold text-charcoal mb-5 flex items-center gap-2 font-serif">
                <ShieldCheck className="w-5 h-5 text-charcoal/60" />
                Tracking History
              </h3>
              
              {trackingData.liveTracking?.scans?.length > 0 ? (
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px before:h-full before:w-0.5 before:bg-charcoal/10">
                  {trackingData.liveTracking.scans.map((scan, idx) => (
                    <div key={idx} className="relative flex items-start gap-5 group">
                      <div className={`w-6 h-6 rounded-full border-4 border-white flex items-center justify-center shrink-0 z-10 shadow-sm mt-0.5 ${idx === 0 ? 'bg-pink-primary' : 'bg-charcoal/10 group-hover:bg-charcoal/20'} transition-colors`} />
                      <div className="flex-1 bg-white p-4 rounded-xl border border-charcoal/5 shadow-sm group-hover:shadow-md group-hover:border-charcoal/10 transition-all">
                        <p className={`font-bold text-sm ${idx === 0 ? 'text-charcoal' : 'text-charcoal/80'}`}>{scan.activity}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs font-medium text-charcoal/50">
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-charcoal/40" /> {scan.location}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-charcoal/40" /> {new Date(scan.date).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-ivory/50 rounded-xl border border-dashed border-charcoal/10">
                  <Activity className="w-10 h-10 text-charcoal/20 mx-auto mb-3" />
                  <p className="text-sm font-medium text-charcoal/50">Detailed tracking scans are not available yet.</p>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-ivory border-t border-charcoal/5 text-center">
              <button 
                onClick={() => setShowTrackingModal(false)}
                className="w-full py-3 bg-charcoal text-white font-bold rounded-lg hover:bg-charcoal/90 active:scale-95 transition-all"
              >
                Close Tracking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
