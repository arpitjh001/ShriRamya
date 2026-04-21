import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useParams, useNavigate } from 'react-router-dom';
import { blogAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Image as ImageIcon, Save, Check, Plus, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminBlogEditPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, capabilities, loading: authLoading, isAdmin } = useAuth();
    const fileInputRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    const [categories, setCategories] = useState([]);
    const [featuredImageUrl, setFeaturedImageUrl] = useState('');

    const [postData, setPostData] = useState({
        title: '',
        slug: '',
        content: '',
        excerpt: '',
        status: 'draft',
        categories: [],
        tags: [],
        seoTitle: '',
        seoDescription: '',
        featuredImage: '',
        images: [],
        isJournal: false
    });
    const [tagsInput, setTagsInput] = useState('');

    const quillRef = useRef(null);

    const quillImageHandler = () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;

            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('category', 'blogs');
                const response = await blogAPI.api.post('/upload/image', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                
                if (response.data) {
                    const uploaded = response.data;
                    const imageUrl = uploaded.medium || uploaded.original || uploaded.url;
                    if (imageUrl) {
                        const quill = quillRef.current.getEditor();
                        const range = quill.getSelection(true) || { index: quill.getLength() };
                        quill.insertEmbed(range.index, 'image', imageUrl);
                    }
                }
            } catch (error) {
                console.error('Editor image upload failed:', error);
                toast.error('Failed to upload image into editor');
            }
        };
    };

    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
                [{ 'align': [] }, { 'color': [] }, { 'background': [] }],
                ['link', 'image', 'video'],
                ['clean']
            ],
            handlers: {
                image: quillImageHandler
            }
        }
    }), []);

    useEffect(() => {
        if (authLoading) return;

        // Wait for user to be loaded
        if (!user) {
            navigate('/blog');
            return;
        }

        // Check if user is admin by role
        const userRole = user?.role?.toLowerCase();
        const userRoles = user?.roles?.map(r => r.toLowerCase()) || [];
        const isUserAdmin = userRoles.includes('admin') || userRole === 'admin';

        // RBAC check
        if (!capabilities.edit_posts && !capabilities.edit_others_posts && !isUserAdmin) {
            toast.error('Insufficient permissions to edit stories');
            navigate('/blog');
            return;
        }

        const fetchData = async () => {
            try {
                const [postRes, catRes] = await Promise.all([
                    blogAPI.getPostById(id),
                    blogAPI.getCategories()
                ]);

                if (catRes.data) {
                    setCategories(catRes.data);
                }

                if (postRes.data) {
                    const p = postRes.data;

                    setPostData({
                        title: p.title || '',
                        slug: p.slug || '',
                        content: p.content || '',
                        excerpt: p.excerpt || '',
                        status: p.status || 'draft',
                        categories: p.categories || [],
                        tags: p.tags || [],
                        seoTitle: p.seo_title || p.meta_title || '',
                        seoDescription: p.seo_description || p.meta_description || '',
                        featuredImage: p.featured_image || '',
                        images: p.images || [],
                        isJournal: p.isJournal || false
                    });
                    setTagsInput(p.tags ? p.tags.join(', ') : '');
                    setFeaturedImageUrl(p.featured_image || '');
                }
            } catch (error) {
                console.error('Failed to load post data:', error);
                toast.error('Failed to load post data for editing');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, user, navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setPostData(prev => ({ ...prev, [name]: value }));
    };

    const handleCategoryChange = (catId) => {
        setPostData(prev => {
            const currentCats = Array.isArray(prev.categories) ? prev.categories : [];
            const isSelected = currentCats.includes(catId);
            if (isSelected) {
                return { ...prev, categories: currentCats.filter(c => c !== catId) };
            } else {
                return { ...prev, categories: [...currentCats, catId] };
            }
        });
    };

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        try {
            setUploadingImage(true);
            const uploadedUrls = [];
            
            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('category', 'blogs');
                const res = await blogAPI.api.post('/upload/image', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                if (res.data) {
                    const uploaded = res.data;
                    const imageUrl = uploaded.medium || uploaded.original || uploaded.url;
                    if (imageUrl) uploadedUrls.push(imageUrl);
                }
            }

            if (uploadedUrls.length > 0) {
                setPostData(prev => {
                    if (!prev.featuredImage) {
                        return { 
                            ...prev, 
                            featuredImage: uploadedUrls[0],
                            images: [...(prev.images || []), ...uploadedUrls.slice(1)]
                        };
                    } else {
                        return { 
                            ...prev, 
                            images: [...(prev.images || []), ...uploadedUrls]
                        };
                    }
                });
                
                if (!postData.featuredImage) {
                    setFeaturedImageUrl(uploadedUrls[0]);
                }
                toast.success("Image(s) uploaded successfully");
            }
        } catch (error) {
            console.error('Failed to upload image:', error);
            toast.error('Image upload failed');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);

        const finalData = {
            ...postData,
            tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean)
        };

        try {
            await blogAPI.updatePost(id, finalData);
            toast.success('Journal entry updated successfully!');
            navigate('/admin/blogs');
        } catch (error) {
            console.error('Update failed:', error);
            toast.error('Failed to update journal entry');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-24">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white font-body selection:bg-royal-maroon/30 pb-20">
            {/* Background Accent */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-royal-maroon/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-royal-gold/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 px-4 md:px-8 lg:px-12 py-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
                    <div className="space-y-4">
                        <button 
                            onClick={() => navigate('/admin/dashboard')} 
                            className="group flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-royal-gold transition-colors"
                        >
                            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> 
                            Back to Sanctuary Dashboard
                        </button>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-heading font-bold text-white tracking-tight">
                                Edit <span className="text-royal-maroon">Heritage</span> Story
                            </h1>
                            <p className="text-slate-400 italic mt-1 font-medium">Refining the chronicles of timeless elegance.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <Button 
                            onClick={() => navigate('/admin/blogs')} 
                            variant="ghost" 
                            className="rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 px-6 border-none"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSave} 
                            disabled={saving} 
                            className="rounded-xl bg-royal-maroon hover:bg-royal-maroon/90 text-white px-8 h-12 shadow-luxury font-bold transition-all active:scale-95 disabled:opacity-50 border-none"
                        >
                            {saving ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sealing...</>
                            ) : (
                                <><Save className="w-4 h-4 mr-2" /> Seal Story</>
                            )}
                        </Button>
                    </div>
                </div>

                <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main Content Column */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Title & Slug Card */}
                        <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-3xl p-6 md:p-8 shadow-luxury space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 ml-1">Archive Entry Title</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={postData.title}
                                    onChange={handleInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xl font-heading font-bold text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-royal-maroon/20 focus:border-royal-maroon/40 transition-all shadow-inner"
                                    placeholder="The Tale of the Crimson Saree..."
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 ml-1">Permanent Resource Identifier (Slug)</label>
                                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 group focus-within:ring-2 focus-within:ring-royal-maroon/20 transition-all">
                                    <span className="text-slate-600 text-sm font-mono select-none">/blog/</span>
                                    <input
                                        type="text"
                                        name="slug"
                                        value={postData.slug}
                                        onChange={handleInputChange}
                                        className="flex-1 bg-transparent border-none text-slate-300 font-mono text-sm focus:outline-none"
                                        placeholder="timeless-heritage-crimson"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Editor Card */}
                        <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-luxury relative min-h-[600px] flex flex-col">
                            <div className="p-6 border-b border-white/10 bg-white/5">
                                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-royal-gold">Story Narrative (Chronicles)</label>
                            </div>
                            
                            {/* Dark Mode Quill Wrapper */}
                            <div className="flex-1 quill-dark-container">
                                <style>{`
                                    .quill-dark-container .ql-toolbar {
                                        background: rgba(255, 255, 255, 0.02);
                                        border: none !important;
                                        border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
                                        padding: 12px 20px !important;
                                    }
                                    .quill-dark-container .ql-container {
                                        border: none !important;
                                        font-family: 'Inter', sans-serif !important;
                                        font-size: 16px !important;
                                        color: #e2e8f0 !important;
                                    }
                                    .quill-dark-container .ql-editor {
                                        padding: 30px !important;
                                        min-height: 450px !important;
                                        line-height: 1.8 !important;
                                    }
                                    .quill-dark-container .ql-editor.ql-blank::before {
                                        color: rgba(255, 255, 255, 0.1) !important;
                                        font-style: italic !important;
                                    }
                                    .quill-dark-container .ql-stroke {
                                        stroke: #94a3b8 !important;
                                    }
                                    .quill-dark-container .ql-fill {
                                        fill: #94a3b8 !important;
                                    }
                                    .quill-dark-container .ql-picker {
                                        color: #94a3b8 !important;
                                    }
                                    .quill-dark-container .ql-picker-options {
                                        background-color: #0f172a !important;
                                        border: 1px solid rgba(255,255,255,0.1) !important;
                                        color: #e2e8f0 !important;
                                    }
                                `}</style>
                                <ReactQuill 
                                    ref={quillRef}
                                    theme="snow" 
                                    value={postData.content} 
                                    onChange={(val) => setPostData(prev => ({ ...prev, content: val }))} 
                                    modules={modules}
                                    className="h-full"
                                />
                            </div>
                        </div>

                        {/* Excerpt Card */}
                        <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-3xl p-6 md:p-8 shadow-luxury space-y-4">
                            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 ml-1">Abridged Narrative (Summary)</label>
                            <textarea
                                name="excerpt"
                                value={postData.excerpt}
                                onChange={handleInputChange}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-slate-300 placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-royal-maroon/20 focus:border-royal-maroon/40 transition-all resize-none h-32 leading-relaxed font-body"
                                placeholder="A brief whisper of the story to entice the readers..."
                            />
                        </div>

                        {/* SEO Card */}
                        <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-3xl p-6 md:p-8 shadow-luxury space-y-6">
                            <div className="flex items-center gap-3 pb-4 border-b border-white/5 mb-2">
                                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                    <Search className="w-4 h-4 text-emerald-500" />
                                </div>
                                <h3 className="font-heading font-bold text-white uppercase tracking-widest text-xs">Search Visibility (SEO)</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 ml-1">Public Archive Index Title</label>
                                    <input
                                        type="text"
                                        name="seoTitle"
                                        value={postData.seoTitle}
                                        onChange={handleInputChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-slate-300 placeholder:text-slate-700 focus:outline-none focus:border-royal-gold/40 transition-all font-medium"
                                        placeholder="Title for Global Search Engines"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 ml-1">Public Archive Description</label>
                                    <textarea
                                        name="seoDescription"
                                        value={postData.seoDescription}
                                        onChange={handleInputChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-slate-300 placeholder:text-slate-700 focus:outline-none focus:border-royal-gold/40 transition-all h-24 resize-none text-sm font-medium font-body"
                                        placeholder="A concise summary for public search results..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Column */}
                    <div className="lg:col-span-4 space-y-8">
                        {/* Status Widget */}
                        <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-luxury space-y-4">
                            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-2">
                                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Chronicle Status</label>
                                {(() => {
                                    const status = postData.status?.toLowerCase() || 'draft';
                                    const dotColor = status === 'published' ? 'bg-emerald-500' : status === 'review' ? 'bg-amber-500' : 'bg-slate-500';
                                    return <div className={`w-2 h-2 rounded-full ${dotColor} animate-pulse`} />;
                                })()}
                            </div>
                            <select
                                name="status"
                                value={postData.status}
                                onChange={handleInputChange}
                                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-royal-maroon/50 appearance-none cursor-pointer hover:bg-slate-800 transition-colors"
                            >
                                <option value="draft" className="bg-slate-900 text-white">Draft (Sanctuary Only)</option>
                                <option value="review" className="bg-slate-900 text-white">Under Review (Curator Check)</option>
                                <option value="published" className="bg-slate-900 text-white">Published (Public Archives)</option>
                                <option value="archived" className="bg-slate-900 text-white">Archived (Locked Vault)</option>
                            </select>
                        </div>

                        {/* Heritage Style Toggle */}
                        <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-luxury group transition-all">
                            <label className="flex items-center gap-4 cursor-pointer">
                                <div className={`relative w-12 h-6 rounded-full transition-colors border border-white/10 ${postData.isJournal ? 'bg-royal-maroon/40' : 'bg-slate-800'}`}>
                                    <input 
                                        type="checkbox" 
                                        className="sr-only outline-none"
                                        checked={postData.isJournal}
                                        onChange={(e) => setPostData(prev => ({ ...prev, isJournal: e.target.checked }))}
                                    />
                                    <div className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full transition-transform duration-300 ${postData.isJournal ? 'translate-x-6' : 'translate-x-0'}`} />
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300 select-none group-hover:text-white">Heritage Format</span>
                                    <p className="text-[9px] text-slate-500 italic leading-tight">Enable premium editorial typography and ivory layouts.</p>
                                </div>
                            </label>
                        </div>

                        {/* Imagery Widget */}
                        <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-luxury space-y-6">
                            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                                <ImageIcon className="w-3.5 h-3.5 text-royal-gold" /> Visual Chronicles
                            </label>
                            
                            <div className="space-y-4">
                                <div>
                                    <div className="flex items-center justify-between mb-2 px-1">
                                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Featured Artifact</p>
                                        <button type="button" onClick={() => setFeaturedImageUrl('')} className="text-[9px] text-rose-500 hover:text-rose-400 font-bold uppercase tracking-widest opacity-0 hover:opacity-100 transition-opacity">Reset</button>
                                    </div>
                                    <div
                                        className="aspect-[4/3] bg-slate-800/50 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group hover:border-royal-gold/50 hover:bg-royal-gold/5 transition-all shadow-inner"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {featuredImageUrl ? (
                                            <>
                                                <img src={featuredImageUrl} alt="Featured" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                                    <div className="p-3 bg-white/10 rounded-full backdrop-blur-md">
                                                       <Plus className="w-6 h-6 text-white" />
                                                    </div>
                                                    <span className="text-white text-[10px] font-bold uppercase tracking-widest font-heading">Replace Imagery</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center space-y-3 p-4">
                                                {uploadingImage ? (
                                                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-royal-maroon" />
                                                ) : (
                                                    <>
                                                        <div className="p-4 bg-white/5 rounded-full mx-auto w-16 h-16 flex items-center justify-center border border-white/5 group-hover:bg-royal-gold/10 group-hover:border-royal-gold/20 transition-all shadow-inner">
                                                            <ImageIcon className="w-8 h-8 text-slate-600 group-hover:text-royal-gold" />
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Select Master Image</p>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">Gallery Fragments</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {postData.images && postData.images.map((img, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-xl border border-white/10 overflow-hidden group shadow-lg">
                                                <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                <button 
                                                    type="button"
                                                    onClick={() => setPostData(prev => ({ 
                                                        ...prev, 
                                                        images: prev.images.filter((_, i) => i !== idx) 
                                                    }))}
                                                    className="absolute top-1 right-1 w-6 h-6 bg-rose-500/80 backdrop-blur-sm text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                >
                                                    <Plus className="w-3.5 h-3.5 rotate-45" />
                                                </button>
                                            </div>
                                        ))}
                                        {(postData.images?.length || 0) < 6 && (
                                            <label className="aspect-square rounded-xl border-2 border-dashed border-white/10 hover:border-royal-gold/40 hover:bg-royal-gold/5 flex flex-col items-center justify-center cursor-pointer transition-all group shadow-inner">
                                                <Plus className="w-6 h-6 text-slate-600 group-hover:text-royal-gold transition-colors" />
                                                <input 
                                                    type="file" 
                                                    multiple 
                                                    accept="image/*" 
                                                    className="hidden" 
                                                    onChange={handleImageUpload} 
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Categories Widget */}
                        <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-luxury space-y-6">
                            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 ml-1">Archive Categories</label>
                            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-2 custom-scrollbar Scrollbar-hide">
                                {categories.map((cat, idx) => {
                                    const catId = typeof cat === 'string' ? cat : cat.id;
                                    const catName = typeof cat === 'string' ? cat : cat.name;
                                    const isSelected = postData.categories?.includes(catId);
                                    return (
                                    <div
                                        key={catId || idx}
                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-royal-maroon/10 border-royal-maroon/30' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                                        onClick={() => handleCategoryChange(catId)}
                                    >
                                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${isSelected ? 'bg-royal-maroon border-royal-maroon shadow-lg shadow-royal-maroon/20 scale-110' : 'bg-slate-950/40 border-white/10'}`}>
                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className={`text-xs font-bold uppercase tracking-widest ${isSelected ? 'text-white' : 'text-slate-500'}`}>{catName}</span>
                                    </div>
                                    );
                                })}
                                {categories.length === 0 && (
                                    <div className="text-center py-6 space-y-2 opacity-20">
                                        <div className="text-2xl">📁</div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest">Archives Empty</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tags Widget */}
                        <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-luxury space-y-4">
                            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 ml-1">Meta Descriptors (Tags)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={tagsInput}
                                    onChange={(e) => setTagsInput(e.target.value)}
                                    className="w-full bg-slate-950/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 placeholder:text-slate-700 focus:outline-none focus:border-royal-gold/40 transition-all font-medium italic font-body"
                                    placeholder="silk, heritage, weave..."
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-20">
                                    <Plus className="w-4 h-4" />
                                </div>
                            </div>
                            <p className="text-[9px] text-slate-600 italic px-1 leading-tight">Separate distinct archives with commas.</p>
                        </div>
                    </div>
                </form>
            </div>
        </div>

    );
};

export default AdminBlogEditPage;
