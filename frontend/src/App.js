import React from 'react';
import { Analytics } from '@vercel/analytics/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import VercelVisitTracker from './components/analytics/VercelVisitTracker';
import ScrollToTop from './components/ScrollToTop';
import AppRoutes from './routes/AppRoutes';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <CartProvider>
          <VercelVisitTracker />
          <AppRoutes />
          <Analytics />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
