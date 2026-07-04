import express from 'express';
import { validateAdmin } from '../middleware/validateAdmin.js';
import { shopService } from '../services/shopService.js';

const router = express.Router();
router.use(express.json());

// GET /api/shop/status — Public
router.get('/status', async (req, res) => {
  try {
    const status = await shopService.getShopStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/shop/toggle — Admin only
router.post('/toggle', validateAdmin, async (req, res) => {
  try {
    const result = await shopService.toggleShopStatus();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;