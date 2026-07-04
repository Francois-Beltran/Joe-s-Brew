import express from 'express'
import crypto from 'crypto'

const router = express.Router()
router.use(express.json())

// TOKEN_SECRET is used to sign tokens. Falls back to ADMIN_PASSWORD so no new
// env var is required, but add TOKEN_SECRET to .env for best practice.
// Changing this secret (or ADMIN_PASSWORD if TOKEN_SECRET is unset) invalidates
// all existing tokens — users must log in again.
function getSecret() {
  return process.env.TOKEN_SECRET || process.env.ADMIN_PASSWORD
}

// Stateless HMAC-signed token: "<base64url-payload>.<hex-sig>"
// No server-side storage — survives process restarts and scale-out.
function issueToken(role) {
  const payload = Buffer.from(JSON.stringify({ role, iat: Date.now() })).toString('base64url')
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex')
  return `${payload}.${sig}`
}

export function isValidToken(token) {
  try {
    const dot = token.lastIndexOf('.')
    if (dot === -1) return false
    const payload = token.slice(0, dot)
    const sig = token.slice(dot + 1)

    const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex')

    // Constant-time comparison to prevent timing attacks
    const sigBuf = Buffer.from(sig.padEnd(expected.length, '0'), 'hex')
    const expBuf = Buffer.from(expected, 'hex')
    if (sigBuf.length !== expBuf.length) return false
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return false

    const { iat } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return Date.now() < iat + 12 * 60 * 60 * 1000 // 12-hour expiry
  } catch {
    return false
  }
}

router.post('/admin-login', (req, res) => {
  const { password } = req.body
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password' })
  }
  res.json({ token: issueToken('admin') })
})

router.post('/employee-login', (req, res) => {
  const { password } = req.body
  if (password !== process.env.EMPLOYEE_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password' })
  }
  res.json({ token: issueToken('employee') })
})

export default router
