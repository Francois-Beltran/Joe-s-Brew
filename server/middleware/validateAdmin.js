import { isValidToken } from '../services/authService.js';

export function validateAdmin(req, res, next) {
  const legacySecret = req.headers['x-admin-secret'];
  const token = req.headers['x-session-token'];

  // Support both legacy secret and new token system
  if (legacySecret === process.env.ADMIN_SECRET) {
    return next();
  }

  if (token && isValidToken(token)) {
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized' });
}