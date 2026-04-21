import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  TrendingUp, DollarSign, Package, Users, ShoppingCart, 
  Calendar, Download, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const AdminAnalyticsPage = () => {
  const { user, isAdmin, isEditor, canViewDashboard } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [activeTab, setActiveTab] = useState('overview');
  
  const [overview, setOverview] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [productData, setProductData] = useState([]);
  const [revenueData, setRevenueData] = useState(null);
  const [customerData, setCustomerData] = useState([]);

  useEffect(() => {
    // Check if user has Admin role
    const userRoles = user?.roles?.map(r => r.toLowerCase()) || [];
    const isAuthorized = userRoles.includes('admin') || user?.role?.toLowerCase() === 'admin';
    
    if (!user || !isAuthorized) {
      toast.error('Access denied');
      navigate('/');
      return;
    }
    loadAnalytics();
  }, [user, timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [overviewRes, salesRes, productsRes, revenueRes, customersRes] = await Promise.all([
        analyticsAPI.getOverview(),
        analyticsAPI.getSales({ group_by: 'day' }),
        analyticsAPI.getProducts({ limit: 10 }),
        analyticsAPI.getRevenue(),
        analyticsAPI.getTopCustomers({ limit: 10 })
      ]);

      setOverview(overviewRes.data);
      setSalesData(salesRes.data?.data || []);
      setProductData(productsRes.data?.products || []);
      setRevenueData(revenueRes.data);
      setCustomerData(customersRes.data?.customers || []);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 font-body">
      {/* Premium Glass Header */}
      <div className="mb-8 animate-fade-in overflow-hidden rounded-2xl border border-royal-maroon/10 bg-white p-6 shadow-luxury md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-charcoal md:text-4xl">
              Analytics <span className="text-royal-maroon">Dashboard</span>
            </h1>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-charcoal/50">
              Luxury Performance Tracking
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="group relative">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-44 border-royal-maroon/10 bg-background text-charcoal transition-all hover:bg-royal-maroon/5">
                  <Calendar className="mr-2 h-4 w-4 text-royal-maroon" />
                  <SelectValue placeholder="Time Range" />
                </SelectTrigger>
                <SelectContent className="border-royal-maroon/10 bg-white text-charcoal">
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                  <SelectItem value="365">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={loadAnalytics} 
              variant="outline" 
              className="border-royal-maroon/10 bg-white text-royal-maroon shadow-sm hover:bg-royal-maroon/5"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Sync Data
            </Button>
            
            <Button 
              className="bg-royal-maroon text-white shadow-luxury hover:bg-royal-maroon/90"
              data-testid="export-csv-btn"
              onClick={async () => {
                try {
                  const res = await analyticsAPI.api.get('/admin/analytics/export', { responseType: 'blob' });
                  const blob = res.data;
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `shriramya_sales_${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                  toast.success('Sales report exported');
                } catch (err) { 
                  console.error('Export error:', err);
                  toast.error('Export failed'); 
                }
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Areas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="h-auto w-full justify-start gap-4 bg-transparent p-0 overflow-x-auto pb-2 scrollbar-hide">
          {['overview', 'sales', 'products', 'revenue', 'customers'].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-full border border-royal-maroon/5 bg-white px-8 py-2.5 text-xs font-bold uppercase tracking-widest text-charcoal/60 transition-all data-[state=active]:border-royal-maroon/30 data-[state=active]:bg-royal-maroon/5 data-[state=active]:text-royal-maroon data-[state=active]:shadow-sm"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-8 animate-slide-up outline-none">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              title="Total Revenue"
              value={overview?.month?.revenue || 0}
              format="currency"
              icon={DollarSign}
              trend="+12.5%"
              delay="delay-0"
              color="maroon"
              loading={loading}
              subtext={`Online: ${overview?.month?.onlineRevenue ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(overview.month.onlineRevenue) : '₹0'}`}
            />
            <StatCard
              title="Offline Revenue"
              value={overview?.month?.offlineRevenue || 0}
              format="currency"
              icon={ShoppingCart}
              trend="+8.2%"
              delay="delay-75"
              color="emerald"
              loading={loading}
            />
            <StatCard
              title="Total Orders"
              value={overview?.month?.orders || 0}
              format="number"
              icon={ShoppingCart}
              trend="+8.2%"
              delay="delay-150"
              color="emerald"
              loading={loading}
              subtext={`Online: ${overview?.month?.onlineOrders || 0} | Offline: ${overview?.month?.offlineOrders || 0}`}
            />
            <StatCard
              title="Active Products"
              value={overview?.totals?.products || 0}
              format="number"
              icon={Package}
              delay="delay-200"
              color="gold"
              loading={loading}
            />
            <StatCard
              title="Total Customers"
              value={overview?.totals?.customers || 0}
              format="number"
              icon={Users}
              trend="+4.1%"
              delay="delay-250"
              color="charcoal"
              loading={loading}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sales Flow Chart */}
            <Card className="lg:col-span-2 border-royal-maroon/5 bg-white shadow-luxury overflow-hidden">
              <CardHeader className="border-b border-royal-maroon/5 bg-royal-maroon/[0.02]">
                <CardTitle className="font-heading text-xl text-charcoal">Sales Flow</CardTitle>
                <CardDescription className="text-charcoal/40">Revenue vs Order volume over time</CardDescription>
              </CardHeader>
              <CardContent className="pt-8">
                {loading ? (
                  <Skeleton className="h-[350px] w-full bg-royal-maroon/[0.05]" />
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={salesData}>
                      <defs>
                        <linearGradient id="maroonGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6A1E2D" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#6A1E2D" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0F3D3E" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#0F3D3E" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#0000000a" vertical={false} />
                      <XAxis 
                        dataKey="period" 
                        stroke="#00000040" 
                        fontSize={10} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#00000040" 
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `₹${v/1000}k`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          border: '1px solid #6A1E2D20', 
                          borderRadius: '12px',
                          color: '#1a1a1a',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="onlineRevenue" 
                        stroke="#6A1E2D" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#maroonGradient)" 
                        name="Online Revenue"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="offlineRevenue" 
                        stroke="#0F3D3E" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#emeraldGradient)" 
                        name="Offline Revenue"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Top Products - Boutique Style */}
            <Card className="border-royal-maroon/5 bg-white shadow-luxury">
              <CardHeader className="border-b border-royal-maroon/5">
                <CardTitle className="font-heading text-xl text-charcoal">Boutique Favorites</CardTitle>
                <CardDescription className="text-charcoal/40">Highest performing pieces</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="space-y-6">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full bg-royal-maroon/[0.05]" />)}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {productData.slice(0, 5).map((product, index) => (
                      <div key={product.id} className="group relative flex items-center justify-between rounded-xl border border-royal-maroon/5 bg-background p-4 transition-all hover:bg-royal-maroon/5">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-royal-maroon/10 text-royal-maroon font-heading font-bold text-lg">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-charcoal group-hover:text-royal-maroon transition-colors">{product.name}</p>
                            <p className="text-[10px] uppercase tracking-[0.15em] text-charcoal/40">
                              {product.totalQuantity} Pieces Crafted
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-royal-maroon">{formatCurrency(product.totalRevenue)}</p>
                          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-charcoal/30">
                            <span className="text-royal-maroon">★</span> {product.avgRating}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-8 animate-slide-up outline-none">
          <Card className="border-royal-maroon/5 bg-white shadow-luxury overflow-hidden">
            <CardHeader className="border-b border-royal-maroon/5 bg-royal-maroon/[0.02]">
              <CardTitle className="font-heading text-2xl text-charcoal">Market Performance</CardTitle>
              <CardDescription className="text-charcoal/40">Detailed sales and revenue metrics</CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              {loading ? (
                <Skeleton className="h-[450px] w-full bg-royal-maroon/[0.05]" />
              ) : (
                <ResponsiveContainer width="100%" height={450}>
                  <BarChart data={salesData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0000000a" vertical={false} />
                    <XAxis 
                      dataKey="period" 
                      stroke="#00000040" 
                      fontSize={10} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#00000040" 
                      fontSize={10} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                       contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #6A1E2D20', 
                        borderRadius: '12px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                       }}
                    />
                    <Legend iconType="diamond" verticalAlign="top" wrapperStyle={{ paddingBottom: '30px' }} />
                    <Bar dataKey="totalRevenue" fill="#6A1E2D" name="Boutique Revenue" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="orderCount" fill="#C8A96A" name="Patron Orders" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-8 animate-slide-up outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-royal-maroon/5 bg-white shadow-luxury">
              <CardHeader className="border-b border-royal-maroon/5">
                <CardTitle className="font-heading text-xl text-charcoal">Revenue Contribution</CardTitle>
                <CardDescription className="text-charcoal/40">Bestsellers share of market</CardDescription>
              </CardHeader>
              <CardContent className="pt-8">
                {loading ? (
                  <Skeleton className="h-[350px] w-full bg-royal-maroon/[0.05] rounded-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={productData.slice(0, 8)}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="totalRevenue"
                        nameKey="name"
                      >
                        {productData.slice(0, 8).map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={[ '#6A1E2D', '#C8A96A', '#0F3D3E', '#1F1F1F', '#E3D1AB'][index % 5]} 
                            stroke="rgba(0,0,0,0.05)"
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #6A1E2D20', borderRadius: '12px' }}
                        formatter={(value) => formatCurrency(value)} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-royal-maroon/5 bg-white shadow-luxury">
              <CardHeader className="border-b border-royal-maroon/5">
                <CardTitle className="font-heading text-xl text-charcoal">Craftsmanship Demand</CardTitle>
                <CardDescription className="text-charcoal/40">Units sold by collection</CardDescription>
              </CardHeader>
              <CardContent className="pt-8">
                {loading ? (
                  <Skeleton className="h-[350px] w-full bg-royal-maroon/[0.05]" />
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={productData.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#0000000a" horizontal={false} />
                      <XAxis type="number" stroke="#00000020" fontSize={10} hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={100} 
                        stroke="#00000060" 
                        fontSize={9} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                         contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #6A1E2D20', borderRadius: '12px' }}
                      />
                      <Bar dataKey="totalQuantity" fill="#C8A96A" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-8 animate-slide-up outline-none">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-royal-maroon/5 bg-white shadow-luxury">
              <CardContent className="pt-8 text-center space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-charcoal/40">Online Revenue</p>
                <h3 className="font-heading text-2xl font-bold text-charcoal">
                  {formatCurrency(revenueData?.metrics?.onlineRevenue || 0)}
                </h3>
                <p className="text-[9px] text-charcoal/30">Orders: {revenueData?.metrics?.onlineOrders || 0}</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-500/10 bg-emerald-50 shadow-sm">
              <CardContent className="pt-8 text-center space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600/60">Offline Revenue</p>
                <h3 className="font-heading text-2xl font-bold text-emerald-600">
                  {formatCurrency(revenueData?.metrics?.offlineRevenue || 0)}
                </h3>
                <p className="text-[9px] text-emerald-600/50">Orders: {revenueData?.metrics?.offlineOrders || 0}</p>
              </CardContent>
            </Card>
            <Card className="border-blue-500/10 bg-blue-50 shadow-sm">
              <CardContent className="pt-8 text-center space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600/60">Gross Inflow</p>
                <h3 className="font-heading text-2xl font-bold text-blue-600">
                  {formatCurrency(revenueData?.metrics?.grossRevenue || 0)}
                </h3>
              </CardContent>
            </Card>
            <Card className="border-royal-maroon/10 bg-royal-maroon/5 shadow-sm">
              <CardContent className="pt-8 text-center space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-royal-maroon/60">Net Treasury</p>
                <h3 className="font-heading text-2xl font-bold text-royal-maroon">
                  {formatCurrency(revenueData?.metrics?.netRevenue || 0)}
                </h3>
              </CardContent>
            </Card>
          </div>

          <Card className="border-royal-maroon/5 bg-white shadow-luxury">
            <CardHeader className="border-b border-royal-maroon/5 bg-royal-maroon/[0.02]">
              <CardTitle className="font-heading text-xl text-charcoal">Settlement Methods</CardTitle>
            </CardHeader>
            <CardContent className="pt-8">
              {loading ? (
                <Skeleton className="h-[300px] w-full bg-royal-maroon/[0.05] rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={revenueData?.byPaymentMethod || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={100}
                      outerRadius={140}
                      paddingAngle={8}
                      dataKey="totalRevenue"
                      nameKey="method"
                    >
                      {(revenueData?.byPaymentMethod || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={[ '#C8A96A', '#0F3D3E', '#6A1E2D', '#1F1F1F'][index % 4]} stroke="rgba(0,0,0,0.05)" />
                      ))}
                    </Pie>
                    <Tooltip 
                       contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #6A1E2D20', borderRadius: '12px' }}
                       formatter={(value) => formatCurrency(value)} 
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-8 animate-slide-up outline-none">
          <Card className="border-royal-maroon/5 bg-white shadow-luxury">
            <CardHeader className="border-b border-royal-maroon/5 bg-royal-maroon/[0.02]">
              <CardTitle className="font-heading text-xl text-charcoal">Top Patrons</CardTitle>
              <CardDescription className="text-charcoal/40">Most frequent and valuable customers</CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full bg-royal-maroon/[0.05]" />)}
                </div>
              ) : (
                <div className="relative overflow-x-auto rounded-xl">
                  <table className="w-full text-left text-sm text-charcoal/70">
                    <thead className="bg-royal-maroon/[0.04] text-[10px] uppercase tracking-widest text-charcoal/40">
                      <tr>
                        <th className="px-6 py-4 font-bold">Customer</th>
                        <th className="px-6 py-4 font-bold">Email</th>
                        <th className="px-6 py-4 font-bold text-right">Orders</th>
                        <th className="px-6 py-4 font-bold text-right text-royal-maroon">Total Spent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-royal-maroon/5">
                      {customerData.map((customer, index) => (
                        <tr key={index} className="transition-colors hover:bg-royal-maroon/[0.02]">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-royal-maroon/10 text-xs font-bold text-royal-maroon capitalize">
                                {customer.firstName?.[0] || customer.name?.[0] || 'U'}
                              </div>
                              <span className="font-bold text-charcoal">{customer.name || `${customer.firstName} ${customer.lastName}`}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-charcoal/50">{customer.email}</td>
                          <td className="px-6 py-4 text-right font-medium">{customer.orderCount}</td>
                          <td className="px-6 py-4 text-right font-bold text-royal-maroon">{formatCurrency(customer.totalSpent)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Premium Stat Card
const StatCard = ({ title, value, format, icon: Icon, color, trend, delay, loading, subtext }) => {
  const formatValue = () => {
    if (format === 'currency') {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(value);
    }
    return new Intl.NumberFormat('en-IN').format(value);
  };

  const schemeOptions = {
    maroon: { bg: 'bg-royal-maroon/[0.08]', text: 'text-royal-maroon', iconColor: 'text-royal-maroon', glow: 'shadow-sm' },
    emerald: { bg: 'bg-emerald-500/[0.08]', text: 'text-emerald-700', iconColor: 'text-emerald-600', glow: 'shadow-sm' },
    gold: { bg: 'bg-royal-gold/[0.15]', text: 'text-royal-gold', iconColor: 'text-royal-gold', glow: 'shadow-sm' },
    charcoal: { bg: 'bg-charcoal/[0.05]', text: 'text-charcoal', iconColor: 'text-charcoal/60', glow: 'shadow-sm' }
  };

  const scheme = schemeOptions[color] || schemeOptions.charcoal;

  return (
    <div className={`animate-scale-in ${delay} group relative overflow-hidden rounded-2xl border border-royal-maroon/5 bg-white p-6 shadow-luxury transition-all hover:scale-[1.02] hover:bg-background`}>
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-royal-maroon/[0.02] transition-transform group-hover:scale-150" />
      
      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${scheme.bg}`}>
            <Icon className={`h-6 w-6 ${scheme.iconColor}`} />
          </div>
          {trend && (
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-600">
              {trend}
            </span>
          )}
        </div>
        
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-charcoal/40">{title}</p>
          {loading ? (
            <Skeleton className="mt-2 h-9 w-32 bg-royal-maroon/[0.05]" />
          ) : (
            <h3 className={`mt-1 font-heading text-3xl font-bold tracking-tight ${scheme.text}`}>
              {formatValue()}
            </h3>
          )}
          {subtext && <p className="text-[11px] text-charcoal/40 mt-1">{subtext}</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminAnalyticsPage;
