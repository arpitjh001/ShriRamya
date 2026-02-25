import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import AccountPage from './pages/AccountPage';
import WishlistPage from './pages/WishlistPage';
import RegionalCollectionsPage from './pages/RegionalCollectionsPage';
import LuxuryCollectionPage from './pages/LuxuryCollectionPage';
import LookbookPage from './pages/LookbookPage';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';
import AdminBlogEditPage from './pages/AdminBlogEditPage';
import AboutPage from './pages/AboutPage';
import TrackOrderPage from './pages/TrackOrderPage';
import FabricCarePage from './pages/FabricCarePage';
import ContactPage from './pages/ContactPage';
import AdminWooCommercePage from './pages/AdminWooCommercePage';
import AllProductsPage from './pages/AllProductsPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <div className="App min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
              <Routes>
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
                <Route path="/blog/:id" element={<BlogPostPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/track-order" element={<TrackOrderPage />} />
                <Route path="/fabric-care" element={<FabricCarePage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/admin/woocommerce" element={<AdminWooCommercePage />} />
                <Route path="/admin/blog/:id/edit" element={<AdminBlogEditPage />} />
                <Route path="/all-products" element={<AllProductsPage />} />
              </Routes>
            </main>
            <Footer />
            <Toaster position="top-center" richColors />
          </div>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
