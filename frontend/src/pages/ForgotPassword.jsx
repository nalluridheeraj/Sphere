import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { KeyRound, Mail, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';

const requirements = [
  { label: '8+ characters',               test: (p) => p.length >= 8 },
  { label: 'Uppercase letter',             test: (p) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter',             test: (p) => /[a-z]/.test(p) },
  { label: 'Digit (0-9)',                  test: (p) => /\d/.test(p) },
  { label: 'Special character (!@#$…)',    test: (p) => /[!@#$%^&*()\-_=+\[\]{};:'",.<>/?\\|`~]/.test(p) },
];

const OTP_LEN = 6;

const ForgotPassword = ({ setToast }) => {
  const navigate = useNavigate();
  const [step, setStep]     = useState(1); // 1 = email, 2 = otp + new pw
  const [email, setEmail]   = useState('');
  const [code, setCode]     = useState(Array(OTP_LEN).fill(''));
  const [newPw, setNewPw]   = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [cooldown, setCooldown] = useState(0);
  const refs = useRef([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendOtp = async (e) => {
    e?.preventDefault();
    setLoading(true); setError('');
    try {
      await authAPI.forgotPassword(email.trim());
      setStep(2);
      setCooldown(60);
      setToast('If that email exists, an OTP has been sent.');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDigit = (i, val) => {
    const v = val.replace(/\D/g, '').slice(-1);
    const next = [...code]; next[i] = v; setCode(next);
    if (v && i < OTP_LEN - 1) refs.current[i + 1]?.focus();
  };
  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) refs.current[i - 1]?.focus();
  };
  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LEN);
    if (text) {
      setCode([...text.split(''), ...Array(OTP_LEN - text.length).fill('')]);
      refs.current[Math.min(text.length, OTP_LEN - 1)]?.focus();
    }
  };

  const reset = async (e) => {
    e.preventDefault();
    const full = code.join('');
    if (full.length < OTP_LEN) { setError('Enter all 6 OTP digits.'); return; }
    const failedReq = requirements.find(r => !r.test(newPw));
    if (failedReq) { setError(`Password requirement: ${failedReq.label}`); return; }
    setLoading(true); setError('');
    try {
      await authAPI.resetPassword(email, full, newPw);
      setToast('Password reset! You can now sign in.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16 dark:bg-brand-950">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sphere-600/10 border border-sphere-600/30">
            <KeyRound className="h-7 w-7 text-sphere-500" />
          </div>
          <h1 className="font-display text-2xl font-bold text-brand-900 dark:text-white">
            {step === 1 ? 'Reset password' : 'Create new password'}
          </h1>
          <p className="mt-2 text-sm text-brand-500 dark:text-brand-400">
            {step === 1 ? "Enter your email and we'll send a reset code." : `Enter the OTP sent to ${email}`}
          </p>
        </div>

        <div className="card p-8 animate-slide-up">
          {error && (
            <div className="mb-5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-600 dark:bg-rose-950/30 dark:border-rose-800/40 dark:text-rose-400">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={sendOtp} className="space-y-4">
              <div>
                <label className="label">Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="your@email.com" className="input" autoFocus />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                <Mail className="h-4 w-4" />
                {loading ? 'Sending…' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={reset} className="space-y-5">
              {/* OTP */}
              <div>
                <label className="label text-center block mb-3">Enter OTP</label>
                <div className="flex justify-center gap-2" onPaste={handlePaste}>
                  {code.map((d, i) => (
                    <input key={i} ref={el => refs.current[i] = el}
                      type="text" inputMode="numeric" maxLength={1} value={d}
                      onChange={e => handleDigit(i, e.target.value)}
                      onKeyDown={e => handleKeyDown(i, e)}
                      className="h-12 w-10 rounded-xl border border-brand-200 bg-brand-50 text-center text-lg font-bold text-brand-900
                                 outline-none focus:border-sphere-500 focus:ring-2 focus:ring-sphere-500/20 transition-all
                                 dark:border-brand-700 dark:bg-brand-800 dark:text-white" />
                  ))}
                </div>
                <div className="mt-2 text-center">
                  <button type="button" onClick={sendOtp} disabled={cooldown > 0}
                    className="text-xs text-sphere-500 hover:text-sphere-400 disabled:opacity-50 transition-colors">
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="label">New Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={newPw}
                    onChange={e => setNewPw(e.target.value)} required
                    placeholder="Create a strong password" className="input pr-11" />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 hover:text-brand-600 dark:hover:text-brand-200">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {newPw && (
                  <div className="mt-2 grid grid-cols-1 gap-1">
                    {requirements.map((r, i) => {
                      const ok = r.test(newPw);
                      return (
                        <div key={i} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-emerald-500' : 'text-brand-400 dark:text-brand-600'}`}>
                          {ok ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> : <XCircle className="h-3.5 w-3.5 flex-shrink-0" />}
                          {r.label}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-sm">
          <Link to="/login" className="text-brand-400 hover:text-brand-600 dark:hover:text-brand-200 transition-colors">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
