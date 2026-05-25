import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postAPI, commentAPI } from '../services/api';
import {
  Heart, MessageSquare, Repeat2, Quote, Share2,
  Trash2, Edit2, MoreHorizontal, Image, Play
} from 'lucide-react';
import CommentSection from './CommentSection';
import ShareModal from './ShareModal';
import { resolveUrl } from '../utils/media';

const AuthorAvatar = ({ author }) => (
  <Link to={`/profile/${author.username}`} className="flex-shrink-0">
    <div className="h-10 w-10 rounded-full overflow-hidden bg-sphere-900 border border-brand-200 dark:border-brand-700">
      {author.avatar_url
        ? <img src={resolveUrl(author.avatar_url)} alt={author.username} className="h-full w-full object-cover" />
        : <div className="flex h-full w-full items-center justify-center text-sm font-bold text-sphere-300">
            {(author.display_name || author.username)[0].toUpperCase()}
          </div>
      }
    </div>
  </Link>
);

const MediaDisplay = ({ url, type }) => {
  const src = resolveUrl(url);
  if (!src) return null;
  if (type === 'image') return (
    <img src={src} alt="media" className="mt-3 w-full max-h-80 object-cover rounded-xl border border-brand-100 dark:border-brand-800" />
  );
  if (type === 'video') return (
    <video src={src} controls className="mt-3 w-full max-h-72 rounded-xl border border-brand-100 dark:border-brand-800" />
  );
  return null;
};

const QuotedPost = ({ post }) => {
  const navigate = useNavigate();
  if (!post) return null;
  return (
    <div 
      onClick={() => navigate(`/post/${post.id}`)}
      className="mt-3 rounded-xl border border-brand-200 dark:border-brand-700 bg-brand-50 dark:bg-brand-800/50 p-3 cursor-pointer hover:bg-brand-100 dark:hover:bg-brand-800 transition-colors"
    >
      <Link to={`/profile/${post.author.username}`}
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-2 mb-1.5 w-fit hover:underline">
        <div className="h-5 w-5 rounded-full overflow-hidden bg-sphere-900 flex-shrink-0">
          {post.author.avatar_url
            ? <img src={resolveUrl(post.author.avatar_url)} alt="" className="h-full w-full object-cover" />
            : <div className="flex h-full w-full items-center justify-center text-[9px] font-bold text-sphere-300">
                {post.author.username[0].toUpperCase()}
              </div>
          }
        </div>
        <span className="text-xs font-semibold text-brand-700 dark:text-brand-200">@{post.author.username}</span>
        <span className="text-[10px] text-brand-400">· {new Date(post.created_at).toLocaleDateString()}</span>
      </Link>
      {post.content && <p className="text-xs text-brand-600 dark:text-brand-300 leading-relaxed line-clamp-3">{post.content}</p>}
      {post.media_url && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-brand-400">
          {post.media_type === 'image' ? <Image className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          <span>Media attachment</span>
        </div>
      )}
    </div>
  );
};

const PostCard = ({ post, onLikeToggle, onRepostToggle, onPostDeleted, onPostEditClick, setToast, expanded = false }) => {
  const { user }            = useAuth();
  const navigate            = useNavigate();
  const [showComments, setShowComments] = useState(expanded);
  const [likeLoading, setLikeLoading]   = useState(false);
  const [repostLoading, setRepostLoading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [showMenu, setShowMenu]   = useState(false);

  const isOwner = user && user.id === post.user_id;

  const handleLike = async () => {
    if (likeLoading) return;
    setLikeLoading(true);
    try {
      await postAPI.toggleLike(post.id);
      onLikeToggle(post.id);
    } catch { setToast?.('Action failed.', 'error'); }
    finally { setLikeLoading(false); }
  };

  const handleRepost = async () => {
    if (repostLoading) return;
    setRepostLoading(true);
    try {
      const res = await postAPI.toggleRepost(post.id);
      onRepostToggle(post.id);
      setToast?.(res.data.action === 'reposted' ? 'Reposted!' : 'Unreposted.');
    } catch { setToast?.('Action failed.', 'error'); }
    finally { setRepostLoading(false); }
  };

  const handleDelete = async () => {
    setShowMenu(false);
    try {
      await postAPI.delete(post.id);
      onPostDeleted(post.id);
    } catch { setToast?.('Delete failed.', 'error'); }
  };

  const handleQuote = () => {
    navigate('/', { state: { quotePostId: post.id, quotePost: post } });
    setToast?.('Quoting post…');
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d`;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <article className="card p-5 hover:shadow-card-hover transition-shadow duration-200 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <AuthorAvatar author={post.author} />
          <div className="min-w-0">
            <Link to={`/profile/${post.author.username}`}
              className="text-sm font-semibold text-brand-900 dark:text-brand-50 hover:underline truncate block">
              {post.author.display_name || post.author.username}
            </Link>
            <div className="flex items-center gap-1 text-xs text-brand-400">
              <span>@{post.author.username}</span>
              <span>·</span>
              <span>{timeAgo(post.created_at)}</span>
            </div>
          </div>
        </div>

        {isOwner && (
          <div className="relative flex-shrink-0">
            <button onClick={() => setShowMenu(!showMenu)}
              className="rounded-lg p-1.5 text-brand-400 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-800 dark:hover:text-brand-200 transition-all">
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-brand-200 bg-white shadow-card-hover dark:border-brand-700 dark:bg-brand-900 overflow-hidden animate-scale-in">
                <button onClick={() => { onPostEditClick(post); setShowMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-brand-700 hover:bg-brand-50 dark:text-brand-200 dark:hover:bg-brand-800 transition-colors">
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </button>
                <button onClick={handleDelete}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {post.content && (
        <p className="mt-3 text-[15px] leading-relaxed text-brand-800 dark:text-brand-200 whitespace-pre-wrap">
          {post.content}
        </p>
      )}

      {/* Media */}
      <MediaDisplay url={post.media_url} type={post.media_type} />

      {/* Quoted post */}
      {post.quote_of && <QuotedPost post={post.quote_of} />}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-1 border-t border-brand-50 pt-3 dark:border-brand-800/50 flex-wrap">
        {/* Like */}
        <button onClick={handleLike} disabled={likeLoading}
          className={`action-btn ${post.is_liked_by_me ? '!text-rose-500 dark:!text-rose-400' : ''}`}>
          <Heart className={`h-4 w-4 ${post.is_liked_by_me ? 'fill-current' : ''} ${likeLoading ? 'opacity-50' : ''}`} />
          <span>{post.likes_count > 0 ? post.likes_count : ''}</span>
        </button>

        {/* Comment */}
        <button onClick={() => setShowComments(!showComments)} className="action-btn">
          <MessageSquare className="h-4 w-4" />
          <span>{post.comments_count > 0 ? post.comments_count : ''}</span>
        </button>

        {/* Repost */}
        <button onClick={handleRepost} disabled={repostLoading}
          className={`action-btn ${post.is_reposted_by_me ? '!text-emerald-500 dark:!text-emerald-400' : ''}`}>
          <Repeat2 className="h-4 w-4" />
          <span>{post.reposts_count > 0 ? post.reposts_count : ''}</span>
        </button>

        {/* Quote */}
        <button onClick={handleQuote} className="action-btn" title="Quote post">
          <Quote className="h-4 w-4" />
        </button>

        {/* Share */}
        <button onClick={() => setShareOpen(true)} className="action-btn ml-auto" title="Share">
          <Share2 className="h-4 w-4" />
        </button>

        {/* View full post link */}
        {!expanded && (
          <Link to={`/post/${post.id}`} className="action-btn text-[11px]">
            View
          </Link>
        )}
      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-4 border-t border-brand-50 pt-4 dark:border-brand-800/50">
          <CommentSection post={post} setToast={setToast} />
        </div>
      )}

      {/* Share Modal */}
      {shareOpen && (
        <ShareModal post={post} onClose={() => setShareOpen(false)} setToast={setToast} />
      )}
    </article>
  );
};

export default PostCard;
