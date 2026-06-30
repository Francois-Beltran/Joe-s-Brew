import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import checkoutRouter from './routes/checkout.js'
import ordersRouter from './routes/orders.js'
import { supabaseAdmin } from './lib/supabaseAdmin.js'

dotenv.config()

/**
 * Express application for Joe's Brew e-commerce platform
 * Handles checkout processing, order management, and Telegram webhook integration
 */
const app = express()
const PORT = process.env.PORT || 4000

/**
 * CORS configuration
 * Development: allows all origins
 * Production: restrict to allowed origins from environment variable
 */
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or telegram webhooks)
    if (!origin) return callback(null, true)
    
    // If no allowed origins configured, allow all (development mode)
    if (allowedOrigins.length === 0) {
      return callback(null, true)
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`))
    }
  },
  credentials: true,
}))

// Bypass ngrok's interstitial warning screen for automated bots (like Telegram)
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

app.use(express.json())

/**
 * Route handlers
 */
app.use('/api/checkout', checkoutRouter)
app.use('/api/orders', ordersRouter)

/**
 * Telegram webhook endpoint
 * Handles /start command to map Telegram usernames to chat IDs for order notifications
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing Telegram message
 * @param {Object} res - Express response object
 * @returns {void}
 */
app.post('/api/telegram-webhook', async (req, res) => {
  res.status(200).send('OK')

  try {
    const message = req.body?.message
    if (!message) return

    if (message.text === '/start') {
      const chatId = message.chat.id
      const username = message.from.username

      if (username) {
        const { error } = await supabaseAdmin
          .from('profiles')
          .upsert(
            { telegram_username: username, telegram_chat_id: chatId },
            { onConflict: 'telegram_username' }
          )

        if (error) {
          throw new Error(`Failed to map Telegram user: ${error.message}`)
        }
      }
    }
  } catch (err) {
    // Log error but don't fail the webhook response
    // Telegram will retry on failure
  }
})

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
  // Server started successfully
})