import { loggerConfig } from "./logger.config";

const MAX_DEPTH = 10;
const MAX_ARRAY_LENGTH = 100;

type SanitizedValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | SanitizedValue[]
  | SanitizedObject;

interface SanitizedObject {
  [key: string]: SanitizedValue;
}

function isSensitiveKey(key: string): boolean {
  const normalizedKey = key.toLowerCase();
  return loggerConfig.sanitization.sensitiveKeys.some((sensitiveKey) =>
    normalizedKey.includes(sensitiveKey.toLowerCase()),
  );
}

export function sanitize(obj: unknown, depth = 0): SanitizedValue {
  if (depth > MAX_DEPTH) {
    return "[MAX_DEPTH_REACHED]";
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    return obj;
  }

  if (typeof obj === "number" || typeof obj === "boolean") {
    return obj;
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: loggerConfig.sanitization.enabled ? undefined : obj.stack,
    };
  }

  if (Array.isArray(obj)) {
    const sanitizedItems = obj.map((item) => sanitize(item, depth + 1));

    if (obj.length > MAX_ARRAY_LENGTH) {
      return sanitizedItems.slice(0, MAX_ARRAY_LENGTH).concat(
        `[...${obj.length - MAX_ARRAY_LENGTH} more items]`,
      );
    }

    return sanitizedItems;
  }

  if (typeof obj === "object") {
    const sanitized: SanitizedObject = {};
    const input = obj as Record<string, unknown>;

    for (const key of Object.keys(input)) {
      if (isSensitiveKey(key)) {
        sanitized[key] = loggerConfig.sanitization.replacement;
      } else {
        sanitized[key] = sanitize(input[key], depth + 1);
      }
    }

    return sanitized;
  }

  return String(obj);
}

export function sanitizeString(str: string): string {
  let result = str;
  loggerConfig.sanitization.sensitiveKeys.forEach((key) => {
    const regex = new RegExp(
      `(["']${key}["']\\s*:\\s*["'])([^"']+)(["'])`,
      "gi",
    );
    result = result.replace(
      regex,
      `$1${loggerConfig.sanitization.replacement}$3`,
    );
  });
  return result;
}
