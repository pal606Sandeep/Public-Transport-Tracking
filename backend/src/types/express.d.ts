import { Logger } from "../utils/logger.js";

export interface AuthUser {
  id: string;
  role: string;
  permissions?: string[];
  sessionId?: string;
  scope?: string; // "guest" | "user"
  deviceId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      log: Logger;
    }

    interface Locals {
      traceId?: string;
    }
  }
}

export {};
