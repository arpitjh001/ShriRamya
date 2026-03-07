import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';

// Pages
import HomePage from '../pages/HomePage';
import ProductsPage from '../pages/ProductsPage';
import ProductDetailPage from '../pages/ProductDetailPage';
import CartPage from '../pages/CartPage';
import CheckoutPage from '../pages/CheckoutPage';
import OrderSuccessPage from '../pages/OrderSuccessPage';
import AccountPage from '../pages/AccountPage';
import WishlistPage from '../pages/WishlistPage';
import RegionalCollectionsPage from '../pages/RegionalCollectionsPage';
import LuxuryCollectionPage from '../pages/LuxuryCollectionPage';
import LookbookPage from '../pages/LookbookPage';
import BlogPage from '../pages/BlogPage';
import BlogPostPage from '../pages/BlogPostPage';
import BlogCreatePage from '../pages/BlogCreatePage';
import AdminBlogEditPage from '../pages/AdminBlogEditPage';
import AboutPage from '../pages/AboutPage';
import TrackOrderPage from '../pages/TrackOrderPage';
import FabricCarePage from '../pages/FabricCarePage';
import ContactPage from '../pages/ContactPage';
import AdminWooCommercePage from '../pages/AdminWooCommercePage';
import AllProductsPage from '../pages/AllProductsPage';
import CategoryPage from '../pages/CategoryPage';

// NEW Phase 10 Admin Pages
import AdminProductsPage from '../pages/AdminProductsPage';
import AdminInventoryPage from '../pages/AdminInventoryPage';
import AdminCouponsPage from '../pages/AdminCouponsPage';
import AdminOrdersPage from '../pages/AdminOrdersPage';
import AdminAnalyticsPage from '../pages/AdminAnalyticsPage';

const AppRoutes = () => {
    return (
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
                <Route path="/admin/blog/new" element={<BlogCreatePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/track-order" element={<TrackOrderPage />} />
                <Route path="/fabric-care" element={<FabricCarePage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/admin/woocommerce" element={<AdminWooCommercePage />} />
                <Route path="/admin/blog/:id/edit" element={<AdminBlogEditPage />} />
                <Route path="/all-products" element={<AllProductsPage />} />
                <Route path="/category/:slug" element={<CategoryPage />} />
            </Route>
        </Routes>
    );
};

export default AppRoutes;
