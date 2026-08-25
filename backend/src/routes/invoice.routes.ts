import { Router } from 'express';
import {
  getInvoiceHandler,
  listInvoicesHandler,
  getInvoiceSummaryHandler,
  createInvoiceHandler,
  sendInvoiceHandler,
  markInvoicePaidHandler,
  cancelInvoiceHandler,
  voidInvoiceHandler,
} from '../controllers/invoice.controller';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createInvoiceSchema } from '../validation';

const router = Router();

router.use(authenticate);

// List invoices
router.get('/', requirePermission('invoices.view'), listInvoicesHandler);

// Summary
router.get('/summary', requirePermission('invoices.view'), getInvoiceSummaryHandler);

// Single invoice
router.get('/:id', requirePermission('invoices.view'), getInvoiceHandler);

// Create invoice
router.post('/', requirePermission('invoices.create'), validate(createInvoiceSchema), createInvoiceHandler);

// Status transitions
router.post('/:id/send', requirePermission('invoices.create'), sendInvoiceHandler);
router.post('/:id/pay', requirePermission('invoices.create'), markInvoicePaidHandler);
router.post('/:id/cancel', requirePermission('invoices.create'), cancelInvoiceHandler);
router.post('/:id/void', requirePermission('invoices.create'), voidInvoiceHandler);

export default router;
