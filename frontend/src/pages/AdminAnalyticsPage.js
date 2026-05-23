import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { analyticsAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Calendar } from '../components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { cn } from '../utils';
import { toast } from 'sonner';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CalendarDays,
  CreditCard,
  IndianRupee,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';

const TIMEZONE = 'Asia/Kolkata';
const COLORS = ['#7A2638', '#C7A15A', '#256F5B', '#2F5F98', '#8A4F2B', '#5B6472'];

const pad = (value) => String(value).padStart(2, '0');

const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseDateKey = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const endOfPreviousMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 0);

const defaultRange = () => {
  const today = new Date();
  return { from: dateKey(addDays(today, -29)), to: dateKey(today) };
};

const presetRanges = () => {
  const today = new Date();
  const yesterday = addDays(today, -1);
  const previousMonthEnd = endOfPreviousMonth(today);

  return [
    { id: 'today', label: 'Today', range: { from: dateKey(today), to: dateKey(today) } },
    { id: 'yesterday', label: 'Yesterday', range: { from: dateKey(yesterday), to: dateKey(yesterday) } },
    { id: 'last7', label: 'Last 7 Days', range: { from: dateKey(addDays(today, -6)), to: dateKey(today) } },
    { id: 'last30', label: 'Last 30 Days', range: defaultRange() },
    { id: 'thisMonth', label: 'This Month', range: { from: dateKey(startOfMonth(today)), to: dateKey(today) } },
    {
      id: 'previousMonth',
      label: 'Previous Month',
      range: {
        from: dateKey(startOfMonth(previousMonthEnd)),
        to: dateKey(previousMonthEnd),
      },
    },
  ];
};

const rangesEqual = (left, right) => left?.from === right?.from && left?.to === right?.to;

const resolvePreset = (range) => presetRanges().find((preset) => rangesEqual(preset.range, range))?.id || 'custom';

const formatDisplayDate = (value) => {
  const date = parseDateKey(value);
  if (!date) return value || '';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const formatRangeLabel = (range) => {
  if (!range?.from || !range?.to) return 'Select date range';
  if (range.from === range.to) return formatDisplayDate(range.from);
  return `${formatDisplayDate(range.from)} to ${formatDisplayDate(range.to)}`;
};

const toCalendarRange = (range) => ({
  from: parseDateKey(range?.from),
  to: parseDateKey(range?.to),
});

const normalizeRangeFromQuery = (params) => {
  const fallback = defaultRange();
  const from = params.get('from');
  const to = params.get('to');

  if (!parseDateKey(from) || !parseDateKey(to)) return fallback;
  if (parseDateKey(from) > parseDateKey(to)) return fallback;

  return { from, to };
};

const unwrap = (response) => response?.data || response || {};

const numberValue = (value) => Number(value || 0);

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(numberValue(value));

const formatCurrency = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(numberValue(value));

const formatPercent = (value) => `${numberValue(value).toFixed(2)}%`;

const formatMetric = (value, type) => {
  if (type === 'currency') return formatCurrency(value);
  if (type === 'percent') return formatPercent(value);
  return formatNumber(value);
};

const AdminAnalyticsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [appliedRange, setAppliedRange] = useState(() => normalizeRangeFromQuery(searchParams));
  const [draftRange, setDraftRange] = useState(() => normalizeRangeFromQuery(searchParams));
  const [data, setData] = useState({
    overview: {},
    visitors: {},
    products: {},
    sales: {},
    cart: {},
    categories: {},
    customers: {},
    search: {},
  });

  useEffect(() => {
    const nextRange = normalizeRangeFromQuery(searchParams);
    setAppliedRange(nextRange);
    setDraftRange(nextRange);
  }, [searchParams]);

  const params = useMemo(() => ({
    from: appliedRange.from,
    to: appliedRange.to,
    timezone: searchParams.get('timezone') || TIMEZONE,
  }), [appliedRange, searchParams]);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);

    try {
      const [
        overviewRes,
        visitorsRes,
        productsRes,
        salesRes,
        cartRes,
        categoriesRes,
        customersRes,
        searchRes,
      ] = await Promise.all([
        analyticsAPI.getOverview(params),
        analyticsAPI.getVisitors(params),
        analyticsAPI.getProducts({ ...params, limit: 25 }),
        analyticsAPI.getSales(params),
        analyticsAPI.getCart(params),
        analyticsAPI.getCategories(params),
        analyticsAPI.getTopCustomers(params),
        analyticsAPI.getSearch(params),
      ]);

      setData({
        overview: unwrap(overviewRes),
        visitors: unwrap(visitorsRes),
        products: unwrap(productsRes),
        sales: unwrap(salesRes),
        cart: unwrap(cartRes),
        categories: unwrap(categoriesRes),
        customers: unwrap(customersRes),
        search: unwrap(searchRes),
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        toast.error(error.response?.data?.message || 'Failed to load analytics dashboard');
      }
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const activePreset = resolvePreset(draftRange);

  const applyRange = () => {
    const fromDate = parseDateKey(draftRange.from);
    const toDate = parseDateKey(draftRange.to || draftRange.from);

    if (!fromDate || !toDate) {
      toast.error('Select a valid date range');
      return;
    }

    if (fromDate > toDate) {
      toast.error('From date cannot be later than To date');
      return;
    }

    setSearchParams({
      from: dateKey(fromDate),
      to: dateKey(toDate),
      timezone: TIMEZONE,
    });
  };

  const resetRange = () => {
    const range = defaultRange();
    setDraftRange(range);
    setSearchParams({ ...range, timezone: TIMEZONE });
  };

  const overviewCards = data.overview?.cards || {};
  const visitorSummary = data.visitors?.summary || {};
  const salesSummary = data.sales?.summary || {};
  const cartSummary = data.cart?.summary || {};
  const products = data.products?.products || [];
  const categories = data.categories?.categories || [];
  const topCategories = data.categories?.revenueByCategory || data.sales?.revenueByCategory || [];
  const searchKeywords = data.search?.keywords || [];
  const topCustomers = data.customers?.topCustomers || data.customers?.customers || [];

  const revenueTrend = data.sales?.revenueByDate || data.sales?.data || [];
  const visitorTrend = data.visitors?.daily || [];
  const deviceRows = data.visitors?.devices || [];
  const topPages = data.visitors?.topPages || [];
  const locations = data.visitors?.locations || [];
  const browsers = data.visitors?.browsers || [];
  const sources = data.visitors?.sources || [];
  const funnelRows = data.cart?.funnel || [];
  const paymentRows = data.sales?.revenueByPaymentMethod || [];

  return (
    <div className="admin-dashboard-shell min-h-screen pt-24 pb-12 font-body">
      <section className="mb-6 border border-border bg-white p-5 shadow-luxury-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Analytics Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatRangeLabel(appliedRange)} - {params.timezone}
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex flex-wrap gap-2">
              {presetRanges().map((preset) => (
                <Button
                  key={preset.id}
                  type="button"
                  size="sm"
                  variant={activePreset === preset.id ? 'default' : 'outline'}
                  className={cn(
                    'h-9 rounded-md',
                    activePreset === preset.id && 'bg-royal-maroon text-white hover:bg-royal-maroon/90'
                  )}
                  onClick={() => setDraftRange(preset.range)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="h-9 min-w-[260px] justify-start rounded-md bg-white">
                  <CalendarDays className="mr-2 h-4 w-4 text-royal-maroon" />
                  {formatRangeLabel(draftRange)}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-0">
                <Calendar
                  mode="range"
                  numberOfMonths={2}
                  selected={toCalendarRange(draftRange)}
                  onSelect={(range) => {
                    if (!range?.from) return;
                    setDraftRange({
                      from: dateKey(range.from),
                      to: dateKey(range.to || range.from),
                    });
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <div className="flex gap-2">
              <Button type="button" className="h-9 rounded-md bg-royal-maroon text-white hover:bg-royal-maroon/90" onClick={applyRange}>
                Apply
              </Button>
              <Button type="button" variant="outline" className="h-9 rounded-md" onClick={resetRange}>
                Reset
              </Button>
              <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-md" onClick={loadAnalytics}>
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard title="Total Revenue" value={overviewCards.totalRevenue?.value ?? salesSummary.totalRevenue} type="currency" icon={IndianRupee} change={overviewCards.totalRevenue?.change} loading={loading} />
        <MetricCard title="Total Orders" value={overviewCards.totalOrders?.value ?? salesSummary.totalOrders} type="number" icon={ShoppingCart} change={overviewCards.totalOrders?.change} loading={loading} />
        <MetricCard title="Total Visitors" value={overviewCards.totalVisitors?.value ?? visitorSummary.uniqueVisitors} type="number" icon={Users} change={overviewCards.totalVisitors?.change} loading={loading} />
        <MetricCard title="Conversion Rate" value={overviewCards.conversionRate?.value} type="percent" icon={TrendingUp} change={overviewCards.conversionRate?.change} loading={loading} />
        <MetricCard title="Average Order Value" value={overviewCards.averageOrderValue?.value ?? salesSummary.averageOrderValue} type="currency" icon={CreditCard} change={overviewCards.averageOrderValue?.change} loading={loading} />
        <MetricCard title="Cart Abandonment" value={overviewCards.cartAbandonmentRate?.value ?? cartSummary.cartAbandonmentRate} type="percent" icon={Package} change={overviewCards.cartAbandonmentRate?.change} loading={loading} inverse loadingLabel="-" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8 space-y-6">
        <TabsList className="h-auto w-full justify-start gap-2 overflow-x-auto bg-transparent p-0">
          {['overview', 'visitors', 'products', 'sales', 'cart', 'categories', 'customers', 'search'].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-md border border-border bg-white px-4 py-2 text-sm capitalize text-muted-foreground data-[state=active]:border-royal-maroon data-[state=active]:bg-royal-maroon/10 data-[state=active]:text-royal-maroon"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <ChartCard title="Revenue by Date" description="Paid revenue and order count" loading={loading} className="xl:col-span-2">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748B" tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} stroke="#64748B" tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value, name) => [name === 'revenue' ? formatCurrency(value) : formatNumber(value), name]} />
                  <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#7A2638" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="orders" name="Orders" stroke="#256F5B" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Device Breakdown" description="Visitors by device" loading={loading}>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie data={deviceRows} dataKey="visitors" nameKey="device" innerRadius={74} outerRadius={112} paddingAngle={4}>
                    {deviceRows.map((entry, index) => (
                      <Cell key={entry.device || index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatNumber(value)} />
                </PieChart>
              </ResponsiveContainer>
              <LegendRows rows={deviceRows.map((row) => ({ label: row.device, value: row.visitors }))} />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <DataTable
              title="Top Products"
              columns={['Product', 'Views', 'Add to Cart', 'Purchases', 'Conversion']}
              rows={products.slice(0, 8).map((product) => [
                product.name || 'Unknown product',
                formatNumber(product.views),
                formatNumber(product.addToCart),
                formatNumber(product.purchases),
                formatPercent(product.conversionRate),
              ])}
              loading={loading}
            />
            <DataTable
              title="Top Categories"
              columns={['Category', 'Visits', 'Purchases', 'Revenue', 'Conversion']}
              rows={topCategories.slice(0, 8).map((category) => [
                category.name || category.slug || 'Uncategorized',
                formatNumber(category.visits),
                formatNumber(category.purchases),
                formatCurrency(category.revenue),
                formatPercent(category.conversionRate),
              ])}
              loading={loading}
            />
          </div>
        </TabsContent>

        <TabsContent value="visitors" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <MiniMetric label="Total Visitors" value={visitorSummary.totalVisitors ?? visitorSummary.uniqueVisitors} loading={loading} />
            <MiniMetric label="Unique Visitors" value={visitorSummary.uniqueVisitors} loading={loading} />
            <MiniMetric label="Page Views" value={visitorSummary.pageViews} loading={loading} />
            <MiniMetric label="Sessions" value={visitorSummary.sessions} loading={loading} />
            <MiniMetric label="New Visitors" value={visitorSummary.newVisitors} loading={loading} />
            <MiniMetric label="Returning Visitors" value={visitorSummary.returningVisitors} loading={loading} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ChartCard title="Daily Visitors" description="Unique visitors and page views" loading={loading}>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={visitorTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748B" tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} stroke="#64748B" tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => formatNumber(value)} />
                  <Line type="monotone" dataKey="visitors" name="Visitors" stroke="#7A2638" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="pageViews" name="Page Views" stroke="#2F5F98" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Traffic Sources" description="Direct, search, social, referral" loading={loading}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={sources}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="source" tick={{ fontSize: 11 }} stroke="#64748B" tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} stroke="#64748B" tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => formatNumber(value)} />
                  <Bar dataKey="visitors" name="Visitors" fill="#7A2638" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <DataTable title="Top Pages" columns={['Page', 'Visitors', 'Views']} rows={topPages.map((page) => [page.title || page.path, formatNumber(page.visitors), formatNumber(page.pageViews)])} loading={loading} />
            <DataTable title="Browsers" columns={['Browser', 'Visitors', 'Views']} rows={browsers.map((browser) => [browser.browser, formatNumber(browser.visitors), formatNumber(browser.pageViews)])} loading={loading} />
            <DataTable title="Locations" columns={['Location', 'Visitors', 'Views']} rows={locations.map((location) => [`${location.city || 'Unknown'}, ${location.region || location.country || 'Unknown'}`, formatNumber(location.visitors), formatNumber(location.pageViews)])} loading={loading} />
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-6 outline-none">
          <DataTable
            title="Product Analytics"
            columns={['Product Name', 'Views', 'Add to Cart', 'Removed', 'Purchases', 'Revenue', 'Conversion Rate']}
            rows={products.map((product) => [
              product.name || 'Unknown product',
              formatNumber(product.views),
              formatNumber(product.addToCart),
              formatNumber(product.removedFromCart),
              formatNumber(product.purchases),
              formatCurrency(product.revenue),
              formatPercent(product.conversionRate),
            ])}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="sales" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <MiniMetric label="Total Revenue" value={salesSummary.totalRevenue} format="currency" loading={loading} />
            <MiniMetric label="Total Orders" value={salesSummary.totalOrders} loading={loading} />
            <MiniMetric label="Paid Orders" value={salesSummary.paidOrders} loading={loading} />
            <MiniMetric label="Cancelled" value={salesSummary.cancelledOrders} loading={loading} />
            <MiniMetric label="Refunded" value={salesSummary.refundedOrders} loading={loading} />
            <MiniMetric label="AOV" value={salesSummary.averageOrderValue} format="currency" loading={loading} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ChartCard title="Orders by Date" description="Paid orders per day" loading={loading}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748B" tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} stroke="#64748B" tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => formatNumber(value)} />
                  <Bar dataKey="orders" name="Orders" fill="#256F5B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <DataTable title="Revenue by Payment Method" columns={['Method', 'Orders', 'Revenue']} rows={paymentRows.map((row) => [row.method || 'unknown', formatNumber(row.orders), formatCurrency(row.totalRevenue)])} loading={loading} />
          </div>
        </TabsContent>

        <TabsContent value="cart" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <MiniMetric label="Add to Cart" value={cartSummary.addToCart} loading={loading} />
            <MiniMetric label="Checkout Started" value={cartSummary.checkoutStarted} loading={loading} />
            <MiniMetric label="Payment Initiated" value={cartSummary.paymentInitiated} loading={loading} />
            <MiniMetric label="Payment Success" value={cartSummary.paymentSuccess} loading={loading} />
            <MiniMetric label="Payment Failed" value={cartSummary.paymentFailed} loading={loading} />
            <MiniMetric label="Checkout Abandonment" value={cartSummary.checkoutAbandonmentRate} format="percent" loading={loading} />
          </div>

          <ChartCard title="Checkout Funnel" description="Product view to payment success" loading={loading}>
            <div className="space-y-4">
              {funnelRows.map((step, index) => {
                const max = Math.max(...funnelRows.map((row) => numberValue(row.count)), 1);
                const width = Math.max((numberValue(step.count) / max) * 100, step.count ? 8 : 0);
                return (
                  <div key={step.step} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{index + 1}. {step.step}</span>
                      <span className="font-semibold text-royal-maroon">{formatNumber(step.count)}</span>
                    </div>
                    <div className="h-9 overflow-hidden rounded-md bg-slate-100">
                      <div className="h-full rounded-md bg-royal-maroon" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6 outline-none">
          <DataTable
            title="Category Analytics"
            columns={['Category', 'Visits', 'Visitors', 'Purchases', 'Revenue', 'Conversion Rate']}
            rows={categories.map((category) => [
              category.name || category.slug || 'Uncategorized',
              formatNumber(category.visits),
              formatNumber(category.visitors),
              formatNumber(category.purchases),
              formatCurrency(category.revenue),
              formatPercent(category.conversionRate),
            ])}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="customers" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <MiniMetric label="New Customers" value={data.customers?.summary?.newCustomers} loading={loading} />
            <MiniMetric label="Returning Customers" value={data.customers?.summary?.returningCustomers} loading={loading} />
            <MiniMetric label="Registered Users" value={data.customers?.summary?.registeredUsers} loading={loading} />
            <MiniMetric label="Guest Users" value={data.customers?.summary?.guestUsers} loading={loading} />
            <MiniMetric label="Repeat Purchase Rate" value={data.customers?.summary?.repeatPurchaseRate} format="percent" loading={loading} />
          </div>
          <DataTable title="Top Customers by Revenue" columns={['Customer', 'Email', 'Orders', 'Revenue']} rows={topCustomers.map((customer) => [customer.name || 'Customer', customer.email || '-', formatNumber(customer.orderCount), formatCurrency(customer.totalSpent)])} loading={loading} />
        </TabsContent>

        <TabsContent value="search" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <MiniMetric label="Total Searches" value={data.search?.summary?.totalSearches} loading={loading} />
            <MiniMetric label="No Result Searches" value={data.search?.summary?.noResultSearches} loading={loading} />
          </div>
          <DataTable
            title="Search Analytics"
            columns={['Keyword', 'Searches', 'No Result', 'Click Rate', 'Purchase Rate']}
            rows={searchKeywords.map((keyword) => [
              keyword.keyword || '-',
              formatNumber(keyword.searches),
              formatNumber(keyword.noResultSearches),
              formatPercent(keyword.searchToProductClickRate),
              formatPercent(keyword.searchToPurchaseRate),
            ])}
            loading={loading}
            emptyIcon={Search}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const MetricCard = ({ title, value, type = 'number', icon: Icon, change, loading, inverse = false }) => {
  const numericChange = Number(change);
  const hasChange = Number.isFinite(numericChange);
  const positive = inverse ? numericChange < 0 : numericChange >= 0;

  return (
    <Card className="border-border bg-white shadow-luxury-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="mt-3 h-8 w-28" />
            ) : (
              <p className="mt-2 truncate font-heading text-2xl font-bold text-foreground">{formatMetric(value, type)}</p>
            )}
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-royal-maroon/10 text-royal-maroon">
            <Icon className="h-5 w-5" />
          </span>
        </div>
        {!loading && hasChange && (
          <p className={cn('mt-3 text-sm font-medium', positive ? 'text-emerald-700' : 'text-rose-700')}>
            {numericChange > 0 ? '+' : ''}{numericChange.toFixed(1)}% compared to previous period
          </p>
        )}
      </CardContent>
    </Card>
  );
};

const MiniMetric = ({ label, value, format = 'number', loading }) => (
  <Card className="border-border bg-white shadow-luxury-sm">
    <CardContent className="p-5">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {loading ? (
        <Skeleton className="mt-3 h-7 w-24" />
      ) : (
        <p className="mt-2 font-heading text-2xl font-bold text-foreground">{formatMetric(value, format)}</p>
      )}
    </CardContent>
  </Card>
);

const ChartCard = ({ title, description, loading, children, className }) => (
  <Card className={cn('border-border bg-white shadow-luxury-sm', className)}>
    <CardHeader className="border-b border-border bg-slate-50">
      <CardTitle className="font-heading text-xl text-foreground">{title}</CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    <CardContent className="p-6">
      {loading ? <Skeleton className="h-[320px] w-full" /> : children}
    </CardContent>
  </Card>
);

const DataTable = ({ title, columns, rows, loading, emptyIcon: EmptyIcon = Package }) => (
  <Card className="border-border bg-white shadow-luxury-sm">
    <CardHeader className="border-b border-border bg-slate-50">
      <CardTitle className="font-heading text-xl text-foreground">{title}</CardTitle>
    </CardHeader>
    <CardContent className="p-0">
      {loading ? (
        <div className="space-y-3 p-5">
          {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-12 w-full" />)}
        </div>
      ) : rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-muted-foreground">
              <tr>
                {columns.map((column) => (
                  <th key={column} className="whitespace-nowrap px-5 py-3 font-semibold">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, rowIndex) => (
                <tr key={`${title}-${rowIndex}`} className="hover:bg-slate-50">
                  {row.map((cell, cellIndex) => (
                    <td key={`${title}-${rowIndex}-${cellIndex}`} className={cn('px-5 py-4', cellIndex === 0 ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex h-52 flex-col items-center justify-center gap-3 text-muted-foreground">
          <EmptyIcon className="h-8 w-8" />
          <p className="text-sm">No data for this date range.</p>
        </div>
      )}
    </CardContent>
  </Card>
);

const LegendRows = ({ rows }) => (
  <div className="mt-4 space-y-2">
    {rows.map((row, index) => (
      <div key={`${row.label}-${index}`} className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
          {row.label || 'unknown'}
        </span>
        <span className="font-semibold text-foreground">{formatNumber(row.value)}</span>
      </div>
    ))}
  </div>
);

export default AdminAnalyticsPage;
