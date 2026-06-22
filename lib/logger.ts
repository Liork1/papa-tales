type LogLevel = "info" | "warn" | "error";
type ServiceName = "api" | "ai" | "db";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: ServiceName;
  action: string;
  duration_ms?: number;
  error?: string;
  [key: string]: unknown;
}

const ENABLED = process.env.ENABLE_LOGGING !== "false";
const MIN_LEVEL = process.env.LOG_LEVEL ?? "info";

const LEVELS: Record<LogLevel, number> = { info: 0, warn: 1, error: 2 };

function shouldLog(level: LogLevel): boolean {
  return ENABLED && LEVELS[level] >= LEVELS[(MIN_LEVEL as LogLevel) ?? "info"];
}

function log(
  level: LogLevel,
  service: ServiceName,
  action: string,
  extra?: Record<string, unknown>
): void {
  if (!shouldLog(level)) return;
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    service,
    action,
    ...extra,
  };
  const out = level === "error" ? console.error : console.log;
  out(JSON.stringify(entry));
}

export const logger = {
  info: (service: ServiceName, action: string, extra?: Record<string, unknown>) =>
    log("info", service, action, extra),
  warn: (service: ServiceName, action: string, extra?: Record<string, unknown>) =>
    log("warn", service, action, extra),
  error: (service: ServiceName, action: string, extra?: Record<string, unknown>) =>
    log("error", service, action, extra),
};
