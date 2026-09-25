// Loads server/.env from an absolute path (next to package.json), instead of
// relying on process.cwd(), so it works no matter where/how you launch the
// server (npm --prefix, double-clicking a script, a different terminal cwd,
// etc.)
//
// This file must be the FIRST import in any entry point that needs env vars
// (server.js, seed.js). In ES modules, every import statement in a file is
// resolved and evaluated — in the order it's written — before any of that
// file's own top-level code runs. So putting this import first guarantees
// process.env is populated before config/index.js (imported later, directly
// or transitively) reads it.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// this file lives at server/src/config/loadEnv.js -> server/.env
const envPath = path.join(__dirname, '..', '..', '.env');

if (!fs.existsSync(envPath)) {
  console.error(
    `\nNo .env file found at:\n  ${envPath}\n\n` +
      'Create it by copying server/.env.example to server/.env and filling in the values.\n' +
      '(On Windows, double-check the file is really named ".env" and not ".env.txt" — ' +
      'turn on "File name extensions" in File Explorer\'s View tab to confirm the real name.)\n'
  );
  process.exit(1);
}

dotenv.config({ path: envPath });
