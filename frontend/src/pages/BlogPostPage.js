import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { blogAPI } from '../services/api';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, User, Share2, Tag, Pencil } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import DOMPurify from 'dompurify';
import SEOMeta from '../components/SEOMeta';

const HTMLRenderer = ({ html, className }) => {
    const cleanHtml = DOMPurify.sanitize(html);
    return <div className={className} dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
};

const BlogPostPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { user, capabilities } = useAuth();
    const [post, setPost] = useState(null);
    const [relatedPosts, setRelatedPosts] = useState([]);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setError(null);

        // If it's the Sanganeri post, navigate to the static page
        if (slug === 'sanganeri-print') {
            navigate('/blog/sanganeri-print');
            return;
        }

        fetchPost();
    }, [slug]);

    const fetchPost = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await blogAPI.getPostBySlug(slug);
            if (response.data) {
                const fetchedPost = response.data;
                setPost(fetchedPost);

                // Fetch supplementary data only for published posts or if user has edit capabilities
                if (fetchedPost.status === 'published' || capabilities.edit_posts) {
                    const [relatedRes, commentsRes] = await Promise.allSettled([
                        blogAPI.getRelatedPosts(fetchedPost.id),
                        blogAPI.getComments(fetchedPost.id)
                    ]);

                    if (relatedRes.status === 'fulfilled') setRelatedPosts(relatedRes.value.data || []);
                    if (commentsRes.status === 'fulfilled') setComments(commentsRes.value.data || []);
                }
            } else {
                setError('Post not found');
                toast.error('Post not found');
            }
        } catch (error) {
            console.error('Failed to fetch blog data:', error);
            setError(error.response?.status === 404 ? 'Post not found' : 'Failed to load post');
            toast.error(error.response?.status === 404 ? 'Post not found' : 'Failed to load post');
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
            <div className="px-6 py-24 text-center min-h-[60vh] flex flex-col items-center justify-center">
                <h1 className="text-3xl font-heading mb-6">
                    {error === 'Post not found' ? 'Article Not Found' : 'Error Loading Article'}
                </h1>
                <p className="text-muted-foreground mb-8 max-w-md">
                    {error === 'Post not found' 
                        ? 'The story you are looking for does not exist, has been moved, or is not yet published.' 
                        : 'There was a problem loading this story. Please try again later.'}
                </p>
                <div className="flex gap-4">
                    <Button asChild>
                        <Link to="/blog">Return to Journal</Link>
                    </Button>
                    {error && error !== 'Post not found' && (
                        <Button variant="outline" onClick={() => window.location.reload()}>
                            Try Again
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <article className="min-h-screen bg-gradient-to-b from-background to-accent/5 pb-24">
            {post && (
                <SEOMeta
                    title={post.seo_title || post.title}
                    description={post.seo_description || post.excerpt}
                    image={post.featured_image}
                    url={`/blog/${post.slug}`}
                />
            )}
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
                            {post.author_name || post.author}
                        </span>
                        <span className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                        {post.reading_time > 0 && (
                            <span className="hidden sm:flex items-center gap-2">
                                <span className="w-1 h-1 bg-muted-foreground rounded-full" />
                                {post.reading_time} min read
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {(capabilities.edit_posts || capabilities.edit_others_posts) && (
                            <Button variant="outline" size="sm" onClick={() => navigate(`/admin/blog/${post.id}/edit`)} className="text-muted-foreground hover:text-primary gap-2">
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
                        {post.tags?.map((tag, i) => (
                            <span key={i} className="bg-accent/10 hover:bg-accent/20 transition-colors text-muted-foreground px-4 py-1.5 rounded-full text-sm font-medium cursor-pointer">
                                #{tag}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Related Posts Section */}
                {relatedPosts.length > 0 && (
                    <div className="mt-24">
                        <h3 className="text-2xl font-heading font-medium mb-8">Related Stories</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {relatedPosts.map((rp) => (
                                <Link key={rp.id} to={`/blog/${rp.slug}`} className="group block">
                                    <div className="aspect-video rounded-xl overflow-hidden mb-4 border border-border">
                                        <img src={rp.featured_image || '/api/placeholder/400/225'} alt={rp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    </div>
                                    <h4 className="font-heading font-medium group-hover:text-primary transition-colors line-clamp-2">{rp.title}</h4>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Comments Section */}
                <div className="mt-24 border-t border-border pt-16">
                    <h3 className="text-2xl font-heading font-medium mb-8">Journal Discussions ({comments.length})</h3>
                    {user ? (
                        <CommentForm blogId={post.id} onCommentAdded={() => blogAPI.getComments(post.id).then(res => setComments(res.data))} />
                    ) : (
                        <div className="bg-accent/5 p-6 rounded-xl text-center mb-8">
                            <p className="text-muted-foreground mb-4">Please log in to join the discussion.</p>
                            <Button asChild variant="outline" size="sm">
                                <Link to="/login">Sign In</Link>
                            </Button>
                        </div>
                    )}

                    <div className="space-y-8 mt-12">
                        {comments.map((comment) => (
                            <div key={comment.id} className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">
                                    {(comment.author_name || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-sm">{comment.author_name || 'Shri Ramya Guest'}</span>
                                        <span className="text-xs text-muted-foreground">{new Date(comment.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-muted-foreground text-sm leading-relaxed">{comment.comment}</p>
                                </div>
                            </div>
                        ))}
                        {comments.length === 0 && <p className="italic text-muted-foreground text-center py-8">Be the first to share your thoughts on this story.</p>}
                    </div>
                </div>
            </motion.div>
        </article>
    );
};

const CommentForm = ({ blogId, onCommentAdded }) => {
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!comment.trim()) return;

        setSubmitting(true);
        try {
            await blogAPI.addComment(blogId, comment);
            toast.success('Comment submitted! It will appear once approved by an admin.');
            setComment('');
            if (onCommentAdded) onCommentAdded();
        } catch (error) {
            toast.error('Failed to post comment. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 mb-12">
            <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts..."
                className="w-full min-h-[120px] p-4 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
            />
            <div className="flex justify-end">
                <Button type="submit" disabled={submitting || !comment.trim()} className="rounded-full px-6">
                    {submitting ? 'Posting...' : 'Post Comment'}
                </Button>
            </div>
        </form>
    );
};

export default BlogPostPage;

