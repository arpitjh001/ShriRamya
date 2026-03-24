import React, { useState, useRef, useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useNavigate, Link } from 'react-router-dom';
import { blogAPI } from '../services/api';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const BlogCreatePage = () => {
    const navigate = useNavigate();
    const { user, capabilities, loading: authLoading, isAdmin } = useAuth();

    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [content, setContent] = useState('');
    const [excerpt, setExcerpt] = useState('');
    const [status, setStatus] = useState('draft');
    const [loading, setLoading] = useState(false);
    const [featuredImage, setFeaturedImage] = useState(null);
    const [galleryImages, setGalleryImages] = useState([]);
    const [seoTitle, setSeoTitle] = useState('');
    const [seoDescription, setSeoDescription] = useState('');
    const [tagsInput, setTagsInput] = useState('');
    const [uploading, setUploading] = useState(false);

    const quillRef = useRef(null);

    const imageHandler = () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;

            setUploading(true);
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
            } finally {
                setUploading(false);
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
                image: imageHandler
            }
        }
    }), []);



    // Generate slug from title
    const generateSlug = (title) => {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    };

    const handleTitleChange = (e) => {
        const newTitle = e.target.value;
        setTitle(newTitle);
        if (!slug) {
            setSlug(generateSlug(newTitle));
        }
    };

    // Redirect if not allowed
    React.useEffect(() => {
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
        
        if (!capabilities.edit_posts && !isUserAdmin) {
            toast.error('Access denied');
            navigate('/blog');
        }
    }, [authLoading, capabilities, user, navigate]);

    if (authLoading || !user) return (
        <div className="flex justify-center items-center h-screen">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
    );

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        setUploading(true);
        try {
            const uploadedUrls = [];
            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                const response = await blogAPI.api.post('/upload/image', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (response.data) {
                    const uploaded = response.data;
                    const imageUrl = uploaded.medium || uploaded.original || uploaded.url;
                    if (imageUrl) uploadedUrls.push(imageUrl);
                }
            }
            
            if (uploadedUrls.length > 0) {
                if (!featuredImage) {
                    setFeaturedImage(uploadedUrls[0]);
                    if (uploadedUrls.length > 1) {
                        setGalleryImages(prev => [...prev, ...uploadedUrls.slice(1)]);
                    }
                } else {
                    setGalleryImages(prev => [...prev, ...uploadedUrls]);
                }
                toast.success('Image(s) uploaded successfully');
            }
        } catch (error) {
            console.error('Upload failed:', error);
            toast.error('Failed to upload image(s)');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title || !content) {
            toast.error('Please fill in both title and content');
            return;
        }
        if (!slug) {
            toast.error('Slug is required');
            return;
        }

        setLoading(true);
        try {
            const postData = {
                title,
                slug,
                content,
                excerpt,
                status,
                featuredImage,
                images: galleryImages,
                seoTitle: seoTitle,
                seoDescription: seoDescription,
                tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean)
            };

            const response = await blogAPI.createPost(postData);
            if (response.data) {
                toast.success(`Story ${status === 'published' ? 'published' : 'saved as ' + status}!`);
                navigate('/admin/blogs');
            }
        } catch (error) {
            console.error('Failed to create story:', error);
            toast.error(error.response?.data?.detail || 'Failed to create story');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-accent/5 pb-24">
            <div className="px-6 md:px-12 lg:px-24 pt-16 pb-12 max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mb-10"
                >
                    <Link to="/blog" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors text-sm font-medium">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Journal
                    </Link>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-2xl border border-border shadow-luxury-lg overflow-hidden"
                >
                    <div className="p-8 border-b border-border bg-accent/5">
                        <h1 className="text-3xl font-heading font-medium tracking-tight">Create New Story</h1>
                        <p className="text-muted-foreground mt-2">Share your heritage, craft, or style inspiration with the world.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-8">
                        <div className="space-y-2">
                            <label className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Story Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={handleTitleChange}
                                placeholder="Enter a captivating title..."
                                className="w-full text-2xl font-heading bg-transparent border-b border-border focus:border-primary focus:outline-none py-2 transition-colors"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium uppercase tracking-widest text-muted-foreground">URL Slug</label>
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground text-sm">/blog/</span>
                                <input
                                    type="text"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                    placeholder="auto-generated-from-title"
                                    className="flex-1 px-4 py-2 bg-background border border-border rounded-lg font-mono text-sm"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">This will be the URL path for your blog post</p>
                        </div>

                        <div className="space-y-4">
                            <label className="text-sm font-medium uppercase tracking-widest text-muted-foreground block">Story Imagery</label>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Main Featured Image */}
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Featured Image</p>
                                    <div 
                                        onClick={() => document.getElementById('featured-upload').click()}
                                        className="relative aspect-video rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-all cursor-pointer group bg-accent/5 overflow-hidden flex items-center justify-center"
                                    >
                                        {featuredImage ? (
                                            <>
                                                <img src={featuredImage} alt="Featured" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <p className="text-white text-xs font-bold uppercase tracking-widest">Change Image</p>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center">
                                                <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                                <p className="text-xs text-muted-foreground">Select Main Image</p>
                                            </div>
                                        )}
                                        <input 
                                            id="featured-upload"
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            onChange={handleImageUpload}
                                        />
                                    </div>
                                </div>

                                {/* Gallery Images */}
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Gallery (WordPress Style)</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {galleryImages.map((img, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-lg border border-border overflow-hidden group">
                                                <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                                                <button 
                                                    type="button"
                                                    onClick={() => setGalleryImages(galleryImages.filter((_, i) => i !== idx))}
                                                    className="absolute top-1 right-1 w-6 h-6 bg-destructive/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Plus className="w-3 h-3 rotate-45" />
                                                </button>
                                            </div>
                                        ))}
                                        {galleryImages.length < 5 && (
                                            <button
                                                type="button"
                                                onClick={() => document.getElementById('gallery-upload').click()}
                                                className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center bg-accent/5 transition-all"
                                            >
                                                <Plus className="w-6 h-6 text-muted-foreground" />
                                                <span className="text-[10px] text-muted-foreground mt-1">Add Image</span>
                                                <input 
                                                    id="gallery-upload"
                                                    type="file" 
                                                    accept="image/*" 
                                                    multiple
                                                    className="hidden" 
                                                    onChange={handleImageUpload}
                                                />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-2 italic">Select multiple images to create a story gallery.</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-sm font-medium uppercase tracking-widest text-muted-foreground block">Story Excerpt</label>
                            <textarea
                                value={excerpt}
                                onChange={(e) => setExcerpt(e.target.value)}
                                placeholder="A brief summary for the blog cards..."
                                rows={3}
                                className="w-full bg-accent/5 border border-border rounded-xl p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all text-sm"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-8">
                            <div className="space-y-4">
                                <label className="text-sm font-medium uppercase tracking-widest text-muted-foreground block text-primary">SEO Title</label>
                                <input
                                    type="text"
                                    value={seoTitle}
                                    onChange={(e) => setSeoTitle(e.target.value)}
                                    placeholder="Meta title for SEO"
                                    className="w-full bg-accent/5 border border-border rounded-lg p-3 text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-sm font-medium uppercase tracking-widest text-muted-foreground block text-primary">SEO Description</label>
                            <textarea
                                value={seoDescription}
                                onChange={(e) => setSeoDescription(e.target.value)}
                                placeholder="Meta description for search engines"
                                rows={2}
                                className="w-full bg-accent/5 border border-border rounded-xl p-4 text-sm"
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="text-sm font-medium uppercase tracking-widest text-muted-foreground block">Tags (comma separated)</label>
                            <input
                                type="text"
                                value={tagsInput}
                                onChange={(e) => setTagsInput(e.target.value)}
                                placeholder="heritage, silk, weaving..."
                                className="w-full bg-accent/5 border border-border rounded-lg p-3 text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Story Content</label>
                            <div className="bg-background rounded-xl overflow-hidden border border-border pb-10">
                                <ReactQuill 
                                    ref={quillRef}
                                    theme="snow" 
                                    value={content} 
                                    onChange={setContent} 
                                    modules={modules}
                                    className="h-[300px]"
                                />
                            </div>
                        </div>

                        <div className="pt-8 border-t border-border flex flex-wrap items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <label className="text-sm font-medium text-muted-foreground">Status:</label>
                                <div className="flex bg-accent/10 rounded-lg p-1">
                                    {['draft', 'review', 'published'].map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setStatus(s)}
                                            disabled={s === 'published' && !capabilities.publish_posts}
                                            className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${status === s ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Button type="submit" disabled={loading} className="px-8 py-6 rounded-full shadow-luxury-lg hover:shadow-luxury gap-2 uppercase tracking-widest text-xs font-bold">
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                                {status === 'published' ? 'Publish Story' : 'Save Story'}
                            </Button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </div>
    );
};

export default BlogCreatePage;

