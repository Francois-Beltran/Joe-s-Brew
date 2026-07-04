import { supabaseAdmin } from '../lib/supabaseAdmin.js';

export const processCheckoutOrder = async (data) => {
  const { items, customerName, gcashRef, customerPhone, orderType, 
          sitio, landmark, deliveryLat, deliveryLng, screenshotFile } = data;

  // Split items
  const fruitBlendItems = items.filter(i => i.baseType);
  const regularItems = items.filter(i => !i.baseType);

  // Fetch regular menu items
  const regularIds = regularItems.map(i => i.menuItemId);
  const { data: dbItems } = await supabaseAdmin
    .from('menu_items')
    .select('id, name, price, price_grande, price_king, is_available')
    .in('id', regularIds.length > 0 ? regularIds : ['00000000-0000-0000-0000-000000000000']);

  // Fetch fruit blend variants
  const fruitBlendActualIds = fruitBlendItems.map(i => i.actualMenuItemId);
  let fruitBlendVariants = [];
  if (fruitBlendActualIds.length > 0) {
    const { data: variants } = await supabaseAdmin
      .from('fruit_blend_variants')
      .select('menu_item_id, base_type, price, price_grande, is_available')
      .in('menu_item_id', fruitBlendActualIds);
    fruitBlendVariants = variants || [];
  }

  // Build price map
  const priceMap = Object.fromEntries(dbItems.map(i => [i.id, {
    base: i.price,
    grande: i.price_grande ?? i.price,
    king: i.price_king ?? i.price_grande ?? i.price,
  }]));

  // Calculate totals
  const regularTotal = regularItems.reduce((sum, i) => {
    const prices = priceMap[i.menuItemId];
    const unitPrice = i.size === 'king' ? prices.king : 
                      i.size === 'grande' ? prices.grande : prices.base;
    return sum + unitPrice * i.quantity;
  }, 0);

  const fruitBlendTotal = fruitBlendItems.reduce((sum, i) => {
    const variant = fruitBlendVariants.find(v => 
      v.menu_item_id === i.actualMenuItemId && v.base_type === i.baseType
    );
    const unitPrice = i.size === 'grande' ? (variant.price_grande ?? variant.price) : variant.price;
    return sum + unitPrice * i.quantity;
  }, 0);

  const itemsTotal = regularTotal + fruitBlendTotal;

  // Delivery fee logic
  let deliveryFee = 0;
  if (orderType === 'delivery') {
    const { data: zone } = await supabaseAdmin
      .from('delivery_zones')
      .select('fee')
      .eq('sitio_name', sitio)
      .eq('is_active', true)
      .maybeSingle();

    const isCogtong = sitio === 'Cogtong';

    if (itemsTotal >= 1000) {
      deliveryFee = 0;
    } else if (isCogtong) {
      deliveryFee = 0;
    } else {
      deliveryFee = Number(zone?.fee || 0);
    }
  }

  const totalAmount = itemsTotal + deliveryFee;

  // Upload screenshot
  const ext = (screenshotFile.originalname.split('.').pop() || 'jpg').toLowerCase();
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabaseAdmin
    .storage
    .from('gcash-screenshots')
    .upload(filename, screenshotFile.buffer, {
      contentType: screenshotFile.mimetype,
      upsert: false,
    });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: urlData } = supabaseAdmin.storage.from('gcash-screenshots').getPublicUrl(filename);
  const screenshotUrl = urlData.publicUrl;

  // Create Order
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
    })
    .select()
    .single();

  if (orderError) throw orderError;

  // Insert Order Items
  const orderItemsPayload = [
    ...regularItems.map(i => ({
      order_id: order.id,
      menu_item_id: i.menuItemId,
      quantity: i.quantity,
      unit_price: i.size === 'king' ? priceMap[i.menuItemId].king :
                  i.size === 'grande' ? priceMap[i.menuItemId].grande :
                  priceMap[i.menuItemId].base,
    })),
    ...fruitBlendItems.map(i => {
      const variant = fruitBlendVariants.find(v => 
        v.menu_item_id === i.actualMenuItemId && v.base_type === i.baseType
      );
      return {
        order_id: order.id,
        menu_item_id: i.actualMenuItemId,
        quantity: i.quantity,
        unit_price: i.size === 'grande' ? (variant.price_grande ?? variant.price) : variant.price,
      };
    })
  ];

  const { error: itemsError } = await supabaseAdmin
    .from('order_items')
    .insert(orderItemsPayload);

  if (itemsError) throw itemsError;

  return {
    orderId: order.id,
    totalAmount
  };
};