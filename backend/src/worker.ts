import { startTrackingWorkers } from "./modules/tracking/workers/tracking.worker.js";
import logger from "./utils/logger.js";

logger.info("Starting tracking worker process...");
startTrackingWorkers().catch((err) => {
  logger.error(`Failed to start tracking worker: ${err.message}`);
  process.exit(1);
});