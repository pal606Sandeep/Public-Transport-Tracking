import { runMaintenanceJobs } from "./maintenance.service.js";
import logger from "../../utils/logger.js";

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000;

let timer: NodeJS.Timeout | null = null;
let running = false;

const runOnce = async (): Promise<void> => {
  if (running) return;
  running = true;
  try {
    const result = await runMaintenanceJobs();
    logger.info(
      `Maintenance job ran: ${result.documentCheck.flagged} document(s) flagged, ${result.serviceDue.length} service due`
    );
  } catch (err) {
    logger.error(`Maintenance job failed: ${(err as Error).message}`);
  } finally {
    running = false;
  }
};

/**
 * P1-48 — lightweight periodic runner for the document-expiry / service-due
 * reminder job. Set MAINTENANCE_JOB_INTERVAL_MS to override (0 disables).
 */
export const startMaintenanceJobRunner = (): void => {
  const interval = Number(process.env.MAINTENANCE_JOB_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);
  if (!Number.isFinite(interval) || interval <= 0) return;
  // Kick off one run shortly after boot, then on the fixed cadence.
  timer = setInterval(() => void runOnce(), interval);
  setTimeout(() => void runOnce(), 5000);
  timer.unref?.();
};

export const stopMaintenanceJobRunner = (): void => {
  if (timer) clearInterval(timer);
  timer = null;
};
