import express from 'express'
import { supabaseAdmin } from '../lib/supabaseAdmin.js'
import { validateAdmin } from '../middleware/validateAdmin.js'

const router = express.Router()
router.use(express.json())

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION HELPER
// SMS Gateway: sms-gate.app (Android app)
// TO CHANGE SMS GATEWAY: update SMS_GATEWAY_URL and SMS_API_KEY in server/.env
// SMS_API_KEY format: "username:password" (from the sms-gate.app Android app)
// ─────────────────────────────────────────────────────────────────────────────
async function sendSMS(phoneNumber, message) {
  const url = process.env.SMS_GATEWAY_URL

  // sms-gate.app uses HTTP Basic Auth with username:password
  const basicAuth = Buffer.from(process.env.SMS_API_KEY).toString('base64')

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      phoneNumbers: [phoneNumber],
      message:      message,
    }),
  })

  // sms-gate.app returns 202 Accepted on success — read as text first to avoid
  // JSON parse errors on empty bodies
  const rawText = await res.text()
  if (!res.ok) {
    throw new Error(`SMS Gateway error: ${rawText}`)
  }
  return rawText ? JSON.parse(rawText) : { status: res.status }
}

// ─────────────────────────────────────────────────────────────────────────────
// Strips HTML tags from Telegram-style messages to plain text for SMS
// ─────────────────────────────────────────────────────────────────────────────
function toPlainText(str) {
  return str
    .replace(/<b>(.*?)<\/b>/g, '$1')
    .replace(/<code>(.*?)<\/code>/g, '$1')
    .replace(/<i>(.*?)<\/i>/g, '$1')
    .replace(/<a[^>]*>(.*?)<\/a>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .trim()
}

/**
 * POST /api/orders/webhook/telegram
 * Retained exactly — webhook route structure unchanged
 * Note: This route is now unused for notifications but kept to avoid
 * breaking any registered Telegram webhook still pointing here
 */
router.post('/webhook/telegram', async (req, res) => {
  const message = req.body?.message
  if (!message) return res.sendStatus(200)

  const chatId   = message.chat?.id?.toString()
  const username = message.from?.username?.toLowerCase()
  const text     = message.text?.trim()

  if (!chatId) return res.sendStatus(200)

  try {
    if (username) {
      await supabaseAdmin
        .from('telegram_users')
        .upsert({ username, chat_id: chatId }, { onConflict: 'username' })
    }

    if (text === '/start' || text?.startsWith('/start')) {
      if (process.env.TELEGRAM_BOT_TOKEN) {
        const tgUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`
        await fetch(tgUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id:    chatId,
            text:       `Welcome to Joe's Brew! You'll now receive order updates via SMS.`,
            parse_mode: 'HTML',
          }),
        })
      }
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

    // 🔔 TO CHANGE ADMIN NOTIFICATION: update ADMIN_PHONE_NUMBER in server/.env
    try {
      await sendSMS(
        process.env.ADMIN_PHONE_NUMBER,
        toPlainText(
          `✅ Payment Verified\n\n` +
          `Order: #${orderId.slice(0, 8).toUpperCase()}\n` +
          `Customer: ${order.customer_name || order.customer_phone || 'N/A'}\n` +
          `GCash Ref: ${order.gcash_ref}\n` +
          `Amount: PHP ${Number(order.total_amount).toFixed(2)}`
        )
      )
    } catch (smsErr) {
      // Non-critical: order is still verified even if SMS fails
      console.error('Admin SMS notify error (verify):', smsErr.message)
    }

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', detail: error.message })
  }
})

/**
 * POST /api/orders/reject
 * Admin endpoint to reject a suspicious or invalid payment
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
        status:           'rejected',
        rejection_reason: finalReason,
      })
      .eq('id', orderId)

    if (updateError) {
      return res.status(500).json({ error: 'Failed to reject order' })
    }

    // Notify admin via SMS
    try {
      await sendSMS(
        process.env.ADMIN_PHONE_NUMBER,
        toPlainText(
          `❌ Order Rejected\n\n` +
          `Order: #${orderId.slice(0, 8).toUpperCase()}\n` +
          `Customer: ${order.customer_name || order.customer_phone || 'N/A'}\n` +
          `Reason: ${finalReason}`
        )
      )
    } catch (smsErr) {
      // Non-critical
      console.error('Admin SMS notify error (reject):', smsErr.message)
    }

    // Notify customer via SMS if phone number is available
    if (order.customer_phone) {
      try {
        await sendSMS(
          order.customer_phone,
          toPlainText(
            `⚠️ Order Update\n\n` +
            `We're sorry, but your Joe's Brew order #${orderId.slice(0, 8).toUpperCase()} could not be verified.\n\n` +
            `Reason: ${finalReason}\n\n` +
            `If you believe this is a mistake, please visit Joe's Brew with your proof of payment.`
          )
        )
      } catch (smsErr) {
        // Non-critical — order still rejects even if customer SMS fails
        console.error('Customer SMS notify error (reject):', smsErr.message)
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

    // Notify admin via SMS
    try {
      await sendSMS(
        process.env.ADMIN_PHONE_NUMBER,
        toPlainText(
          `☕ Order Marked Ready\n\n` +
          `Order: #${orderId.slice(0, 8).toUpperCase()}\n` +
          `Customer: ${order.customer_name || order.customer_phone || 'N/A'}\n` +
          `Amount: PHP ${Number(order.total_amount).toFixed(2)}`
        )
      )
    } catch (smsErr) {
      // Non-critical
      console.error('Admin SMS notify error (fulfill):', smsErr.message)
    }

    // Notify customer via SMS if phone number is available
    if (order.customer_phone) {
      try {
        await sendSMS(
          order.customer_phone,
          toPlainText(
            `☕ Your Joe's Brew order is ready!\n\n` +
            `Order #${orderId.slice(0, 8).toUpperCase()} is ready for pickup.\n` +
            `Please proceed to the counter. Thank you!`
          )
        )
      } catch (smsErr) {
        // Non-critical — order still fulfills even if customer SMS fails
        console.error('Customer SMS notify error (fulfill):', smsErr.message)
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