import { Router } from 'express';
import { ProductController } from '../controllers/product.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// Protect all product routes with JWT Authentication
router.use(authenticateJwt);

// Product CRUD
router.get('/', ProductController.listProducts);
router.post('/', ProductController.createProduct);
router.put('/:id', ProductController.updateProduct);
router.patch('/:id', ProductController.updateProduct);
router.delete('/:id', ProductController.deleteProduct);

export default router;
