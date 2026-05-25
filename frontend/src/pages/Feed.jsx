import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { postAPI } from '../services/api';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import { PenSquare, Sparkles, Users, RefreshCw } from 'lucide-react';

const LIMIT = 15;

const Feed = ({ setToast }) => {
  const [tab, setTab]         = useState('foryou'); // 'foryou' | 'orbit'
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadMore, setLoadMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [editingPost, setEditingPost]   = useState(null);
  const [quotePost, setQuotePost]       = useState(null);
  const skip = useRef(0);
  const location = useLocation();
  const navigate = useNavigate();

  // Handle quote navigation from PostCard
  useEffect(() => {
    if (location.state?.quotePost) {
      setQuotePost(location.state.quotePost);
      setEditingPost(null);
      setIsModalOpen(true);
      // Clear the state so refreshing doesn't re-trigger
      navigate('/', { replace: true, state: {} });
    }
  }, [location.state]);

  const fetchPosts = useCallback(async (reset = false) => {
    if (reset) { skip.current = 0; setLoading(true); }
    else setLoadMore(true);
    try {
      const fn = tab === 'orbit' ? postAPI.getOrbitFeed : postAPI.getFeed;
      const res = await fn(skip.current, LIMIT);
      const data = res.data;
      if (reset) {
        setPosts(data);
      } else {
        setPosts(prev => [...prev, ...data]);
      }
      setHasMore(data.length === LIMIT);
      skip.current += data.length;
    } catch {
      setToast('Failed to load posts.', 'error');
    } finally {
      setLoading(false);
      setLoadMore(false);
    }
  }, [tab]);

  useEffect(() => { fetchPosts(true); }, [fetchPosts]);

  const handleTabChange = (t) => { if (t !== tab) { setTab(t); } };

  const handlePostChange = (post, action) => {
    if (action === 'create') {
      setPosts(prev => [post, ...prev]);
      setToast('Post shared to Sphere!');
    } else if (action === 'edit') {
      setPosts(prev => prev.map(p => p.id === post.id ? post : p));
      setToast('Post updated.');
    }
    setIsModalOpen(false);
    setEditingPost(null);
    setQuotePost(null);
  };

  const handleLikeToggle = (postId) => {
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, is_liked_by_me: !p.is_liked_by_me, likes_count: p.is_liked_by_me ? p.likes_count - 1 : p.likes_count + 1 }
      : p
    ));
  };

  const handleRepostToggle = (postId) => {
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, is_reposted_by_me: !p.is_reposted_by_me, reposts_count: p.is_reposted_by_me ? p.reposts_count - 1 : p.reposts_count + 1 }
      : p
    ));
  };

  const handlePostDeleted = (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    setToast('Post deleted.');
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6">
      {/* Tabs */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 rounded-xl border border-brand-200 bg-brand-50 p-1 dark:border-brand-800 dark:bg-brand-900">
          <button onClick={() => handleTabChange('foryou')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold transition-all ${
              tab === 'foryou'
                ? 'bg-sphere-600 text-white shadow-sm'
                : 'text-brand-500 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-200'
            }`}>
            <Sparkles className="h-3.5 w-3.5" />
            For You
          </button>
          <button onClick={() => handleTabChange('orbit')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold transition-all ${
              tab === 'orbit'
                ? 'bg-sphere-600 text-white shadow-sm'
                : 'text-brand-500 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-200'
            }`}>
            <Users className="h-3.5 w-3.5" />
            Orbit
          </button>
        </div>
        <button onClick={() => fetchPosts(true)}
          className="rounded-xl p-2 text-brand-400 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-800 dark:hover:text-brand-200 transition-all">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Posts */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-full bg-brand-200 dark:bg-brand-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 rounded-full bg-brand-200 dark:bg-brand-700" />
                  <div className="h-3 w-20 rounded-full bg-brand-100 dark:bg-brand-800" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-3 w-full rounded-full bg-brand-100 dark:bg-brand-800" />
                <div className="h-3 w-3/4 rounded-full bg-brand-100 dark:bg-brand-800" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-sphere-600/10 border border-sphere-600/20 flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-sphere-500" />
          </div>
          <h3 className="font-semibold text-brand-700 dark:text-brand-200">
            {tab === 'orbit' ? 'Your orbit is quiet' : 'Nothing here yet'}
          </h3>
          <p className="mt-1 text-sm text-brand-400 dark:text-brand-500">
            {tab === 'orbit' ? 'Join some orbits to see their posts here.' : 'Be the first to post something!'}
          </p>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary mt-6">
            <PenSquare className="h-4 w-4" /> Create Post
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onLikeToggle={handleLikeToggle}
              onRepostToggle={handleRepostToggle}
              onPostDeleted={handlePostDeleted}
              onPostEditClick={(p) => { setEditingPost(p); setIsModalOpen(true); }}
              setToast={setToast}
            />
          ))}
          {hasMore && (
            <div className="flex justify-center py-4">
              <button onClick={() => fetchPosts(false)} disabled={loadMore} className="btn-ghost">
                {loadMore ? (
                  <><div className="h-4 w-4 border-2 border-sphere-600 border-t-transparent rounded-full animate-spin" /> Loading…</>
                ) : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating create button */}
      <button
        onClick={() => { setEditingPost(null); setIsModalOpen(true); }}
        className="fixed bottom-8 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-sphere-600 text-white shadow-glow-sphere hover:bg-sphere-700 active:scale-95 transition-all duration-200 sm:hidden">
        <PenSquare className="h-6 w-6" />
      </button>

      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingPost(null); setQuotePost(null); }}
        onPostChange={handlePostChange}
        editingPost={editingPost}
        setToast={setToast}
        quotePost={quotePost}
      />
    </div>
  );
};

export default Feed;
