import express from 'express'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const router = express.Router()

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Configure VAPID — generate once with: npx web-push generate-vapid-keys
// Then add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to your .env / Render env vars
webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL || 'admin@joesbrew.com'}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

// GET /api/push/vapid-public-key — client fetches this to subscribe
router.get('/vapid-public-key', (_, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY })
})

// POST /api/push/subscribe — save a push subscription
router.post('/subscribe', async (req, res) => {
  const { subscription, role } = req.body
  if (!subscription?.endpoint) {
    return res.status(400).json({ error: 'Missing subscription' })
  }

  const { error } = await supabaseAdmin
    .from('push_subscriptions')
    .upsert({ endpoint: subscription.endpoint, subscription, role: role || 'customer' }, { onConflict: 'endpoint' })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

// POST /api/push/unsubscribe — remove a subscription
router.post('/unsubscribe', async (req, res) => {
  const { endpoint } = req.body
  if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' })

  await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', endpoint)
  res.json({ ok: true })
})

// Internal helper — exported for use in orders.js
export async function sendPushToRole(role, payload) {
  const { data } = await supabaseAdmin
    .from('push_subscriptions')
    .select('subscription')
    .eq('role', role)

  if (!data?.length) return

  await Promise.allSettled(
    data.map(({ subscription }) =>
      webpush.sendNotification(subscription, JSON.stringify(payload)).catch(async (err) => {
        // 410 Gone = subscription expired; clean it up
        if (err.statusCode === 410) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
        }
      })
    )
  )
}

export default router
