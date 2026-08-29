import { Request, Response, NextFunction } from "express";
import { apiResponse } from "../utils/apiResponse.js";

export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      apiResponse(res, 403, false, "Forbidden: insufficient permissions");
      return;
    }

    next();
  };
};