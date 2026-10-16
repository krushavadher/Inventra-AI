import { Router } from 'express';
import { SalesController } from '../controllers/sales.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// Protect all sales routes with JWT middleware
router.use(authenticateJwt);

// Summary & Aggregates
router.get('/summary', SalesController.getSummary);

// Batch Import
router.post('/import', SalesController.importSales);

// Demo Data Clean
router.delete('/demo', SalesController.deleteDemoSales);

// Void Sale
router.post('/:id/void', SalesController.voidSale);

// Create and List Sales
router.post('/', SalesController.createSale);
router.get('/', SalesController.getSales);

export default router;
