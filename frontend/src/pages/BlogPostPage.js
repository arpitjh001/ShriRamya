import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { blogAPI } from '../lib/api';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, User, Share2, Tag, Pencil } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import DOMPurify from 'dompurify';

const HTMLRenderer = ({ html, className }) => {
    const cleanHtml = DOMPurify.sanitize(html);
    return <div className={className} dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
};

const BlogPostPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        fetchPost();
    }, [id]);

    const fetchPost = async () => {
        try {
            const response = await blogAPI.getPostBySlug(slug);
            if (response.data) {
                setPost(response.data);
            } else {
                toast.error('Post not found');
            }
        } catch (error) {
            console.error('Failed to fetch blog post:', error);
            toast.error('Failed to load post');
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: post?.title,
                    text: `Read this amazing article: ${post?.title}`,
                    url: window.location.href,
                });
            } catch (err) {
                console.error('Error sharing:', err);
            }
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast.success('Link copied to clipboard!');
        }
    };

    if (loading) {
        return (
            <div className="px-6 md:px-12 lg:px-24 py-16 bg-gradient-to-b from-background to-accent/5 max-w-4xl mx-auto">
                <div className="h-8 bg-muted animate-pulse rounded w-32 mb-12" />
                <div className="h-16 bg-muted animate-pulse rounded mb-6" />
                <div className="h-6 bg-muted animate-pulse rounded w-64 mb-12" />
                <div className="aspect-[21/9] bg-muted animate-pulse rounded-2xl mb-12" />
                <div className="space-y-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-4 bg-muted animate-pulse rounded w-full" />
                    ))}
                </div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="px-6 py-24 text-center">
                <h1 className="text-3xl font-heading mb-6">Article Not Found</h1>
                <p className="text-muted-foreground mb-8">The story you are looking for does not exist or has been moved.</p>
                <Button asChild>
                    <Link to="/blog">Return to Journal</Link>
                </Button>
            </div>
        );
    }

    return (
        <article className="min-h-screen bg-gradient-to-b from-background to-accent/5 pb-24">
            {/* Header Container */}
            <div className="px-6 md:px-12 lg:px-24 pt-16 pb-12 max-w-5xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mb-10"
                >
                    <Link to="/blog" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors text-sm font-medium">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Journal
                    </Link>
                </motion.div>

                <div className="mb-8 flex flex-wrap gap-2">
                    {post.categories?.map((cat, i) => (
                        <span key={i} className="bg-secondary/10 text-secondary text-xs font-medium px-3 py-1 rounded-full border border-secondary/20 uppercase tracking-widest">
                            {cat}
                        </span>
                    ))}
                </div>

                <motion.h1
                    className="text-4xl md:text-5xl lg:text-6xl font-heading font-medium tracking-tight mb-8 leading-tight"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <HTMLRenderer html={post.title} />
                </motion.h1>

                <motion.div
                    className="flex flex-wrap items-center justify-between gap-6 border-y border-border py-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <div className="flex items-center gap-6 text-sm text-muted-foreground font-medium">
                        <span className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {post.author}
                        </span>
                        <span className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {user?.role === 'admin' && (
                            <Button variant="outline" size="sm" onClick={() => navigate(`/admin/blog/${id}/edit`)} className="text-muted-foreground hover:text-primary gap-2">
                                <Pencil className="h-4 w-4" />
                                Edit
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={handleShare} className="text-muted-foreground hover:text-primary gap-2">
                            <Share2 className="h-4 w-4" />
                            Share
                        </Button>
                    </div>
                </motion.div>
            </div>

            {/* Featured Media */}
            {post.image && (
                <motion.div
                    className="max-w-6xl mx-auto px-6 mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                >
                    <div className="aspect-[21/9] md:aspect-[2.5/1] rounded-2xl overflow-hidden shadow-luxury-lg border border-border/50 relative">
                        <img
                            src={post.image}
                            alt="Featured"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>
                </motion.div>
            )}

            {/* Content */}
            <motion.div
                className="max-w-3xl mx-auto px-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
            >
                <div className="prose prose-lg md:prose-xl prose-stone max-w-none 
          prose-headings:font-heading prose-headings:font-medium 
          prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl 
          prose-p:font-body prose-p:leading-relaxed prose-p:text-muted-foreground
          prose-a:text-primary hover:prose-a:text-secondary prose-a:transition-colors
          prose-img:rounded-xl prose-img:shadow-md
          prose-blockquote:border-l-secondary prose-blockquote:bg-accent/5 prose-blockquote:p-6 prose-blockquote:rounded-r-lg prose-blockquote:font-heading prose-blockquote:text-xl prose-blockquote:italic
          prose-li:text-muted-foreground
          prose-strong:text-foreground">
                    <HTMLRenderer html={post.content} />
                </div>

                {/* Tags / Meta block */}
                <div className="mt-16 pt-8 border-t border-border flex flex-wrap items-center gap-4">
                    <Tag className="w-5 h-5 text-muted-foreground" />
                    <div className="flex flex-wrap gap-2">
                        {post.categories?.map((cat, i) => (
                            <span key={i} className="bg-accent/10 hover:bg-accent/20 transition-colors text-muted-foreground px-4 py-1.5 rounded-full text-sm font-medium cursor-pointer">
                                {cat}
                            </span>
                        ))}
                    </div>
                </div>
            </motion.div>
        </article>
    );
};

export default BlogPostPage;
