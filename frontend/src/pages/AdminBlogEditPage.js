import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useParams, useNavigate } from 'react-router-dom';
import { blogAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Image as ImageIcon, Save, Check, Plus } from 'lucide-react';
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
        images: []
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
                ['link', 'image'],
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
                        images: p.images || []
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
        <div className="px-6 md:px-12 lg:px-24 py-12 max-w-5xl mx-auto">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <Button variant="ghost" onClick={() => navigate('/admin/dashboard')} className="mb-4 text-muted-foreground hover:text-primary">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                    </Button>
                    <h1 className="text-3xl font-heading font-medium tracking-tight">Edit Story</h1>
                </div>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>

            <form onSubmit={handleSave} className="space-y-8">
                <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Main Editor Section */}
                        <div className="col-span-2 space-y-6">
                            <div>
                                <label className="block text-sm font-medium mb-2">Post Title</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={postData.title}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-lg font-heading"
                                    placeholder="Enter title here"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">URL Slug</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground text-sm">/blog/</span>
                                    <input
                                        type="text"
                                        name="slug"
                                        value={postData.slug}
                                        onChange={handleInputChange}
                                        className="flex-1 px-4 py-2 bg-background border border-border rounded-lg font-mono text-sm"
                                        placeholder="auto-generated-from-title"
                                        required
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">This will be the URL path for your blog post</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Content (Rich HTML/Text)</label>
                                <div className="bg-background border border-border rounded-lg pb-10">
                                    <ReactQuill 
                                        ref={quillRef}
                                        theme="snow" 
                                        value={postData.content} 
                                        onChange={(val) => setPostData(prev => ({ ...prev, content: val }))} 
                                        modules={modules}
                                        className="h-[400px]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Excerpt (Journal Summary)</label>
                                <textarea
                                    name="excerpt"
                                    value={postData.excerpt}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 bg-background border border-border rounded-lg resize-y h-24"
                                    placeholder="Brief summary used in cards..."
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-6 pt-6 border-t border-border">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-primary">SEO Title</label>
                                    <input
                                        type="text"
                                        name="seoTitle"
                                        value={postData.seoTitle}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg"
                                        placeholder="Title for search engines"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-primary">SEO Description</label>
                                <textarea
                                    name="seoDescription"
                                    value={postData.seoDescription}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg h-24"
                                    placeholder="Meta description for SEO"
                                />
                            </div>
                        </div>

                        {/* Sidebar Settings Section */}
                        <div className="space-y-6">

                            {/* Image Upload Widget */}
                            <div className="p-4 border border-border rounded-lg bg-background">
                                <label className="block text-sm font-medium mb-4 flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4 text-primary" /> Story Imagery
                                </label>
                                
                                <p className="text-xs font-medium text-muted-foreground mb-2">Featured Image</p>
                                <div
                                    className="aspect-video bg-muted/50 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group mb-4"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {featuredImageUrl ? (
                                        <>
                                            <img src={featuredImageUrl} alt="Featured" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-white text-sm font-medium">Change Image</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center p-4">
                                            {uploadingImage ? (
                                                <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                                            ) : (
                                                <>
                                                    <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-1" />
                                                    <span className="text-[10px] text-muted-foreground">Select Main Image</span>
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

                                <p className="text-xs font-medium text-muted-foreground mb-2">Gallery Images</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {postData.images && postData.images.map((img, idx) => (
                                        <div key={idx} className="relative aspect-square rounded border border-border overflow-hidden group">
                                            <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                                            <button 
                                                type="button"
                                                onClick={() => setPostData(prev => ({ 
                                                    ...prev, 
                                                    images: prev.images.filter((_, i) => i !== idx) 
                                                }))}
                                                className="absolute top-1 right-1 w-5 h-5 bg-destructive/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Plus className="w-2.5 h-2.5 rotate-45" />
                                            </button>
                                        </div>
                                    ))}
                                    {(postData.images?.length || 0) < 6 && (
                                        <label className="aspect-square rounded border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center bg-accent/5 cursor-pointer transition-all">
                                            <Plus className="w-5 h-5 text-muted-foreground" />
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

                            {/* Categories Widget */}
                            <div className="p-4 border border-border rounded-lg bg-background">
                                <label className="block text-sm font-medium mb-4">Categories</label>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                    {categories.map((cat, idx) => {
                                        const catId = typeof cat === 'string' ? cat : cat.id;
                                        const catName = typeof cat === 'string' ? cat : cat.name;
                                        return (
                                        <label
                                            key={catId || idx}
                                            className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded cursor-pointer transition-colors"
                                            onClick={() => handleCategoryChange(catId)}
                                        >
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${postData.categories?.includes(catId) ? 'bg-primary border-primary' : 'bg-background border-border'}`}>
                                                {postData.categories?.includes(catId) && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                                            </div>
                                            <span className="text-sm">{catName}</span>
                                        </label>
                                        );
                                    })}
                                    {categories.length === 0 && <span className="text-sm text-muted-foreground block p-2">No categories available</span>}
                                </div>
                            </div>

                            {/* Tags Widget */}
                            <div className="p-4 border border-border rounded-lg bg-background">
                                <label className="block text-sm font-medium mb-3">Tags (Comma separated)</label>
                                <input
                                    type="text"
                                    value={tagsInput}
                                    onChange={(e) => setTagsInput(e.target.value)}
                                    className="w-full px-3 py-2 bg-background border border-border rounded text-sm"
                                    placeholder="silk, saree, weaving..."
                                />
                            </div>

                            {/* Publish Setting Node */}
                            <div className="p-4 border border-border rounded-lg bg-background">
                                <label className="block text-sm font-medium mb-3">Workflow Status</label>
                                <select
                                    name="status"
                                    value={postData.status}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 bg-background border border-border rounded text-sm"
                                >
                                    <option value="draft">Draft</option>
                                    <option value="review">Under Review</option>
                                    <option value="published">Published</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>

                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default AdminBlogEditPage;

