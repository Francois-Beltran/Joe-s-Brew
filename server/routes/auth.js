import express from 'express';
import { validateLogin } from '../validators/authValidator.js';
import { authService } from '../services/authService.js';

const router = express.Router();
router.use(express.json());

router.post('/admin-login', async (req, res) => {
  try {
    const validation = validateLogin(req.body, 'admin');
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const result = authService.adminLogin(validation.password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

router.post('/employee-login', async (req, res) => {
  try {
    const validation = validateLogin(req.body, 'employee');
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const result = authService.employeeLogin(validation.password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

export { isValidToken } from '../services/authService.js'; // Export for middleware use
export default router;