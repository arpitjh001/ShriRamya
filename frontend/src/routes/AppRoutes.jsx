import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';

// Loading fallback component
const PageLoader = () => (
    <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
);

// Lazy load pages for code splitting
const HomePage = lazy(() => import('../pages/HomePage'));
const ProductsPage = lazy(() => import('../pages/ProductsPage'));
const ProductDetailPage = lazy(() => import('../pages/ProductDetailPage'));
const CartPage = lazy(() => import('../pages/CartPage'));
const CheckoutPage = lazy(() => import('../pages/CheckoutPage'));
const OrderSuccessPage = lazy(() => import('../pages/OrderSuccessPage'));
const AccountPage = lazy(() => import('../pages/AccountPage'));
const WishlistPage = lazy(() => import('../pages/WishlistPage'));
const RegionalCollectionsPage = lazy(() => import('../pages/RegionalCollectionsPage'));
const LuxuryCollectionPage = lazy(() => import('../pages/LuxuryCollectionPage'));
const LookbookPage = lazy(() => import('../pages/LookbookPage'));
const BlogPage = lazy(() => import('../pages/BlogPage'));
const BlogPostPage = lazy(() => import('../pages/BlogPostPage'));
const SanganeriBlogPost = lazy(() => import('../pages/SanganeriBlogPost'));
const BlogCreatePage = lazy(() => import('../pages/BlogCreatePage'));
const AdminBlogEditPage = lazy(() => import('../pages/AdminBlogEditPage'));
const AboutPage = lazy(() => import('../pages/AboutPage'));
const TrackOrderPage = lazy(() => import('../pages/TrackOrderPage'));
const FabricCarePage = lazy(() => import('../pages/FabricCarePage'));
const ContactPage = lazy(() => import('../pages/ContactPage'));
const AdminDashboardPage = lazy(() => import('../pages/AdminWooCommercePage'));
const AllProductsPage = lazy(() => import('../pages/AllProductsPage'));
const CategoryPage = lazy(() => import('../pages/CategoryPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

// NEW Phase 10 Admin Pages - Lazy loaded
const AdminProductsPage = lazy(() => import('../pages/AdminProductsPage'));
const AdminInventoryPage = lazy(() => import('../pages/AdminInventoryPage'));
const AdminCouponsPage = lazy(() => import('../pages/AdminCouponsPage'));
const AdminOrdersPage = lazy(() => import('../pages/AdminOrdersPage'));
const AdminAnalyticsPage = lazy(() => import('../pages/AdminAnalyticsPage'));
const AdminBlogsPage = lazy(() => import('../pages/AdminBlogsPage'));

const AppRoutes = () => {
    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
                <Route element={<MainLayout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/products/:id" element={<ProductDetailPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/order-success/:orderId" element={<OrderSuccessPage />} />
                    <Route path="/account" element={<AccountPage />} />
                    <Route path="/wishlist" element={<WishlistPage />} />
                    <Route path="/regional-collections" element={<RegionalCollectionsPage />} />
                    <Route path="/luxury-collection" element={<LuxuryCollectionPage />} />
                    <Route path="/lookbook" element={<LookbookPage />} />
                    <Route path="/blog" element={<BlogPage />} />
                    <Route path="/blog/:slug" element={<BlogPostPage />} />
                    <Route path="/blog/sanganeri-print" element={<SanganeriBlogPost />} />
                    <Route path="/admin/blog/new" element={<BlogCreatePage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/track-order" element={<TrackOrderPage />} />
                    <Route path="/fabric-care" element={<FabricCarePage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                    <Route path="/admin/products" element={<AdminProductsPage />} />
                    <Route path="/admin/inventory" element={<AdminInventoryPage />} />
                    <Route path="/admin/coupons" element={<AdminCouponsPage />} />
                    <Route path="/admin/orders" element={<AdminOrdersPage />} />
                    <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
                    <Route path="/admin/blogs" element={<AdminBlogsPage />} />
                    <Route path="/admin/blog/:id/edit" element={<AdminBlogEditPage />} />
                    <Route path="/all-products" element={<AllProductsPage />} />
                    <Route path="/category/:slug" element={<CategoryPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                </Route>
            </Routes>
        </Suspense>
    );
};

export default AppRoutes;
