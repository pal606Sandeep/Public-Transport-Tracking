type Level = "INFO" | "WARN" | "ERROR";

const line = (level: Level, message: string, traceId?: string): string => {
  const id = traceId ? ` [traceId:${traceId}]` : "";
  return `[${new Date().toISOString()}] [${level}]${id} ${message}`;
};

const makeLogger = (traceId?: string) => {
  const logger = {
    info: (message: string): void => {
      console.log(line("INFO", message, traceId));
    },
    warn: (message: string): void => {
      console.warn(line("WARN", message, traceId));
    },
    error: (message: string): void => {
      console.error(line("ERROR", message, traceId));
    },
    child(nextTraceId: string) {
      return makeLogger(nextTraceId || traceId);
    },
  };
  return logger;
};

const logger = makeLogger();
export type Logger = ReturnType<typeof makeLogger>;

export default logger;
