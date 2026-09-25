import { Router } from 'express';
import { createSubmission, getSubmission } from '../controllers/submission.controller.js';
import { authorize, protect } from '../middleware/auth.js';
import { validateId } from '../utils/validateId.js';

const router = Router();
router.use(protect);
router.post('/', authorize('candidate'), createSubmission);
router.get('/:id', validateId('id'), getSubmission);
export default router;
