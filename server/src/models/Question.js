import mongoose from 'mongoose';
import { DIFFICULTIES } from '../config/constants.js';

const testCaseSchema = new mongoose.Schema(
  {
    // Text passed to the candidate's program as the global `input` string.
    input: { type: String, default: '' },
    // What the program is expected to print (compared after trimming whitespace).
    expectedOutput: { type: String, required: true },
    // Hidden test cases are used for judging but never shown to the candidate.
    isHidden: { type: Boolean, default: false },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 150 },
    description: { type: String, required: [true, 'Description is required'], maxlength: 10000 },
    difficulty: { type: String, enum: DIFFICULTIES, default: 'easy' },
    testCases: { type: [testCaseSchema], default: [] },
    // Interviewer-only notes: reference answer or what a good solution looks like.
    expectedOutput: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.model('Question', questionSchema);
