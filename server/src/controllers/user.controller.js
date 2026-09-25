import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Interviewers use this to pick a candidate when scheduling.
export const listUsers = asyncHandler(async (req, res) => {
  const { role, q } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (q) {
    const rx = new RegExp(escapeRegex(String(q)), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const users = await User.find(filter).select('name email role').sort('name').limit(100);
  res.json({ users });
});

export const getUser = asyncHandler(async (req, res) => {
  const isSelf = String(req.user._id) === req.params.id;
  if (!isSelf && req.user.role !== 'interviewer') throw new ApiError(403, 'Not allowed');
  const user = await User.findById(req.params.id).select('name email role createdAt');
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ user });
});

export const updateMe = asyncHandler(async (req, res) => {
  const { name, currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (name !== undefined) {
    if (!String(name).trim()) throw new ApiError(400, 'Name cannot be empty');
    user.name = name;
  }
  if (newPassword) {
    if (!currentPassword || !(await user.comparePassword(currentPassword))) {
      throw new ApiError(400, 'Current password is incorrect');
    }
    if (newPassword.length < 6) throw new ApiError(400, 'New password must be at least 6 characters');
    user.password = newPassword;
  }

  await user.save();
  res.json({ user });
});
