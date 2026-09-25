import mongoose from 'mongoose';
import { LANGUAGES } from '../config/constants.js';
import Interview from '../models/Interview.js';
import Message from '../models/Message.js';
import Question from '../models/Question.js';
import User from '../models/User.js';
import { previewFreeRun, previewRun, submitCode } from '../services/submissionService.js';
import ApiError from '../utils/ApiError.js';
import { questionForCandidate, questionForUser } from '../utils/serializers.js';
import { verifyToken } from '../utils/token.js';

/**
 * Socket.IO layer
 * ---------------
 * Every interview owns one private room: `interview:<roomId>`. A socket can only be in a
 * room after `join-interview` succeeds, which requires being that interview's interviewer
 * or candidate. All later events use the room stored on the socket (socket.data.ctx) rather
 * than trusting an interview id sent by the client, so events can never leak into a room the
 * user did not join.
 *
 * Live state that changes constantly (editor contents, who is online) lives in memory in
 * `rooms`. Durable things (messages, submissions, status, current question) go to MongoDB.
 * The in-memory map means a single Node process; to scale horizontally add the Redis adapter
 * for Socket.IO and move this state to Redis.
 */

const rooms = new Map(); // roomName -> { code, language, currentQuestionId, status, candidateSockets:Set }

const roomNameFor = (interview) => `interview:${interview.roomId}`;
const reply = (ack, payload) => typeof ack === 'function' && ack(payload);

function getRoomState(room, interview) {
  let state = rooms.get(room);
  if (!state) {
    state = {
      code: interview.codeSnapshot?.code || '',
      language: interview.codeSnapshot?.language || 'javascript',
      currentQuestionId: interview.currentQuestion ? String(interview.currentQuestion) : null,
      candidateSockets: new Set(),
      status: interview.status,
    };
    rooms.set(room, state);
  }
  state.status = interview.status;
  return state;
}

function requireRoom(socket) {
  const ctx = socket.data.ctx;
  if (!ctx) throw new ApiError(400, 'Join an interview first');
  return ctx;
}

function requireRole(ctx, role) {
  if (ctx.role !== role) throw new ApiError(403, `Only the ${role} can do this`);
}

// Wraps a handler so thrown errors reach the client's ack callback instead of crashing the process.
const safe = (handler) => async (payload, ack) => {
  try {
    await handler(payload && typeof payload === 'object' ? payload : {}, ack);
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Something went wrong';
    if (!(err instanceof ApiError)) console.error('[socket]', err);
    reply(ack, { ok: false, error: message });
  }
};

function leaveCurrentRoom(io, socket) {
  const ctx = socket.data.ctx;
  if (!ctx) return;

  socket.data.ctx = null;
  socket.leave(ctx.room);

  // Harmless if no call was active — the client just ignores it in that case.
  socket.to(ctx.room).emit('call-end', { reason: 'peer-left' });

  const state = rooms.get(ctx.room);
  if (!state) return;

  if (ctx.role === 'candidate') {
    state.candidateSockets.delete(socket.id);
    if (state.candidateSockets.size === 0) {
      socket.to(ctx.room).emit('candidate-offline', { userId: String(socket.user._id) });
    }
  }

  // Free memory for finished interviews once everyone has left.
  const members = io.sockets.adapter.rooms.get(ctx.room);
  if (!members?.size && state.status === 'completed') rooms.delete(ctx.room);
}

export default function registerSocketHandlers(io) {
  // --- Authentication: every connection must present a valid JWT ---
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const payload = verifyToken(token);
      const user = await User.findById(payload.id).select('name email role');
      if (!user) return next(new Error('Account not found'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    // ---- join / leave ----
    socket.on(
      'join-interview',
      safe(async ({ interviewId }, ack) => {
        if (!mongoose.isValidObjectId(interviewId)) throw new ApiError(400, 'Invalid interview id');

        const interview = await Interview.findById(interviewId);
        if (!interview) throw new ApiError(404, 'Interview not found');

        const userId = String(socket.user._id);
        let role = null;
        if (String(interview.interviewer) === userId) role = 'interviewer';
        else if (String(interview.candidate) === userId) role = 'candidate';
        if (!role) throw new ApiError(403, 'You are not a participant in this interview');
        if (interview.status === 'cancelled') throw new ApiError(409, 'This interview was cancelled');
        // The client may have navigated away while we were querying; don't register a dead socket.
        if (socket.disconnected) return;

        leaveCurrentRoom(io, socket); // a socket is only ever in one interview room

        const room = roomNameFor(interview);
        const state = getRoomState(room, interview);
        socket.join(room);
        socket.data.ctx = { interviewId: String(interview._id), room, role };

        if (role === 'candidate') {
          state.candidateSockets.add(socket.id);
          if (state.candidateSockets.size === 1) socket.to(room).emit('candidate-online', { userId });
        }

        let currentQuestion = null;
        if (state.currentQuestionId) {
          const question = await Question.findById(state.currentQuestionId);
          if (question) currentQuestion = questionForUser(question, socket.user);
        }

        reply(ack, {
          ok: true,
          state: {
            interviewId: String(interview._id),
            role,
            status: interview.status,
            startedAt: interview.startedAt || null,
            endedAt: interview.endedAt || null,
            durationMinutes: interview.durationMinutes,
            candidateOnline: state.candidateSockets.size > 0,
            currentQuestion,
            code: state.code,
            language: state.language,
          },
        });
      })
    );

    socket.on('leave-interview', safe(async () => leaveCurrentRoom(io, socket)));

    // ---- chat ----
    socket.on(
      'send-message',
      safe(async ({ message }, ack) => {
        const ctx = requireRoom(socket);
        const state = rooms.get(ctx.room);
        if (state?.status === 'completed') throw new ApiError(409, 'This interview has ended');

        const text = typeof message === 'string' ? message.trim() : '';
        if (!text) throw new ApiError(400, 'Message cannot be empty');
        if (text.length > 2000) throw new ApiError(400, 'Message is too long (2,000 characters max)');

        const doc = await Message.create({
          interview: ctx.interviewId,
          sender: socket.user._id,
          message: text,
        });

        io.to(ctx.room).emit('receive-message', {
          _id: doc._id,
          interview: ctx.interviewId,
          sender: { _id: socket.user._id, name: socket.user.name, role: ctx.role },
          message: doc.message,
          createdAt: doc.createdAt,
        });
        reply(ack, { ok: true });
      })
    );

    // ---- typing indicators (relayed only, never stored) ----
    for (const role of ['candidate', 'interviewer']) {
      socket.on(
        `${role}-typing`,
        safe(async ({ isTyping }) => {
          const ctx = requireRoom(socket);
          if (ctx.role !== role) return;
          socket.to(ctx.room).emit(`${role}-typing`, { isTyping: Boolean(isTyping) });
        })
      );
    }

    // ---- questions ----
    socket.on(
      'send-question',
      safe(async ({ questionId }, ack) => {
        const ctx = requireRoom(socket);
        requireRole(ctx, 'interviewer');
        if (!mongoose.isValidObjectId(questionId)) throw new ApiError(400, 'Invalid question id');

        const interview = await Interview.findById(ctx.interviewId);
        if (interview.status !== 'in-progress') {
          throw new ApiError(409, 'Start the interview before sending questions');
        }
        if (!interview.questions.some((id) => String(id) === String(questionId))) {
          throw new ApiError(400, 'That question is not part of this interview');
        }
        const question = await Question.findById(questionId);
        if (!question) throw new ApiError(404, 'Question not found');

        interview.currentQuestion = question._id;
        await interview.save();
        rooms.get(ctx.room).currentQuestionId = String(question._id);

        // Candidate-safe version: no hidden test cases, no interviewer notes.
        io.to(ctx.room).emit('receive-question', {
          questionId: String(question._id),
          question: questionForCandidate(question),
        });
        reply(ack, { ok: true });
      })
    );

    // ---- collaborative code editing (full-document sync, last write wins) ----
    socket.on(
      'code-change',
      safe(async ({ code, language }) => {
        const ctx = requireRoom(socket);
        const state = rooms.get(ctx.room);
        if (!['scheduled', 'in-progress'].includes(state.status)) return;
        if (typeof code !== 'string' || code.length > 100000) throw new ApiError(400, 'Invalid code payload');

        state.code = code;
        if (LANGUAGES.includes(language)) state.language = language;

        socket.to(ctx.room).emit('code-update', {
          code,
          language: state.language,
          from: { id: String(socket.user._id), role: ctx.role },
        });
      })
    );

    // ---- interview lifecycle ----
    socket.on(
      'start-interview',
      safe(async (_payload, ack) => {
        const ctx = requireRoom(socket);
        requireRole(ctx, 'interviewer');

        const interview = await Interview.findById(ctx.interviewId);
        if (interview.status !== 'scheduled') throw new ApiError(409, 'This interview has already started or ended');

        interview.status = 'in-progress';
        interview.startedAt = new Date();
        await interview.save();
        rooms.get(ctx.room).status = 'in-progress';

        io.to(ctx.room).emit('start-interview', {
          status: 'in-progress',
          startedAt: interview.startedAt,
          durationMinutes: interview.durationMinutes,
        });
        reply(ack, { ok: true });
      })
    );

    socket.on(
      'end-interview',
      safe(async (_payload, ack) => {
        const ctx = requireRoom(socket);
        requireRole(ctx, 'interviewer');

        const interview = await Interview.findById(ctx.interviewId);
        if (interview.status !== 'in-progress') throw new ApiError(409, 'This interview is not in progress');

        const state = rooms.get(ctx.room);
        interview.status = 'completed';
        interview.endedAt = new Date();
        interview.codeSnapshot = { code: state.code, language: state.language };
        await interview.save();
        state.status = 'completed';

        io.to(ctx.room).emit('end-interview', { status: 'completed', endedAt: interview.endedAt });
        reply(ack, { ok: true });
      })
    );

    // ---- code submission ----
    // A "Run" preview: lets the candidate sanity-check their code before formally submitting.
    // Works even if no question has been sent yet — in that case it just executes the code
    // and returns whatever it printed, with nothing to check against. Never persisted, never
    // broadcast to the interviewer — the result only goes back to the socket that asked.
    socket.on(
      'run-code',
      safe(async ({ questionId, code, language }, ack) => {
        const ctx = requireRoom(socket);
        requireRole(ctx, 'candidate');

        const result = questionId
          ? await previewRun({ user: socket.user, interviewId: ctx.interviewId, questionId, code, language })
          : await previewFreeRun({ user: socket.user, interviewId: ctx.interviewId, code, language });

        reply(ack, { ok: true, result });
      })
    );

    socket.on(
      'submit-code',
      safe(async ({ questionId, code, language }, ack) => {
        const ctx = requireRoom(socket);
        requireRole(ctx, 'candidate');

        const submission = await submitCode({
          user: socket.user,
          interviewId: ctx.interviewId,
          questionId,
          code,
          language,
        });

        const payload = submission.toObject();
        io.to(ctx.room).emit('submission-result', payload);
        reply(ack, { ok: true, submission: payload });
      })
    );

    // ---- video/audio call signaling (WebRTC) ----
    // The server never sees or touches any audio/video — it only relays the SDP offer/answer
    // and ICE candidates between the interview's two participants so their browsers can
    // negotiate a direct peer-to-peer connection. This only needs STUN (see client ICE_SERVERS
    // config) for most home/office networks; a strict corporate or mobile NAT may need a TURN
    // server added there to connect reliably — none is configured here.
    socket.on(
      'call-offer',
      safe(async ({ sdp, video }) => {
        const ctx = requireRoom(socket);
        const state = rooms.get(ctx.room);
        if (state?.status === 'completed') throw new ApiError(409, 'This interview has ended');
        socket.to(ctx.room).emit('call-offer', {
          sdp,
          video: Boolean(video),
          from: { id: String(socket.user._id), role: ctx.role, name: socket.user.name },
        });
      })
    );

    socket.on(
      'call-answer',
      safe(async ({ sdp }) => {
        const ctx = requireRoom(socket);
        socket.to(ctx.room).emit('call-answer', { sdp });
      })
    );

    socket.on(
      'call-ice-candidate',
      safe(async ({ candidate }) => {
        const ctx = requireRoom(socket);
        if (!candidate) return;
        socket.to(ctx.room).emit('call-ice-candidate', { candidate });
      })
    );

    socket.on(
      'call-end',
      safe(async ({ reason } = {}) => {
        const ctx = requireRoom(socket);
        socket.to(ctx.room).emit('call-end', { reason: reason || 'hangup' });
      })
    );

    // ---- disconnect ----
    socket.on('disconnecting', () => leaveCurrentRoom(io, socket));
  });
}
