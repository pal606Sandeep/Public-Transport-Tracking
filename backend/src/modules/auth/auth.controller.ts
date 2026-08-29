import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";

export const register = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    apiResponse(res, 501, false, "Auth register not implemented yet");
  }
);

export const login = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    apiResponse(res, 501, false, "Auth login not implemented yet");
  }
);

export const refreshToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    apiResponse(res, 501, false, "Auth refreshToken not implemented yet");
  }
);