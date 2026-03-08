import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { blogAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Image as ImageIcon, Save, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminBlogEditPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, capabilities } = useAuth();
    const fileInputRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    const [postData, setPostData] = useState({
        title: '',
        content: '',
        excerpt: '',
        status: 'draft',
        categories: [],
        tags: [],
        seo_title: '',
        seo_description: '',
        reading_time: 0,
        featuredImage: ''
    });
    const [tagsInput, setTagsInput] = useState('');

    useEffect(() => {
        // RBAC check
        if (!capabilities.edit_posts && !capabilities.edit_others_posts) {
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
                        content: p.content || '',
                        excerpt: p.excerpt || '',
                        status: p.status || 'draft',
                        categories: p.categories || [],
                        tags: p.tags || [],
                        seo_title: p.seo_title || '',
                        seo_description: p.seo_description || '',
                        reading_time: p.reading_time || 0,
                        featuredImage: p.featured_image || ''
                    });
                    setTagsInput(p.tags ? p.tags.join(', ') : '');
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
                return { ...prev, categories: currentCats.filter(id => id !== catId) };
            } else {
                return { ...prev, categories: [...currentCats, catId] };
            }
        });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadingImage(true);
            const tempUrl = URL.createObjectURL(file);
            setFeaturedImageUrl(tempUrl); // Optimistic UI

            const res = await blogAPI.uploadMedia(file);

            // WP REST API media upload returns the media ID and URL
            // If we want to strictly set featured media, we must pass `featured_media` id to PUT /posts
            // For now, let's keep it simple by just passing back the attachment or simply letting them upload inline
            // We also update state to hold the `featured_media` ID so `handleSave` can use it 
            if (res.data && res.data.id) {
                setPostData(prev => ({ ...prev, featured_media: res.data.id }));
                setFeaturedImageUrl(res.data.url);
                toast.success("Image uploaded to WordPress successfully");
            }
        } catch (error) {
            console.error('Failed to upload image:', error);
            toast.error('Image upload failed');
            setFeaturedImageUrl(''); // Revert on failure
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
                    <Button variant="ghost" onClick={() => navigate('/admin/woocommerce')} className="mb-4 text-muted-foreground hover:text-primary">
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
                                <label className="block text-sm font-medium mb-2">Content (Rich HTML/Text)</label>
                                <div className="bg-muted/30 border border-border rounded-lg p-2 min-h-[400px]">
                                    {/* Basic Textarea for Rich Text/HTML Input */}
                                    <textarea
                                        name="content"
                                        value={postData.content}
                                        onChange={handleInputChange}
                                        className="w-full h-[400px] p-4 bg-background border-none outline-none resize-y rounded text-sm font-mono"
                                        placeholder="<p>Write your amazing story here in HTML or plain text...</p>"
                                        required
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-border">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-primary">SEO Title</label>
                                    <input
                                        type="text"
                                        name="seo_title"
                                        value={postData.seo_title}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg"
                                        placeholder="Title for search engines"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-primary">Reading Time (min)</label>
                                    <input
                                        type="number"
                                        name="reading_time"
                                        value={postData.reading_time}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-primary">SEO Description</label>
                                <textarea
                                    name="seo_description"
                                    value={postData.seo_description}
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
                                    <ImageIcon className="w-4 h-4 text-primary" /> Featured Image
                                </label>
                                <div
                                    className="aspect-video bg-muted/50 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group"
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
                                                    <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                                                    <span className="text-sm text-muted-foreground">Click to upload</span>
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

                            {/* Categories Widget */}
                            <div className="p-4 border border-border rounded-lg bg-background">
                                <label className="block text-sm font-medium mb-4">Categories</label>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                    {categories.map(cat => (
                                        <label
                                            key={cat.id}
                                            className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded cursor-pointer transition-colors"
                                            onClick={() => handleCategoryChange(cat.id)}
                                        >
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${postData.categories?.includes(cat.id) ? 'bg-primary border-primary' : 'bg-background border-border'}`}>
                                                {postData.categories?.includes(cat.id) && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                                            </div>
                                            <span className="text-sm">{cat.name}</span>
                                        </label>
                                    ))}
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

