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
      const [overviewRes, salesRes, productsRes, revenueRes] = await Promise.all([
        analyticsAPI.getOverview(),
        analyticsAPI.getSales({ group_by: 'day' }),
        analyticsAPI.getProducts({ limit: 10 }),
        analyticsAPI.getRevenue()
      ]);

      setOverview(overviewRes.data);
      setSalesData(salesRes.data?.data || []);
      setProductData(productsRes.data?.products || []);
      setRevenueData(revenueRes.data);
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
    <div className="min-h-screen bg-royal-veil p-4 md:p-8 font-body">
      {/* Premium Glass Header */}
      <div className="mb-8 animate-fade-in overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 shadow-glass backdrop-blur-luxury md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-white md:text-4xl">
              Analytics <span className="text-royal-gold">Dashboard</span>
            </h1>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/50">
              Luxury Performance Tracking
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="group relative">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-44 border-white/10 bg-white/5 text-white backdrop-blur-md transition-all hover:bg-white/10">
                  <Calendar className="mr-2 h-4 w-4 text-royal-gold" />
                  <SelectValue placeholder="Time Range" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-charcoal text-white backdrop-blur-xl">
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
              className="border-white/10 bg-white/5 text-white shadow-luxury hover:bg-white/10"
            >
              <RefreshCw className={`mr-2 h-4 w-4 text-royal-gold ${loading ? 'animate-spin' : ''}`} />
              Sync Data
            </Button>
            
            <Button 
              className="bg-royal-gold text-charcoal shadow-gold-glow hover:bg-gold-mist"
              data-testid="export-csv-btn"
              onClick={async () => {
                try {
                  const API_BASE = process.env.REACT_APP_BACKEND_URL;
                  const res = await fetch(`${API_BASE}/api/v1/admin/analytics/export`);
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `shriramya_sales_${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                  toast.success('Sales report exported');
                } catch (err) { toast.error('Export failed'); }
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
          {['overview', 'sales', 'products', 'revenue'].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-full border border-white/5 bg-white/5 px-8 py-2.5 text-xs font-bold uppercase tracking-widest text-white/60 transition-all data-[state=active]:border-royal-gold/30 data-[state=active]:bg-white/10 data-[state=active]:text-royal-gold data-[state=active]:shadow-gold-glow"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-8 animate-slide-up outline-none">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Revenue"
              value={overview?.month?.revenue || 0}
              format="currency"
              icon={DollarSign}
              trend="+12.5%"
              delay="delay-0"
              color="maroon"
              loading={loading}
            />
            <StatCard
              title="Total Orders"
              value={overview?.month?.orders || 0}
              format="number"
              icon={ShoppingCart}
              trend="+8.2%"
              delay="delay-75"
              color="emerald"
              loading={loading}
            />
            <StatCard
              title="Active Products"
              value={overview?.totals?.products || 0}
              format="number"
              icon={Package}
              delay="delay-150"
              color="gold"
              loading={loading}
            />
            <StatCard
              title="Total Customers"
              value={overview?.totals?.customers || 0}
              format="number"
              icon={Users}
              trend="+4.1%"
              delay="delay-200"
              color="charcoal"
              loading={loading}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sales Flow Chart */}
            <Card className="lg:col-span-2 border-white/5 bg-white/5 shadow-glass backdrop-blur-luxury overflow-hidden">
              <CardHeader className="border-b border-white/5 bg-white/5">
                <CardTitle className="font-heading text-xl text-white">Sales Flow</CardTitle>
                <CardDescription className="text-white/40">Revenue vs Order volume over time</CardDescription>
              </CardHeader>
              <CardContent className="pt-8">
                {loading ? (
                  <Skeleton className="h-[350px] w-full bg-white/5" />
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={salesData}>
                      <defs>
                        <linearGradient id="maroonGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6A1E2D" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6A1E2D" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0F3D3E" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#0F3D3E" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                      <XAxis 
                        dataKey="period" 
                        stroke="#ffffff40" 
                        fontSize={10} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#ffffff40" 
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `₹${v/1000}k`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1f1f1f', 
                          border: '1px solid #ffffff10', 
                          borderRadius: '12px',
                          color: '#fff',
                          backdropFilter: 'blur(10px)'
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="totalRevenue" 
                        stroke="#C8A96A" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#maroonGradient)" 
                        name="Revenue"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="orderCount" 
                        stroke="#0F3D3E" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#emeraldGradient)" 
                        name="Orders"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Top Products - Boutique Style */}
            <Card className="border-white/5 bg-white/5 shadow-glass backdrop-blur-luxury">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="font-heading text-xl text-white">Boutique Favorites</CardTitle>
                <CardDescription className="text-white/40">Highest performing pieces</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="space-y-6">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full bg-white/5" />)}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {productData.slice(0, 5).map((product, index) => (
                      <div key={product.id} className="group relative flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-royal-gold/10 text-royal-gold font-heading font-bold text-lg">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white group-hover:text-royal-gold transition-colors">{product.name}</p>
                            <p className="text-[10px] uppercase tracking-[0.15em] text-white/40">
                              {product.totalQuantity} Pieces Crafted
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-royal-gold">{formatCurrency(product.totalRevenue)}</p>
                          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-white/30">
                            <span className="text-royal-gold">★</span> {product.avgRating}
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
          <Card className="border-white/5 bg-white/5 shadow-glass backdrop-blur-luxury overflow-hidden">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="font-heading text-2xl text-white">Market Performance</CardTitle>
              <CardDescription className="text-white/40">Detailed sales and revenue metrics</CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              {loading ? (
                <Skeleton className="h-[450px] w-full bg-white/5" />
              ) : (
                <ResponsiveContainer width="100%" height={450}>
                  <BarChart data={salesData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                    <XAxis 
                      dataKey="period" 
                      stroke="#ffffff40" 
                      fontSize={10} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#ffffff40" 
                      fontSize={10} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                       contentStyle={{ 
                        backgroundColor: '#1f1f1f', 
                        border: '1px solid #ffffff10', 
                        borderRadius: '12px',
                        backdropFilter: 'blur(10px)'
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
            <Card className="border-white/5 bg-white/5 shadow-glass backdrop-blur-luxury">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="font-heading text-xl text-white">Revenue Contribution</CardTitle>
                <CardDescription className="text-white/40">Bestsellers share of market</CardDescription>
              </CardHeader>
              <CardContent className="pt-8">
                {loading ? (
                  <Skeleton className="h-[350px] w-full bg-white/5 rounded-full" />
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
                            stroke="rgba(255,255,255,0.05)"
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f1f1f', border: '1px solid #ffffff10', borderRadius: '12px' }}
                        formatter={(value) => formatCurrency(value)} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/5 bg-white/5 shadow-glass backdrop-blur-luxury">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="font-heading text-xl text-white">Craftsmanship Demand</CardTitle>
                <CardDescription className="text-white/40">Units sold by collection</CardDescription>
              </CardHeader>
              <CardContent className="pt-8">
                {loading ? (
                  <Skeleton className="h-[350px] w-full bg-white/5" />
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={productData.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" horizontal={false} />
                      <XAxis type="number" stroke="#ffffff20" fontSize={10} hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={100} 
                        stroke="#ffffff60" 
                        fontSize={9} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                         contentStyle={{ backgroundColor: '#1f1f1f', border: '1px solid #ffffff10', borderRadius: '12px' }}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-white/5 bg-white/5 shadow-glass backdrop-blur-md">
              <CardContent className="pt-8 text-center space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Gross Inflow</p>
                <h3 className="font-heading text-3xl font-bold text-white">
                  {formatCurrency(revenueData?.metrics?.grossRevenue || 0)}
                </h3>
              </CardContent>
            </Card>
            <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-glass backdrop-blur-md">
              <CardContent className="pt-8 text-center space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/60">Net Treasury</p>
                <h3 className="font-heading text-3xl font-bold text-emerald-400">
                  {formatCurrency(revenueData?.metrics?.netRevenue || 0)}
                </h3>
              </CardContent>
            </Card>
            <Card className="border-royal-maroon/20 bg-royal-maroon/5 shadow-glass backdrop-blur-md">
              <CardContent className="pt-8 text-center space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-royal-maroon/60">Boutique Refunds</p>
                <h3 className="font-heading text-3xl font-bold text-royal-maroon">
                  {formatCurrency(revenueData?.metrics?.refunds || 0)}
                </h3>
              </CardContent>
            </Card>
          </div>

          <Card className="border-white/5 bg-white/5 shadow-glass backdrop-blur-luxury">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="font-heading text-xl text-white">Settlement Methods</CardTitle>
            </CardHeader>
            <CardContent className="pt-8">
              {loading ? (
                <Skeleton className="h-[300px] w-full bg-white/5 rounded-xl" />
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
                        <Cell key={`cell-${index}`} fill={[ '#C8A96A', '#0F3D3E', '#6A1E2D', '#1F1F1F'][index % 4]} stroke="rgba(255,255,255,0.1)" />
                      ))}
                    </Pie>
                    <Tooltip 
                       contentStyle={{ backgroundColor: '#1f1f1f', border: '1px solid #ffffff10', borderRadius: '12px' }}
                       formatter={(value) => formatCurrency(value)} 
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Premium Stat Card
const StatCard = ({ title, value, format, icon: Icon, color, trend, delay, loading }) => {
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
    maroon: { bg: 'bg-royal-maroon/20', text: 'text-royal-maroon', iconColor: 'text-royal-maroon', glow: 'shadow-luxury' },
    emerald: { bg: 'bg-deep-emerald/20', text: 'text-emerald-400', iconColor: 'text-deep-emerald', glow: 'shadow-emerald-500/10' },
    gold: { bg: 'bg-royal-gold/20', text: 'text-royal-gold', iconColor: 'text-royal-gold', glow: 'shadow-gold-glow' },
    charcoal: { bg: 'bg-charcoal/40', text: 'text-white/80', iconColor: 'text-white/60', glow: 'shadow-glass' }
  };

  const scheme = schemeOptions[color] || schemeOptions.charcoal;

  return (
    <div className={`animate-scale-in ${delay} group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 shadow-glass backdrop-blur-luxury transition-all hover:scale-[1.02] hover:bg-white/10`}>
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5 transition-transform group-hover:scale-150" />
      
      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${scheme.bg} backdrop-blur-md`}>
            <Icon className={`h-6 w-6 ${scheme.iconColor}`} />
          </div>
          {trend && (
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-400">
              {trend}
            </span>
          )}
        </div>
        
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/40">{title}</p>
          {loading ? (
            <Skeleton className="mt-2 h-9 w-32 bg-white/10" />
          ) : (
            <h3 className={`mt-1 font-heading text-3xl font-bold tracking-tight ${scheme.text}`}>
              {formatValue()}
            </h3>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAnalyticsPage;
