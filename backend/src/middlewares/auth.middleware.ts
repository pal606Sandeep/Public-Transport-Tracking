import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { apiResponse } from "../utils/apiResponse.js";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    apiResponse(res, 401, false, "No token provided");
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
      role: string;
    };
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch {
    apiResponse(res, 401, false, "Invalid or expired token");
  }
};