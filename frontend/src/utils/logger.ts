const format = (level: "INFO" | "WARN" | "ERROR", message: string): string => {
  return `[${new Date().toISOString()}] [${level}] ${message}`;
};

const logger = {
  info: (message: string): void => {
    console.log(format("INFO", message));
  },
  warn: (message: string): void => {
    console.warn(format("WARN", message));
  },
  error: (message: string): void => {
    console.error(format("ERROR", message));
  },
};

export default logger;
