import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Toaster } from 'sonner';

const MainLayout = () => {
    const location = useLocation();
    const isHome = location.pathname === '/';

    return (
        <div className="App min-h-screen flex flex-col">
            <Navbar isHome={isHome} />
            {/* 
                Main content overlaps under the floating Navbar on HomePage, 
                but uses padding for safe clearance on other pages.
            */}
            <main className="flex-1">
                <Outlet />
            </main>
            <Footer />
            <Toaster position="top-center" richColors />
        </div>
    );
};

export default MainLayout;
