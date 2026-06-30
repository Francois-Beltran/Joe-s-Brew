/**
 * Middleware to validate admin requests using shared secret
 * Checks for X-Admin-Secret header matching environment variable
 * NOTE: In production, replace with Supabase JWT verification for better security
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.headers - Request headers
 * @param {string} req.headers['x-admin-secret'] - Admin secret token
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
export function validateAdmin(req, res, next) {
  const secret = req.headers['x-admin-secret']
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}