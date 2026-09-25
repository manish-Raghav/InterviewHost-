import mongoose from 'mongoose';
import { LANGUAGES, SUBMISSION_STATUSES } from '../config/constants.js';

const submissionSchema = new mongoose.Schema({
  interview: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview', required: true, index: true },
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  code: { type: String, required: true, maxlength: 100000 },
  language: { type: String, enum: LANGUAGES, default: 'javascript' },
  result: {
    status: { type: String, enum: SUBMISSION_STATUSES, default: 'pending' },
    passed: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    message: { type: String, default: '' },
    details: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  submittedAt: { type: Date, default: Date.now },
});

export default mongoose.model('Submission', submissionSchema);
