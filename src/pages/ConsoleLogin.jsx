import { useState, useRef, useEffect } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { LogIn, Mail, Lock, Loader2, ShieldCheck, KeyRound } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import EventLogo from '@/components/layout/EventLogo';
import { EVENT_CONFIG } from '@/lib/eventConfig';

export default function ConsoleLogin() {
  const { login, changePassword, verifyOtp, verifyTotp, user, hasConsoleAccess, isLoadingAuth, authChecked } = useAuth();
  const navigate = useNavigate();

  // Redirect already-authenticated users away from this page
  if (authChecked && !isLoadingAuth) {
    if (hasConsoleAccess()) return <Navigate to="/console" replace />;
    if (user) return <Navigate to="/" replace />;
  }

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const [step, setStep]             = useState('credentials');
  const [mfaToken, setMfaToken]     = useState('');
  const [changeToken, setChangeToken] = useState('');
  const [otp, setOtp]               = useState('');
  const [totpCode, setTotpCode]     = useState('');
  const [qrCode, setQrCode]         = useState('');
  const [newPassword, setNewPassword]             = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const otpRef  = useRef(null);
  const totpRef = useRef(null);
  const focusAfter = (ref) => setTimeout(() => ref.current?.focus(), 100);

  const OTP_SESSION_KEY = `${EVENT_CONFIG.storagePrefix}_console_otp_flow`;

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(OTP_SESSION_KEY);
      if (saved) {
        const s = JSON.parse(saved);
        if (s.step && s.step !== 'credentials') {
          setStep(s.step);
          setMfaToken(s.mfaToken || '');
          setChangeToken(s.changeToken || '');
          setQrCode(s.qrCode || '');
        }
      }
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step === 'credentials') {
      sessionStorage.removeItem(OTP_SESSION_KEY);
    } else {
      try {
        sessionStorage.setItem(OTP_SESSION_KEY, JSON.stringify({ step, mfaToken, changeToken, qrCode }));
      } catch {}
    }
  }, [step, mfaToken, changeToken, qrCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success) { setError(result.error); return; }
      if (result.mustChangePassword) { setChangeToken(result.changeToken); setStep('change_password'); return; }
      if (result.mfaRequired) { setMfaToken(result.mfaToken); setOtp(''); setStep('email_otp'); focusAfter(otpRef); return; }
      if (result.totpRequired) {
        setMfaToken(result.mfaToken);
        if (result.firstTime) { setQrCode(result.qrCode); setStep('totp_setup'); }
        else { setStep('totp_verify'); focusAfter(totpRef); }
        return;
      }
      sessionStorage.removeItem(OTP_SESSION_KEY);
      navigate('/console', { replace: true });
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmNewPassword) return setError('Passwords do not match.');
    if (newPassword.length < 8) return setError('Password must be at least 8 characters.');
    setLoading(true);
    try {
      const result = await changePassword(changeToken, newPassword);
      if (!result.success) { setError(result.error); return; }
      if (result.totpRequired) {
        setMfaToken(result.mfaToken);
        if (result.firstTime) { setQrCode(result.qrCode); setStep('totp_setup'); }
        else { setStep('totp_verify'); focusAfter(totpRef); }
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await verifyOtp(mfaToken, otp);
      if (!result.success) { setError(result.error); return; }
      sessionStorage.removeItem(OTP_SESSION_KEY);
      navigate('/console', { replace: true });
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTotpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await verifyTotp(mfaToken, totpCode);
      if (!result.success) { setError(result.error); return; }
      sessionStorage.removeItem(OTP_SESSION_KEY);
      navigate('/console', { replace: true });
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setStep('credentials'); setOtp(''); setTotpCode(''); setError(''); };

  return (
    <div className="min-h-screen bg-steel flex flex-col items-center justify-center px-4">
      {/* Brand strip */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <EventLogo />
        <div className="text-center">
          <p className="text-amber text-[11px] font-bold uppercase tracking-widest">Management Console</p>
          <p className="text-slate-400 text-xs mt-0.5">Authorised personnel only</p>
        </div>
      </div>

      <div className="w-full max-w-sm bg-slate-800 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 bg-amber/10 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-amber" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-tight">
              {step === 'credentials'    ? 'Sign in to Console'  :
               step === 'change_password'? 'Set new password'    :
               step === 'email_otp'     ? 'Email verification'  :
               step === 'totp_setup'    ? 'Set up authenticator':
                                          'Authenticator code'  }
            </p>
            <p className="text-slate-400 text-[11px]">{EVENT_CONFIG.eventFullName}</p>
          </div>
        </div>

        <div className="px-6 py-5">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* ── Credentials ── */}
          {step === 'credentials' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    autoFocus
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="username"
                    placeholder="you@organisation.com"
                    className="w-full bg-slate-900 border border-white/10 text-white placeholder:text-slate-600 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber/50 focus:border-amber/50"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-400">Password</label>
                  <Link to="/forgot-password" className="text-xs text-amber hover:underline">Forgot password?</Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Your password"
                    className="w-full bg-slate-900 border border-white/10 text-white placeholder:text-slate-600 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber/50 focus:border-amber/50"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber hover:bg-amber/90 text-white font-semibold py-2.5 rounded-lg text-sm transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Signing in…</> : <><LogIn className="w-4 h-4" />Sign in</>}
              </button>
            </form>
          )}

          {/* ── Password change ── */}
          {step === 'change_password' && (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="p-3 rounded-lg bg-amber/10 border border-amber/20 text-amber text-xs">
                You must set a permanent password before accessing the console.
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">New password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="password" required autoFocus autoComplete="new-password" placeholder="At least 8 characters"
                    value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 text-white placeholder:text-slate-600 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber/50" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirm password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="password" required autoComplete="new-password" placeholder="Repeat password"
                    value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 text-white placeholder:text-slate-600 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber/50" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-amber hover:bg-amber/90 text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : 'Set password & continue'}
              </button>
            </form>
          )}

          {/* ── Email OTP ── */}
          {step === 'email_otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <p className="text-slate-400 text-xs">A verification code was sent to your email address.</p>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Verification code</label>
                <input
                  ref={otpRef}
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  autoComplete="one-time-code"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full bg-slate-900 border border-white/10 text-white text-center text-xl font-mono tracking-[0.4em] placeholder:text-slate-600 placeholder:text-base placeholder:tracking-normal rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber/50"
                />
              </div>
              <button type="submit" disabled={loading || otp.length < 6}
                className="w-full bg-amber hover:bg-amber/90 text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying…</> : 'Verify & continue'}
              </button>
              <button type="button" onClick={reset} className="w-full text-slate-500 hover:text-slate-300 text-xs py-1 transition-colors">
                ← Back to sign in
              </button>
            </form>
          )}

          {/* ── TOTP setup ── */}
          {step === 'totp_setup' && (
            <div className="space-y-4">
              <p className="text-slate-400 text-xs">Scan this QR code with your authenticator app (e.g. Google Authenticator, Authy).</p>
              {qrCode && (
                <div className="flex justify-center">
                  <div className="bg-white p-3 rounded-xl">
                    <img src={qrCode} alt="TOTP QR" className="w-40 h-40" />
                  </div>
                </div>
              )}
              <p className="text-slate-400 text-xs text-center">Then enter the 6-digit code from your app below.</p>
              <form onSubmit={handleTotpSubmit} className="space-y-3">
                <input
                  ref={totpRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  placeholder="6-digit code"
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full bg-slate-900 border border-white/10 text-white text-center text-xl font-mono tracking-[0.4em] placeholder:text-slate-600 placeholder:text-base placeholder:tracking-normal rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber/50"
                />
                <button type="submit" disabled={loading || totpCode.length < 6}
                  className="w-full bg-amber hover:bg-amber/90 text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying…</> : 'Activate & continue'}
                </button>
              </form>
            </div>
          )}

          {/* ── TOTP verify ── */}
          {step === 'totp_verify' && (
            <form onSubmit={handleTotpSubmit} className="space-y-4">
              <p className="text-slate-400 text-xs">Enter the 6-digit code from your authenticator app.</p>
              <input
                ref={totpRef}
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                placeholder="6-digit code"
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full bg-slate-900 border border-white/10 text-white text-center text-xl font-mono tracking-[0.4em] placeholder:text-slate-600 placeholder:text-base placeholder:tracking-normal rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber/50"
              />
              <button type="submit" disabled={loading || totpCode.length < 6}
                className="w-full bg-amber hover:bg-amber/90 text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying…</> : 'Verify & enter'}
              </button>
              <button type="button" onClick={reset} className="w-full text-slate-500 hover:text-slate-300 text-xs py-1 transition-colors">
                ← Back to sign in
              </button>
            </form>
          )}
        </div>
      </div>

      <p className="mt-6 text-slate-600 text-xs text-center">
        Not an organiser?{' '}
        <a href="/" className="text-amber hover:underline">Back to {EVENT_CONFIG.eventName} app</a>
      </p>
    </div>
  );
}
