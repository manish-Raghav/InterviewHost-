import { Router } from 'express';
import { getUser, listUsers, updateMe } from '../controllers/user.controller.js';
import { authorize, protect } from '../middleware/auth.js';
import { validateId } from '../utils/validateId.js';

const router = Router();
router.use(protect);
router.get('/', authorize('interviewer'), listUsers);
router.put('/me', updateMe);
router.get('/:id', validateId('id'), getUser);
export default router;
