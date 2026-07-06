import express from 'express'
import multer from 'multer'
import { supabaseAdmin } from '../lib/supabaseAdmin.js'
import { sendSMSToNotifyList } from '../lib/sms.js'

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
 */
router.post('/', upload.single('screenshot'), async (req, res) => {
  const { items: itemsRaw, customerName, gcashRef, customerPhone, orderType, sitio, landmark, agreedToTerms, deliveryLat, deliveryLng, branchId } = req.body
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

    if (!customerName?.trim() || customerName.trim().length < 2) {
      return res.status(400).json({ error: 'Customer name is required' })
    }

    if (!gcashRef?.match(/^\d{13}$/)) {
      return res.status(400).json({ error: 'GCash reference number must be exactly 13 digits' })
    }

    if (!customerPhone?.match(/^09\d{9}$/)) {
      return res.status(400).json({ error: 'Invalid phone number format. Use 09XXXXXXXXX' })
    }

    if (!['pickup', 'delivery'].includes(orderType)) {
      return res.status(400).json({ error: 'Invalid order type' })
    }
    if (orderType === 'delivery' && !sitio?.trim()) {
      return res.status(400).json({ error: 'Sitio is required for delivery orders' })
    }

    if (!screenshotFile) {
      return res.status(400).json({ error: 'Payment screenshot is required' })
    }

    // 🔒 SHOP STATUS CHECK — blocks checkout entirely if admin/employee has closed the shop
    const { data: shopStatus } = await supabaseAdmin
      .from('shop_settings')
      .select('is_open')
      .eq('id', 1)
      .single()

    if (!shopStatus?.is_open) {
      return res.status(403).json({ error: 'Sorry, Joe\'s Brew is currently closed. Please check back later!' })
    }

    if (agreedToTerms !== 'true') {
      return res.status(400).json({ error: 'You must agree to the Terms and Agreement.' })
    }

    // ============================================================
    // SPLIT ITEMS: regular menu items vs Fruit Blend selections
    // Fruit Blend items carry `baseType` (Aqua/Tea/Seltzer) and
    // `actualMenuItemId` (the real menu_items.id, since menuItemId
    // for these is a composite cart key like "uuid_Aqua Infused")
    // ============================================================
    const itemsWithIndex = items.map((item, idx) => ({ ...item, cartIndex: idx }))
    const fruitBlendItems = itemsWithIndex.filter(i => i.baseType)
    const regularItems = itemsWithIndex.filter(i => !i.baseType)

    // Fetch authoritative prices for regular menu items
    // Deduplicate IDs: the same item can appear multiple times (different sizes, add-ons)
    // and Supabase's .in() deduplicates internally — causing a length mismatch → 400.
    const uniqueRegularIds = [...new Set(regularItems.map(i => i.menuItemId))]

    const { data: dbItems, error: dbError } = await supabaseAdmin
      .from('menu_items')
      .select('id, name, price, price_grande, price_king, is_available')
      .in('id', uniqueRegularIds.length > 0 ? uniqueRegularIds : ['00000000-0000-0000-0000-000000000000'])

    if (dbError) {
      return res.status(500).json({ error: 'Failed to fetch menu items', detail: dbError.message })
    }

    if (uniqueRegularIds.length > 0 && (!dbItems || dbItems.length !== uniqueRegularIds.length)) {
      return res.status(400).json({ error: 'One or more items not found' })
    }

    // Branch-scoped availability: COALESCE(branch_override, true)
    // Matches the same logic used on the frontend — no branch row means available by default
    let branchAvailMap = {}
    if (uniqueRegularIds.length > 0 && branchId) {
      const { data: branchAvailRows } = await supabaseAdmin
        .from('branch_menu_availability')
        .select('menu_item_id, is_available')
        .eq('branch_id', branchId)
        .in('menu_item_id', uniqueRegularIds)
      if (branchAvailRows) {
        branchAvailMap = Object.fromEntries(branchAvailRows.map(r => [r.menu_item_id, r.is_available]))
      }
    }

    const unavailable = dbItems.filter(i =>
      i.id in branchAvailMap ? !branchAvailMap[i.id] : false
    )
    if (unavailable.length > 0) {
      return res.status(400).json({
        error: 'Some items are unavailable',
        items: unavailable.map(i => i.name),
      })
    }

    // Fetch Fruit Blend variant prices (flavor + base type combos actually in the cart)
    const fruitBlendActualIds = fruitBlendItems.map(i => i.actualMenuItemId)
    let fruitBlendVariants = []
    if (fruitBlendActualIds.length > 0) {
      const { data: variants, error: variantError } = await supabaseAdmin
        .from('fruit_blend_variants')
        .select('menu_item_id, base_type, price, price_grande, is_available')
        .in('menu_item_id', fruitBlendActualIds)

      if (variantError) {
        return res.status(500).json({ error: 'Failed to fetch fruit blend prices', detail: variantError.message })
      }
      fruitBlendVariants = variants
    }

    // Validate every fruit blend item actually matched a real, available variant
    for (const i of fruitBlendItems) {
      const variant = fruitBlendVariants.find(
        v => v.menu_item_id === i.actualMenuItemId && v.base_type === i.baseType
      )
      if (!variant || !variant.is_available) {
        return res.status(400).json({ error: `Invalid or unavailable fruit blend selection: ${i.baseType}` })
      }
    }

    // Build price map respecting selected size — server always owns the price
    const priceMap = Object.fromEntries(dbItems.map(i => [i.id, {
      base: i.price,
      grande: i.price_grande ?? i.price,
      king: i.price_king ?? i.price_grande ?? i.price,
    }]))

    // Regular items total
    const regularTotal = regularItems.reduce((sum, i) => {
      const prices = priceMap[i.menuItemId]
      if (!prices) return sum
      const unitPrice =
        i.size === 'king' ? prices.king :
          i.size === 'grande' ? prices.grande :
            prices.base
      return sum + unitPrice * i.quantity
    }, 0)

    // Fruit Blend items total
    const fruitBlendTotal = fruitBlendItems.reduce((sum, i) => {
      const variant = fruitBlendVariants.find(
        v => v.menu_item_id === i.actualMenuItemId && v.base_type === i.baseType
      )
      const unitPrice = i.size === 'grande' ? (variant.price_grande ?? variant.price) : variant.price
      return sum + unitPrice * i.quantity
    }, 0)

    const itemsTotal = regularTotal + fruitBlendTotal


    let deliveryFee = 0

    if (orderType === 'delivery') {
      const { data: zone } = await supabaseAdmin
        .from('delivery_zones')
        .select('fee')
        .eq('sitio_name', sitio)
        .eq('is_active', true)
        .maybeSingle()

      if (!zone) {
        return res.status(400).json({ error: 'Invalid or unavailable delivery Sitio' })
      }

      const isCogtong = sitio === 'Cogtong'

      // 🔧 Cogtong-specific minimum order rule (₱200)
      if (isCogtong && itemsTotal < 200) {
        return res.status(400).json({
          error: `Delivery to Cogtong requires a minimum order of ₱200. Your current order is ₱${itemsTotal.toFixed(2)}.`,
        })
      }

      // 🔧 All other sitios' minimum order rule (₱500)
      if (!isCogtong && itemsTotal < 500) {
        return res.status(400).json({
          error: `Delivery to ${sitio} requires a minimum order of ₱500. Your current order is ₱${itemsTotal.toFixed(2)}.`,
        })
      }

      // 🔧 Universal free-delivery threshold — any sitio, ₱1000+ order
      if (itemsTotal >= 1000) {
        deliveryFee = 0
      } else if (isCogtong) {
        deliveryFee = 0 // Cogtong is always free once the ₱200 minimum is met
      } else {
        deliveryFee = Number(zone.fee) // Flat fee from delivery_zones table
      }
    }

    const totalAmount = itemsTotal + deliveryFee

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
        customer_name: customerName.trim(),
        status: 'unverified',
        total_amount: totalAmount,
        gcash_ref: gcashRef,
        gcash_screenshot_url: screenshotUrl,
        gcash_verified: false,
        customer_phone: '+63' + customerPhone.slice(1),
        order_type: orderType,
        delivery_fee: deliveryFee,
        delivery_address: orderType === 'delivery'
          ? `Sitio: ${sitio.trim()}${landmark?.trim() ? ' | Landmark: ' + landmark.trim() : ''}`
          : null,
        delivery_lat: orderType === 'delivery' && deliveryLat ? Number(deliveryLat) : null,
        delivery_lng: orderType === 'delivery' && deliveryLng ? Number(deliveryLng) : null,
        branch_id: branchId || 'cogtong',
      })
      .select()
      .single()

    if (orderError) {
      return res.status(500).json({ error: 'Failed to save order', detail: orderError.message })
    }

    // Insert order items — regular items + fruit blend items (using their REAL menu_items id)
    const orderItemsPayload = [
      ...regularItems.map(i => ({
        order_id: order.id,
        menu_item_id: i.menuItemId,
        quantity: i.quantity,
        size: i.size || 'base',
        sort_order: i.cartIndex,
        unit_price:
          i.size === 'king' ? priceMap[i.menuItemId].king :
            i.size === 'grande' ? priceMap[i.menuItemId].grande :
              priceMap[i.menuItemId].base,
      })),
      ...fruitBlendItems.map(i => {
        const variant = fruitBlendVariants.find(
          v => v.menu_item_id === i.actualMenuItemId && v.base_type === i.baseType
        )
        return {
          order_id: order.id,
          menu_item_id: i.actualMenuItemId,
          quantity: i.quantity,
          size: i.size || 'base',
          base_type: i.baseType,
          sort_order: i.cartIndex,
          unit_price: i.size === 'grande' ? (variant.price_grande ?? variant.price) : variant.price,
        }
      }),
    ]

    const { error: itemsError } = await supabaseAdmin.from('order_items').insert(orderItemsPayload)

    if (itemsError) {
      return res.status(500).json({ error: 'Failed to save order items', detail: itemsError.message })
    }

    // Notify all admins + branch phone of new order
    try {
      const branch = (branchId || 'cogtong').toUpperCase()
      const typeLabel = orderType === 'delivery' ? '🛵 DELIVERY' : '🏪 PICKUP'
      await sendSMSToNotifyList(
        branchId || 'cogtong',
        `🔔 NEW ORDER — ${branch}\n\n` +
        `${typeLabel}\n` +
        `Customer: ${customerName.trim()}\n` +
        `Order: #${order.id.slice(0, 8).toUpperCase()}\n` +
        `GCash Ref: ${gcashRef}\n` +
        `Amount: PHP ${totalAmount.toFixed(2)}\n\n` +
        `Please verify the payment in the Admin Dashboard.`
      )
    } catch (smsErr) {
      console.error('New-order SMS notify error:', smsErr.message)
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