import { validateSession, SESSION_COOKIE } from './session.js';

// Reads the session cookie (if present) and attaches the resolved session to
// req.user. Never rejects — routes that need auth use requireAuth/requireRole
// after this runs. Mounted globally so every route can rely on req.user.
export async function attachUser(req, _res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  const session = await validateSession(token);
  if (session) {
    req.user = { id: session.user_id, role: session.role, exhibitor_id: session.exhibitor_id };
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please log in to continue.' });
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Please log in to continue.' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission to do that.' });
    next();
  };
}
