import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";

export const getAll = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    apiResponse(res, 501, false, "Route getAll not implemented yet");
  }
);

export const getById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    apiResponse(res, 501, false, "Route getById not implemented yet");
  }
);

export const create = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    apiResponse(res, 501, false, "Route create not implemented yet");
  }
);

export const update = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    apiResponse(res, 501, false, "Route update not implemented yet");
  }
);

export const remove = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    apiResponse(res, 501, false, "Route remove not implemented yet");
  }
);