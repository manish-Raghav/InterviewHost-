import Interview from '../models/Interview.js';
import Question from '../models/Question.js';
import Submission from '../models/Submission.js';
import { LANGUAGES } from '../config/constants.js';
import ApiError from '../utils/ApiError.js';
import { isCandidate } from '../utils/access.js';
import { runCode, runFreeform } from './codeRunner.js';

// Base checks shared by every candidate code-execution path: valid code/language, and an
// interview that actually belongs to this candidate. `allowedStatuses` differs by caller —
// formal submission only makes sense once the interview is in progress, but a candidate
// should be able to just try running code as soon as they're in the room (before or after
// the interviewer has officially started things).
async function loadCandidateInterview({ user, interviewId, code, language, allowedStatuses }) {
  if (typeof code !== 'string' || !code.trim()) throw new ApiError(400, 'Code cannot be empty');
  if (code.length > 100000) throw new ApiError(400, 'Code is too long (100,000 characters max)');
  if (!LANGUAGES.includes(language)) throw new ApiError(400, `Unsupported language: ${language}`);

  const interview = await Interview.findById(interviewId);
  if (!interview) throw new ApiError(404, 'Interview not found');
  if (!isCandidate(interview, user)) throw new ApiError(403, 'Only the candidate can do this');
  if (!allowedStatuses.includes(interview.status)) {
    throw new ApiError(409, 'This interview is not open for running code right now');
  }

  return interview;
}

// Shared validation for both submitCode() and previewRun(): the interview must exist, be
// in progress, belong to this candidate, and the question must actually be attached to it.
async function loadCandidateQuestion({ user, interviewId, questionId, code, language, allowedStatuses }) {
  const interview = await loadCandidateInterview({ user, interviewId, code, language, allowedStatuses });

  const question = await Question.findById(questionId);
  if (!question || !interview.questions.some((id) => id.equals(question._id))) {
    throw new ApiError(400, 'That question is not part of this interview');
  }

  return { interview, question };
}

// Shared by the REST endpoint and the `submit-code` socket event. Graded against every test
// case (including hidden ones) and persisted so the interviewer can see it.
export async function submitCode({ user, interviewId, questionId, code, language = 'javascript' }) {
  const { interview, question } = await loadCandidateQuestion({
    user,
    interviewId,
    questionId,
    code,
    language,
    allowedStatuses: ['in-progress'],
  });

  const result = await runCode({ code, language, testCases: question.testCases });

  return Submission.create({
    interview: interview._id,
    candidate: user._id,
    question: question._id,
    code,
    language,
    result,
  });
}

// Used by the `run-code` socket event so a candidate can sanity-check their solution before
// submitting. Deliberately NOT persisted and NOT shown to the interviewer, and only ever run
// against the question's visible test cases — hidden test cases stay hidden even here.
export async function previewRun({ user, interviewId, questionId, code, language = 'javascript' }) {
  const { question } = await loadCandidateQuestion({
    user,
    interviewId,
    questionId,
    code,
    language,
    allowedStatuses: ['scheduled', 'in-progress'],
  });

  const visibleCases = (question.testCases || []).filter((tc) => !tc.isHidden);
  if (!visibleCases.length) {
    return {
      status: 'pending',
      passed: 0,
      total: 0,
      message: 'This question has no visible test cases to run against — submit your solution to see graded results.',
      details: [],
    };
  }

  return runCode({ code, language, testCases: visibleCases });
}

// Used by the `run-code` socket event when no question has been sent yet (or the candidate
// just wants to try something out). No test cases to check against — just executes the code
// and returns whatever it printed. Not persisted, not shown to the interviewer.
export async function previewFreeRun({ user, interviewId, code, language = 'javascript' }) {
  await loadCandidateInterview({ user, interviewId, code, language, allowedStatuses: ['scheduled', 'in-progress'] });
  return runFreeform({ code, language });
}
