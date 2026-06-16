import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

// Roles with console access
const CONSOLE_ROLES = ['organizer', 'marketing_partner'];
// Roles with exhibitor portal access
const EXHIBITOR_ROLES = ['exhibitor'];

function loadUsers() {
  try { return JSON.parse(localStorage.getItem('entities_users') || '[]'); } catch { return []; }
}

function findUserByEmail(email) {
  return loadUsers().find(u => u.email?.toLowerCase() === email.toLowerCase()) || null;
}

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
      const stored = localStorage.getItem('minecon_user');
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

  // Stub login — looks up entities_users by email (password not validated in stub mode)
  const login = async (email) => {
    const found = findUserByEmail(email);
    if (!found) return { success: false, error: 'No account found with that email.' };
    const session = {
      id: found.id,
      email: found.email,
      full_name: found.full_name,
      role: found.role,
      company: found.company || '',
    };
    localStorage.setItem('minecon_user', JSON.stringify(session));
    setUser(session);
    setIsAuthenticated(true);
    return { success: true, redirectTo: redirectForRole(found.role) };
  };

  // Stub register — creates a user in entities_users with attendee role
  const register = async (data) => {
    const users = loadUsers();
    if (users.find(u => u.email?.toLowerCase() === data.email?.toLowerCase())) {
      return { success: false, error: 'An account with that email already exists.' };
    }
    const newUser = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      role: 'attendee',
      status: 'active',
      created_date: new Date().toISOString(),
      ...data,
    };
    users.push(newUser);
    localStorage.setItem('entities_users', JSON.stringify(users));
    const session = { id: newUser.id, email: newUser.email, full_name: newUser.full_name, role: newUser.role, company: newUser.company || '' };
    localStorage.setItem('minecon_user', JSON.stringify(session));
    setUser(session);
    setIsAuthenticated(true);
    return { success: true, redirectTo: '/' };
  };

  const logout = () => {
    localStorage.removeItem('minecon_user');
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
      register,
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