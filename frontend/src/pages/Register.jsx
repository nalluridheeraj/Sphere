import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Eye, EyeOff, UserPlus, CheckCircle2, XCircle } from 'lucide-react';

const requirements = [
  { id: 'len',    label: 'At least 8 characters',         test: (p) => p.length >= 8 },
  { id: 'upper',  label: 'One uppercase letter (A-Z)',     test: (p) => /[A-Z]/.test(p) },
  { id: 'lower',  label: 'One lowercase letter (a-z)',     test: (p) => /[a-z]/.test(p) },
  { id: 'digit',  label: 'One digit (0-9)',                test: (p) => /\d/.test(p) },
  { id: 'special',label: 'One special character (!@#$…)',  test: (p) => /[!@#$%^&*()\-_=+\[\]{};:'",.<>/?\\|`~]/.test(p) },
];

const StrengthBar = ({ password }) => {
  const passed = requirements.filter((r) => r.test(password)).length;
  const colors = ['bg-rose-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-emerald-500'];
  return (
    <div className="mt-3 space-y-2">
      <div className="flex gap-1 h-1.5">
        {[0,1,2,3,4].map((i) => (
          <div key={i} className={`flex-1 rounded-full transition-colors duration-300 ${i < passed ? colors[passed-1] : 'bg-brand-200 dark:bg-brand-700'}`} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-1">
        {requirements.map((r) => {
          const ok = r.test(password);
          return (
            <div key={r.id} className={`flex items-center gap-1.5 text-xs transition-colors ${ok ? 'text-emerald-500' : 'text-brand-400 dark:text-brand-600'}`}>
              {ok ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> : <XCircle className="h-3.5 w-3.5 flex-shrink-0" />}
              {r.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Register = ({ setToast }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', display_name: '' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await authAPI.register(form);
      setToast('Account created! Check your email for the verification OTP.');
      navigate('/verify-email', { state: { email: form.email } });
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16 dark:bg-brand-950">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sphere-600 shadow-glow-sphere">
            <span className="text-2xl font-display font-bold text-white">S</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-brand-900 dark:text-white">Join Sphere</h1>
          <p className="mt-2 text-sm text-brand-500 dark:text-brand-400">Build your orbit. Share your world.</p>
        </div>

        <div className="card p-8 animate-slide-up">
          {error && (
            <div className="mb-5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-600 dark:bg-rose-950/30 dark:border-rose-800/40 dark:text-rose-400">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Username</label>
                <input name="username" type="text" value={form.username} onChange={handle} required
                  placeholder="unique_handle" className="input" autoComplete="username" />
              </div>
              <div>
                <label className="label">Display Name</label>
                <input name="display_name" type="text" value={form.display_name} onChange={handle}
                  placeholder="Your Name" className="input" />
              </div>
            </div>

            <div>
              <label className="label">Email Address</label>
              <input name="email" type="email" value={form.email} onChange={handle} required
                placeholder="you@example.com" className="input" autoComplete="email" />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input name="password" type={showPw ? 'text' : 'password'} value={form.password}
                  onChange={handle} required placeholder="Create a strong password"
                  className="input pr-11" autoComplete="new-password" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 hover:text-brand-600 dark:hover:text-brand-200">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.password && <StrengthBar password={form.password} />}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              <UserPlus className="h-4 w-4" />
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-brand-500 dark:text-brand-400">
            Already on Sphere?{' '}
            <Link to="/login" className="font-semibold text-sphere-500 hover:text-sphere-400 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
