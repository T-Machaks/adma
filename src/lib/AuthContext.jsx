import React, { createContext, useState, useContext, useEffect } from 'react';
import { User } from '@/api/entities';
import { EVENT_CONFIG } from '@/lib/eventConfig';

const AuthContext = createContext();

const CONSOLE_ROLES  = EVENT_CONFIG.consoleRoles;
const EXHIBITOR_ROLES = EVENT_CONFIG.exhibitorRoles;

function redirectForRole(role) {
  if (CONSOLE_ROLES.includes(role)) return '/console';
  if (EXHIBITOR_ROLES.includes(role)) return '/exhibitor';
  return '/';
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    await checkUserAuth();
    setIsLoadingPublicSettings(false);
  };

  const checkUserAuth = async () => {
    setIsLoadingAuth(true);
    try {
      const stored = localStorage.getItem(EVENT_CONFIG.storageUserKey);
      if (stored) {
        setUser(JSON.parse(stored));
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const login = async (email, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const found = await res.json();
      if (!res.ok) return { success: false, error: found.error || 'Login failed.' };

      // Forced password change (first login)
      if (found.must_change_password) {
        return { success: true, mustChangePassword: true, changeToken: found.change_token };
      }

      // Email OTP required
      if (found.mfa_required) {
        return { success: true, mfaRequired: true, mfaToken: found.mfa_token, emailHint: found.email_hint, phoneHint: found.phone_hint };
      }

      // Authenticator TOTP required (organizers)
      if (found.totp_required) {
        return {
          success: true,
          totpRequired: true,
          mfaToken: found.mfa_token,
          firstTime: found.first_time,
          qrCode: found.qr_code,
        };
      }

      const session = {
        id: found.id,
        email: found.email,
        full_name: found.full_name,
        role: found.role,
        company: found.company || '',
      };
      localStorage.setItem(EVENT_CONFIG.storageUserKey, JSON.stringify(session));
      setUser(session);
      setIsAuthenticated(true);
      return { success: true, redirectTo: redirectForRole(found.role) };
    } catch (e) {
      return { success: false, error: e.message || 'Login failed.' };
    }
  };

  const verifyOtp = async (mfaToken, otp) => {
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfa_token: mfaToken, otp }),
      });
      const found = await res.json();
      if (!res.ok) return { success: false, error: found.error || 'Verification failed.' };
      const session = {
        id: found.id,
        email: found.email,
        full_name: found.full_name,
        role: found.role,
        company: found.company || '',
      };
      localStorage.setItem(EVENT_CONFIG.storageUserKey, JSON.stringify(session));
      setUser(session);
      setIsAuthenticated(true);
      return { success: true, redirectTo: redirectForRole(found.role) };
    } catch (e) {
      return { success: false, error: e.message || 'Verification failed.' };
    }
  };

  const changePassword = async (changeToken, newPassword) => {
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ change_token: changeToken, new_password: newPassword }),
      });
      const found = await res.json();
      if (!res.ok) return { success: false, error: found.error || 'Password change failed.' };
      // Server issues TOTP challenge immediately after password change
      if (found.totp_required) {
        return {
          success: true,
          totpRequired: true,
          mfaToken: found.mfa_token,
          firstTime: found.first_time,
          qrCode: found.qr_code,
        };
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || 'Password change failed.' };
    }
  };

  const verifyTotp = async (mfaToken, code) => {
    try {
      const res = await fetch('/api/auth/totp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfa_token: mfaToken, code }),
      });
      const found = await res.json();
      if (!res.ok) return { success: false, error: found.error || 'Verification failed.' };
      const session = {
        id: found.id,
        email: found.email,
        full_name: found.full_name,
        role: found.role,
        company: found.company || '',
      };
      localStorage.setItem(EVENT_CONFIG.storageUserKey, JSON.stringify(session));
      setUser(session);
      setIsAuthenticated(true);
      return { success: true, redirectTo: redirectForRole(found.role) };
    } catch (e) {
      return { success: false, error: e.message || 'Verification failed.' };
    }
  };

  const resendOtp = async (mfaToken, method) => {
    try {
      const res = await fetch('/api/auth/otp/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfa_token: mfaToken, method }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Could not resend code.' };
      return { success: true, method: data.method };
    } catch (e) {
      return { success: false, error: e.message || 'Could not resend code.' };
    }
  };

  const register = async (data) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const newUser = await res.json();
      if (!res.ok) return { success: false, error: newUser.error || 'Registration failed.' };
      const session = { id: newUser.id, email: newUser.email, full_name: newUser.full_name, role: newUser.role, company: newUser.company || '' };
      localStorage.setItem(EVENT_CONFIG.storageUserKey, JSON.stringify(session));
      setUser(session);
      setIsAuthenticated(true);
      return { success: true, redirectTo: '/' };
    } catch (e) {
      return { success: false, error: e.message || 'Registration failed.' };
    }
  };

  const setSession = (userData) => {
    const session = {
      id: userData.id,
      email: userData.email,
      full_name: userData.full_name,
      role: userData.role,
      company: userData.company || '',
    };
    localStorage.setItem(EVENT_CONFIG.storageUserKey, JSON.stringify(session));
    setUser(session);
    setIsAuthenticated(true);
    return { success: true, redirectTo: redirectForRole(userData.role) };
  };

  const logout = () => {
    localStorage.removeItem(EVENT_CONFIG.storageUserKey);
    setUser(null);
    setIsAuthenticated(false);
  };

  const hasConsoleAccess = () => user && CONSOLE_ROLES.includes(user.role);
  const hasExhibitorAccess = () => user && (EXHIBITOR_ROLES.includes(user.role) || CONSOLE_ROLES.includes(user.role));

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      login,
      changePassword,
      verifyOtp,
      verifyTotp,
      resendOtp,
      register,
      setSession,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
      hasConsoleAccess,
      hasExhibitorAccess,
      CONSOLE_ROLES,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};