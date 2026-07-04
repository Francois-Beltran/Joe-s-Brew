import express from 'express'
import crypto from 'crypto'

const router = express.Router()
router.use(express.json())

// Simple in-memory token store — good enough for a single small shop
// Tokens expire after 12 hours
const validTokens = new Map()

function issueToken() {
  const token = crypto.randomBytes(32).toString('hex')
  validTokens.set(token, Date.now() + 12 * 60 * 60 * 1000) // 12h expiry
  return token
}

export function isValidToken(token) {
  const expiry = validTokens.get(token)
  if (!expiry) return false
  if (Date.now() > expiry) {
    validTokens.delete(token)
    return false
  }
  return true
}

router.post('/admin-login', (req, res) => {
  const { password } = req.body
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password' })
  }
  res.json({ token: issueToken() })
})

router.post('/employee-login', (req, res) => {
  const { password } = req.body
  if (password !== process.env.EMPLOYEE_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password' })
  }
  res.json({ token: issueToken() })
})

export default router