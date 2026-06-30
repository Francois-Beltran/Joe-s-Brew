import express from 'express'
import multer from 'multer'
import { supabaseAdmin } from '../lib/supabaseAdmin.js'

const router = express.Router()

/**
 * Multer configuration for file uploads
 * Stores files in memory with 10MB size limit
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})

/**
 * POST /api/checkout
 * Processes customer orders with GCash payment verification
 * Validates inputs, checks item availability, uploads receipt screenshot, and creates order
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing order data
 * @param {string} req.body.items - JSON string of cart items
 * @param {string} req.body.customerPhone - Customer phone number in +63 format
 * @param {string} req.body.gcashRef - 13-digit GCash reference number
 * @param {string} req.body.telegramUsername - Optional Telegram username for notifications
 * @param {Object} req.file - Multer file object for screenshot upload
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with order details or error message
 */
router.post('/', upload.single('screenshot'), async (req, res) => {
  const { items: itemsRaw, customerPhone, gcashRef, telegramUsername } = req.body
  const screenshotFile = req.file

  try {
    // Validate inputs
    let items
    try {
      items = JSON.parse(itemsRaw)
    } catch {
      return res.status(400).json({ error: 'Invalid items payload' })
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' })
    }

    if (!customerPhone?.match(/^\+63\d{10}$/)) {
      return res.status(400).json({ error: 'Invalid phone number format. Use +63XXXXXXXXXX' })
    }

    if (!gcashRef?.match(/^\d{13}$/)) {
      return res.status(400).json({ error: 'GCash reference number must be exactly 13 digits' })
    }

    if (!screenshotFile) {
      return res.status(400).json({ error: 'Payment screenshot is required' })
    }

    // Fetch authoritative prices from database
    const ids = items.map(i => i.menuItemId)

    const { data: dbItems, error: dbError } = await supabaseAdmin
      .from('menu_items')
      .select('id, name, price, is_available')
      .in('id', ids)

    if (dbError) {
      return res.status(500).json({ error: 'Failed to fetch menu items', detail: dbError.message })
    }

    if (!dbItems || dbItems.length === 0) {
      return res.status(500).json({
        error: 'Failed to fetch menu items',
        detail: 'No items returned for IDs: ' + ids.join(', '),
      })
    }

    if (dbItems.length !== ids.length) {
      return res.status(400).json({ error: 'One or more items not found' })
    }

    const unavailable = dbItems.filter(i => !i.is_available)
    if (unavailable.length > 0) {
      return res.status(400).json({
        error: 'Some items are unavailable',
        items: unavailable.map(i => i.name),
      })
    }

    // Compute server-side total to prevent client manipulation
    const priceMap = Object.fromEntries(dbItems.map(i => [i.id, i.price]))
    const totalAmount = items.reduce(
      (sum, i) => sum + priceMap[i.menuItemId] * i.quantity, 0
    )

    // Check for duplicate reference number to prevent fraud
    const { data: duplicate } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('gcash_ref', gcashRef)
      .maybeSingle()

    if (duplicate) {
      return res.status(409).json({
        error: 'This GCash reference number has already been used.',
      })
    }

    // Upload screenshot to Supabase Storage
    let screenshotUrl = null
    try {
      const ext = (screenshotFile.originalname.split('.').pop() || 'jpg').toLowerCase()
      const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabaseAdmin
        .storage
        .from('gcash-screenshots')
        .upload(filename, screenshotFile.buffer, {
          contentType: screenshotFile.mimetype,
          upsert: false,
        })

      if (uploadError) {
        throw new Error(`Failed to upload screenshot: ${uploadError.message}`)
      }

      const { data: urlData } = supabaseAdmin
        .storage
        .from('gcash-screenshots')
        .getPublicUrl(filename)
      screenshotUrl = urlData?.publicUrl ?? null
    } catch (uploadErr) {
      return res.status(500).json({ error: 'Failed to upload payment screenshot', detail: uploadErr.message })
    }

    // Insert order into database
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_phone: customerPhone,
        status: 'unverified',
        total_amount: totalAmount,
        gcash_ref: gcashRef,
        gcash_screenshot_url: screenshotUrl,
        gcash_verified: false,
        telegram_username: telegramUsername || null,
      })
      .select()
      .single()

    if (orderError) {
      return res.status(500).json({ error: 'Failed to save order', detail: orderError.message })
    }

    // Insert order items
    const { error: itemsError } = await supabaseAdmin.from('order_items').insert(
      items.map(i => ({
        order_id: order.id,
        menu_item_id: i.menuItemId,
        quantity: i.quantity,
        unit_price: priceMap[i.menuItemId],
      }))
    )

    if (itemsError) {
      return res.status(500).json({ error: 'Failed to save order items', detail: itemsError.message })
    }

    res.json({
      success: true,
      orderId: order.id,
      gcashRef,
      totalAmount,
    })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', detail: error.message })
  }
})

export default router