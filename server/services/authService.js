import crypto from 'crypto';

// In-memory token store
const validTokens = new Map();

function issueToken() {
  const token = crypto.randomBytes(32).toString('hex');
  validTokens.set(token, Date.now() + 12 * 60 * 60 * 1000); // 12 hours
  return token;
}

export function isValidToken(token) {
  const expiry = validTokens.get(token);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    validTokens.delete(token);
    return false;
  }
  return true;
}

export const authService = {
  adminLogin(password) {
    if (password !== process.env.ADMIN_PASSWORD) {
      throw new Error('Incorrect password');
    }
    return { token: issueToken() };
  },

  employeeLogin(password) {
    if (password !== process.env.EMPLOYEE_PASSWORD) {
      throw new Error('Incorrect password');
    }
    return { token: issueToken() };
  },

  isValidToken
};