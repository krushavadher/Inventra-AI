import { Router } from 'express';
import { SupplierController } from '../controllers/supplier.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/rbac.middleware.js';
import { UserRole } from '../enums/user-role.enum.js';

const router = Router();

// Protect all supplier routes with JWT Authentication
router.use(authenticateJwt);

// Performance Analytics Dashboard
router.get('/dashboard', SupplierController.getDashboard);

// Supplier CRUD
router.get('/', SupplierController.listSuppliers);
router.get('/:id', SupplierController.getSupplierById);
router.post('/', authorizeRoles(UserRole.SUPER_ADMIN, UserRole.SUPPLY_CHAIN_VP, UserRole.PROCUREMENT_MANAGER), SupplierController.createSupplier);
router.patch('/:id', authorizeRoles(UserRole.SUPER_ADMIN, UserRole.SUPPLY_CHAIN_VP, UserRole.PROCUREMENT_MANAGER), SupplierController.updateSupplier);
router.delete('/:id', authorizeRoles(UserRole.SUPER_ADMIN, UserRole.SUPPLY_CHAIN_VP), SupplierController.deleteSupplier);

// Document Attachments
router.post('/:id/documents', authorizeRoles(UserRole.SUPER_ADMIN, UserRole.SUPPLY_CHAIN_VP, UserRole.PROCUREMENT_MANAGER), SupplierController.addDocument);

export default router;
