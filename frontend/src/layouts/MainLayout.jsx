import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Toaster } from 'sonner';

const MainLayout = () => {
    return (
        <div className="App min-h-screen flex flex-col">
            <Navbar />
            {/* 
                Main content with padding-top to account for fixed Navbar
                Navbar height: ~100px on mobile, ~120px on desktop
                Using pt-28 (112px) mobile, pt-36 (144px) desktop for safe clearance
            */}
            <main className="flex-1 pt-28 md:pt-36">
                <Outlet />
            </main>
            <Footer />
            <Toaster position="top-center" richColors />
        </div>
    );
};

export default MainLayout;
