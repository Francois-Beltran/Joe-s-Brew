// ============================================================
// SHOP STATUS ROUTES
// Controls whether the storefront accepts new checkouts
// ============================================================
import express from 'express'
import { supabaseAdmin } from '../lib/supabaseAdmin.js'
import { validateAdmin } from '../middleware/validateAdmin.js'

const router = express.Router()
router.use(express.json())

// GET /api/shop/status — public, used by customer checkout to check if shop is open
router.get('/status', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('shop_settings')
    .select('is_open')
    .eq('id', 1)
    .single()

  if (error) return res.status(500).json({ error: 'Failed to fetch shop status' })
  res.json({ isOpen: data.is_open })
})

// POST /api/shop/toggle — admin/employee only, flips the open/closed state
router.post('/toggle', validateAdmin, async (req, res) => {
  const { data: current } = await supabaseAdmin
    .from('shop_settings')
    .select('is_open')
    .eq('id', 1)
    .single()

  const newState = !current?.is_open

  const { error } = await supabaseAdmin
    .from('shop_settings')
    .update({ is_open: newState })
    .eq('id', 1)

  if (error) return res.status(500).json({ error: 'Failed to update shop status' })
  res.json({ isOpen: newState })
})

export default router