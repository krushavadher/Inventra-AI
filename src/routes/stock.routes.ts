import { Router } from 'express';
import { StockController } from '../controllers/stock.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// Protect with auth middleware
router.use(authenticateJwt);

router.post('/in', StockController.stockIn);
router.post('/out', StockController.stockOut);

export default router;
