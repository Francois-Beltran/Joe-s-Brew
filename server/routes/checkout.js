import express from 'express';
import multer from 'multer';
import { validateCheckout } from '../validators/checkoutValidator.js';
import { processCheckoutOrder } from '../services/checkoutService.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'), false);
  }
});

router.post('/', upload.single('screenshot'), async (req, res) => {
  try {
    const validation = validateCheckout(req.body, req.file);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const result = await processCheckoutOrder({
      ...validation.data,
      screenshotFile: req.file
    });

    res.json({
      success: true,
      orderId: result.orderId,
      totalAmount: result.totalAmount,
    });
  } catch (error) {
    console.error('Checkout Error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

export default router;