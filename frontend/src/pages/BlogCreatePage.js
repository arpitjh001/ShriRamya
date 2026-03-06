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
    const [status, setStatus] = useState('draft');
    const [loading, setLoading] = useState(false);
    const [featuredImage, setFeaturedImage] = useState(null);
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
            const response = await blogAPI.uploadMedia(file);
            if (response.data && response.data.source_url) {
                setFeaturedImage(response.data.id);
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
                status,
                featured_media: featuredImage
            };

            const response = await blogAPI.createPost(postData);
            if (response.data) {
                toast.success(`Post ${status === 'publish' ? 'published' : 'saved as draft'}!`);
                navigate('/blog');
            }
        } catch (error) {
            console.error('Failed to create post:', error);
            toast.error(error.response?.data?.detail || 'Failed to create post');
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
                            <label className="text-sm font-medium uppercase tracking-widest text-muted-foreground block">Featured Image</label>
                            <div className="flex items-center gap-6">
                                <div className="relative group">
                                    <input
                                        type="file"
                                        onChange={handleImageUpload}
                                        accept="image/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        disabled={uploading}
                                    />
                                    <div className="h-32 w-48 rounded-xl border-2 border-dashed border-border group-hover:border-primary/50 flex flex-col items-center justify-center bg-accent/5 transition-colors overflow-hidden relative">
                                        {uploading ? (
                                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                        ) : (
                                            <>
                                                <ImageIcon className="h-6 w-6 text-muted-foreground mb-2" />
                                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Upload Cover</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-muted-foreground">
                                        This image will be displayed at the top of your story and in the blog listing cards.
                                        Recommended size: 1200x600px.
                                    </p>
                                </div>
                            </div>
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
                                    <button
                                        type="button"
                                        onClick={() => setStatus('draft')}
                                        className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${status === 'draft' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        Draft
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStatus('publish')}
                                        disabled={!capabilities.publish_posts}
                                        className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${status === 'publish' ? 'bg-background shadow-sm text-foreground' : capabilities.publish_posts ? 'text-muted-foreground hover:text-foreground' : 'opacity-50 cursor-not-allowed'}`}
                                    >
                                        Publish
                                    </button>
                                </div>
                            </div>

                            <Button type="submit" disabled={loading} className="px-8 py-6 rounded-full shadow-luxury-lg hover:shadow-luxury gap-2">
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                                {status === 'publish' ? 'Publish Story' : 'Save as Draft'}
                            </Button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </div>
    );
};

export default BlogCreatePage;

