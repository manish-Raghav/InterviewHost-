import Interview from '../models/Interview.js';
import ApiError from './ApiError.js';

const idOf = (value) => String(value?._id ?? value);

export const isInterviewer = (interview, user) => idOf(interview.interviewer) === idOf(user._id);
export const isCandidate = (interview, user) => idOf(interview.candidate) === idOf(user._id);
export const isParticipant = (interview, user) =>
  isInterviewer(interview, user) || isCandidate(interview, user);

// Loads an interview and makes sure the current user is one of its two participants.
export async function loadInterviewForUser(id, user, { populate = '' } = {}) {
  const query = Interview.findById(id);
  if (populate) query.populate(populate);
  const interview = await query;
  if (!interview) throw new ApiError(404, 'Interview not found');
  if (!isParticipant(interview, user)) {
    throw new ApiError(403, 'You are not a participant in this interview');
  }
  return interview;
}
