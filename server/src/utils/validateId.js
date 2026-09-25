import mongoose from 'mongoose';
import ApiError from './ApiError.js';

// validateId('id', 'questionId') -> 400 if any of those route params is not a valid ObjectId
export const validateId =
  (...names) =>
  (req, res, next) => {
    for (const name of names) {
      if (!mongoose.isValidObjectId(req.params[name])) {
        return next(new ApiError(400, `Invalid ${name}`));
      }
    }
    next();
  };
