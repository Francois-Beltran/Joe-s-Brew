import { supabaseAdmin } from '../lib/supabaseAdmin.js';

export const shopService = {
  async getShopStatus() {
    const { data, error } = await supabaseAdmin
      .from('shop_settings')
      .select('is_open')
      .eq('id', 1)
      .single();

    if (error) throw new Error('Failed to fetch shop status');
    return { isOpen: data?.is_open || false };
  },

  async toggleShopStatus() {
    const { data: current } = await supabaseAdmin
      .from('shop_settings')
      .select('is_open')
      .eq('id', 1)
      .single();

    const newState = !current?.is_open;

    const { error } = await supabaseAdmin
      .from('shop_settings')
      .update({ is_open: newState })
      .eq('id', 1);

    if (error) throw new Error('Failed to update shop status');

    return { isOpen: newState };
  }
};