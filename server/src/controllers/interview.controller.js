import Interview from '../models/Interview.js';
import Message from '../models/Message.js';
import Question from '../models/Question.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { isInterviewer, loadInterviewForUser } from '../utils/access.js';
import { interviewForUser } from '../utils/serializers.js';
import { INTERVIEW_STATUSES } from '../config/constants.js';

const PEOPLE = 'name email role';
const POPULATE_PEOPLE = [
  { path: 'interviewer', select: PEOPLE },
  { path: 'candidate', select: PEOPLE },
];

// Every question id must exist and belong to the interviewer creating/editing the interview.
async function validateQuestionIds(ids, interviewer) {
  if (!Array.isArray(ids)) throw new ApiError(400, 'questions must be an array of question ids');
  const unique = [...new Set(ids.map(String))];
  const found = await Question.countDocuments({ _id: { $in: unique }, createdBy: interviewer._id });
  if (found !== unique.length) throw new ApiError(400, 'One or more questions were not found');
  return unique;
}

function parseDate(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw new ApiError(400, 'A valid scheduledAt date is required');
  return date;
}

async function loadOwnedInterview(id, user) {
  const interview = await loadInterviewForUser(id, user);
  if (!isInterviewer(interview, user)) throw new ApiError(403, 'Only the interviewer can change this interview');
  return interview;
}

export const createInterview = asyncHandler(async (req, res) => {
  const { candidateId, candidateEmail, title, scheduledAt, durationMinutes, questions = [] } = req.body;

  const candidate = candidateId
    ? await User.findById(candidateId)
    : candidateEmail
      ? await User.findOne({ email: String(candidateEmail).toLowerCase() })
      : null;
  if (!candidate || candidate.role !== 'candidate') throw new ApiError(400, 'Choose a valid candidate account');

  const interview = await Interview.create({
    interviewer: req.user._id,
    candidate: candidate._id,
    title: title?.trim() || undefined,
    scheduledAt: parseDate(scheduledAt),
    durationMinutes: durationMinutes || undefined,
    questions: await validateQuestionIds(questions, req.user),
  });

  await interview.populate(POPULATE_PEOPLE);
  res.status(201).json({ interview: interviewForUser(interview, req.user) });
});

export const listInterviews = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'interviewer' ? { interviewer: req.user._id } : { candidate: req.user._id };
  if (req.query.status) {
    if (!INTERVIEW_STATUSES.includes(req.query.status)) throw new ApiError(400, 'Unknown status');
    filter.status = req.query.status;
  }
  const interviews = await Interview.find(filter)
    .populate(POPULATE_PEOPLE)
    .sort('-scheduledAt');
  res.json({ interviews: interviews.map((i) => interviewForUser(i, req.user)) });
});

export const getInterview = asyncHandler(async (req, res) => {
  const interview = await loadInterviewForUser(req.params.id, req.user);
  await interview.populate(POPULATE_PEOPLE);
  // Question bodies are only sent to interviewers; candidates receive them live via the socket.
  if (req.user.role === 'interviewer') await interview.populate('questions');
  res.json({ interview: interviewForUser(interview, req.user) });
});

export const updateInterview = asyncHandler(async (req, res) => {
  const interview = await loadOwnedInterview(req.params.id, req.user);
  if (['completed', 'cancelled'].includes(interview.status)) {
    throw new ApiError(409, `A ${interview.status} interview can't be changed`);
  }

  const { title, scheduledAt, durationMinutes, questions, status } = req.body;
  if (title !== undefined) interview.title = title;
  if (durationMinutes !== undefined) interview.durationMinutes = durationMinutes;
  if (scheduledAt !== undefined) {
    if (interview.status !== 'scheduled') throw new ApiError(409, 'Only scheduled interviews can be moved');
    interview.scheduledAt = parseDate(scheduledAt);
  }
  if (questions !== undefined) interview.questions = await validateQuestionIds(questions, req.user);
  if (status !== undefined) {
    // Start / end happen over the socket; REST can only cancel.
    if (status !== 'cancelled') throw new ApiError(400, 'Status can only be changed to "cancelled" here');
    if (interview.status !== 'scheduled') throw new ApiError(409, 'Only scheduled interviews can be cancelled');
    interview.status = 'cancelled';
  }

  await interview.save();
  await interview.populate(POPULATE_PEOPLE);
  await interview.populate('questions');
  res.json({ interview: interviewForUser(interview, req.user) });
});

export const deleteInterview = asyncHandler(async (req, res) => {
  const interview = await loadOwnedInterview(req.params.id, req.user);
  if (interview.status === 'in-progress') throw new ApiError(409, 'End the interview before deleting it');
  await Promise.all([
    Message.deleteMany({ interview: interview._id }),
    Submission.deleteMany({ interview: interview._id }),
  ]);
  await interview.deleteOne();
  res.json({ message: 'Interview deleted' });
});

export const addQuestion = asyncHandler(async (req, res) => {
  const interview = await loadOwnedInterview(req.params.id, req.user);
  if (['completed', 'cancelled'].includes(interview.status)) {
    throw new ApiError(409, `A ${interview.status} interview can't be changed`);
  }
  const ids = await validateQuestionIds([...interview.questions, req.body.questionId], req.user);
  interview.questions = ids;
  await interview.save();
  await interview.populate(POPULATE_PEOPLE);
  await interview.populate('questions');
  res.json({ interview: interviewForUser(interview, req.user) });
});

export const removeQuestion = asyncHandler(async (req, res) => {
  const interview = await loadOwnedInterview(req.params.id, req.user);
  if (['completed', 'cancelled'].includes(interview.status)) {
    throw new ApiError(409, `A ${interview.status} interview can't be changed`);
  }
  interview.questions = interview.questions.filter((q) => String(q) !== req.params.questionId);
  if (String(interview.currentQuestion) === req.params.questionId) interview.currentQuestion = null;
  await interview.save();
  await interview.populate(POPULATE_PEOPLE);
  await interview.populate('questions');
  res.json({ interview: interviewForUser(interview, req.user) });
});

export const getMessages = asyncHandler(async (req, res) => {
  const interview = await loadInterviewForUser(req.params.id, req.user);
  const messages = await Message.find({ interview: interview._id })
    .sort('createdAt')
    .limit(500)
    .populate('sender', 'name role');
  res.json({ messages });
});

export const getSubmissions = asyncHandler(async (req, res) => {
  const interview = await loadInterviewForUser(req.params.id, req.user);
  const filter = { interview: interview._id };
  if (req.user.role !== 'interviewer') filter.candidate = req.user._id;
  const submissions = await Submission.find(filter).sort('-submittedAt').populate('question', 'title');
  res.json({ submissions });
});
