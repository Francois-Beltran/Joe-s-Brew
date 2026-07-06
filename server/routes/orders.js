import express from 'express'
import { supabaseAdmin } from '../lib/supabaseAdmin.js'
import { validateAdmin } from '../middleware/validateAdmin.js'
import { sendPushToRole } from './push.js'

const router = express.Router()
router.use(express.json())

// ============================================================
// Co-Admin notification registry — receives SMS on every order event.
// Outbound sender is the Android device running sms-gate.app (09241913950).
// ============================================================
const CO_ADMIN_PHONES = ['09653280300', '09275165980', '09173011678']

// Branch-specific phones — prepended to the notify list per order's branch
const BRANCH_PHONES = {
  cogtong:  '09936040934',
  candijay: '09928125498',
}

// Builds full notify list: branch phone (if mapped) + all co-admin phones
function buildNotifyList(branchId) {
  const phones = [...CO_ADMIN_PHONES]
  const branchPhone = BRANCH_PHONES[branchId]
  if (branchPhone && !phones.includes(branchPhone)) phones.unshift(branchPhone)
  return phones
}

async function sendSMSToNotifyList(branchId, message) {
  return Promise.allSettled(buildNotifyList(branchId).map(phone => sendSMS(phone, message)))
}

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

    try {
      await sendSMSToNotifyList(
        order.branch_id,
        toPlainText(
          `✅ Payment Verified\n\n` +
          `Branch: ${(order.branch_id || 'cogtong').toUpperCase()}\n` +
          `Order: #${orderId.slice(0, 8).toUpperCase()}\n` +
          `Customer: ${order.customer_name || order.customer_phone || 'N/A'}\n` +
          `GCash Ref: ${order.gcash_ref}\n` +
          `Amount: PHP ${Number(order.total_amount).toFixed(2)}`
        )
      )
    } catch (smsErr) {
      console.error('Co-admin SMS notify error (verify):', smsErr.message)
    }

    // Notify customer that payment was received and order is being prepared
    if (order.customer_phone) {
      const isDelivery = order.order_type === 'delivery'
      try {
        await sendSMS(
          order.customer_phone,
          toPlainText(
            `✅ Payment Confirmed!\n\n` +
            `Hi ${order.customer_name || 'there'}! Your Joe's Brew payment has been verified.\n\n` +
            `Order: #${orderId.slice(0, 8).toUpperCase()}\n` +
            `Amount: PHP ${Number(order.total_amount).toFixed(2)}\n\n` +
            `We're now preparing your order. We'll text you again when ${isDelivery ? 'your order is out for delivery' : "it's ready for pick-up"}!`
          )
        )
      } catch (smsErr) {
        console.error('Customer SMS notify error (verify):', smsErr.message)
      }
    }

    // Web push — notify admin dashboard and employee dashboard of new paid order
    sendPushToRole('admin', {
      title: "Joe's Brew — Payment Verified",
      body: `Order #${orderId.slice(0, 8).toUpperCase()} · PHP ${Number(order.total_amount).toFixed(2)}`,
      icon: '/images/admin-icon-192.png',
      tag: `verify-${orderId}`,
      url: '/admin',
    }).catch(() => {})
    sendPushToRole('employee', {
      title: "New Order Ready to Fulfill ☕",
      body: `${order.customer_name || 'A customer'} · PHP ${Number(order.total_amount).toFixed(2)}`,
      icon: '/images/employee-icon-192.png',
      tag: `fulfill-${orderId}`,
      url: '/employee',
    }).catch(() => {})

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

    try {
      await sendSMSToNotifyList(
        order.branch_id,
        toPlainText(
          `❌ Order Rejected\n\n` +
          `Branch: ${(order.branch_id || 'cogtong').toUpperCase()}\n` +
          `Order: #${orderId.slice(0, 8).toUpperCase()}\n` +
          `Customer: ${order.customer_name || order.customer_phone || 'N/A'}\n` +
          `Reason: ${finalReason}`
        )
      )
    } catch (smsErr) {
      console.error('Co-admin SMS notify error (reject):', smsErr.message)
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

    const isDelivery = order.order_type === 'delivery'

    try {
      await sendSMSToNotifyList(
        order.branch_id,
        toPlainText(
          `${isDelivery ? '🛵' : '☕'} Order ${isDelivery ? 'Out for Delivery' : 'Marked Ready'}\n\n` +
          `Branch: ${(order.branch_id || 'cogtong').toUpperCase()}\n` +
          `Order: #${orderId.slice(0, 8).toUpperCase()}\n` +
          `Customer: ${order.customer_name || order.customer_phone || 'N/A'}\n` +
          `Type: ${isDelivery ? 'Delivery' : 'Pickup'}\n` +
          `Amount: PHP ${Number(order.total_amount).toFixed(2)}`
        )
      )
    } catch (smsErr) {
      console.error('Co-admin SMS notify error (fulfill):', smsErr.message)
    }

    // Notify customer — message differs by order type
    if (order.customer_phone) {
      try {
        await sendSMS(
          order.customer_phone,
          toPlainText(
            isDelivery
              ? `🛵 Your Joe's Brew order is out for delivery!\n\n` +
                `Order #${orderId.slice(0, 8).toUpperCase()} is on its way to you.\n` +
                `Please prepare the exact amount. Thank you!`
              : `☕ Your Joe's Brew order is ready for pick-up!\n\n` +
                `Order #${orderId.slice(0, 8).toUpperCase()} is ready at the counter.\n` +
                `Please proceed to claim your order. Thank you!`
          )
        )
      } catch (smsErr) {
        console.error('Customer SMS notify error (fulfill):', smsErr.message)
      }
    }

    // Web push — notify customer that order is ready
    sendPushToRole('customer', {
      title: "Your order is ready! ☕",
      body: `Order #${orderId.slice(0, 8).toUpperCase()} — please proceed to the counter.`,
      icon: '/images/icon-192.png',
      tag: `ready-${orderId}`,
      url: '/',
    }).catch(() => {})

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', detail: error.message })
  }
})

/**
 * DELETE /api/orders
 * Admin endpoint to delete ALL orders and reset priority counter to 1.
 * Requires this one-time Supabase SQL function (run once in SQL Editor):
 *   CREATE OR REPLACE FUNCTION reset_priority_sequence()
 *   RETURNS void AS $$
 *   BEGIN
 *     PERFORM setval(pg_get_serial_sequence('orders', 'priority_number'), 1, false);
 *   END;
 *   $$ LANGUAGE plpgsql SECURITY DEFINER;
 */
router.delete('/', validateAdmin, async (req, res) => {
  try {
    const { confirmPassword } = req.body
    if (confirmPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Incorrect password. Deletion cancelled.' })
    }

    // Delete order_items first (foreign key dependency)
    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .delete()
      .not('order_id', 'is', null)

    if (itemsError) {
      return res.status(500).json({ error: 'Failed to clear order items', detail: itemsError.message })
    }

    const { error: ordersError } = await supabaseAdmin
      .from('orders')
      .delete()
      .not('id', 'is', null)

    if (ordersError) {
      return res.status(500).json({ error: 'Failed to clear orders', detail: ordersError.message })
    }

    // Reset priority_number sequence so next order starts at #1
    try {
      await supabaseAdmin.rpc('reset_priority_sequence')
    } catch {
      console.warn('Priority sequence reset skipped — create reset_priority_sequence() in Supabase SQL Editor')
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
    const { confirmPassword } = req.body

    if (!orderId) {
      return res.status(400).json({ error: 'orderId required' })
    }

    // Extra security layer — re-confirm admin password before permanent deletion
    if (confirmPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Incorrect password. Deletion cancelled.' })
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