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
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [activeTab, setActiveTab] = useState('overview');
  
  const [overview, setOverview] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [productData, setProductData] = useState([]);
  const [revenueData, setRevenueData] = useState(null);

  useEffect(() => {
    // Check if user has Admin role (case-insensitive)
    const userRole = user?.role?.toLowerCase();
    const userRoles = user?.roles?.map(r => r.toLowerCase()) || [];
    
    if (!user || (!userRoles.includes('admin') && userRole !== 'admin')) {
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

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-IN').format(value);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', padding: '24px' }}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Track your store performance
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                  <SelectItem value="365">Last Year</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={loadAnalytics} variant="outline" size="sm" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard
                title="Total Revenue"
                value={overview?.month?.revenue || 0}
                format="currency"
                icon={DollarSign}
                color="green"
                loading={loading}
              />
              <StatCard
                title="Total Orders"
                value={overview?.month?.orders || 0}
                format="number"
                icon={ShoppingCart}
                color="blue"
                loading={loading}
              />
              <StatCard
                title="Total Products"
                value={overview?.totals?.products || 0}
                format="number"
                icon={Package}
                color="purple"
                loading={loading}
              />
              <StatCard
                title="Total Customers"
                value={overview?.totals?.customers || 0}
                format="number"
                icon={Users}
                color="orange"
                loading={loading}
              />
            </div>

            {/* Sales Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Sales Overview</CardTitle>
                <CardDescription>Daily sales trend</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={salesData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="totalRevenue" 
                        stroke="#8884d8" 
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                        name="Revenue"
                      />
                      <Line type="monotone" dataKey="orderCount" stroke="#82ca9d" name="Orders" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Top Products */}
            <Card>
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
                <CardDescription>Best performing products by revenue</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {productData.slice(0, 5).map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-gray-500">
                              {formatNumber(product.totalQuantity)} sold
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(product.totalRevenue)}</p>
                          <p className="text-sm text-gray-500">
                            {product.avgRating} ★ ({product.reviewCount})
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sales Analytics</CardTitle>
                <CardDescription>Detailed sales breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="totalRevenue" fill="#8884d8" name="Revenue" />
                      <Bar yAxisId="right" dataKey="orderCount" fill="#82ca9d" name="Orders" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Product Performance</CardTitle>
                <CardDescription>Top products by different metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Revenue by Product</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={productData.slice(0, 8)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="totalRevenue"
                            nameKey="name"
                          >
                            {productData.slice(0, 8).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Units Sold</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={productData.slice(0, 10)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={150} />
                          <Tooltip />
                          <Bar dataKey="totalQuantity" fill="#82ca9d" name="Units Sold" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Gross Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(revenueData?.metrics?.grossRevenue || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Before refunds</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(revenueData?.metrics?.netRevenue || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">After refunds</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Refunds</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(revenueData?.metrics?.refunds || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Total refunded</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={revenueData?.byPaymentMethod || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ method, totalRevenue }) => `${method}: ${formatCurrency(totalRevenue)}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="totalRevenue"
                        nameKey="method"
                      >
                        {(revenueData?.byPaymentMethod || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, format, icon: Icon, color, loading }) => {
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

  const colorClasses = {
    green: 'text-green-600 bg-green-50 dark:bg-green-950',
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-950',
    purple: 'text-purple-600 bg-purple-50 dark:bg-purple-950',
    orange: 'text-orange-600 bg-orange-50 dark:bg-orange-950'
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${colorClasses[color]?.split(' ')[0]}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className={`text-2xl font-bold ${colorClasses[color]?.split(' ')[0]}`}>
            {formatValue()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminAnalyticsPage;
