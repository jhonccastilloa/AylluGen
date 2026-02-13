export const nowIso = () => new Date().toISOString();
export const nowTimestamp = () => Date.now();

export const normalizeOptionalIsoDate = (
  value?: string | null,
): string | null => {
  if (!value) return null;

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString();
};

export const isoToTimestamp = (value?: string | null): number | null => {
  if (!value) return null;
  const parsedDate = new Date(value);
  const timestamp = parsedDate.getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

export const timestampToIso = (
  value?: number | string | null,
): string | null => {
  if (value == null) return null;
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return null;
  return parsedDate.toISOString();
};

export const todayInputDate = (): string => new Date().toISOString().slice(0, 10);

export const inputDateToIso = (value: string): string | undefined => {
  if (!value.trim()) return undefined;
  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime())) return undefined;
  return parsedDate.toISOString();
};

export const toReadableDate = (value: string): string => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return value;
  return parsedDate.toLocaleDateString();
};
