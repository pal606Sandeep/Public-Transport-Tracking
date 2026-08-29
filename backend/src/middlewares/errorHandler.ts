import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger.js";
import { apiResponse } from "../utils/apiResponse.js";

export const errorHandler = (
  err: Error & { statusCode?: number },
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error(err.message);
  apiResponse(
    res,
    err.statusCode || 500,
    false,
    err.message || "Internal Server Error"
  );
};