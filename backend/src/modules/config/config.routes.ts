import { Router } from "express";
import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { guestOrAuth } from "../../middlewares/rbac.js";
import { getClientConfig, getServerTime } from "./config.service.js";

// P1-17
const configController = {
  getConfig: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const payload = await getClientConfig(req.user?.role);
    apiResponse(res, 200, true, "Client config", payload);
  }),
  getTime: asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    apiResponse(res, 200, true, "Server time", getServerTime());
  }),
};

const router = Router();
router.get("/config", guestOrAuth, configController.getConfig);
router.get("/time", guestOrAuth, configController.getTime);

export default router;
