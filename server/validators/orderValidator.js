export const validateOrderAction = (action, body) => {
  if (action === 'verify' || action === 'fulfill') {
    if (!body.orderId) {
      return { success: false, error: 'orderId is required' };
    }
  }

  if (action === 'reject') {
    if (!body.orderId) {
      return { success: false, error: 'orderId is required' };
    }
  }

  if (action === 'delete') {
    if (!body.confirmPassword) {
      return { success: false, error: 'confirmPassword is required for deletion' };
    }
  }

  return { success: true };
};