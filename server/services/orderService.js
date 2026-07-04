import { supabaseAdmin } from '../lib/supabaseAdmin.js';

async function getSmsAdminPhone() {
  const { data } = await supabaseAdmin
    .from('admin_contacts')
    .select('phone')
    .eq('is_sender', true)
    .maybeSingle();
  return data?.phone || process.env.ADMIN_PHONE_NUMBER;
}

async function sendSMS(phoneNumber, message) {
  const url = process.env.SMS_GATEWAY_URL;
  const basicAuth = Buffer.from(process.env.SMS_API_KEY).toString('base64');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phoneNumbers: [phoneNumber],
      message: message,
    }),
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(`SMS Gateway error: ${rawText}`);
  }
  return rawText ? JSON.parse(rawText) : { status: res.status };
}

function toPlainText(str) {
  return str
    .replace(/<b>(.*?)<\/b>/g, '$1')
    .replace(/<code>(.*?)<\/code>/g, '$1')
    .replace(/<i>(.*?)<\/i>/g, '$1')
    .replace(/<a[^>]*>(.*?)<\/a>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();
}

// Main service functions
export const orderService = {
  async verifyOrder(orderId) {
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !order) throw new Error('Order not found');

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ gcash_verified: true, status: 'paid' })
      .eq('id', orderId);

    if (updateError) throw updateError;

    return order;
  },

  async rejectOrder(orderId, reason) {
    const finalReason = reason || 'Payment could not be verified';

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !order) throw new Error('Order not found');

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'rejected',
        rejection_reason: finalReason,
      })
      .eq('id', orderId);

    if (updateError) throw updateError;

    return { order, reason: finalReason };
  },

  async fulfillOrder(orderId) {
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !order) throw new Error('Order not found');

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'ready' })
      .eq('id', orderId);

    if (updateError) throw updateError;

    return order;
  },

  async deleteOrder(orderId) {
    // Delete order items first
    await supabaseAdmin.from('order_items').delete().eq('order_id', orderId);

    const { error } = await supabaseAdmin.from('orders').delete().eq('id', orderId);
    if (error) throw error;
  },

  getSmsAdminPhone,
  sendSMS,
  toPlainText
};