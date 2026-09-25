import './config/loadEnv.js';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import Interview from './models/Interview.js';
import Message from './models/Message.js';
import Question from './models/Question.js';
import Submission from './models/Submission.js';
import User from './models/User.js';

// Re-creates the demo accounts, three questions and one interview.
// Only data belonging to the two demo accounts is removed; anything else in the database is left alone.
async function seed() {
  await connectDB();

  const demoUsers = await User.find({ email: { $in: ['interviewer@demo.com', 'candidate@demo.com'] } }).select('_id');
  const demoIds = demoUsers.map((u) => u._id);
  if (demoIds.length) {
    const demoInterviews = await Interview.find({
      $or: [{ interviewer: { $in: demoIds } }, { candidate: { $in: demoIds } }],
    }).select('_id');
    const interviewIds = demoInterviews.map((i) => i._id);

    await Promise.all([
      Message.deleteMany({ interview: { $in: interviewIds } }),
      Submission.deleteMany({ interview: { $in: interviewIds } }),
      Interview.deleteMany({ _id: { $in: interviewIds } }),
      Question.deleteMany({ createdBy: { $in: demoIds } }),
    ]);
    await User.deleteMany({ _id: { $in: demoIds } });
  }

  const interviewer = await User.create({
    name: 'Ira Interviewer',
    email: 'interviewer@demo.com',
    password: 'password123',
    role: 'interviewer',
  });
  const candidate = await User.create({
    name: 'Chandan Candidate',
    email: 'candidate@demo.com',
    password: 'password123',
    role: 'candidate',
  });

  const questions = await Question.insertMany([
    {
      title: 'Sum of numbers',
      difficulty: 'easy',
      createdBy: interviewer._id,
      description:
        'The global `input` string contains space-separated integers. Print their sum.\n\nExample: input "1 2 3" -> print 6',
      expectedOutput: 'Reduce over the parsed numbers; O(n).',
      testCases: [
        { input: '1 2 3', expectedOutput: '6' },
        { input: '10 -4 7', expectedOutput: '13' },
        { input: '5', expectedOutput: '5', isHidden: true },
        { input: '0 0 0 0', expectedOutput: '0', isHidden: true },
      ],
    },
    {
      title: 'Valid palindrome',
      difficulty: 'easy',
      createdBy: interviewer._id,
      description:
        'Print `true` if `input` reads the same forwards and backwards after removing non-alphanumeric characters and ignoring case; otherwise print `false`.',
      expectedOutput: 'Two pointers or compare with the reversed string; O(n).',
      testCases: [
        { input: 'A man, a plan, a canal: Panama', expectedOutput: 'true' },
        { input: 'race a car', expectedOutput: 'false' },
        { input: ' ', expectedOutput: 'true', isHidden: true },
      ],
    },
    {
      title: 'Two sum',
      difficulty: 'medium',
      createdBy: interviewer._id,
      description:
        'The first line of `input` is an array of integers (space separated), the second line is the target. Print the indices (0-based, ascending, separated by a space) of the two numbers that add up to the target.',
      expectedOutput: 'Hash map of value -> index; O(n).',
      testCases: [
        { input: '2 7 11 15\n9', expectedOutput: '0 1' },
        { input: '3 2 4\n6', expectedOutput: '1 2' },
        { input: '3 3\n6', expectedOutput: '0 1', isHidden: true },
      ],
    },
  ]);

  const when = new Date();
  when.setHours(when.getHours() + 1, 0, 0, 0);

  const interview = await Interview.create({
    interviewer: interviewer._id,
    candidate: candidate._id,
    title: 'Frontend screening',
    scheduledAt: when,
    durationMinutes: 45,
    questions: questions.map((q) => q._id),
  });

  console.log('\nSeed complete.');
  console.log('  Interviewer: interviewer@demo.com / password123');
  console.log('  Candidate:   candidate@demo.com   / password123');
  console.log(`  Interview room: /interviews/${interview._id}/room\n`);

  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
