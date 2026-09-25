// Candidates must never see hidden test cases or the interviewer's expected-output notes.
export function questionForCandidate(question) {
  const q = typeof question.toObject === 'function' ? question.toObject() : { ...question };
  return {
    _id: q._id,
    title: q.title,
    description: q.description,
    difficulty: q.difficulty,
    testCases: (q.testCases || [])
      .filter((tc) => !tc.isHidden)
      .map(({ input, expectedOutput }) => ({ input, expectedOutput })),
  };
}

export function questionForUser(question, user) {
  const q = typeof question.toObject === 'function' ? question.toObject() : question;
  return user.role === 'interviewer' ? q : questionForCandidate(q);
}

// Candidates only receive question bodies through the socket once the interviewer sends them.
export function interviewForUser(interview, user) {
  const obj = typeof interview.toObject === 'function' ? interview.toObject() : { ...interview };
  obj.questionCount = (obj.questions || []).length;
  if (user.role !== 'interviewer') {
    obj.questions = [];
    delete obj.codeSnapshot;
  }
  return obj;
}
