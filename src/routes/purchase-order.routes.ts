import { Router } from 'express';
import { PurchaseOrderController } from '../controllers/purchase-order.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/rbac.middleware.js';
import { UserRole } from '../enums/user-role.enum.js';

const router = Router();

// Protect all procurement routes with JWT Authentication
router.use(authenticateJwt);

const ALL_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.SUPPLY_CHAIN_VP,
  UserRole.PROCUREMENT_MANAGER,
  UserRole.WAREHOUSE_MANAGER,
  UserRole.INVENTORY_CLERK,
  UserRole.AUDITOR
];

// Purchase Order Lifecycle (Accessible across roles)
router.get('/', PurchaseOrderController.listPOs);
router.get('/:id', PurchaseOrderController.getPOById);
router.post('/', authorizeRoles(...ALL_ROLES), PurchaseOrderController.createPO);

// Approval & Issue Workflow
router.post('/:id/approve', authorizeRoles(...ALL_ROLES), PurchaseOrderController.approvePO);
router.post('/:id/reject', authorizeRoles(...ALL_ROLES), PurchaseOrderController.rejectPO);
router.post('/:id/issue', authorizeRoles(...ALL_ROLES), PurchaseOrderController.issuePO);

// Inbound Goods Receiving & GRN (Support both /receive and /receive-goods)
router.post('/receive', authorizeRoles(...ALL_ROLES), PurchaseOrderController.receiveGoods);
router.post('/receive-goods', authorizeRoles(...ALL_ROLES), PurchaseOrderController.receiveGoods);

// Invoices & 3-Way Reconciliation
router.post('/:id/match-invoice', authorizeRoles(...ALL_ROLES), PurchaseOrderController.match3WayInvoice);
router.patch('/:id/payment-status', authorizeRoles(...ALL_ROLES), PurchaseOrderController.updatePaymentStatus);

export default router;
