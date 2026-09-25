import { Router } from 'express';
import authRoutes from './auth.routes.js';
import interviewRoutes from './interview.routes.js';
import questionRoutes from './question.routes.js';
import submissionRoutes from './submission.routes.js';
import userRoutes from './user.routes.js';

const router = Router();
router.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/interviews', interviewRoutes);
router.use('/questions', questionRoutes);
router.use('/submissions', submissionRoutes);
export default router;
