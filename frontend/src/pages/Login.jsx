import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, LogIn } from 'lucide-react';

const Login = ({ setToast }) => {
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]       = useState({ identifier: '', password: '' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await authAPI.login(form.identifier.trim(), form.password);
      loginUser(res.data.access_token);
      setToast('Welcome back to Sphere!');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16 dark:bg-brand-950">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sphere-600 shadow-glow-sphere">
            <span className="text-2xl font-display font-bold text-white">S</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-brand-900 dark:text-white">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-brand-500 dark:text-brand-400">
            Sign in to your Sphere account
          </p>
        </div>

        <div className="card p-8 animate-slide-up">
          {error && (
            <div className="mb-5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-600 dark:bg-rose-950/30 dark:border-rose-800/40 dark:text-rose-400">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="label">Username or Email</label>
              <input
                name="identifier"
                type="text"
                autoComplete="username"
                value={form.identifier}
                onChange={handle}
                required
                placeholder="Enter username or email"
                className="input"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">Password</label>
                <Link to="/forgot-password" className="text-xs text-sphere-500 hover:text-sphere-400 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handle}
                  required
                  placeholder="Your password"
                  className="input pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 hover:text-brand-600 dark:hover:text-brand-200"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              <LogIn className="h-4 w-4" />
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-brand-500 dark:text-brand-400">
            New to Sphere?{' '}
            <Link to="/register" className="font-semibold text-sphere-500 hover:text-sphere-400 transition-colors">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
