import express from 'express';
import { validateAdmin } from '../middleware/validateAdmin.js';
import { validateOrderAction } from '../validators/orderValidator.js';
import { orderService } from '../services/orderService.js';

const router = express.Router();
router.use(express.json());

// Webhook (kept as-is for compatibility)
router.post('/webhook/telegram', async (req, res) => {
  // ... (your existing webhook logic - keep it for now)
  res.sendStatus(200);
});

router.post('/verify', validateAdmin, async (req, res) => {
  try {
    const { orderId } = req.body;
    const validation = validateOrderAction('verify', req.body);
    if (!validation.success) return res.status(400).json({ error: validation.error });

    const order = await orderService.verifyOrder(orderId);

    // Send notifications (non-blocking)
    try {
      const adminPhone = await orderService.getSmsAdminPhone();
      await orderService.sendSMS(
        adminPhone,
        orderService.toPlainText(`✅ Payment Verified\nOrder: #${orderId.slice(0,8).toUpperCase()}\nCustomer: ${order.customer_name}`)
      );
    } catch (e) { console.error('Admin SMS failed', e); }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/reject', validateAdmin, async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    const validation = validateOrderAction('reject', req.body);
    if (!validation.success) return res.status(400).json({ error: validation.error });

    const { order } = await orderService.rejectOrder(orderId, reason);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/fulfill', validateAdmin, async (req, res) => {
  try {
    const { orderId } = req.body;
    const validation = validateOrderAction('fulfill', req.body);
    if (!validation.success) return res.status(400).json({ error: validation.error });

    await orderService.fulfillOrder(orderId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:orderId', validateAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { confirmPassword } = req.body;

    if (confirmPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    await orderService.deleteOrder(orderId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;