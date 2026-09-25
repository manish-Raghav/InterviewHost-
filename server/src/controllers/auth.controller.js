import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { signToken } from '../utils/token.js';
import { ROLES } from '../config/constants.js';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name?.trim() || !email || !password) {
    throw new ApiError(400, 'Name, email and password are required');
  }
  if (!EMAIL_RE.test(email)) throw new ApiError(400, 'Please provide a valid email');
  if (password.length < 6) throw new ApiError(400, 'Password must be at least 6 characters');
  if (role && !ROLES.includes(role)) throw new ApiError(400, 'Role must be interviewer or candidate');

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new ApiError(409, 'An account with this email already exists');

  const user = await User.create({ name, email, password, role: role || 'candidate' });
  res.status(201).json({ user, token: signToken(user) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password are required');

  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  res.json({ user, token: signToken(user) });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});
