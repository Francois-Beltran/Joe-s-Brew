import express from 'express'
import { supabaseAdmin } from '../lib/supabaseAdmin.js'
import { validateAdmin } from '../middleware/validateAdmin.js'

const router = express.Router()
router.use(express.json())

/**
 * Sends a Telegram message to a specific chat ID
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
 */
async function getChatId(username) {
  if (!username) return null
  const clean = username.replace('@', '').toLowerCase()
  const { data } = await supabaseAdmin
    .from('telegram_users')
    .select('chat_id')
    .eq('username', clean)
    .maybeSingle()
  return data?.chat_id ?? null
}

/**
 * POST /api/orders/webhook/telegram
 * Telegram webhook endpoint for handling user messages
 */
router.post('/webhook/telegram', async (req, res) => {
  const message = req.body?.message
  if (!message) return res.sendStatus(200)

  const chatId = message.chat?.id?.toString()
  const username = message.from?.username?.toLowerCase()
  const text = message.text?.trim()

  if (!chatId) return res.sendStatus(200)

  try {
    if (username) {
      await supabaseAdmin
        .from('telegram_users')
        .upsert({ username, chat_id: chatId }, { onConflict: 'username' })
    }

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

    try {
      await sendTelegram(
        process.env.TELEGRAM_ADMIN_CHAT_ID,
        `✅ <b>Payment Verified</b>\n\n` +
        `Order: <code>#${orderId.slice(0, 8).toUpperCase()}</code>\n` +
        `Customer: ${order.customer_name || order.customer_phone || 'N/A'}\n` +
        `Telegram: ${order.telegram_username ? '@' + order.telegram_username : 'not provided'}\n` +
        `GCash Ref: <code>${order.gcash_ref}</code>\n` +
        `Amount: ₱${Number(order.total_amount).toFixed(2)}`
      )
    } catch (tgErr) {
      // Non-critical
    }

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', detail: error.message })
  }
})

/**
 * POST /api/orders/reject
 * Admin endpoint to reject a suspicious or invalid payment
 * Notifies customer via Telegram with the rejection reason
 */
router.post('/reject', validateAdmin, async (req, res) => {
  try {
    const { orderId, reason } = req.body
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

    const finalReason = reason || 'Payment could not be verified'

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'rejected',
        rejection_reason: finalReason,
      })
      .eq('id', orderId)

    if (updateError) {
      return res.status(500).json({ error: 'Failed to reject order' })
    }

    // Notify admin
    try {
      await sendTelegram(
        process.env.TELEGRAM_ADMIN_CHAT_ID,
        `❌ <b>Order Rejected</b>\n\n` +
        `Order: <code>#${orderId.slice(0, 8).toUpperCase()}</code>\n` +
        `Customer: ${order.customer_name || order.customer_phone || 'N/A'}\n` +
        `Reason: ${finalReason}`
      )
    } catch (tgErr) {
      // Non-critical
    }

    // Notify customer if they linked Telegram
    if (order.telegram_username) {
      const chatId = await getChatId(order.telegram_username)
      if (chatId) {
        try {
          await sendTelegram(
            chatId,
            `⚠️ <b>Order Update</b>\n\n` +
            `We're sorry, but your order <code>#${orderId.slice(0, 8).toUpperCase()}</code> could not be verified.\n\n` +
            `<b>Reason:</b> ${finalReason}\n\n` +
            `If you believe this is a mistake, please visit Joe's Brew with your proof of payment so we can assist you.`
          )
        } catch (tgErr) {
          // Non-critical — order still rejects even if Telegram fails
        }
      }
    }

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', detail: error.message })
  }
})

/**
 * POST /api/orders/fulfill
 * Admin endpoint to mark order as ready for pickup and notify customer
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

    try {
      await sendTelegram(
        process.env.TELEGRAM_ADMIN_CHAT_ID,
        `☕ <b>Order Marked Ready</b>\n\n` +
        `Order: <code>#${orderId.slice(0, 8).toUpperCase()}</code>\n` +
        `Customer: ${order.customer_name || order.customer_phone || 'N/A'}\n` +
        `Amount: ₱${Number(order.total_amount).toFixed(2)}`
      )
    } catch (tgErr) {
      // Non-critical
    }

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
          // Non-critical
        }
      }
    }

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', detail: error.message })
  }
})

/**
 * DELETE /api/orders/:orderId
 * Admin endpoint to permanently delete an order (cleanup old/test data)
 */
router.delete('/:orderId', validateAdmin, async (req, res) => {
  try {
    const { orderId } = req.params
    if (!orderId) {
      return res.status(400).json({ error: 'orderId required' })
    }

    // Delete order items first (foreign key dependency)
    await supabaseAdmin.from('order_items').delete().eq('order_id', orderId)

    const { error } = await supabaseAdmin.from('orders').delete().eq('id', orderId)

    if (error) {
      return res.status(500).json({ error: 'Failed to delete order' })
    }

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', detail: error.message })
  }
})

export default router