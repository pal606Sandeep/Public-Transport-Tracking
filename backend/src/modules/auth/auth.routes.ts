import { Router } from "express";
import * as c from "./auth.controller.js";
import { validate } from "../../utils/validation.js";
import { authenticate } from "../../middlewares/rbac.js";
import {
  registerSchema,
  loginSchema,
  otpRequestSchema,
  otpVerifySchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  registerDeviceSchema,
} from "./auth.validation.js";

const router = Router();

// P1-07
router.post("/register", validate(registerSchema), c.register);
router.post("/login", validate(loginSchema), c.login);

// P1-08
router.post("/refresh", c.refreshToken);
router.post("/refresh-token", c.refreshToken); // alias

// P1-09
router.post("/otp/request", validate(otpRequestSchema), c.requestOtp);
router.post("/otp/verify", validate(otpVerifySchema), c.verifyOtp);

// P1-10
router.post("/logout", c.logout);
router.get("/sessions", authenticate, c.listSessions);
router.delete("/sessions/:sessionId", authenticate, c.revokeSession);

// P1-11
router.post("/password/forgot", validate(forgotPasswordSchema), c.forgotPassword);
router.post("/password/reset", validate(resetPasswordSchema), c.resetPassword);
router.post("/password/change", authenticate, validate(changePasswordSchema), c.changePassword);

// P1-12
router.post("/guest", c.guestSession);

// P1-13
router.get("/me", authenticate, c.me);
router.patch("/me", authenticate, validate(updateProfileSchema), c.updateMe);

// P1-16 devices
router.post("/devices", authenticate, validate(registerDeviceSchema), c.registerDevice);
router.get("/devices", authenticate, c.listDevices);
router.delete("/devices/:deviceId", authenticate, c.deleteDevice);

export default router;
