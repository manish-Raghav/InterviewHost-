import Submission from '../models/Submission.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { loadInterviewForUser } from '../utils/access.js';
import { submitCode } from '../services/submissionService.js';

export const createSubmission = asyncHandler(async (req, res) => {
  const { interviewId, questionId, code, language } = req.body;
  const submission = await submitCode({ user: req.user, interviewId, questionId, code, language });

  // Same event the socket flow emits, so the interviewer sees REST submissions live too.
  const io = req.app.get('io');
  const interview = await loadInterviewForUser(interviewId, req.user);
  io?.to(`interview:${interview.roomId}`).emit('submission-result', submission.toObject());

  res.status(201).json({ submission });
});

export const getSubmission = asyncHandler(async (req, res) => {
  const submission = await Submission.findById(req.params.id).populate('question', 'title');
  if (!submission) throw new ApiError(404, 'Submission not found');
  const interview = await loadInterviewForUser(submission.interview, req.user);
  if (req.user.role !== 'interviewer' && String(submission.candidate) !== String(req.user._id)) {
    throw new ApiError(403, 'Not allowed');
  }
  res.json({ submission, interviewId: interview._id });
});
