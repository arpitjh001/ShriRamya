import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Toaster } from 'sonner';

const MainLayout = () => {
    return (
        <div className="App min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
                <Outlet />
            </main>
            <Footer />
            <Toaster position="top-center" richColors />
        </div>
    );
};

export default MainLayout;
