import React, { useState, useCallback } from 'react';
import { commentAPI, mediaAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Send, Trash2, Heart, Reply, Quote, Image, X,
  ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import { resolveUrl } from '../utils/media';

const CommentAvatar = ({ author }) => (
  <div className="h-8 w-8 rounded-full overflow-hidden bg-sphere-900 border border-brand-200 dark:border-brand-700 flex-shrink-0">
    {author.avatar_url
      ? <img src={resolveUrl(author.avatar_url)} alt={author.username} className="h-full w-full object-cover" />
      : <div className="flex h-full w-full items-center justify-center text-xs font-bold text-sphere-300">
          {(author.display_name || author.username)[0].toUpperCase()}
        </div>
    }
  </div>
);

const QuotedComment = ({ comment }) => {
  if (!comment) return null;
  return (
    <div className="mt-2 rounded-lg border-l-2 border-sphere-600 bg-brand-50 dark:bg-brand-800/50 px-3 py-2">
      <span className="text-xs font-semibold text-sphere-500">@{comment.author.username}</span>
      <p className="text-xs text-brand-500 dark:text-brand-400 mt-0.5 line-clamp-2">{comment.content}</p>
    </div>
  );
};

const CommentItem = ({ comment, postId, postAuthorId, onUpdate, depth = 0 }) => {
  const { user }               = useAuth();
  const [liked, setLiked]      = useState(comment.is_liked_by_me);
  const [likes, setLikes]      = useState(comment.likes_count);
  const [showReplies, setShowReplies] = useState(false);
  const [replyOpen, setReplyOpen]     = useState(false);
  const [quoteOpen, setQuoteOpen]     = useState(false);
  const [replyText, setReplyText]     = useState('');
  const [replyMedia, setReplyMedia]   = useState(null);
  const [replyMediaUrl, setReplyMediaUrl] = useState('');
  const [replyMediaType, setReplyMediaType] = useState('text');
  const [submitting, setSubmitting] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [quoteText, setQuoteText]   = useState('');
  const [quotingSubmit, setQuotingSubmit] = useState(false);

  const isOwn     = user?.id === comment.user_id;
  const isPostOwn = user?.id === postAuthorId;
  const canDelete = isOwn || isPostOwn;

  const timeAgo = (d) => {
    const m = Math.floor((Date.now() - new Date(d)) / 60000);
    if (m < 1) return 'just now'; if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return new Date(d).toLocaleDateString();
  };

  const handleLike = async () => {
    if (likeLoading) return;
    setLikeLoading(true);
    try {
      await commentAPI.toggleLike(postId, comment.id);
      setLiked(l => { setLikes(c => l ? c - 1 : c + 1); return !l; });
    } catch {} finally { setLikeLoading(false); }
  };

  const handleDelete = async () => {
    try {
      await commentAPI.delete(postId, comment.id);
      onUpdate(comment.id, 'delete');
    } catch {}
  };

  const pickFile = async (file) => {
    if (!file) return;
    try {
      const res = await mediaAPI.upload(file);
      setReplyMedia(file);
      setReplyMediaUrl(res.data.url);
      setReplyMediaType(res.data.media_type);
    } catch { alert('Upload failed.'); }
  };

  const submitReply = async (quoteOfId = null) => {
    const text = quoteOfId ? quoteText : replyText;
    if (!text.trim() && !replyMediaUrl) return;
    setSubmitting(true);
    setQuotingSubmit(true);
    try {
      const payload = {
        content: text,
        parent_id: quoteOfId ? null : comment.id,
        quote_of_id: quoteOfId || null,
        media_url: replyMediaUrl || '',
        media_type: replyMediaType,
      };
      const res = await commentAPI.create(postId, payload);
      onUpdate(null, 'add', res.data, comment.id);
      setReplyText(''); setQuoteText('');
      setReplyMedia(null); setReplyMediaUrl(''); setReplyMediaType('text');
      setReplyOpen(false); setQuoteOpen(false);
    } catch {} finally { setSubmitting(false); setQuotingSubmit(false); }
  };

  return (
    <div className={`${depth > 0 ? 'ml-8 border-l border-brand-100 dark:border-brand-800 pl-4' : ''} space-y-3`}>
      <div className="flex items-start gap-2.5 group">
        <CommentAvatar author={comment.author} />
        <div className="flex-1 min-w-0">
          <div className="rounded-2xl bg-brand-50 dark:bg-brand-800/60 px-4 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-brand-900 dark:text-brand-100">
                  {comment.author.display_name || comment.author.username}
                </span>
                <span className="text-[10px] text-brand-400">· {timeAgo(comment.created_at)}</span>
              </div>
              {canDelete && (
                <button onClick={handleDelete}
                  className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 transition-all">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {comment.quote_of && <QuotedComment comment={comment.quote_of} />}
            {comment.content && <p className="text-sm text-brand-700 dark:text-brand-200 mt-1 leading-relaxed">{comment.content}</p>}
            {comment.media_url && (
              comment.media_type === 'image'
                ? <img src={resolveUrl(comment.media_url)} alt="" className="mt-2 rounded-xl max-h-48 w-auto" />
                : <video src={resolveUrl(comment.media_url)} controls className="mt-2 rounded-xl max-h-40 w-auto" />
            )}
          </div>

          {/* Comment actions */}
          <div className="flex items-center gap-3 mt-1 ml-2">
            <button onClick={handleLike} disabled={likeLoading}
              className={`flex items-center gap-1 text-xs transition-colors ${liked ? 'text-rose-500' : 'text-brand-400 hover:text-rose-400'}`}>
              <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-current' : ''}`} />
              {likes > 0 && <span>{likes}</span>}
            </button>
            {depth === 0 && (
              <button onClick={() => { setReplyOpen(!replyOpen); setQuoteOpen(false); }}
                className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-600 dark:hover:text-brand-200 transition-colors">
                <Reply className="h-3.5 w-3.5" /> Reply
              </button>
            )}
            <button onClick={() => { setQuoteOpen(!quoteOpen); setReplyOpen(false); }}
              className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-600 dark:hover:text-brand-200 transition-colors">
              <Quote className="h-3.5 w-3.5" /> Quote
            </button>
            {comment.replies_count > 0 && depth === 0 && (
              <button onClick={() => setShowReplies(!showReplies)}
                className="flex items-center gap-1 text-xs text-sphere-500 hover:text-sphere-400 transition-colors">
                {showReplies ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {comment.replies_count} {comment.replies_count === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>

          {/* Reply form */}
          {replyOpen && (
            <div className="mt-2 ml-2 space-y-2 animate-slide-up">
              <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                rows={2} placeholder={`Reply to @${comment.author.username}…`}
                className="textarea text-sm w-full" />
              {replyMedia && (
                <div className="relative inline-block">
                  <img src={URL.createObjectURL(replyMedia)} alt="" className="h-16 w-auto rounded-lg" />
                  <button onClick={() => { setReplyMedia(null); setReplyMediaUrl(''); setReplyMediaType('text'); }}
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white flex items-center justify-center">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <label className="cursor-pointer rounded-lg p-1.5 text-brand-400 hover:bg-brand-100 hover:text-brand-600 dark:hover:bg-brand-800 transition-all">
                  <Image className="h-3.5 w-3.5" />
                  <input type="file" accept="image/*,video/*" className="hidden" onChange={e => pickFile(e.target.files[0])} />
                </label>
                <button onClick={() => submitReply()} disabled={submitting || (!replyText.trim() && !replyMediaUrl)}
                  className="ml-auto btn-primary text-xs py-1.5 px-3">
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Send className="h-3.5 w-3.5" /> Reply</>}
                </button>
              </div>
            </div>
          )}

          {/* Quote form */}
          {quoteOpen && (
            <div className="mt-2 ml-2 space-y-2 animate-slide-up">
              <QuotedComment comment={comment} />
              <textarea value={quoteText} onChange={e => setQuoteText(e.target.value)}
                rows={2} placeholder="Add your thoughts…"
                className="textarea text-sm w-full" />
              <div className="flex justify-end">
                <button onClick={() => submitReply(comment.id)} disabled={quotingSubmit || !quoteText.trim()}
                  className="btn-primary text-xs py-1.5 px-3">
                  {quotingSubmit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Quote className="h-3.5 w-3.5" /> Quote</>}
                </button>
              </div>
            </div>
          )}

          {/* Nested replies */}
          {showReplies && comment.replies?.length > 0 && (
            <div className="mt-3 space-y-3">
              {comment.replies.map(r => (
                <CommentItem key={r.id} comment={r} postId={postId} postAuthorId={postAuthorId}
                  onUpdate={onUpdate} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main CommentSection ───────────────────────────────────────────────────────

const CommentSection = ({ post, setToast }) => {
  const { user }       = useAuth();
  const [comments, setComments] = useState([]);
  const [loaded, setLoaded]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [text, setText]         = useState('');
  const [media, setMedia]       = useState(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('text');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const res = await commentAPI.getComments(post.id);
      setComments(res.data);
      setLoaded(true);
    } catch { setToast?.('Failed to load replies.', 'error'); }
    finally { setLoading(false); }
  }, [post.id, loaded]);

  // Load on mount
  React.useEffect(() => { load(); }, [load]);

  const handleUpdate = useCallback((commentId, action, newComment, parentId) => {
    setComments(prev => {
      if (action === 'delete') return prev.filter(c => c.id !== commentId);
      if (action === 'add') {
        if (!parentId) return [...prev, newComment];
        return prev.map(c => c.id === parentId
          ? { ...c, replies: [...(c.replies || []), newComment], replies_count: (c.replies_count || 0) + 1 }
          : c
        );
      }
      return prev;
    });
  }, []);

  const pickFile = async (file) => {
    if (!file) return;
    try {
      const res = await mediaAPI.upload(file);
      setMedia(file); setMediaUrl(res.data.url); setMediaType(res.data.media_type);
    } catch { setToast?.('Upload failed.', 'error'); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !mediaUrl) return;
    setSubmitting(true);
    try {
      const res = await commentAPI.create(post.id, { content: text, media_url: mediaUrl, media_type: mediaType });
      setComments(prev => [...prev, res.data]);
      setText(''); setMedia(null); setMediaUrl(''); setMediaType('text');
    } catch { setToast?.('Failed to post reply.', 'error'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-4">
      {loading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-sphere-500" />
        </div>
      )}

      {!loading && comments.length === 0 && (
        <p className="text-center text-xs text-brand-400 py-3">
          No replies yet. Be the first to respond.
        </p>
      )}

      <div className="space-y-3">
        {comments.map(c => (
          <CommentItem key={c.id} comment={c} postId={post.id}
            postAuthorId={post.user_id} onUpdate={handleUpdate} />
        ))}
      </div>

      {/* New comment form */}
      <form onSubmit={submit} className="flex gap-3 pt-2 border-t border-brand-50 dark:border-brand-800/50">
        <div className="h-8 w-8 rounded-full bg-sphere-700 flex items-center justify-center text-xs font-bold text-white overflow-hidden flex-shrink-0">
          {user?.avatar_url
            ? <img src={resolveUrl(user.avatar_url)} alt="" className="h-full w-full object-cover" />
            : user?.username[0].toUpperCase()
          }
        </div>
        <div className="flex-1 space-y-2">
          <textarea value={text} onChange={e => setText(e.target.value)} rows={2}
            placeholder="Write a reply…" className="textarea text-sm w-full"
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) submit(e); }} />
          {media && (
            <div className="relative inline-block">
              <img src={URL.createObjectURL(media)} alt="" className="h-16 w-auto rounded-lg" />
              <button type="button" onClick={() => { setMedia(null); setMediaUrl(''); setMediaType('text'); }}
                className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white flex items-center justify-center">
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="cursor-pointer rounded-lg p-1.5 text-brand-400 hover:bg-brand-100 hover:text-brand-600 dark:hover:bg-brand-800 transition-all">
              <Image className="h-4 w-4" />
              <input type="file" accept="image/*,video/*" className="hidden"
                onChange={e => pickFile(e.target.files[0])} />
            </label>
            <button type="submit" disabled={submitting || (!text.trim() && !mediaUrl)}
              className="ml-auto btn-primary text-sm py-1.5 px-4">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-3.5 w-3.5" /> Reply</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CommentSection;
