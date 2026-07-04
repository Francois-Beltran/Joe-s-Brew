import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export function useGCashModal({ onSuccess, setStage, cartTotal = 0, cartItems = [] }) {
  const [formState, setFormState] = useState({
    customerName: '',
    customerPhone: '',
    orderType: 'pickup',
    sitio: '',
    landmark: '',
    refNumber: '',
    screenshot: null,
    agreedToTerms: false,
  });

  const [deliveryZones, setDeliveryZones] = useState([]);
  const [selectedFee, setSelectedFee] = useState(0);
  const [deliveryError, setDeliveryError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch delivery zones
  useEffect(() => {
    async function fetchZones() {
      const { data } = await supabase
        .from('delivery_zones')
        .select('sitio_name, fee')
        .eq('is_active', true)
        .order('sitio_name');
      setDeliveryZones(data || []);
    }
    fetchZones();
  }, []);

  // Delivery fee + minimum order logic
  useEffect(() => {
    setDeliveryError('');
    const zone = deliveryZones.find(z => z.sitio_name === formState.sitio);

    if (!zone || formState.orderType !== 'delivery') {
      setSelectedFee(0);
      return;
    }

    const isCogtong = formState.sitio === 'Cogtong';

    if (cartTotal >= 1000) {
      setSelectedFee(0);
    } else if (isCogtong) {
      if (cartTotal < 200) {
        setDeliveryError(`Delivery to Cogtong requires a minimum order of ₱200. Current: ₱${cartTotal}`);
        setSelectedFee(null);
      } else {
        setSelectedFee(0);
      }
    } else {
      if (cartTotal < 500) {
        setDeliveryError(`Delivery to ${formState.sitio} requires a minimum order of ₱500. Current: ₱${cartTotal}`);
        setSelectedFee(null);
      } else {
        setSelectedFee(Number(zone.fee));
      }
    }
  }, [formState.sitio, formState.orderType, deliveryZones, cartTotal]);

  const grandTotal = cartTotal + (selectedFee > 0 ? selectedFee : 0);

  const handleSubmit = async () => {
    if (loading) return;
    setError('');
    setLoading(true);

    console.log('handleSubmit started');
    console.log('Form State:', formState);
    console.log('Cart Items:', cartItems);
    console.log('Cart Total:', cartTotal);

    if (formState.orderType === 'delivery' && selectedFee === null) {
      setError(deliveryError || 'Delivery minimum not met');
      setLoading(false);
      return;
    }

    try {
      console.log('Starting order creation...');

      let screenshotUrl = null;

      if (formState.screenshot) {
        console.log('Uploading screenshot...');
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('gcash-screenshots')
          .upload(fileName, formState.screenshot);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        const { data: urlData } = supabase.storage.from('gcash-screenshots').getPublicUrl(fileName);
        screenshotUrl = urlData.publicUrl;
        console.log('Screenshot uploaded:', screenshotUrl);
      }

      const orderPayload = {
        customer_name: formState.customerName.trim(),
        customer_phone: formState.customerPhone,
        order_type: formState.orderType,
        delivery_address: formState.orderType === 'delivery'
          ? `Sitio: ${formState.sitio}${formState.landmark ? ` | Landmark: ${formState.landmark}` : ''}`
          : null,
        total_amount: grandTotal,
        delivery_fee: selectedFee > 0 ? selectedFee : 0,
        gcash_ref: formState.refNumber,
        gcash_screenshot_url: screenshotUrl,
        gcash_verified: false,
        status: 'pending',
      };

      console.log('Order Payload:', orderPayload);

      // Create Order
      const { data: order, error: dbError } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select()
        .single();

      if (dbError) {
        console.error('DB Error:', dbError);
        throw dbError;
      }

      console.log('Order created successfully:', order);

      // Insert Order Items
      if (cartItems && cartItems.length > 0) {
        console.log('Inserting order items...');
        const orderItemsPayload = cartItems.map(item => ({
          order_id: order.id,
          menu_item_id: item.menuItemId || item.id || item.actualMenuItemId,
          quantity: item.quantity || 1,
          unit_price: Number(item.displayPrice || item.price || 0),
        }));

        console.log('Order Items Payload:', orderItemsPayload);

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItemsPayload);

        if (itemsError) {
          console.error('Items Error:', itemsError);
        } else {
          console.log('Order items inserted successfully');
        }
      }

      setFormState(prev => ({ ...prev, result: order }));
      setStage('done');
      if (onSuccess) onSuccess(order);

    } catch (err) {
      console.error('Final Catch Error:', err);
      setError(err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return {
    formState,
    setFormState,
    grandTotal,
    error: error || deliveryError,
    loading,
    handleSubmit,
    deliveryZones,
    selectedFee,
  };
}