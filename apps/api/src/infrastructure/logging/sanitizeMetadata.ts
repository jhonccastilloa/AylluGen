const sensitiveKeys = [
  "password",
  "pwd",
  "token",
  "secret",
  "apiKey",
  "authorization",
  "cookie",
  "creditCard",
  "ssn",
  "dni",
  "email",
];

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
  return sensitiveKeys.some((sensitiveKey) =>
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
    return obj.length > 4096 ? `${obj.slice(0, 4096)}[TRUNCATED]` : obj;
  }

  if (typeof obj === "number" || typeof obj === "boolean") {
    return obj;
  }

  if (obj instanceof Date) {
    return Number.isNaN(obj.getTime()) ? "[INVALID_DATE]" : obj.toISOString();
  }

  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: "[ERROR_DETAILS_OMITTED]",
    };
  }

  if (Array.isArray(obj)) {
    const sanitizedItems = obj
      .slice(0, MAX_ARRAY_LENGTH)
      .map((item) => sanitize(item, depth + 1));

    if (obj.length > MAX_ARRAY_LENGTH) {
      return sanitizedItems.concat(
        `[...${obj.length - MAX_ARRAY_LENGTH} more items]`,
      );
    }

    return sanitizedItems;
  }

  if (typeof obj === "object") {
    const sanitized: SanitizedObject = Object.create(null);
    const input = obj as Record<string, unknown>;

    for (const key of Object.keys(input)) {
      if (isSensitiveKey(key)) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = sanitize(input[key], depth + 1);
      }
    }

    return sanitized;
  }

  return String(obj);
}
