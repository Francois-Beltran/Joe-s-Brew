import express from 'express'
import { supabaseAdmin } from '../lib/supabaseAdmin.js'
import { validateAdmin } from '../middleware/validateAdmin.js'

const router = express.Router()
router.use(express.json())

/**
 * Sends a Telegram message to a specific chat ID
 * 
 * @param {string} chatId - Telegram chat ID to send message to
 * @param {string} message - Message content with HTML formatting
 * @returns {Promise<Object>} Telegram API response
 * @throws {Error} If Telegram API call fails
 */
async function sendTelegram(chatId, message) {
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
    }),
  })
  const data = await res.json()
  if (!data.ok) {
    throw new Error(`Telegram error: ${data.description}`)
  }
  return data
}

/**
 * Looks up a customer's chat ID by their Telegram username
 * 
 * @param {string} username - Telegram username (with or without @)
 * @returns {Promise<string|null>} Chat ID if found, null otherwise
 */
async function getChatId(username) {
  if (!username) return null
  const clean = username.replace('@', '').toLowerCase()
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('telegram_chat_id')
    .eq('telegram_username', clean)
    .maybeSingle()
  return data?.telegram_chat_id ?? null
}

/**
 * POST /api/orders/webhook/telegram
 * Telegram webhook endpoint for handling user messages
 * Maps Telegram usernames to chat IDs for order notifications
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Telegram webhook payload
 * @param {Object} res - Express response object
 * @returns {void}
 */
router.post('/webhook/telegram', async (req, res) => {
  const message = req.body?.message
  if (!message) return res.sendStatus(200)

  const chatId = message.chat?.id?.toString()
  const username = message.from?.username?.toLowerCase()
  const text = message.text?.trim()

  if (!chatId) return res.sendStatus(200)

  try {
    // Save or update this user's chat ID mapping
    if (username) {
      await supabaseAdmin
        .from('profiles')
        .upsert({ telegram_username: username, telegram_chat_id: chatId }, { onConflict: 'telegram_username' })
    }

    // Send welcome message on /start command
    if (text === '/start' || text?.startsWith('/start')) {
      await sendTelegram(
        chatId,
        `☕ <b>Welcome to Joe's Brew!</b>\n\n` +
        `Hi ${message.from?.first_name ?? 'there'}! You're all set to receive order updates.\n\n` +
        `When your order is ready for pickup, we'll notify you right here. See you at the counter! 🙏`
      )
    }
  } catch (error) {
    // Log error but don't fail the webhook response
  }

  res.sendStatus(200)
})

/**
 * POST /api/orders/verify
 * Admin endpoint to verify GCash payment and mark order as paid
 * Requires admin authentication via X-Admin-Secret header
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.orderId - UUID of the order to verify
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success status
 */
router.post('/verify', validateAdmin, async (req, res) => {
  try {
    const { orderId } = req.body
    if (!orderId) {
      return res.status(400).json({ error: 'orderId required' })
    }

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (error || !order) {
      return res.status(404).json({ error: 'Order not found' })
    }

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ gcash_verified: true, status: 'paid' })
      .eq('id', orderId)

    if (updateError) {
      return res.status(500).json({ error: 'Failed to verify order' })
    }

    // Notify admin via Telegram
    try {
      await sendTelegram(
        process.env.TELEGRAM_ADMIN_CHAT_ID,
        `✅ <b>Payment Verified</b>\n\n` +
        `Order: <code>#${orderId.slice(0, 8).toUpperCase()}</code>\n` +
        `Phone: ${order.customer_phone}\n` +
        `Telegram: ${order.telegram_username ? '@' + order.telegram_username : 'not provided'}\n` +
        `GCash Ref: <code>${order.gcash_ref}</code>\n` +
        `Amount: ₱${Number(order.total_amount).toFixed(2)}`
      )
    } catch (tgErr) {
      // Non-critical: continue even if Telegram notification fails
    }

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', detail: error.message })
  }
})

/**
 * POST /api/orders/fulfill
 * Admin endpoint to mark order as ready for pickup and notify customer
 * Requires admin authentication via X-Admin-Secret header
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.orderId - UUID of the order to fulfill
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success status
 */
router.post('/fulfill', validateAdmin, async (req, res) => {
  try {
    const { orderId } = req.body
    if (!orderId) {
      return res.status(400).json({ error: 'orderId required' })
    }

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (error || !order) {
      return res.status(404).json({ error: 'Order not found' })
    }

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'ready' })
      .eq('id', orderId)

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update order status' })
    }

    // Notify admin via Telegram
    try {
      await sendTelegram(
        process.env.TELEGRAM_ADMIN_CHAT_ID,
        `☕ <b>Order Marked Ready</b>\n\n` +
        `Order: <code>#${orderId.slice(0, 8).toUpperCase()}</code>\n` +
        `Phone: ${order.customer_phone}\n` +
        `Amount: ₱${Number(order.total_amount).toFixed(2)}`
      )
    } catch (tgErr) {
      // Non-critical: continue even if Telegram notification fails
    }

    // Notify customer via Telegram if they linked their account
    if (order.telegram_username) {
      const chatId = await getChatId(order.telegram_username)
      if (chatId) {
        try {
          await sendTelegram(
            chatId,
            `☕ <b>Your order is ready!</b>\n\n` +
            `Order <code>#${orderId.slice(0, 8).toUpperCase()}</code> is ready for pickup.\n` +
            `Please proceed to the counter. Thank you! 🙏`
          )
        } catch (tgErr) {
          // Non-critical: continue even if customer notification fails
        }
      }
    }

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', detail: error.message })
  }
})

export default router