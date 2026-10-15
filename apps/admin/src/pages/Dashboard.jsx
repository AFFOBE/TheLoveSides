import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { ShoppingBag, DollarSign, Package, AlertTriangle, ArrowUpRight, TrendingUp, Users, Activity, Loader2, MessageSquare, Star, Ticket } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    activeProducts: 0,
    lowStock: 0,
    recentOrders: [],
    revenueByDay: [],
    customers: 0,
    leads: 0,
    reviews: 0,
    coupons: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, ordersRes, productsRes, custRes, leadsRes, reviewsRes, couponsRes] = await Promise.allSettled([
          api.get('/admin/dashboard/stats?period=7d'),
          api.get('/admin/orders?limit=6'),
          api.get('/admin/catalog/products?limit=1000'), // Get more products to check stock
          api.get('/admin/customers?limit=1'),
          api.get('/admin/leads?limit=1'),
          api.get('/admin/reviews?limit=1'),
          api.get('/admin/coupons?limit=1')
        ]);

        const dashboardData = statsRes.status === 'fulfilled' ? (statsRes.value.data.data || {}) : {};
        const orders = ordersRes.status === 'fulfilled' ? (ordersRes.value.data.data || []) : [];
        const products = productsRes.status === 'fulfilled' ? (productsRes.value.data.data || []) : [];

        // Active = published products
        const activeProducts = products.filter(p => p.status === 'published').length;

        // Low stock = products having at least one tracked variant at/under threshold
        const lowStockCount = products.filter(p =>
          (p.variants || []).some(v => v.inventory?.trackInventory && v.inventory.available <= v.inventory.lowStockThreshold)
        ).length;

        setStats({
          totalSales: dashboardData.revenue || 0,
          totalOrders: dashboardData.totalOrders || 0,
          activeProducts: activeProducts,
          lowStock: lowStockCount,
          recentOrders: orders,
          revenueByDay: dashboardData.revenueByDay || [],
          customers: custRes.status === 'fulfilled' ? (custRes.value.data.meta?.pagination?.total ?? 0) : 0,
          leads: leadsRes.status === 'fulfilled' ? (leadsRes.value.data.data?.pagination?.total ?? 0) : 0,
          reviews: reviewsRes.status === 'fulfilled' ? (reviewsRes.value.data.meta?.pagination?.total ?? 0) : 0,
          coupons: couponsRes.status === 'fulfilled' ? (couponsRes.value.data.meta?.pagination?.total ?? 0) : 0
        });
      } catch (error) {
        console.error('Failed to fetch dashboard stats', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { 
      name: 'Total Revenue', 
      value: `₹${stats.totalSales.toLocaleString()}`, 
      icon: DollarSign, 
      trend: '7 days', 
      trendUp: true,
      color: 'text-indigo-600', 
      bg: 'bg-indigo-50/80', 
      border: 'border-indigo-100',
      glow: 'shadow-indigo-500/10'
    },
    { 
      name: 'Total Orders', 
      value: stats.totalOrders, 
      icon: ShoppingBag, 
      trend: '7 days',
      trendUp: true,
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50/80', 
      border: 'border-emerald-100',
      glow: 'shadow-emerald-500/10'
    },
    { 
      name: 'Active Products', 
      value: stats.activeProducts, 
      icon: Package, 
      trend: 'Steady',
      trendUp: true,
      color: 'text-blue-600', 
      bg: 'bg-blue-50/80', 
      border: 'border-blue-100',
      glow: 'shadow-blue-500/10'
    },
    { 
      name: 'Low Stock Alerts', 
      value: stats.lowStock, 
      icon: AlertTriangle, 
      trend: 'Action needed',
      trendUp: false,
      color: 'text-rose-600', 
      bg: 'bg-rose-50/80', 
      border: 'border-rose-100',
      glow: 'shadow-rose-500/10'
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium animate-pulse">Loading dashboard insights...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back, here is what's happening with your store today.</p>
        </div>
        <div className="flex items-center gap-3">
            <Link to="/orders" className="inline-flex items-center justify-center rounded-xl border border-gray-200/80 bg-white/50 backdrop-blur-md px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:shadow focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all">
               Manage Orders
            </Link>
            <Link to="/catalog/products/new" className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all">
              <Package className="w-4 h-4 mr-2" />
              Add Product
            </Link>
        </div>
      </div>

      {/* Stat Cards - Premium Glassmorphism Look */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.name} className={`relative overflow-hidden bg-white/70 backdrop-blur-xl p-6 rounded-3xl shadow-lg ${stat.glow} border border-white/60 group hover:-translate-y-1 transition-all duration-300`}>
            <div className="flex items-center justify-between mb-5">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.border} border shadow-inner`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full shadow-sm ${stat.trendUp ? 'bg-green-50/90 text-green-700 border border-green-100' : 'bg-red-50/90 text-red-700 border border-red-100'}`}>
                {stat.trendUp ? <TrendingUp className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
                {stat.trend}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">{stat.name}</p>
              <h3 className="text-3xl font-bold text-gray-900 tracking-tight">{stat.value}</h3>
            </div>
            
            {/* Decorative background element */}
            <div className={`absolute -right-8 -bottom-8 w-32 h-32 ${stat.bg} rounded-full opacity-60 group-hover:scale-[1.8] transition-transform duration-700 ease-out blur-3xl -z-10`}></div>
          </div>
        ))}
      </div>

      {/* Charts & Secondary Stats Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue Area Chart */}
        <div className="lg:col-span-2 bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg shadow-gray-200/40 border border-white/60 overflow-hidden flex flex-col transition-all hover:shadow-xl">
          <div className="px-7 py-6 flex items-center justify-between relative z-10">
            <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Revenue Overview</h2>
                <p className="text-sm text-gray-500 mt-0.5">Sales performance over the last 7 days</p>
            </div>
          </div>
          <div className="px-6 pb-6 pt-2 flex-1 min-h-[320px] relative z-10">
            {stats.revenueByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.revenueByDay} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6b7280', fontSize: 13, fontWeight: 500 }}
                    dy={12}
                    tickFormatter={(dateStr) => {
                      const d = new Date(dateStr);
                      return isNaN(d) ? dateStr : d.toLocaleDateString(undefined, { weekday: 'short' });
                    }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6b7280', fontSize: 13, fontWeight: 500 }}
                    dx={-10}
                    tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`}
                  />
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e5e7eb" />
                  <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: '#111827', fontWeight: 700 }}
                      formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
                      labelFormatter={(label) => {
                        const d = new Date(label);
                        return isNaN(d) ? label : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                      }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#4f46e5" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                    activeDot={{ r: 7, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 3, className: 'shadow-lg' }}
                    animationDuration={1500}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                 <Activity className="w-12 h-12 mb-3 text-gray-300" />
                 <p className="font-medium text-gray-500">No revenue data for the past 7 days</p>
                 <p className="text-sm mt-1">Orders will appear here once they are placed.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions / Summary */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg shadow-gray-200/40 border border-white/60 flex flex-col transition-all hover:shadow-xl">
            <div className="px-7 py-6 border-b border-gray-100/50">
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Action Center</h2>
            </div>
            <div className="p-7 flex flex-col gap-5">
                
                <div className="group bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border border-blue-100/60 rounded-2xl p-5 flex gap-4 transition-all hover:shadow-md hover:border-blue-200/80">
                    <div className="bg-white shadow-sm text-blue-600 p-3 rounded-xl h-fit border border-blue-50 group-hover:scale-110 transition-transform">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 text-base">Customers</h4>
                        <p className="text-sm text-gray-600 mt-1">{stats.customers} registered customers.</p>
                        <Link to="/customers" className="text-sm font-semibold text-blue-600 hover:text-blue-700 mt-2.5 inline-flex items-center group-hover:translate-x-1 transition-transform">
                            View customers <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                        </Link>
                    </div>
                </div>

                <div className="group bg-gradient-to-br from-emerald-50/50 to-teal-50/50 border border-emerald-100/60 rounded-2xl p-5 flex gap-4 transition-all hover:shadow-md hover:border-emerald-200/80">
                    <div className="bg-white shadow-sm text-emerald-600 p-3 rounded-xl h-fit border border-emerald-50 group-hover:scale-110 transition-transform">
                        <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 text-base">Contact Leads</h4>
                        <p className="text-sm text-gray-600 mt-1">{stats.leads} total inquiries received.</p>
                        <Link to="/contact-leads" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 mt-2.5 inline-flex items-center group-hover:translate-x-1 transition-transform">
                            View leads <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                        </Link>
                    </div>
                </div>

                <div className="group bg-gradient-to-br from-amber-50/50 to-yellow-50/50 border border-amber-100/60 rounded-2xl p-5 flex gap-4 transition-all hover:shadow-md hover:border-amber-200/80">
                    <div className="bg-white shadow-sm text-amber-600 p-3 rounded-xl h-fit border border-amber-50 group-hover:scale-110 transition-transform">
                        <Star className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 text-base">Reviews</h4>
                        <p className="text-sm text-gray-600 mt-1">{stats.reviews} product reviews.</p>
                        <Link to="/reviews" className="text-sm font-semibold text-amber-600 hover:text-amber-700 mt-2.5 inline-flex items-center group-hover:translate-x-1 transition-transform">
                            View reviews <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                        </Link>
                    </div>
                </div>

                <div className="group bg-gradient-to-br from-violet-50/50 to-purple-50/50 border border-violet-100/60 rounded-2xl p-5 flex gap-4 transition-all hover:shadow-md hover:border-violet-200/80">
                    <div className="bg-white shadow-sm text-violet-600 p-3 rounded-xl h-fit border border-violet-50 group-hover:scale-110 transition-transform">
                        <Ticket className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 text-base">Coupons</h4>
                        <p className="text-sm text-gray-600 mt-1">{stats.coupons} active coupons.</p>
                        <Link to="/coupons" className="text-sm font-semibold text-violet-600 hover:text-violet-700 mt-2.5 inline-flex items-center group-hover:translate-x-1 transition-transform">
                            View coupons <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                        </Link>
                    </div>
                </div>

                <div className="group bg-gradient-to-br from-rose-50/50 to-orange-50/50 border border-rose-100/60 rounded-2xl p-5 flex gap-4 transition-all hover:shadow-md hover:border-rose-200/80">
                    <div className="bg-white shadow-sm text-rose-600 p-3 rounded-xl h-fit border border-rose-50 group-hover:scale-110 transition-transform">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 text-base">Inventory Alerts</h4>
                        <p className="text-sm text-gray-600 mt-1">{stats.lowStock} products are running low on stock.</p>
                        <Link to="/inventory" className="text-sm font-semibold text-rose-600 hover:text-rose-700 mt-2.5 inline-flex items-center group-hover:translate-x-1 transition-transform">
                            Update inventory <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg shadow-gray-200/40 border border-white/60 overflow-hidden transition-all hover:shadow-xl">
        <div className="px-7 py-6 border-b border-gray-100/50 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Recent Orders</h2>
          <Link to="/orders" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors inline-flex items-center group px-3 py-1.5 rounded-lg hover:bg-indigo-50">
            View All 
            <ArrowUpRight className="w-4 h-4 ml-1 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/30 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100/80">
                <th className="px-7 py-5">Order #</th>
                <th className="px-7 py-5">Date</th>
                <th className="px-7 py-5">Customer</th>
                <th className="px-7 py-5">Status</th>
                <th className="px-7 py-5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/80 bg-transparent">
              {stats.recentOrders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50/60 transition-colors group">
                  <td className="px-7 py-5 whitespace-nowrap text-sm font-bold text-indigo-600">
                    <Link to={`/orders/${order._id}`} className="hover:underline">{order.orderNumber}</Link>
                  </td>
                  <td className="px-7 py-5 whitespace-nowrap text-sm font-medium text-gray-500">{new Date(order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                  <td className="px-7 py-5 whitespace-nowrap">
                    <div className="flex items-center">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 border border-white shadow-sm flex items-center justify-center text-sm font-bold text-gray-700 mr-3">
                            {(order.shippingAddress?.fullName || 'G')[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-bold text-gray-900">{order.shippingAddress?.fullName || 'Guest User'}</span>
                    </div>
                  </td>
                  <td className="px-7 py-5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold border shadow-sm
                      ${order.status === 'PAID' || order.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 
                        order.status === 'PENDING_PAYMENT' ? 'bg-amber-50 text-amber-700 border-amber-200/60' : 
                        'bg-blue-50 text-blue-700 border-blue-200/60'}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-7 py-5 whitespace-nowrap text-sm font-black text-gray-900 text-right">₹{order.grandTotal.toLocaleString()}</td>
                </tr>
              ))}
              {stats.recentOrders.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-7 py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                        <div className="bg-gray-50 p-4 rounded-full mb-4">
                            <ShoppingBag className="w-10 h-10 text-gray-300" />
                        </div>
                        <p className="text-lg font-bold text-gray-900">No orders yet</p>
                        <p className="text-sm font-medium text-gray-500 mt-1 max-w-sm mx-auto">When you receive your first order, it will appear here on your dashboard.</p>
                    </div>
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
