import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError.js";

/**
 * Reject guest tokens (role GUEST). Use after `authenticate` on routes that a
 * registered account is required for (creating complaints, subscriptions, …).
 */
export const denyGuest = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role === "GUEST") {
    next(AppError.forbidden("A registered account is required", "GUEST_FORBIDDEN"));
    return;
  }
  next();
};
