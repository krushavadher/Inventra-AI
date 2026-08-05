import { Router } from 'express';
import { ReportController } from '../controllers/report.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// Protect all report endpoints with JWT Authentication
router.use(authenticateJwt);

router.get('/inventory', ReportController.getInventoryReport);
router.get('/suppliers', ReportController.getSupplierReport);
router.get('/sales', ReportController.getSalesReport);
router.get('/warehouses', ReportController.getWarehouseReport);
router.get('/forecasts', ReportController.getForecastReport);
router.get('/procurement', ReportController.getProcurementReport);

export default router;
