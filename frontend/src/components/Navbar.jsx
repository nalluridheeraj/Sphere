import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userAPI, messageAPI } from '../services/api';
import { LogOut, User, PenSquare, Moon, Sun, Search, X, ArrowRight, MessageSquare } from 'lucide-react';

const SphereLogoMark = () => (
  <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none">
    <circle cx="16" cy="16" r="13" fill="#7c3aed" />
    <circle cx="16" cy="16" r="8" stroke="white" strokeWidth="1.5" />
    <circle cx="16" cy="16" r="3" fill="white" />
    <ellipse cx="16" cy="16" rx="13" ry="5" stroke="white" strokeWidth="1" strokeDasharray="2 2" />
  </svg>
);

const Navbar = ({ setToast }) => {
  const { user, logoutUser } = useAuth();
  const navigate  = useNavigate();
  const [dark, setDark]   = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [unread, setUnread] = useState(0);
  const searchRef = useRef(null);

  // Sync dark mode state
  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleDark = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    setDark(isDark);
  };

  // Debounced search
  useEffect(() => {
    const t = setTimeout(async () => {
      if (query.trim().length >= 2) {
        try {
          const res = await userAPI.search(query.trim());
          setResults(res.data);
        } catch {}
      } else {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // Close search on outside click
  useEffect(() => {
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setResults([]); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Poll unread message count
  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      try {
        const res = await messageAPI.getUnreadCount();
        setUnread(res.data.unread_count || 0);
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const clearSearch = () => { setQuery(''); setResults([]); };

  return (
    <header className="sticky top-0 z-40 border-b border-brand-200/80 bg-brand-50/90 backdrop-blur-lg transition-colors duration-200 dark:border-brand-800/60 dark:bg-brand-950/90">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0 mr-2">
          <SphereLogoMark />
          <span className="font-display text-lg font-bold tracking-tight text-brand-900 dark:text-white">
            Sphere
          </span>
        </Link>

        {/* Search */}
        {user && (
          <div ref={searchRef} className="relative flex-1 max-w-xs hidden sm:block">
            <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-100 px-3 py-1.5 dark:border-brand-700 dark:bg-brand-800 focus-within:border-sphere-500 focus-within:ring-2 focus-within:ring-sphere-500/20 transition-all">
              <Search className="h-3.5 w-3.5 text-brand-400 flex-shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Sphere…"
                className="w-full bg-transparent text-sm text-brand-900 outline-none placeholder:text-brand-400 dark:text-brand-50"
              />
              {query && (
                <button onClick={clearSearch} className="text-brand-400 hover:text-brand-600 dark:hover:text-brand-200">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {results.length > 0 && (
              <div className="absolute top-11 left-0 w-full rounded-xl border border-brand-200 bg-white shadow-card-hover dark:border-brand-700 dark:bg-brand-900 overflow-hidden animate-slide-up">
                {results.map((u) => (
                  <Link key={u.username} to={`/profile/${u.username}`}
                    onClick={clearSearch}
                    className="flex items-center justify-between px-3 py-2.5 hover:bg-brand-50 dark:hover:bg-brand-800 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-sphere-700 flex items-center justify-center text-xs font-bold text-sphere-200 flex-shrink-0">
                        {(u.display_name || u.username)[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-brand-900 dark:text-brand-50">{u.display_name || u.username}</div>
                        <div className="text-[10px] text-brand-400">@{u.username}</div>
                      </div>
                    </div>
                    <ArrowRight className="h-3 w-3 text-brand-400" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <nav className="flex items-center gap-1">
          <button onClick={toggleDark}
            className="rounded-xl p-2 text-brand-500 hover:bg-brand-100 hover:text-brand-700 transition-all dark:text-brand-400 dark:hover:bg-brand-800 dark:hover:text-brand-200">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user ? (
            <>
              <Link to="/messages"
                className="relative rounded-xl p-2 text-brand-500 hover:bg-brand-100 hover:text-sphere-600 transition-all dark:text-brand-400 dark:hover:bg-brand-800 dark:hover:text-sphere-400">
                <MessageSquare className="h-4 w-4" />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-sphere-600 text-white text-[9px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </Link>

              <Link to="/"
                onClick={(e) => { e.preventDefault(); document.dispatchEvent(new CustomEvent('open-create-post')); }}
                className="btn-primary text-sm py-1.5 px-3 hidden sm:flex">
                <PenSquare className="h-3.5 w-3.5" />
                <span>Post</span>
              </Link>

              <Link to={`/profile/${user.username}`}
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-brand-100 dark:hover:bg-brand-800 transition-all group">
                <div className="h-7 w-7 rounded-full bg-sphere-700 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                  {user.avatar_url
                    ? <img src={user.avatar_url} alt={user.username} className="h-full w-full object-cover" />
                    : (user.display_name || user.username)[0].toUpperCase()
                  }
                </div>
                <span className="text-xs font-medium text-brand-600 dark:text-brand-300 hidden md:block">
                  @{user.username}
                </span>
              </Link>

              <button onClick={() => { logoutUser(); navigate('/login'); }}
                className="rounded-xl p-2 text-brand-400 hover:bg-brand-100 hover:text-rose-500 transition-all dark:hover:bg-brand-800">
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="text-sm font-medium text-brand-500 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-200 px-3 py-1.5 transition-colors">
                Sign in
              </Link>
              <Link to="/register" className="btn-primary text-sm py-1.5 px-4">
                Join
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
