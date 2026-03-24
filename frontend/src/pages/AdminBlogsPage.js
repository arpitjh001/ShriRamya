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

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = filterStatus !== 'all' ? { status: filterStatus } : {};
            if (searchQuery) params.search = searchQuery;

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
        if (!window.confirm('Are you sure you want to delete this story?')) return;
        try {
            await blogAPI.deletePost(postId);
            toast.success('Story deleted');
            setPosts(posts.filter(p => p.id !== postId));
        } catch (error) {
            toast.error('Delete failed');
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
        <div className="px-6 md:px-12 lg:px-24 py-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-heading font-medium tracking-tight mb-2">Journal Dashboard</h1>
                    <p className="text-muted-foreground italic">Curate and manage the stories of Shri Ramya heritage.</p>
                </div>
                <div className="flex gap-4">
                    <Button asChild className="rounded-full px-6">
                        <Link to="/admin/blog/new">
                            <Plus className="w-4 h-4 mr-2" /> New Story
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Quick Stats - Part 10 Integration */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Eye className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Total Views</p>
                                <p className="text-2xl font-heading font-medium">
                                    {stats.monthlyStats?.reduce((acc, curr) => acc + curr.views, 0) || 0}
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* Additional stats... */}
                </div>
            )}

            {/* Controls */}
            <div className="flex flex-col lg:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search stories..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                    />
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 sm:pb-0">
                    {['all', 'draft', 'review', 'published', 'archived'].map((s) => (
                        <button
                            key={s}
                            onClick={() => { setFilterStatus(s); fetchData(); }}
                            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all whitespace-nowrap ${filterStatus === s
                                    ? 'bg-primary text-primary-foreground border-primary shadow-md'
                                    : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                                }`}
                        >
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table Area */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/30 border-b border-border">
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Entry Details</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Author</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Stats</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-2" />
                                        <p className="text-muted-foreground">Loading journal entries...</p>
                                    </td>
                                </tr>
                            ) : posts.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center">
                                        <p className="text-muted-foreground italic">No stories found matching your criteria.</p>
                                    </td>
                                </tr>
                            ) : posts.map((post) => (
                                <tr key={post.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                                <img src={post.featured_image || '/api/placeholder/64/40'} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground mb-0.5 line-clamp-1">{post.title}</p>
                                                <p className="text-xs text-muted-foreground">{new Date(post.published_at || post.created_at).toDateString()}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getStatusStyle(post.status)}`}>
                                            {post.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-medium">{post.author_name || 'System'}</p>
                                        <p className="text-[10px] text-muted-foreground">Shri Ramya Curators</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3 text-muted-foreground">
                                            <div className="flex items-center gap-1" title="Views">
                                                <Eye className="w-3.5 h-3.5" />
                                                <span className="text-xs">{post.view_count || 0}</span>
                                            </div>
                                            <div className="flex items-center gap-1" title="Reading Time">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span className="text-xs">{post.reading_time || 0}m</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button asChild variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
                                                <Link to={`/admin/blog/${post.id}/edit`}>
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                            </Button>
                                            <div className="h-4 w-px bg-border mx-1" />
                                            {post.status !== 'published' && (
                                                <Button onClick={() => handleStatusMove(post.id, 'published')} variant="ghost" size="icon" title="Publish" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50">
                                                    <CheckCircle className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {post.status === 'published' && (
                                                <Button onClick={() => handleStatusMove(post.id, 'archived')} variant="ghost" size="icon" title="Archive" className="h-8 w-8 text-slate-500 hover:bg-slate-50">
                                                    <Archive className="w-4 h-4" />
                                                </Button>
                                            )}
                                            <Button onClick={() => handleDelete(post.id)} variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminBlogsPage;
