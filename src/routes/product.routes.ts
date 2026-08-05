import { Router } from 'express';
import { ProductController } from '../controllers/product.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/rbac.middleware.js';
import { UserRole } from '../enums/user-role.enum.js';

const router = Router();

// Protect all product routes with JWT Authentication
router.use(authenticateJwt);

// Product CRUD
router.get('/', ProductController.listProducts);
router.get('/categories', ProductController.listCategories);
router.post('/categories', authorizeRoles(UserRole.SUPER_ADMIN, UserRole.SUPPLY_CHAIN_VP, UserRole.PROCUREMENT_MANAGER), ProductController.createCategory);

router.get('/:id', ProductController.getProductById);
router.post('/', authorizeRoles(UserRole.SUPER_ADMIN, UserRole.SUPPLY_CHAIN_VP, UserRole.PROCUREMENT_MANAGER, UserRole.INVENTORY_CLERK), ProductController.createProduct);
router.patch('/:id', authorizeRoles(UserRole.SUPER_ADMIN, UserRole.SUPPLY_CHAIN_VP, UserRole.PROCUREMENT_MANAGER, UserRole.INVENTORY_CLERK), ProductController.updateProduct);
router.delete('/:id', authorizeRoles(UserRole.SUPER_ADMIN, UserRole.SUPPLY_CHAIN_VP), ProductController.deleteProduct);

export default router;
