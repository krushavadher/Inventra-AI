import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// Protect all inventory routes with JWT Authentication
router.use(authenticateJwt);

// Query & Filter Inventory Levels
router.get('/levels', InventoryController.queryLevels);

// Summary KPIs & Analytics & AI Endpoints
router.get('/kpis', InventoryController.getSummaryKPIs);
router.get('/ai-recommendations', InventoryController.getAIRecommendations);
router.get('/ai-alerts', InventoryController.getAIAlerts);
router.get('/analytics', InventoryController.getAnalyticsData);

// Inventory Item CRUD
router.post('/items', InventoryController.createItem);
router.put('/items/:id', InventoryController.updateItem);
router.delete('/items/:id', InventoryController.deleteItem);

// Stock Transactions
router.post('/stock-in', InventoryController.stockIn);
router.post('/stock-out', InventoryController.stockOut);
router.post('/adjust', InventoryController.adjustStock);
router.post('/transfers', InventoryController.createTransfer);

// Audit Logs & Valuation
router.get('/movements', InventoryController.getMovementHistory);
router.get('/alerts/low-stock', InventoryController.getLowStockAlerts);
router.get('/alerts/expired', InventoryController.getExpiredProducts);
router.get('/alerts/damaged', InventoryController.getDamagedProducts);
router.get('/valuation', InventoryController.getValuation);

export default router;
