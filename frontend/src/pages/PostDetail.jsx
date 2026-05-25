import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { postAPI } from '../services/api';
import PostCard from '../components/PostCard';
import CommentSection from '../components/CommentSection';
import { ArrowLeft, Loader2 } from 'lucide-react';

const PostDetail = ({ setToast }) => {
  const { postId } = useParams();
  const [post, setPost]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await postAPI.getPost(postId);
        setPost(res.data);
      } catch {
        setToast('Post not found.', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [postId]);

  const handleLike = () => setPost(p => p ? ({
    ...p, is_liked_by_me: !p.is_liked_by_me,
    likes_count: p.is_liked_by_me ? p.likes_count - 1 : p.likes_count + 1
  }) : null);

  const handleRepost = () => setPost(p => p ? ({
    ...p, is_reposted_by_me: !p.is_reposted_by_me,
    reposts_count: p.is_reposted_by_me ? p.reposts_count - 1 : p.reposts_count + 1
  }) : null);

  if (loading) return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-sphere-500" />
    </div>
  );

  if (!post) return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <p className="text-brand-400">Post not found.</p>
      <Link to="/" className="btn-ghost text-sm"><ArrowLeft className="h-4 w-4" /> Back to feed</Link>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-16">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-600 dark:hover:text-brand-200 transition-colors mb-5">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <PostCard
        post={post}
        onLikeToggle={handleLike}
        onRepostToggle={handleRepost}
        onPostDeleted={() => window.history.back()}
        onPostEditClick={() => {}}
        setToast={setToast}
        expanded
      />

      {/* Full comment section (always visible) */}
      <div className="card mt-4 p-5">
        <h3 className="text-sm font-semibold text-brand-500 dark:text-brand-400 uppercase tracking-wider mb-4">
          Replies
        </h3>
        <CommentSection post={post} setToast={setToast} />
      </div>
    </div>
  );
};

export default PostDetail;
