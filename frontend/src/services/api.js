import axios from 'axios';

// Prioritize the environment variable if available, otherwise fall back to local development
const BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api` 
  : 'http://localhost:8000/api';

const API = axios.create({ baseURL: BASE_URL });

// ── Request interceptor: attach Bearer token ──────────────────────────────
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor: auto-logout on 401 ─────────────────────────────
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────
export const authAPI = {
  register:        (payload)            => API.post('/auth/register', payload),
  verifyEmail:     (email, code)        => API.post('/auth/verify-email', { email, code }),
  resendOtp:       (email)              => API.post('/auth/resend-otp', { email }),
  login:           (identifier, pw)     => API.post('/auth/login', { identifier, password: pw }),
  forgotPassword:  (email)              => API.post('/auth/forgot-password', { email }),
  resetPassword:   (email, code, pw)    => API.post('/auth/reset-password', { email, code, new_password: pw }),
};

// ── Users ─────────────────────────────────────────────────────────────────
export const userAPI = {
  getMe:          ()         => API.get('/users/me'),
  updateProfile:  (data)     => API.put('/users/me', data),
  getProfile:     (username) => API.get(`/users/${username}`),
  search:         (q)        => API.get(`/users/search?q=${encodeURIComponent(q)}`),
  joinOrbit:      (username) => API.post(`/users/${username}/join`),
  leaveOrbit:     (username) => API.delete(`/users/${username}/join`),
  getOrbit:       (username) => API.get(`/users/${username}/orbit`),
  getFollowing:   (username) => API.get(`/users/${username}/following`),
};

// ── Posts ─────────────────────────────────────────────────────────────────
export const postAPI = {
  getFeed:        (skip=0, limit=20) => API.get(`/posts?skip=${skip}&limit=${limit}`),
  getOrbitFeed:   (skip=0, limit=20) => API.get(`/posts/orbit-feed?skip=${skip}&limit=${limit}`),
  getPost:        (id)               => API.get(`/posts/${id}`),
  getUserPosts:   (username, skip=0, limit=20) => API.get(`/posts/user/${username}?skip=${skip}&limit=${limit}`),
  create:         (data)             => API.post('/posts', data),
  update:         (id, content)      => API.put(`/posts/${id}`, { content }),
  delete:         (id)               => API.delete(`/posts/${id}`),
  toggleLike:     (id)               => API.post(`/posts/${id}/like`),
  toggleRepost:   (id)               => API.post(`/posts/${id}/repost`),
};

// ── Comments ──────────────────────────────────────────────────────────────
export const commentAPI = {
  getComments:  (postId)                 => API.get(`/posts/${postId}/comments`),
  create:       (postId, data)           => API.post(`/posts/${postId}/comments`, data),
  delete:       (postId, commentId)      => API.delete(`/posts/${postId}/comments/${commentId}`),
  toggleLike:   (postId, commentId)      => API.post(`/posts/${postId}/comments/${commentId}/like`),
};

// ── Media ─────────────────────────────────────────────────────────────────
export const mediaAPI = {
  upload: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return API.post('/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// ── Calls ─────────────────────────────────────────────────────────────────
export const callAPI = {
  initiate: (targetUsername, callType = 'video') =>
    API.post(`/calls/initiate?target_username=${encodeURIComponent(targetUsername)}&call_type=${callType}`),
};

export const API_BASE = BASE_URL.replace('/api', '');

// ── Messages / DMs ───────────────────────────────────────────────────────
export const messageAPI = {
  getConversations: ()              => API.get('/messages/conversations'),
  getUnreadCount:   ()              => API.get('/messages/conversations/unread-count'),
  getMessages:      (username, skip = 0, limit = 50) => API.get(`/messages/${username}?skip=${skip}&limit=${limit}`),
  sendMessage:      (username, data) => API.post(`/messages/${username}`, data),
  markRead:         (convId)        => API.put(`/messages/${convId}/read`),
  acceptRequest:    (convId)        => API.post(`/messages/requests/${convId}/accept`),
  declineRequest:   (convId)        => API.post(`/messages/requests/${convId}/decline`),
};

export default API;