import { Router } from 'express';
import { WarehouseController } from '../controllers/warehouse.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/rbac.middleware.js';
import { UserRole } from '../enums/user-role.enum.js';

const router = Router();

// Protect all warehouse routes with JWT Authentication
router.use(authenticateJwt);

// Warehouse CRUD & Setup
router.get('/', WarehouseController.listWarehouses);
router.get('/:id', WarehouseController.getWarehouseById);
router.post('/', authorizeRoles(UserRole.SUPER_ADMIN, UserRole.SUPPLY_CHAIN_VP), WarehouseController.createWarehouse);
router.patch('/:id', authorizeRoles(UserRole.SUPER_ADMIN, UserRole.SUPPLY_CHAIN_VP, UserRole.WAREHOUSE_MANAGER), WarehouseController.updateWarehouse);
router.delete('/:id', authorizeRoles(UserRole.SUPER_ADMIN), WarehouseController.deleteWarehouse);

// Layout & Zone Management
router.post('/:id/zones', authorizeRoles(UserRole.SUPER_ADMIN, UserRole.SUPPLY_CHAIN_VP, UserRole.WAREHOUSE_MANAGER), WarehouseController.addZone);

// WMS Analytics & Visual Heatmap
router.get('/:id/analytics', WarehouseController.getAnalytics);
router.get('/:id/heatmap', WarehouseController.getHeatmap);

export default router;
