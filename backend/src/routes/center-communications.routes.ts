import { Router } from 'express';
import { authenticate, requireCenterAdmin } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import {
  listComplaints,
  getComplaintsSummary,
  getCommunicationsSummary,
  createComplaint,
  updateComplaint,
  listCenterMessages,
  getMessagesSummary,
  sendCenterMessage,
  markMessageRead,
} from '../controllers/center-communications.controller';

const router = Router();

router.use(authenticate, requireCenterAdmin);

router.get('/summary', requirePermission('centers.view'), getCommunicationsSummary);
router.get('/complaints', requirePermission('centers.view'), listComplaints);
router.get('/complaints/summary', requirePermission('centers.view'), getComplaintsSummary);
router.post('/complaints', requirePermission('centers.update'), createComplaint);
router.patch('/complaints/:id', requirePermission('centers.update'), updateComplaint);
router.get('/messages', requirePermission('centers.view'), listCenterMessages);
router.get('/messages/summary', requirePermission('centers.view'), getMessagesSummary);
router.post('/messages', requirePermission('centers.update'), sendCenterMessage);
router.patch('/messages/:id/read', requirePermission('centers.view'), markMessageRead);

export default router;