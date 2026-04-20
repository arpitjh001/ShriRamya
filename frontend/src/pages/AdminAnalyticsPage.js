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
    <div className="admin-dashboard-shell min-h-screen pt-24 pb-12 font-body">
      {/* Premium Header */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-border bg-white shadow-luxury-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between p-8">
          <div className="space-y-1">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
              Analytics <span className="text-royal-maroon">Dashboard</span>
            </h1>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Luxury Performance Tracking
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="group relative">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-44 border-border bg-slate-50 text-foreground transition-all hover:bg-slate-100">
                  <Calendar className="mr-2 h-4 w-4 text-royal-maroon" />
                  <SelectValue placeholder="Time Range" />
                </SelectTrigger>
                <SelectContent className="border-border bg-white text-foreground">
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
              className="border-border bg-slate-50 text-foreground shadow-sm hover:bg-slate-100"
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
        <TabsList className="h-auto w-full justify-start gap-4 bg-transparent p-0 overflow-x-auto pb-4 scrollbar-hide">
          {['overview', 'sales', 'products', 'revenue', 'customers'].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-full border border-border bg-slate-50 px-8 py-2.5 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-all data-[state=active]:border-royal-maroon/50 data-[state=active]:bg-royal-maroon/10 data-[state=active]:text-royal-maroon data-[state=active]:shadow-xl"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-8 animate-slide-up outline-none">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
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
            <Card className="lg:col-span-2 border-border bg-white shadow-luxury-sm">
              <CardHeader className="border-b border-border bg-slate-50">
                <CardTitle className="font-heading text-xl text-foreground">Sales Flow</CardTitle>
                <CardDescription className="text-muted-foreground">Revenue vs Order volume over time</CardDescription>
              </CardHeader>
              <CardContent className="pt-8">
                {loading ? (
                  <Skeleton className="h-[350px] w-full bg-slate-100" />
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={salesData}>
                      <defs>
                        <linearGradient id="maroonGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6A1E2D" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6A1E2D" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis 
                        dataKey="period" 
                        stroke="#94a3b8" 
                        fontSize={10} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `₹${v/1000}k`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: '12px',
                          color: '#1e293b',
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
                        stroke="#10b981" 
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

            {/* Top Products */}
            <Card className="border-border bg-white shadow-luxury-sm">
              <CardHeader className="border-b border-border">
                <CardTitle className="font-heading text-xl text-foreground">Boutique Favorites</CardTitle>
                <CardDescription className="text-muted-foreground">Highest performing pieces</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="space-y-6">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full bg-slate-50" />)}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {productData.slice(0, 5).map((product, index) => (
                      <div key={product.id} className="group relative flex items-center justify-between rounded-xl border border-border bg-slate-50 p-4 transition-all hover:bg-slate-100">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-royal-maroon/20 text-royal-maroon font-heading font-bold text-lg">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground group-hover:text-royal-maroon transition-colors">{product.name}</p>
                            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">
                              {product.totalQuantity} Pieces Crafted
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">₹{Number(product.totalRevenue).toLocaleString()}</p>
                          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-600">
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
          <Card className="border-border bg-white shadow-luxury-sm">
            <CardHeader className="border-b border-border bg-slate-50">
              <CardTitle className="font-heading text-2xl text-foreground">Market Performance</CardTitle>
              <CardDescription className="text-muted-foreground">Detailed sales and revenue metrics</CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              {loading ? (
                <Skeleton className="h-[450px] w-full bg-slate-100" />
              ) : (
                <ResponsiveContainer width="100%" height={450}>
                  <BarChart data={salesData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis 
                      dataKey="period" 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                       contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '12px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                       }}
                    />
                    <Legend iconType="diamond" verticalAlign="top" wrapperStyle={{ paddingBottom: '30px', color: '#94a3b8' }} />
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
            <Card className="border-border bg-white shadow-luxury-sm">
              <CardHeader className="border-b border-border">
                <CardTitle className="font-heading text-xl text-foreground">Revenue Contribution</CardTitle>
                <CardDescription className="text-muted-foreground">Bestsellers share of market</CardDescription>
              </CardHeader>
              <CardContent className="pt-8">
                {loading ? (
                  <Skeleton className="h-[350px] w-full bg-slate-100 rounded-full" />
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
                            fill={[ '#6A1E2D', '#C8A96A', '#10b981', '#94a3b8', '#c084fc'][index % 5]} 
                            stroke="#ffffff"
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#1e293b' }}
                        formatter={(value) => formatCurrency(value)} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-white shadow-luxury-sm">
              <CardHeader className="border-b border-border">
                <CardTitle className="font-heading text-xl text-foreground">Craftsmanship Demand</CardTitle>
                <CardDescription className="text-muted-foreground">Units sold by collection</CardDescription>
              </CardHeader>
              <CardContent className="pt-8">
                {loading ? (
                  <Skeleton className="h-[350px] w-full bg-slate-100" />
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={productData.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" fontSize={10} hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={100} 
                        stroke="#94a3b8" 
                        fontSize={9} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                         contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-border bg-slate-50">
              <CardContent className="pt-8 text-center space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Online Revenue</p>
                <h3 className="font-heading text-2xl font-bold text-foreground">
                  {formatCurrency(revenueData?.metrics?.onlineRevenue || 0)}
                </h3>
                <p className="text-[9px] text-slate-600 uppercase tracking-tighter">Orders: {revenueData?.metrics?.onlineOrders || 0}</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-500/20 bg-emerald-50">
              <CardContent className="pt-8 text-center space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600">Offline Revenue</p>
                <h3 className="font-heading text-2xl font-bold text-emerald-600">
                  {formatCurrency(revenueData?.metrics?.offlineRevenue || 0)}
                </h3>
                <p className="text-[9px] text-emerald-600/60 uppercase tracking-tighter">Orders: {revenueData?.metrics?.offlineOrders || 0}</p>
              </CardContent>
            </Card>
            <Card className="border-blue-500/20 bg-blue-50">
              <CardContent className="pt-8 text-center space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">Gross Inflow</p>
                <h3 className="font-heading text-2xl font-bold text-blue-600">
                  {formatCurrency(revenueData?.metrics?.grossRevenue || 0)}
                </h3>
              </CardContent>
            </Card>
            <Card className="border-royal-maroon/20 bg-royal-maroon/5">
              <CardContent className="pt-8 text-center space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-royal-maroon/60">Net Treasury</p>
                <h3 className="font-heading text-2xl font-bold text-royal-maroon">
                  {formatCurrency(revenueData?.metrics?.netRevenue || 0)}
                </h3>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border bg-white shadow-luxury-sm">
            <CardHeader className="border-b border-border bg-slate-50">
              <CardTitle className="font-heading text-xl text-foreground">Settlement Methods</CardTitle>
            </CardHeader>
            <CardContent className="pt-8">
              {loading ? (
                <Skeleton className="h-[300px] w-full bg-slate-50 rounded-xl" />
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
                        <Cell key={`cell-${index}`} fill={[ '#C8A96A', '#10b981', '#6A1E2D', '#94a3b8'][index % 4]} stroke="#ffffff" />
                      ))}
                    </Pie>
                    <Tooltip 
                       contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#1e293b' }}
                       formatter={(value) => formatCurrency(value)} 
                    />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#94a3b8', paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-8 animate-slide-up outline-none">
          <Card className="border-border bg-white shadow-luxury-sm">
            <CardHeader className="border-b border-border bg-slate-50">
              <CardTitle className="font-heading text-xl text-foreground">Patron Honor Roll</CardTitle>
              <CardDescription className="text-muted-foreground">Most frequent and valuable customers</CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full bg-slate-50" />)}
                </div>
              ) : (
                <div className="relative overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500">
                      <tr>
                        <th className="px-6 py-4 font-bold">Patron</th>
                        <th className="px-6 py-4 font-bold">Inquiries</th>
                        <th className="px-6 py-4 font-bold text-right">Orders</th>
                        <th className="px-6 py-4 font-bold text-right text-royal-maroon">Investment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {customerData.map((customer, index) => (
                        <tr key={index} className="transition-colors hover:bg-slate-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-royal-maroon/20 text-xs font-bold text-royal-maroon capitalize">
                                {customer.firstName?.[0] || customer.name?.[0] || 'U'}
                              </div>
                              <span className="font-bold text-foreground">{customer.name || `${customer.firstName} ${customer.lastName}`}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-mono text-xs">{customer.email}</td>
                          <td className="px-6 py-4 text-right font-medium text-muted-foreground">{customer.orderCount}</td>
                          <td className="px-6 py-4 text-right font-bold text-foreground">₹{Number(customer.totalSpent).toLocaleString()}</td>
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
    maroon: { bg: 'bg-royal-maroon/5', text: 'text-royal-maroon', iconColor: 'text-royal-maroon', glow: 'shadow-luxury' },
    emerald: { bg: 'bg-emerald-500/5', text: 'text-emerald-600', iconColor: 'text-emerald-500', glow: 'shadow-emerald-500/10' },
    gold: { bg: 'bg-amber-500/5', text: 'text-amber-600', iconColor: 'text-amber-500', glow: 'shadow-gold-glow' },
    charcoal: { bg: 'bg-slate-50', text: 'text-foreground', iconColor: 'text-muted-foreground', glow: 'shadow-luxury-sm' }
  };

  const scheme = schemeOptions[color] || schemeOptions.charcoal;

  return (
    <div className={`animate-scale-in ${delay} group relative overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-luxury-sm transition-all hover:scale-[1.02] hover:shadow-luxury`}>
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-accent/5 transition-transform group-hover:scale-150" />
      
      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10`}>
            <Icon className={`h-6 w-6 ${scheme.iconColor}`} />
          </div>
          {trend && (
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-600">
              {trend}
            </span>
          )}
        </div>
        
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
          {loading ? (
            <div className="h-9 w-24 bg-slate-100 animate-pulse rounded mt-1" />
          ) : (
            <h3 className={`mt-1 font-heading text-3xl font-bold tracking-tight ${scheme.text}`}>
              {formatValue()}
            </h3>
          )}
          {subtext && <p className="text-[11px] text-muted-foreground mt-1">{subtext}</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminAnalyticsPage;
