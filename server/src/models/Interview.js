import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { INTERVIEW_STATUSES, LANGUAGES } from '../config/constants.js';

const interviewSchema = new mongoose.Schema(
  {
    interviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, trim: true, maxlength: 150, default: 'Technical Interview' },
    scheduledAt: { type: Date, required: [true, 'Scheduled time is required'] },
    durationMinutes: { type: Number, min: 5, max: 480, default: 60 },
    status: { type: String, enum: INTERVIEW_STATUSES, default: 'scheduled' },
    // Public identifier used to derive the private Socket.IO room name.
    roomId: { type: String, unique: true, default: () => crypto.randomUUID() },
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    currentQuestion: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', default: null },
    startedAt: Date,
    endedAt: Date,
    // Final editor contents, saved when the interview ends.
    codeSnapshot: {
      code: { type: String, default: '' },
      language: { type: String, enum: LANGUAGES, default: 'javascript' },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Interview', interviewSchema);
