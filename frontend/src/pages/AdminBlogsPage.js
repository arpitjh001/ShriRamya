import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { blogAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import {
    Loader2, Plus, Search, Filter, MoreVertical,
    Edit, Trash2, CheckCircle, Archive, Eye,
    BarChart2, MessageSquare, Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminBlogsPage = () => {
    const navigate = useNavigate();
    const { user, capabilities, loading: authLoading, isAdmin } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const canDelete = Boolean(capabilities?.delete_posts) || (typeof isAdmin === 'function' && isAdmin());

    useEffect(() => {
        if (authLoading) return;
        
        // Wait for user to be loaded
        if (!user) {
            // If auth is done loading but no user, redirect
            navigate('/blog');
            return;
        }
        
        // Check if user is admin by role (more reliable than capabilities)
        const userRole = user?.role?.toLowerCase();
        const userRoles = user?.roles?.map(r => r.toLowerCase()) || [];
        const isUserAdmin = userRoles.includes('admin') || userRole === 'admin';
        
        if (!capabilities.edit_posts && !isUserAdmin) {
            toast.error('Access denied');
            navigate('/blog');
            return;
        }
        fetchData();
        fetchAnalytics();
    }, [capabilities, navigate, authLoading, user]);

    const fetchData = async (overrides = {}) => {
        setLoading(true);
        try {
            const status = overrides.status ?? filterStatus;
            const search = overrides.search ?? searchQuery;
            const params = { status: status === 'all' ? 'all' : status };
            if (search) params.search = search;

            const response = await blogAPI.getPosts(params);
            setPosts(response.data.posts || []);
        } catch (error) {
            toast.error('Failed to load journal entries');
        } finally {
            setLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const response = await blogAPI.getAnalytics();
            setStats(response.data);
        } catch (err) {
            console.error('Failed to fetch analytics');
        }
    };

    const handleDelete = async (postId) => {
        if (!canDelete) {
            toast.error('Only admins can delete stories');
            return;
        }
        if (!window.confirm('Are you sure you want to delete this story?')) return;
        try {
            await blogAPI.deletePost(postId);
            toast.success('Story deleted');
            setPosts((prev) => prev.filter((p) => p.id !== postId));
        } catch (error) {
            toast.error(error?.response?.data?.message || error?.message || 'Delete failed');
        }
    };

    const handleStatusMove = async (postId, newStatus) => {
        try {
            if (newStatus === 'published') await blogAPI.publishPost(postId);
            else if (newStatus === 'archived') await blogAPI.archivePost(postId);
            toast.success(`Entry moved to ${newStatus}`);
            fetchData();
        } catch (err) {
            toast.error('Failed to change status');
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'published': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'review': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'archived': return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-blue-100 text-blue-700 border-blue-200';
        }
    };

    return (
        <div className="admin-dashboard-shell p-4 md:p-8 space-y-8 animate-fade-in min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-heading font-bold tracking-tight text-foreground mb-2">Heritage <span className="text-royal-maroon">Journal</span></h1>
                    <p className="text-muted-foreground italic font-medium">Curate and manage the stories of Shri Ramya heritage.</p>
                </div>
                <div className="flex gap-4">
                    <Button asChild className="rounded-xl px-6 bg-royal-maroon hover:bg-royal-maroon/90 shadow-luxury transition-all active:scale-95 border-none">
                        <Link to="/admin/blog/new">
                            <Plus className="w-4 h-4 mr-2" /> New Story
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white border border-border p-6 rounded-2xl shadow-luxury-sm group hover:border-royal-gold/30 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-royal-gold/10 flex items-center justify-center border border-royal-gold/20 group-hover:scale-110 transition-transform">
                                <Eye className="w-6 h-6 text-royal-gold" />
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Global Views</p>
                                <p className="text-2xl font-heading font-bold text-foreground">
                                    {stats.total_views || stats.monthlyStats?.reduce((acc, curr) => acc + curr.views, 0) || 0}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white border border-border p-6 rounded-2xl shadow-luxury-sm group hover:border-emerald-500/30 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                                <CheckCircle className="w-6 h-6 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Published</p>
                                <p className="text-2xl font-heading font-bold text-foreground">
                                    {posts.filter(p => p.status === 'published').length}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-border p-6 rounded-2xl shadow-luxury-sm group hover:border-royal-maroon/30 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-royal-maroon/10 flex items-center justify-center border border-royal-maroon/20 group-hover:scale-110 transition-transform">
                                <MessageSquare className="w-6 h-6 text-royal-maroon" />
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Total Stories</p>
                                <p className="text-2xl font-heading font-bold text-foreground">{posts.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-border p-6 rounded-2xl shadow-luxury-sm group hover:border-amber-500/30 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
                                <BarChart2 className="w-6 h-6 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Engagement</p>
                                <p className="text-2xl font-heading font-bold text-foreground">High</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="flex flex-col lg:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search heritage stories..."
                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-border bg-white text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-royal-maroon/20 focus:border-royal-maroon/50 outline-none transition-all font-medium shadow-luxury-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchData({ search: e.currentTarget.value })}
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 w-full lg:w-auto Scrollbar-hide">
                    {['all', 'draft', 'review', 'published', 'archived'].map((s) => (
                        <button
                            key={s}
                            onClick={() => {
                                setFilterStatus(s);
                                fetchData({ status: s });
                            }}
                            className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all whitespace-nowrap ${filterStatus === s
                                    ? 'bg-royal-maroon text-white border-royal-maroon/50 shadow-lg'
                                    : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/20 hover:text-white'
                                }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table Area */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-luxury">
                <div className="overflow-x-auto overflow-y-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Story Entry</th>
                                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Current Status</th>
                                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Curator</th>
                                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Analytics</th>
                                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 text-right">Vault Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <Loader2 className="w-10 h-10 animate-spin text-royal-maroon" />
                                            <p className="text-slate-500 font-medium uppercase tracking-widest text-xs">Unlocking Journal Vault...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : posts.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-20 text-center">
                                        <div className="max-w-xs mx-auto space-y-4">
                                            <div className="text-4xl opacity-20 grayscale">📜</div>
                                            <p className="text-slate-500 italic font-medium">The archives are empty. No stories match your search criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : posts.map((post) => {
                                const thumbnail =
                                    post.featured_image ||
                                    post.featuredImage ||
                                    post.image ||
                                    (Array.isArray(post.images) ? post.images.find(Boolean) : '') ||
                                    '';

                                return (
                                <tr key={post.id} className="group hover:bg-white/[0.03] transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-20 h-12 rounded-xl border border-white/10 overflow-hidden bg-slate-800 flex-shrink-0 relative">
                                                {thumbnail ? (
                                                    <img src={thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                ) : (
                                                    <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                                                        <span className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">Shri Ramya</span>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                            </div>
                                            <div>
                                                <p className="font-heading font-bold text-white mb-1 line-clamp-1 group-hover:text-royal-gold transition-colors">{post.title}</p>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-3 h-3 text-slate-600" />
                                                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                                                        {new Date(post.publishedAt || post.published_at || post.createdAt || post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        {(() => {
                                            const status = post.status?.toLowerCase() || 'draft';
                                            const colors = {
                                                published: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                                                draft: 'bg-slate-500/10 text-slate-400 border-white/10',
                                                review: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                                                archived: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                            };
                                            return (
                                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-[0.15em] border ${colors[status] || colors.draft}`}>
                                                    {status}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-xs font-bold text-slate-300 uppercase tracking-wide">{post.author?.name || post.author_name || 'System Curator'}</p>
                                        <p className="text-[10px] text-slate-500 italic">Heritage Specialist</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5" title="Views">
                                                <Eye className="w-3.5 h-3.5 text-slate-600" />
                                                <span className="text-xs font-mono font-medium text-slate-400">{post.views || post.view_count || 0}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5" title="Reading Time">
                                                <Clock className="w-3.5 h-3.5 text-slate-600" />
                                                <span className="text-xs font-mono font-medium text-slate-400">{post.reading_time || Math.ceil((post.content?.length || 0)/1500) || 5}m</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button asChild variant="ghost" size="icon" className="h-9 w-9 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-slate-400 hover:text-royal-gold rounded-xl transition-all border-none">
                                                <Link to={`/admin/blog/${post.id}/edit`}>
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                            </Button>
                                            
                                            <div className="w-px h-6 bg-white/10 mx-1" />

                                            {post.status !== 'published' && (
                                                <Button 
                                                    onClick={() => handleStatusMove(post.id, 'published')} 
                                                    variant="ghost" size="icon" 
                                                    className="h-9 w-9 bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition-all border-none"
                                                    title="Vault: Publish"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {post.status === 'published' && (
                                                <Button 
                                                    onClick={() => handleStatusMove(post.id, 'archived')} 
                                                    variant="ghost" size="icon" 
                                                    className="h-9 w-9 bg-slate-500/5 border border-white/10 hover:bg-white/10 text-slate-400 rounded-xl transition-all border-none"
                                                    title="Vault: Archive"
                                                >
                                                    <Archive className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {canDelete && (
                                                <Button 
                                                    onClick={() => handleDelete(post.id)} 
                                                    variant="ghost" size="icon" 
                                                    className="h-9 w-9 bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-all border-none"
                                                    title="Vault: Purge"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

    );
};

export default AdminBlogsPage;
