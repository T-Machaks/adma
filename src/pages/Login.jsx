import React, { useState, useRef, useEffect } from "react";
import { EVENT_CONFIG } from '@/lib/eventConfig';
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2, Info, MessageSquare, RefreshCw, ShieldCheck, Smartphone, KeyRound, Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { useAuth } from "@/lib/AuthContext";
import SocialAuthButtons, { SocialDivider } from "@/components/SocialAuthButtons";

const DEMO_ACCOUNTS = [
  { email: "organizer@agrishow.co.zw",  role: "Organizer",         dest: "Console" },
  { email: "partner@agrishow.co.zw",    role: "Marketing Partner", dest: "Console" },
  { email: "exhibitor@agrishow.co.zw",  role: "Exhibitor",         dest: "Exhibitor Portal" },
  { email: "attendee@agrishow.co.zw",   role: "Attendee",          dest: "Attendee App" },
];

// ── Verification method pill ────────────────────────────────────────────────
function MethodBadge({ icon: Icon, label, active, disabled }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors
      ${disabled ? 'border-border text-muted-foreground/30 bg-muted/20 cursor-not-allowed' :
        active  ? 'border-primary bg-primary/10 text-primary' :
                  'border-border text-muted-foreground hover:border-primary/50 cursor-pointer'}`}
      title={disabled ? 'Add a Zimbabwe mobile number to your account to use SMS OTP' : undefined}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
      {disabled && <span className="opacity-60 text-[10px]">· no ZW number</span>}
    </span>
  );
}

// ── "Authenticator app not available" fallback links ───────────────────────
function TotpFallbackLinks({ onFallback, disabled }) {
  return (
    <div className="mt-4 text-center space-y-1">
      <p className="text-xs text-muted-foreground">Authenticator app not available?</p>
      <div className="flex items-center justify-center gap-3 text-xs">
        <button type="button" onClick={() => onFallback('email')} disabled={disabled}
          className="text-primary hover:underline disabled:opacity-50">Email me a code</button>
        <span className="text-muted-foreground">·</span>
        <button type="button" onClick={() => onFallback('sms')} disabled={disabled}
          className="text-primary hover:underline disabled:opacity-50">Text me a code</button>
      </div>
    </div>
  );
}

export default function Login() {
  const { login, changePassword, verifyOtp, verifyTotp, resendOtp, totpFallback, setSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  // Step state: 'credentials' | 'change_password' | 'email_otp' | 'totp_setup' | 'totp_verify'
  const [step, setStep]           = useState('credentials');
  const [mfaToken, setMfaToken]   = useState('');
  const [changeToken, setChangeToken] = useState('');
  const [emailHint, setEmailHint] = useState('');
  const [phoneHint, setPhoneHint] = useState('');
  const [otpMethod, setOtpMethod] = useState('email');
  const [qrCode, setQrCode]       = useState('');
  const [otp, setOtp]             = useState('');
  const [totpCode, setTotpCode]   = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [showPass, setShowPass] = useState(false);

  const otpRef   = useRef(null);
  const totpRef  = useRef(null);
  const intendedPath = location.state?.from || null;

  const focusAfter = (ref) => setTimeout(() => ref.current?.focus(), 100);

  const OTP_SESSION_KEY = `${EVENT_CONFIG.storagePrefix}_otp_flow`;

  // Restore OTP flow if user left the app to check email/SMS and came back
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(OTP_SESSION_KEY);
      if (saved) {
        const s = JSON.parse(saved);
        if (s.step && s.step !== 'credentials') {
          setStep(s.step);
          setMfaToken(s.mfaToken || '');
          setChangeToken(s.changeToken || '');
          setEmailHint(s.emailHint || '');
          setPhoneHint(s.phoneHint || '');
          setOtpMethod(s.otpMethod || 'email');
          setQrCode(s.qrCode || '');
        }
      }
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist OTP flow state so it survives PWA app-switching
  useEffect(() => {
    if (step === 'credentials') {
      sessionStorage.removeItem(OTP_SESSION_KEY);
    } else {
      try {
        sessionStorage.setItem(OTP_SESSION_KEY, JSON.stringify({
          step, mfaToken, changeToken, emailHint, phoneHint, otpMethod, qrCode,
        }));
      } catch {}
    }
  }, [step, mfaToken, changeToken, emailHint, phoneHint, otpMethod, qrCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSession = (found) => {
    sessionStorage.removeItem(OTP_SESSION_KEY);
    navigate(intendedPath || found.redirectTo, { replace: true });
  };

  // ── Step 1: credentials ──────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success) { setError(result.error); return; }

      if (result.mustChangePassword) {
        setChangeToken(result.changeToken);
        setStep('change_password');
        return;
      }
      if (result.mfaRequired) {
        setMfaToken(result.mfaToken);
        setEmailHint(result.emailHint);
        setPhoneHint(result.phoneHint || '');
        setOtpMethod('email');
        setStep('email_otp');
        focusAfter(otpRef);
        return;
      }
      if (result.totpRequired) {
        setMfaToken(result.mfaToken);
        if (result.firstTime) {
          setQrCode(result.qrCode);
          setStep('totp_setup');
        } else {
          setStep('totp_verify');
          focusAfter(totpRef);
        }
        return;
      }
      handleSession(result);
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 1b: forced password change ─────────────────────────────────────
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmNewPassword) return setError('Passwords do not match.');
    if (newPassword.length < 8) return setError('Password must be at least 8 characters.');
    setLoading(true);
    try {
      const result = await changePassword(changeToken, newPassword);
      if (!result.success) { setError(result.error); return; }
      // Server immediately issues TOTP challenge
      if (result.totpRequired) {
        setMfaToken(result.mfaToken);
        if (result.firstTime) { setQrCode(result.qrCode); setStep('totp_setup'); }
        else { setStep('totp_verify'); focusAfter(totpRef); }
        return;
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2a: email OTP ───────────────────────────────────────────────────
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await verifyOtp(mfaToken, otp);
      if (!result.success) { setError(result.error); return; }
      handleSession(result);
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (method) => {
    setResendMsg('');
    setError('');
    setResending(true);
    const result = await resendOtp(mfaToken, method);
    setResending(false);
    if (result.success) {
      if (result.method) setOtpMethod(result.method);
      setResendMsg(result.method === 'sms' ? 'Code sent via SMS.' : 'New code sent to your email.');
    } else {
      setError(result.error);
    }
  };

  // ── Step 2b/c: TOTP (setup or verify) ───────────────────────────────────
  const handleTotpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await verifyTotp(mfaToken, totpCode);
      if (!result.success) { setError(result.error); return; }
      handleSession(result);
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Authenticator not available — fall back to email/SMS OTP ───────────
  const handleTotpFallback = async (method) => {
    setError('');
    setLoading(true);
    const result = await totpFallback(mfaToken, method);
    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    setEmailHint(result.emailHint || '');
    setPhoneHint(result.phoneHint || '');
    setOtpMethod(result.method);
    setQrCode('');
    setStep('email_otp');
    focusAfter(otpRef);
  };

  const handleSocialSuccess = (userData) => {
    const result = setSession(userData);
    navigate(intendedPath || result.redirectTo, { replace: true });
  };

  const resetToCredentials = () => {
    setStep('credentials');
    setOtp('');
    setTotpCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setError('');
    setResendMsg('');
  };

  // ── Forced password change ────────────────────────────────────────────────
  if (step === 'change_password') {
    return (
      <AuthLayout
        icon={KeyRound}
        title="Set your password"
        subtitle="Your account uses a temporary password. Please set a permanent one to continue."
        footer={<button type="button" onClick={resetToCredentials} className="text-primary font-medium hover:underline">← Back to login</button>}
      >
        <div className="mb-5 p-3 rounded-lg bg-amber/10 border border-amber/20 text-amber-700 dark:text-amber-400 text-sm">
          For security, you must change the default password before accessing your account.
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="new-password"
                type="password"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                autoFocus
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">Confirm new password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="confirm-new-password"
                type="password"
                placeholder="Repeat your new password"
                autoComplete="new-password"
                value={confirmNewPassword}
                onChange={e => setConfirmNewPassword(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full h-12 font-medium" disabled={loading || !newPassword || !confirmNewPassword}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : 'Set password & continue'}
          </Button>
        </form>
      </AuthLayout>
    );
  }

  // ── TOTP first-time setup ─────────────────────────────────────────────────
  if (step === 'totp_setup') {
    return (
      <AuthLayout
        icon={ShieldCheck}
        title="Set up authenticator"
        subtitle="Scan the QR code with Google Authenticator or Microsoft Authenticator"
        footer={<button type="button" onClick={resetToCredentials} className="text-primary font-medium hover:underline">← Back to login</button>}
      >
        {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
        {qrCode && (
          <div className="flex flex-col items-center gap-4 mb-6">
            <img src={qrCode} alt="TOTP QR code" className="w-48 h-48 rounded-xl border border-border" />
            <p className="text-xs text-muted-foreground text-center">
              Open your authenticator app, tap <strong>+</strong> and scan this code.
            </p>
          </div>
        )}
        <form onSubmit={handleTotpSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="totp-setup">Enter the 6-digit code to confirm setup</Label>
            <Input
              id="totp-setup"
              ref={totpRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="123456"
              value={totpCode}
              onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
              className="h-12 text-center text-2xl tracking-[0.5em] font-mono"
              required
              autoComplete="one-time-code"
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full h-12 font-medium" disabled={loading || totpCode.length < 6}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying…</> : 'Confirm & log in'}
          </Button>
        </form>
        <TotpFallbackLinks onFallback={handleTotpFallback} disabled={loading} />
      </AuthLayout>
    );
  }

  // ── TOTP verify (returning organizer) ─────────────────────────────────────
  if (step === 'totp_verify') {
    return (
      <AuthLayout
        icon={ShieldCheck}
        title="Authenticator code"
        subtitle="Enter the 6-digit code from your authenticator app"
        footer={<button type="button" onClick={resetToCredentials} className="text-primary font-medium hover:underline">← Back to login</button>}
      >
        {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
        <form onSubmit={handleTotpSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="totp-verify">Authenticator code</Label>
            <Input
              id="totp-verify"
              ref={totpRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="123456"
              value={totpCode}
              onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
              className="h-12 text-center text-2xl tracking-[0.5em] font-mono"
              required
              autoComplete="one-time-code"
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full h-12 font-medium" disabled={loading || totpCode.length < 6}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying…</> : 'Verify & log in'}
          </Button>
        </form>
        <TotpFallbackLinks onFallback={handleTotpFallback} disabled={loading} />
      </AuthLayout>
    );
  }

  // ── Email / SMS OTP step ─────────────────────────────────────────────────
  if (step === 'email_otp') {
    const hint = otpMethod === 'sms' ? phoneHint : emailHint;
    const title = otpMethod === 'sms' ? 'Check your phone' : 'Check your email';
    const subtitle = `We sent a 6-digit code to ${hint}`;
    return (
      <AuthLayout
        icon={MessageSquare}
        title={title}
        subtitle={subtitle}
        footer={<button type="button" onClick={resetToCredentials} className="text-primary font-medium hover:underline">← Back to login</button>}
      >
        {/* Method selector */}
        <div className="flex gap-2 mb-5">
          <button type="button" onClick={() => otpMethod !== 'email' && handleResend('email')} disabled={resending}>
            <MethodBadge icon={Mail} label="Email" active={otpMethod === 'email'} />
          </button>
          <button type="button" onClick={() => otpMethod !== 'sms' && phoneHint && handleResend('sms')} disabled={resending || !phoneHint}>
            <MethodBadge icon={Smartphone} label="SMS" active={otpMethod === 'sms'} disabled={!phoneHint} />
          </button>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
        {resendMsg && <div className="mb-4 p-3 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400 text-sm">{resendMsg}</div>}

        <form onSubmit={handleOtpSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">Verification code</Label>
            <Input
              id="otp"
              ref={otpRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              className="h-12 text-center text-2xl tracking-[0.5em] font-mono"
              required
              autoComplete="one-time-code"
            />
          </div>
          <Button type="submit" className="w-full h-12 font-medium" disabled={loading || otp.length < 6}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying…</> : 'Verify & log in'}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => handleResend(otpMethod)}
            disabled={resending}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {resending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Resend code
          </button>
        </div>
      </AuthLayout>
    );
  }

  // ── Step 1: credentials ───────────────────────────────────────────────────
  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Log in to your account"
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary font-medium hover:underline">Create free account</Link>
          {" · "}
          <Link to="/register" className="text-primary font-medium hover:underline">Event registration</Link>
          {" · "}
          <Link to="/exhibitor-apply" className="text-primary font-medium hover:underline">Exhibitor application</Link>
        </>
      }
    >
      <SocialAuthButtons onSuccess={handleSocialSuccess} onError={setError} />
      <SocialDivider />

      {window.location.hostname === 'localhost' && (
        <div className="mb-4">
          <button type="button" onClick={() => setShowDemo(v => !v)}
            className="flex items-center gap-1.5 text-xs text-amber font-medium hover:underline">
            <Info className="w-3.5 h-3.5" />
            {showDemo ? 'Hide demo accounts' : 'Show demo accounts'}
          </button>
          {showDemo && (
            <div className="mt-2 rounded-xl border border-amber/30 bg-amber/5 p-3 space-y-1.5">
              {DEMO_ACCOUNTS.map(a => (
                <button key={a.email} type="button"
                  onClick={() => { setEmail(a.email); setPassword('demo'); setShowDemo(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-amber/10 transition-colors text-left">
                  <div>
                    <p className="text-xs font-semibold">{a.role}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{a.email}</p>
                  </div>
                  <span className="text-[10px] text-amber font-bold">{a.dest} →</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="email" type="email" autoComplete="email" autoFocus placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="password" type={showPass ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10 h-12" />
            <button
              type="button"
              onClick={() => setShowPass(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
              aria-label={showPass ? 'Hide password' : 'Show password'}
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Logging in...</> : 'Log in'}
        </Button>
      </form>
    </AuthLayout>
  );
}
