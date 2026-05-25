import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { userAPI, postAPI, mediaAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import CallModal from '../components/CallModal';
import CreatePostModal from '../components/CreatePostModal';
import { resolveUrl } from '../utils/media';
import {
  Edit3, Check, X, Camera, Phone, Video,
  Users, UserCheck, Grid3x3, FileText
} from 'lucide-react';

const Avatar = ({ user, size = 'lg', onClick }) => {
  const s = size === 'lg' ? 'h-24 w-24' : 'h-10 w-10';
  const txt = size === 'lg' ? 'text-3xl' : 'text-base';
  return (
    <div onClick={onClick} className={`${s} relative overflow-hidden rounded-full bg-sphere-900 border-4 border-brand-50 dark:border-brand-950 ${onClick ? 'cursor-pointer group' : ''} flex-shrink-0`}>
      {user.avatar_url ? (
        <img src={user.avatar_url} alt={user.username} className="h-full w-full object-cover" />
      ) : (
        <div className={`flex h-full w-full items-center justify-center ${txt} font-bold text-sphere-300`}>
          {(user.display_name || user.username)[0].toUpperCase()}
        </div>
      )}
      {onClick && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="h-6 w-6 text-white" />
        </div>
      )}
    </div>
  );
};

const StatBadge = ({ label, value }) => (
  <div className="text-center">
    <div className="text-lg font-bold text-brand-900 dark:text-white">{value?.toLocaleString() ?? 0}</div>
    <div className="text-xs text-brand-400">{label}</div>
  </div>
);

const Profile = ({ setToast }) => {
  const { username } = useParams();
  const { user: me, updateLocalUser } = useAuth();
  const [profile, setProfile]   = useState(null);
  const [posts, setPosts]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('posts'); // 'posts' | 'media'
  const [isEditing, setIsEditing]   = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [editForm, setEditForm] = useState({ bio: '', avatar_url: '', display_name: '' });
  const [callModal, setCallModal] = useState(null); // { type: 'audio'|'video', roomId, targetUsername }
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const avatarInputRef = useRef(null);

  const isOwn = me?.username === username;

  const load = async () => {
    setLoading(true);
    try {
      const [uRes, pRes] = await Promise.all([
        userAPI.getProfile(username),
        postAPI.getUserPosts(username),
      ]);
      setProfile(uRes.data);
      setEditForm({ bio: uRes.data.bio, avatar_url: uRes.data.avatar_url, display_name: uRes.data.display_name });
      setPosts(pRes.data);
    } catch {
      setToast('Failed to load profile.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [username]);

  const handleJoin = async () => {
    if (!profile) return;
    setJoinLoading(true);
    try {
      if (profile.is_in_my_orbit) {
        await userAPI.leaveOrbit(username);
        setProfile(p => ({ ...p, is_in_my_orbit: false, orbit_count: p.orbit_count - 1 }));
        setToast(`Left @${username}'s orbit.`);
      } else {
        await userAPI.joinOrbit(username);
        setProfile(p => ({ ...p, is_in_my_orbit: true, orbit_count: p.orbit_count + 1 }));
        setToast(`Joined @${username}'s orbit!`);
      }
    } catch (err) {
      setToast(err.response?.data?.detail || 'Action failed.', 'error');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleSave = async () => {
    setEditLoading(true);
    try {
      const res = await userAPI.updateProfile(editForm);
      setProfile(p => ({ ...p, ...res.data }));
      if (isOwn) updateLocalUser(res.data);
      setIsEditing(false);
      setToast('Profile updated!');
    } catch {
      setToast('Update failed.', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await mediaAPI.upload(file);
      const avatarUrl = resolveUrl(res.data.url);
      setEditForm(f => ({ ...f, avatar_url: avatarUrl }));
      const saved = await userAPI.updateProfile({ ...editForm, avatar_url: avatarUrl });
      setProfile(p => ({ ...p, avatar_url: avatarUrl }));
      if (isOwn) updateLocalUser({ avatar_url: avatarUrl });
      setToast('Avatar updated!');
    } catch {
      setToast('Failed to upload avatar.', 'error');
    }
  };

  const handleLikeToggle = (id) => setPosts(prev => prev.map(p =>
    p.id === id ? { ...p, is_liked_by_me: !p.is_liked_by_me, likes_count: p.is_liked_by_me ? p.likes_count - 1 : p.likes_count + 1 } : p
  ));
  const handleRepostToggle = (id) => setPosts(prev => prev.map(p =>
    p.id === id ? { ...p, is_reposted_by_me: !p.is_reposted_by_me, reposts_count: p.is_reposted_by_me ? p.reposts_count - 1 : p.reposts_count + 1 } : p
  ));
  const handlePostDeleted = (id) => { setPosts(prev => prev.filter(p => p.id !== id)); setToast('Post deleted.'); };
  const handlePostChange = (post, action) => {
    if (action === 'edit') setPosts(prev => prev.map(p => p.id === post.id ? post : p));
    else if (action === 'create') setPosts(prev => [post, ...prev]);
    setIsPostModalOpen(false); setEditingPost(null);
    setToast(action === 'edit' ? 'Post updated.' : 'Post shared!');
  };

  const mediaPosts = posts.filter(p => p.media_type === 'image' || p.media_type === 'video');

  // Orbit connection check for calls (either direction)
  const canCall = !isOwn && profile && (profile.is_in_my_orbit || me?.username === username);

  if (loading) return (
    <div className="mx-auto max-w-2xl px-4 pt-8 animate-pulse">
      <div className="card p-6 mb-6">
        <div className="flex gap-4">
          <div className="h-24 w-24 rounded-full bg-brand-200 dark:bg-brand-700 flex-shrink-0" />
          <div className="flex-1 space-y-3 pt-2">
            <div className="h-4 w-40 rounded-full bg-brand-200 dark:bg-brand-700" />
            <div className="h-3 w-28 rounded-full bg-brand-100 dark:bg-brand-800" />
            <div className="h-3 w-full rounded-full bg-brand-100 dark:bg-brand-800" />
          </div>
        </div>
      </div>
    </div>
  );

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6">
      {/* Profile Header */}
      <div className="card overflow-hidden mb-6">
        {/* Banner */}
        <div className="h-28 bg-gradient-to-r from-sphere-900 via-sphere-800 to-brand-900" />

        <div className="px-6 pb-6">
          {/* Avatar + Actions row */}
          <div className="flex items-end justify-between -mt-12 mb-4">
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            <Avatar user={profile} size="lg" onClick={isOwn ? () => avatarInputRef.current?.click() : null} />

            <div className="flex items-center gap-2 pb-1">
              {/* Call buttons (only if in orbit) */}
              {canCall && (
                <>
                  <button onClick={() => setCallModal({ type: 'audio', targetUsername: username })}
                    className="btn-ghost p-2" title="Voice call">
                    <Phone className="h-4 w-4" />
                  </button>
                  <button onClick={() => setCallModal({ type: 'video', targetUsername: username })}
                    className="btn-ghost p-2" title="Video call">
                    <Video className="h-4 w-4" />
                  </button>
                </>
              )}

              {isOwn ? (
                <>
                  {isEditing ? (
                    <>
                      <button onClick={handleSave} disabled={editLoading}
                        className="btn-primary py-1.5 px-3 text-xs">
                        <Check className="h-3.5 w-3.5" /> Save
                      </button>
                      <button onClick={() => setIsEditing(false)} className="btn-ghost py-1.5 px-3 text-xs">
                        <X className="h-3.5 w-3.5" /> Cancel
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setIsEditing(true)} className="btn-ghost text-xs py-1.5 px-3">
                      <Edit3 className="h-3.5 w-3.5" /> Edit profile
                    </button>
                  )}
                  <button onClick={() => { setEditingPost(null); setIsPostModalOpen(true); }}
                    className="btn-primary text-xs py-1.5 px-3">
                    Post
                  </button>
                </>
              ) : (
                <button onClick={handleJoin} disabled={joinLoading}
                  className={profile.is_in_my_orbit ? 'btn-ghost' : 'btn-primary'}>
                  {joinLoading ? <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> :
                    profile.is_in_my_orbit ? <><UserCheck className="h-4 w-4" /> In Orbit</> : <><Users className="h-4 w-4" /> Join</>
                  }
                </button>
              )}
            </div>
          </div>

          {/* Name & username */}
          {isEditing ? (
            <input value={editForm.display_name} onChange={e => setEditForm(f => ({ ...f, display_name: e.target.value }))}
              className="input text-lg font-bold mb-1" placeholder="Display name" />
          ) : (
            <h2 className="text-xl font-bold text-brand-900 dark:text-white">{profile.display_name || profile.username}</h2>
          )}
          <p className="text-sm text-brand-400 mb-3">@{profile.username}</p>

          {/* Bio */}
          {isEditing ? (
            <textarea value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
              rows={3} className="textarea text-sm mb-3" placeholder="Write your bio…" />
          ) : (
            profile.bio && <p className="text-sm text-brand-600 dark:text-brand-300 mb-4 leading-relaxed">{profile.bio}</p>
          )}

          {/* Stats */}
          <div className="flex gap-6">
            <StatBadge value={posts.length} label="Posts" />
            <Link to={`/profile/${username}/orbit`} className="hover:opacity-80 transition-opacity">
              <StatBadge value={profile.orbit_count} label="Orbit" />
            </Link>
            <Link to={`/profile/${username}/following`} className="hover:opacity-80 transition-opacity">
              <StatBadge value={profile.following_count} label="Following" />
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs: Posts / Media */}
      <div className="flex gap-0 border-b border-brand-200 dark:border-brand-800 mb-5">
        <button onClick={() => setTab('posts')}
          className={`tab-btn ${tab === 'posts' ? 'active' : ''}`}>
          <FileText className="inline h-3.5 w-3.5 mr-1" />Posts
        </button>
        <button onClick={() => setTab('media')}
          className={`tab-btn ${tab === 'media' ? 'active' : ''}`}>
          <Grid3x3 className="inline h-3.5 w-3.5 mr-1" />Media
        </button>
      </div>

      {/* Content */}
      {tab === 'posts' ? (
        <div className="space-y-4 pb-10">
          {posts.length === 0 ? (
            <div className="card py-14 text-center">
              <p className="text-sm text-brand-400">No posts yet.</p>
              {isOwn && <button onClick={() => setIsPostModalOpen(true)} className="btn-primary mt-4 mx-auto">Create first post</button>}
            </div>
          ) : posts.map(post => (
            <PostCard key={post.id} post={post}
              onLikeToggle={handleLikeToggle}
              onRepostToggle={handleRepostToggle}
              onPostDeleted={handlePostDeleted}
              onPostEditClick={(p) => { setEditingPost(p); setIsPostModalOpen(true); }}
              setToast={setToast}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 pb-10">
          {mediaPosts.length === 0 ? (
            <div className="col-span-3 card py-14 text-center">
              <p className="text-sm text-brand-400">No media posts yet.</p>
            </div>
          ) : mediaPosts.map(post => (
            <Link to={`/post/${post.id}`} key={post.id}
              className="aspect-square overflow-hidden rounded-xl bg-brand-100 dark:bg-brand-800 group relative">
              {post.media_type === 'image'
                ? <img src={resolveUrl(post.media_url)}
                    alt="media" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                : <video src={resolveUrl(post.media_url)}
                    className="h-full w-full object-cover" />
              }
            </Link>
          ))}
        </div>
      )}

      {/* Call Modal */}
      {callModal && (
        <CallModal
          targetUsername={callModal.targetUsername}
          callType={callModal.type}
          currentUsername={me?.username}
          onClose={() => setCallModal(null)}
        />
      )}

      {/* Post Modal */}
      <CreatePostModal
        isOpen={isPostModalOpen}
        onClose={() => { setIsPostModalOpen(false); setEditingPost(null); }}
        onPostChange={handlePostChange}
        editingPost={editingPost}
        setToast={setToast}
      />
    </div>
  );
};

export default Profile;
