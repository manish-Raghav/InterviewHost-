# InterviewHost — Real-Time Interview & Collaboration Platform

A full-stack MERN application for scheduling and running live technical
interviews: real-time collaborative code editor, chat, question bank,
role-based access (interviewer / candidate), and an automatic judge for
JavaScript submissions.

## Stack

**Frontend:** React 18, Redux Toolkit, React Router, Tailwind CSS, Monaco Editor, Socket.IO client
**Backend:** Node.js, Express, Socket.IO, MongoDB, Mongoose, JWT, bcrypt

## Project structure

```
interviewHost/
├── server/        # Express + Socket.IO API
│   └── src/
│       ├── config/       # env validation, constants, DB connection
│       ├── models/       # User, Question, Interview, Submission, Message
│       ├── controllers/  # REST route handlers
│       ├── routes/       # REST route definitions
│       ├── middleware/   # auth (JWT), error handling
│       ├── services/     # codeRunner (JS sandbox judge), submissionService
│       ├── sockets/      # all real-time event handling
│       └── seed.js       # demo data seeder
└── client/        # React + Vite app
    └── src/
        ├── app/          # Redux store
        ├── features/     # auth / interviews / questions / room slices
        ├── hooks/        # useInterviewRoom (socket wiring)
        ├── components/   # shared UI + room/* (editor, chat, panels)
        ├── pages/        # Login, Register, Dashboard, ScheduleInterview,
        │                 # Questions, InterviewRoom
        └── services/     # axios API client, socket client
```

## Setup

1. **Install dependencies** (from the project root):
   ```bash
   npm run install:all
   ```
   This installs the root, `server/`, and `client/` packages.

2. **Configure environment variables.**

   `server/.env` (copy from `server/.env.example` if you need to recreate it):
   ```
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/interviewhub
   JWT_SECRET=replace-with-a-long-random-secret
   JWT_EXPIRES_IN=7d
   CLIENT_URL=http://localhost:5173
   CODE_TIMEOUT_MS=5000
   ```

   `client/.env` (copy from `client/.env.example`):
   ```
   VITE_API_URL=http://localhost:5000/api
   VITE_SOCKET_URL=http://localhost:5000
   ```

3. **Start MongoDB.** Either run your own local instance, or use the
   provided `docker-compose.yml`:
   ```bash
   docker compose up -d
   ```

4. **Seed demo data** (optional but recommended):
   ```bash
   npm run seed
   ```
   Creates two demo accounts and a few sample questions/interview:
   - Interviewer: `interviewer@demo.com` / `password123`
   - Candidate: `candidate@demo.com` / `password123`

5. **Run the app in development** (starts both server and client):
   ```bash
   npm run dev
   ```
   - API: http://localhost:5000
   - Client: http://localhost:5173

## Production build

```bash
npm run build   # builds the client
npm start       # starts the server (serve the client build separately or via your own static hosting/reverse proxy)
```

## Notes & known limitations

- **Code judge is a demo-grade sandbox, not hardened.** `server/src/services/runner/jsRunner.js`
  runs candidate JavaScript in a Node `vm` context inside a forked child
  process with a memory cap and per-test timeout. This is **not** safe for
  untrusted production use — swap in a real isolation layer (Judge0, Piston,
  or Docker + gVisor) before exposing this to real candidates. Non-JS
  language submissions currently return `status: 'pending'` for manual
  review rather than being auto-judged.
- **Socket.IO room state is in-memory and single-process.** `server/src/sockets/index.js`
  keeps live room state (current code, presence, etc.) in a `Map` on the
  Node process. To run more than one server instance you'll need to move
  this to Redis (e.g. the `socket.io-redis` adapter) plus a shared store
  for room state.
- **Video/audio calling uses STUN only, no TURN server.** The interviewer and
  candidate can start a peer-to-peer video or audio call from the room
  (`client/src/hooks/useCall.js`, signaled over Socket.IO via the `call-*`
  events in `server/src/sockets/index.js`). The server never sees or touches
  the actual audio/video — it only relays the WebRTC offer/answer/ICE
  messages so the two browsers can connect directly. This works on most
  home/office networks with just the public Google STUN server that's
  configured, but a strict corporate or mobile NAT can fail to connect a
  direct path without a TURN server (e.g. a self-hosted coturn, or a paid
  TURN provider) — add one to `ICE_SERVERS` in `useCall.js` if that matters
  for your deployment.
- Hidden test cases and interviewer-only notes on questions are stripped
  server-side before being sent to candidates (see `src/utils/serializers.js`
  and the sanitization in `src/sockets/index.js`) — verified in testing that
  no hidden-test data leaks into candidate-facing payloads.

## Testing performed

The server code was validated with `node --check` across all files. The
JavaScript code judge was exercised with a standalone harness covering
correct/incorrect solutions, syntax errors, infinite loops, sandbox-escape
attempts, and async solutions — all behaved as expected. The full Socket.IO
flow (auth, join/leave, role enforcement, question sanitization, code sync,
chat, submission judging, disconnect handling, post-end guards) was verified
end-to-end with a mock integration test. Client JSX was verified to bundle
cleanly with esbuild.

**Not yet done in this environment:** a real `npm install` (npm registry
access was unavailable in the build sandbox), so run `npm run install:all`
and do a final smoke test before deploying.
