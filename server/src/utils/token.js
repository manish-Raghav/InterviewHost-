import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

export const verifyToken = (token) => jwt.verify(token, config.jwtSecret);
