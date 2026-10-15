import { Router } from 'express';
import * as ctrl from '../controllers/payment.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { validate } from '../middleware/validate.js';
import { verifyPaymentSchema } from '../validators/payment.validators.js';

const router = Router();

// Public webhook route (called by Razorpay servers, authenticated via x-razorpay-signature)
router.post('/webhook', ctrl.handleWebhook);

// Protected routes (requires coaching_admin session)
router.use(authMiddleware, roleGuard('coaching_admin'));

router.post('/create-order', ctrl.createOrder);
router.post('/verify', validate(verifyPaymentSchema), ctrl.verify);
router.get('/subscription', ctrl.status);

export default router;
