import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";

export const getAll = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    apiResponse(res, 501, false, "Schedule getAll not implemented yet");
  }
);

export const getById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    apiResponse(res, 501, false, "Schedule getById not implemented yet");
  }
);

export const create = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    apiResponse(res, 501, false, "Schedule create not implemented yet");
  }
);

export const update = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    apiResponse(res, 501, false, "Schedule update not implemented yet");
  }
);

export const remove = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    apiResponse(res, 501, false, "Schedule remove not implemented yet");
  }
);