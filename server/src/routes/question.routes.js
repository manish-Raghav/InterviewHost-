import { Router } from 'express';
import {
  createQuestion,
  deleteQuestion,
  getQuestion,
  listQuestions,
  updateQuestion,
} from '../controllers/question.controller.js';
import { authorize, protect } from '../middleware/auth.js';
import { validateId } from '../utils/validateId.js';

const router = Router();
router.use(protect, authorize('interviewer'));
router.route('/').get(listQuestions).post(createQuestion);
router
  .route('/:id')
  .all(validateId('id'))
  .get(getQuestion)
  .put(updateQuestion)
  .delete(deleteQuestion);
export default router;
