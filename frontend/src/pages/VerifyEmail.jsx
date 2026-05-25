import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { MailCheck, RefreshCw, ArrowLeft } from 'lucide-react';

const OTP_LEN = 6;

const VerifyEmail = ({ setToast }) => {
  const { state } = useLocation();
  const navigate  = useNavigate();
  const [email, setEmail]     = useState(state?.email || '');
  const [code, setCode]       = useState(Array(OTP_LEN).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError]     = useState('');
  const refs = useRef([]);

  // Countdown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleDigit = (i, val) => {
    const v = val.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[i] = v;
    setCode(next);
    if (v && i < OTP_LEN - 1) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LEN);
    if (text) {
      setCode([...text.split(''), ...Array(OTP_LEN - text.length).fill('')]);
      refs.current[Math.min(text.length, OTP_LEN - 1)]?.focus();
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const full = code.join('');
    if (full.length < OTP_LEN) { setError('Please enter all 6 digits.'); return; }
    setLoading(true); setError('');
    try {
      await authAPI.verifyEmail(email, full);
      setToast('Email verified! You can now sign in.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Verification failed.');
      setCode(Array(OTP_LEN).fill(''));
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0 || !email) return;
    setResending(true);
    try {
      await authAPI.resendOtp(email);
      setToast('OTP resent. Check your inbox.');
      setCooldown(60);
      setCode(Array(OTP_LEN).fill(''));
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16 dark:bg-brand-950">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sphere-600/10 border border-sphere-600/30">
            <MailCheck className="h-7 w-7 text-sphere-500" />
          </div>
          <h1 className="font-display text-2xl font-bold text-brand-900 dark:text-white">Verify your email</h1>
          <p className="mt-2 text-sm text-brand-500 dark:text-brand-400">
            We sent a 6-digit code to{' '}
            <span className="font-medium text-brand-700 dark:text-brand-200">{email}</span>
          </p>
        </div>

        <div className="card p-8 animate-slide-up">
          {error && (
            <div className="mb-5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-600 dark:bg-rose-950/30 dark:border-rose-800/40 dark:text-rose-400">
              {error}
            </div>
          )}

          {!state?.email && (
            <div className="mb-4">
              <label className="label">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Your registered email" className="input" />
            </div>
          )}

          <form onSubmit={submit}>
            <label className="label text-center block mb-3">Enter OTP</label>
            <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={el => refs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleDigit(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className="h-12 w-10 rounded-xl border border-brand-200 bg-brand-50 text-center text-lg font-bold text-brand-900
                             outline-none focus:border-sphere-500 focus:ring-2 focus:ring-sphere-500/20 transition-all
                             dark:border-brand-700 dark:bg-brand-800 dark:text-white"
                />
              ))}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Verifying…' : 'Verify Email'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button onClick={resend} disabled={cooldown > 0 || resending}
              className="inline-flex items-center gap-1.5 text-sm text-sphere-500 hover:text-sphere-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              <RefreshCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-sm">
          <Link to="/login" className="inline-flex items-center gap-1 text-brand-400 hover:text-brand-600 dark:hover:text-brand-200 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;
