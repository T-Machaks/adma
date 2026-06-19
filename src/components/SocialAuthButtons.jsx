import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';

// Provider feature flags — buttons only render when the env var is set
const G_ID  = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const MS_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
const FB_ID = import.meta.env.VITE_FACEBOOK_APP_ID;

// ── Microsoft MSAL (lazy-initialised) ──────────────────────────────────────
let _msal = null;
async function getMsal() {
  if (_msal) return _msal;
  const { PublicClientApplication } = await import('@azure/msal-browser');
  _msal = new PublicClientApplication({
    auth: {
      clientId: MS_ID,
      authority: 'https://login.microsoftonline.com/common',
      redirectUri: `${window.location.origin}/blank.html`,
    },
    cache: { cacheLocation: 'sessionStorage' },
  });
  await _msal.initialize();
  return _msal;
}

// ── Facebook SDK (lazy-loaded) ──────────────────────────────────────────────
function loadFB() {
  return new Promise((resolve) => {
    if (window.FB) { resolve(window.FB); return; }
    window.fbAsyncInit = () => {
      window.FB.init({ appId: FB_ID, cookie: true, xfbml: false, version: 'v21.0' });
      resolve(window.FB);
    };
    const s = document.createElement('script');
    s.src = 'https://connect.facebook.net/en_US/sdk.js';
    s.async = true;
    document.head.appendChild(s);
  });
}

// ── Icon SVGs ──────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" aria-hidden="true">
      <path fill="#F25022" d="M1 1h10v10H1z"/>
      <path fill="#00A4EF" d="M13 1h10v10H13z"/>
      <path fill="#7FBA00" d="M1 13h10v10H1z"/>
      <path fill="#FFB900" d="M13 13h10v10H13z"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="#1877F2" aria-hidden="true">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.793-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97H15.83c-1.491 0-1.956.93-1.956 1.886v2.273h3.328l-.532 3.49H13.875V24C19.612 23.094 24 18.1 24 12.073z"/>
    </svg>
  );
}

// ── Divider ────────────────────────────────────────────────────────────────
export function SocialDivider() {
  return (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-card px-3 text-muted-foreground">or continue with</span>
      </div>
    </div>
  );
}

// ── Google button (own component so useGoogleLogin hook is always called) ──
function GoogleButton({ onAuth, busy, setBusy }) {
  const login = useGoogleLogin({
    onSuccess: (r) => onAuth('google', r.access_token),
    onError:   () => { setBusy(null); },
  });

  return (
    <button
      type="button"
      disabled={!!busy}
      onClick={() => { setBusy('google'); login(); }}
      className="w-full h-11 flex items-center justify-center gap-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {busy === 'google' ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
      Continue with Google
    </button>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────
export default function SocialAuthButtons({ onSuccess, onError }) {
  const [busy, setBusy] = useState(null);

  if (!G_ID && !MS_ID && !FB_ID) return null;

  async function handleAuth(provider, token) {
    try {
      const res = await fetch(`/api/auth/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      onSuccess(data);
    } catch (e) {
      onError(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function loginWithMicrosoft() {
    setBusy('microsoft');
    try {
      const msal  = await getMsal();
      const result = await msal.loginPopup({ scopes: ['openid', 'email', 'profile', 'User.Read'] });
      await handleAuth('microsoft', result.accessToken);
    } catch (e) {
      if (e?.errorCode !== 'user_cancelled') onError('Microsoft sign-in failed.');
      setBusy(null);
    }
  }

  async function loginWithFacebook() {
    setBusy('facebook');
    try {
      const FB = await loadFB();
      FB.login((response) => {
        if (response.authResponse) {
          handleAuth('facebook', response.authResponse.accessToken);
        } else {
          onError('Facebook sign-in was cancelled.');
          setBusy(null);
        }
      }, { scope: 'email,public_profile' });
    } catch (e) {
      onError('Facebook sign-in failed.');
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      {G_ID && <GoogleButton onAuth={handleAuth} busy={busy} setBusy={setBusy} />}

      {MS_ID && (
        <button
          type="button"
          disabled={!!busy}
          onClick={loginWithMicrosoft}
          className="w-full h-11 flex items-center justify-center gap-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy === 'microsoft' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MicrosoftIcon />}
          Continue with Microsoft
        </button>
      )}

      {FB_ID && (
        <button
          type="button"
          disabled={!!busy}
          onClick={loginWithFacebook}
          className="w-full h-11 flex items-center justify-center gap-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy === 'facebook' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FacebookIcon />}
          Continue with Facebook
        </button>
      )}
    </div>
  );
}
