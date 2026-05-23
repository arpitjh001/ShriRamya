import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';

/**
 * A wrapper component that only allows authenticated Admin users to access children.
 * If not authenticated, redirects to the /admin/dashboard (Admin Vault login page).
 */
const AdminProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();
    const [adminCheck, setAdminCheck] = useState('checking'); // 'checking' | 'admin' | 'denied' | 'login'

    const hasAdminRole = (candidate) => {
        if (!candidate) return false;
        const userRole = (candidate.role || '').toLowerCase();
        const userRoles = (candidate.roles || []).map(role => role.toLowerCase());
        return userRole === 'admin' || userRoles.includes('admin');
    };

    useEffect(() => {
        const verifyAdmin = async () => {
            if (loading) {
                setAdminCheck('checking');
                return;
            }

            if (!user) {
                setAdminCheck('login');
                return;
            }

            if (hasAdminRole(user)) {
                setAdminCheck('admin');
                return;
            }

            try {
                const res = await authAPI.checkAdmin();
                if (res.data && res.data.is_admin) {
                    setAdminCheck('admin');
                } else {
                    setAdminCheck('denied');
                }
            } catch (err) {
                console.error('Admin protection check failed:', err);
                if (err.response?.status === 401) {
                    setAdminCheck('login');
                } else {
                    setAdminCheck('denied');
                }
            }
        };

        verifyAdmin();
    }, [user, loading]);

    if (adminCheck === 'checking') {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-950 font-body">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal-maroon mx-auto"></div>
                    <p className="text-slate-400 font-medium uppercase tracking-[0.2em] text-xs">Authenticating Admin Session...</p>
                </div>
            </div>
        );
    }

    if (adminCheck === 'login') {
        // Redirect to admin dashboard (which has the login vault)
        // We preserve the current location to redirect back after login if the vault supports it
        return <Navigate to="/admin/dashboard" state={{ from: location }} replace />;
    }

    if (adminCheck === 'denied') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 font-body px-4">
                <div className="w-full max-w-md p-8 rounded-3xl border border-rose-500/20 bg-slate-900/40 shadow-rose-900/40 backdrop-blur-xl text-center space-y-6">
                    <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/20 mb-2">
                        <span className="text-4xl">🚫</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-heading font-bold text-rose-400">Access Restricted</h1>
                        <p className="text-slate-400 mt-2 text-sm leading-relaxed">
                            Your account is not authorized to access this administrative section.
                        </p>
                    </div>
                    <Navigate to="/admin/dashboard" />
                </div>
            </div>
        );
    }

    return children;
};

export default AdminProtectedRoute;
