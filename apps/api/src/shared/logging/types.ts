export interface LogMetadata {
  requestId?: string;
  userId?: string;
  service?: string;
  module?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  ip?: string;
  userAgent?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  requestId?: string;
  userId?: string;
  service?: string;
  module?: string;
  environment: string;
  host: string;
  pid: number;
  data?: LogMetadata;
  stack?: string;
}

export type LogLevel =
  | "error"
  | "warn"
  | "info"
  | "http"
  | "verbose"
  | "debug"
  | "silly";

export type LogFormat = "json" | "pretty";
