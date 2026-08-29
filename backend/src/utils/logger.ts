import { trackingConfig } from "../modules/tracking/config/tracking.config.js";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogMeta {
  traceId?: string;
  service?: string;
  [key: string]: unknown;
}

const levelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = trackingConfig.logging.level as LogLevel;

function shouldLog(level: LogLevel): boolean {
  return levelPriority[level] >= levelPriority[currentLevel];
}

function formatMessage(level: LogLevel, message: string, meta: LogMeta = {}): string {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

export const logger = {
  debug: (message: string, meta?: LogMeta): void => {
    if (shouldLog("debug")) {
      console.debug(formatMessage("debug", message, meta));
    }
  },
  info: (message: string, meta?: LogMeta): void => {
    if (shouldLog("info")) {
      console.log(formatMessage("info", message, meta));
    }
  },
  warn: (message: string, meta?: LogMeta): void => {
    if (shouldLog("warn")) {
      console.warn(formatMessage("warn", message, meta));
    }
  },
  error: (message: string, meta?: LogMeta): void => {
    if (shouldLog("error")) {
      console.error(formatMessage("error", message, meta));
    }
  },
  child: (defaultMeta: LogMeta) => ({
    debug: (message: string, meta?: LogMeta) => logger.debug(message, { ...defaultMeta, ...meta }),
    info: (message: string, meta?: LogMeta) => logger.info(message, { ...defaultMeta, ...meta }),
    warn: (message: string, meta?: LogMeta) => logger.warn(message, { ...defaultMeta, ...meta }),
    error: (message: string, meta?: LogMeta) => logger.error(message, { ...defaultMeta, ...meta }),
  }),
};

export default logger;