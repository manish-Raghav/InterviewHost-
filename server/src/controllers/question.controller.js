import Interview from '../models/Interview.js';
import Question from '../models/Question.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { DIFFICULTIES } from '../config/constants.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function pickQuestionFields(body) {
  const fields = {};
  for (const key of ['title', 'description', 'difficulty', 'expectedOutput']) {
    if (body[key] !== undefined) fields[key] = body[key];
  }
  if (body.testCases !== undefined) {
    if (!Array.isArray(body.testCases)) throw new ApiError(400, 'testCases must be an array');
    fields.testCases = body.testCases.map((tc) => ({
      input: String(tc.input ?? ''),
      expectedOutput: String(tc.expectedOutput ?? ''),
      isHidden: Boolean(tc.isHidden),
    }));
  }
  if (fields.difficulty && !DIFFICULTIES.includes(fields.difficulty)) {
    throw new ApiError(400, 'Difficulty must be easy, medium or hard');
  }
  return fields;
}

async function findOwnedQuestion(id, user) {
  const question = await Question.findById(id);
  if (!question) throw new ApiError(404, 'Question not found');
  if (String(question.createdBy) !== String(user._id)) {
    throw new ApiError(403, 'You can only change questions you created');
  }
  return question;
}

export const listQuestions = asyncHandler(async (req, res) => {
  const { difficulty, q } = req.query;
  const filter = { createdBy: req.user._id };
  if (difficulty) filter.difficulty = difficulty;
  if (q) filter.title = new RegExp(escapeRegex(String(q)), 'i');
  const questions = await Question.find(filter).sort('-createdAt');
  res.json({ questions });
});

export const getQuestion = asyncHandler(async (req, res) => {
  const question = await findOwnedQuestion(req.params.id, req.user);
  res.json({ question });
});

export const createQuestion = asyncHandler(async (req, res) => {
  const question = await Question.create({ ...pickQuestionFields(req.body), createdBy: req.user._id });
  res.status(201).json({ question });
});

export const updateQuestion = asyncHandler(async (req, res) => {
  const question = await findOwnedQuestion(req.params.id, req.user);
  question.set(pickQuestionFields(req.body));
  await question.save();
  res.json({ question });
});

export const deleteQuestion = asyncHandler(async (req, res) => {
  const question = await findOwnedQuestion(req.params.id, req.user);
  const inUse = await Interview.exists({
    questions: question._id,
    status: { $in: ['scheduled', 'in-progress'] },
  });
  if (inUse) throw new ApiError(409, 'This question is used in an upcoming or live interview');
  await question.deleteOne();
  res.json({ message: 'Question deleted' });
});
