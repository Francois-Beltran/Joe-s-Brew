import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import checkoutRouter from './routes/checkout.js'
import ordersRouter from './routes/orders.js'
import shopRouter from './routes/shop.js'
import authRouter from './routes/auth.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Telegram webhooks)
    if (!origin) return callback(null, true)

    // If no allowed origins configured, allow all (development mode)
    if (allowedOrigins.length === 0) {
      return callback(null, true)
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`))
    }
  },
  credentials: true,
}))

app.use(express.json())

// Bypass ngrok's interstitial warning screen for automated bots (like Telegram), harmless in production
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true')
  next()
})

app.use('/api/auth', authRouter)
app.use('/api/auth', authRouter)
app.use('/api/checkout', checkoutRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/shop', shopRouter)

/**
 * Health check endpoint
 * Used for monitoring and load balancer health checks
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with status and shop name
 */

app.get('/health', (_, res) => {
  res.json({ status: 'ok', shop: "Joe's Brew" })
})

/**
 * Start the Express server
 */
app.listen(PORT, () => {
  console.log(`Joe's Brew server running on port ${PORT}`)
})