import { Router } from 'express';
import {
  addQuestion,
  createInterview,
  deleteInterview,
  getInterview,
  getMessages,
  getSubmissions,
  listInterviews,
  removeQuestion,
  updateInterview,
} from '../controllers/interview.controller.js';
import { authorize, protect } from '../middleware/auth.js';
import { validateId } from '../utils/validateId.js';

const router = Router();
router.use(protect);

router.route('/').get(listInterviews).post(authorize('interviewer'), createInterview);

router
  .route('/:id')
  .all(validateId('id'))
  .get(getInterview)
  .put(authorize('interviewer'), updateInterview)
  .delete(authorize('interviewer'), deleteInterview);

router.post('/:id/questions', authorize('interviewer'), validateId('id'), addQuestion);
router.delete('/:id/questions/:questionId', authorize('interviewer'), validateId('id', 'questionId'), removeQuestion);
router.get('/:id/messages', validateId('id'), getMessages);
router.get('/:id/submissions', validateId('id'), getSubmissions);

export default router;
