import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { blogAPI } from '../services/api';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const BlogCreatePage = () => {
    const navigate = useNavigate();
    const { capabilities } = useAuth();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [excerpt, setExcerpt] = useState('');
    const [status, setStatus] = useState('draft');
    const [loading, setLoading] = useState(false);
    const [featuredImage, setFeaturedImage] = useState(null);
    const [seoTitle, setSeoTitle] = useState('');
    const [seoDescription, setSeoDescription] = useState('');
    const [readingTime, setReadingTime] = useState(0);
    const [tagsInput, setTagsInput] = useState('');
    const [uploading, setUploading] = useState(false);

    // Redirect if not allowed
    if (!capabilities.edit_posts) {
        navigate('/blog');
        return null;
    }

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await blogAPI.api.post('/upload/image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (response.data && response.data.url) {
                setFeaturedImage(response.data.url);
                toast.success('Image uploaded successfully');
            }
        } catch (error) {
            console.error('Upload failed:', error);
            toast.error('Failed to upload image');
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

        setLoading(true);
        try {
            const postData = {
                title,
                content,
                excerpt,
                status,
                featuredImage,
                seo_title: seoTitle,
                seo_description: seoDescription,
                reading_time: readingTime,
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
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter a captivating title..."
                                className="w-full text-2xl font-heading bg-transparent border-b border-border focus:border-primary focus:outline-none py-2 transition-colors"
                                required
                            />
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                            <div className="space-y-4">
                                <label className="text-sm font-medium uppercase tracking-widest text-muted-foreground block text-primary">Reading Time (min)</label>
                                <input
                                    type="number"
                                    value={readingTime}
                                    onChange={(e) => setReadingTime(parseInt(e.target.value))}
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
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Begin your narrative here..."
                                rows={12}
                                className="w-full bg-accent/5 border border-border rounded-xl p-6 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all font-body text-lg leading-relaxed"
                                required
                            />
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

