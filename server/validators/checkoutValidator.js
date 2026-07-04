export const validateCheckout = (body, screenshotFile) => {
  const { items: itemsRaw, customerName, gcashRef, customerPhone, 
          orderType, sitio, agreedToTerms } = body;

  let items;
  try {
    items = JSON.parse(itemsRaw);
  } catch {
    return { success: false, error: 'Invalid items payload' };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { success: false, error: 'Cart is empty' };
  }

  if (!customerName?.trim() || customerName.trim().length < 2) {
    return { success: false, error: 'Customer name is required' };
  }

  if (!gcashRef?.match(/^\d{13}$/)) {
    return { success: false, error: 'GCash reference number must be exactly 13 digits' };
  }

  if (!customerPhone?.match(/^09\d{9}$/)) {
    return { success: false, error: 'Invalid phone number format. Use 09XXXXXXXXX' };
  }

  if (!['pickup', 'delivery'].includes(orderType)) {
    return { success: false, error: 'Invalid order type' };
  }

  if (orderType === 'delivery' && !sitio?.trim()) {
    return { success: false, error: 'Sitio is required for delivery orders' };
  }

  if (!screenshotFile) {
    return { success: false, error: 'Payment screenshot is required' };
  }

  if (agreedToTerms !== 'true') {
    return { success: false, error: 'You must agree to the Terms and Agreement.' };
  }

  return { 
    success: true, 
    items,
    data: { items, customerName, gcashRef, customerPhone, orderType, sitio, agreedToTerms }
  };
};