interface SanitizeNumericOptions {
  allowDecimal?: boolean;
  maxDecimals?: number;
  allowNegative?: boolean;
}

export const sanitizeNumericValue = (
  rawValue: string,
  options: SanitizeNumericOptions = {},
): string => {
  const {
    allowDecimal = false,
    maxDecimals = 2,
    allowNegative = false,
  } = options;

  if (!rawValue) {
    return '';
  }

  let value = rawValue.replace(',', '.').replace(/\s/g, '');
  value = allowDecimal
    ? value.replace(/[^\d.-]/g, '')
    : value.replace(/[^\d-]/g, '');

  if (allowNegative) {
    value = value.replace(/(?!^)-/g, '');
  } else {
    value = value.replace(/-/g, '');
  }

  if (!allowDecimal) {
    return value;
  }

  if (value.startsWith('.')) {
    value = `0${value}`;
  }

  if (value.startsWith('-.')) {
    value = value.replace('-.', '-0.');
  }

  const firstDotIndex = value.indexOf('.');
  if (firstDotIndex === -1) {
    return value;
  }

  const integerPart = value.slice(0, firstDotIndex);
  const decimalPartRaw = value.slice(firstDotIndex + 1).replace(/\./g, '');
  const safeMaxDecimals = Math.max(0, maxDecimals);

  if (safeMaxDecimals === 0) {
    return integerPart;
  }

  const decimalPart = decimalPartRaw.slice(0, safeMaxDecimals);
  return `${integerPart}.${decimalPart}`;
};

export const clampNumericString = (
  value: string,
  min: number,
  max: number,
): string => {
  if (value === '' || value === '-' || value === '.' || value === '-.') {
    return value;
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return '';
  }

  const clampedValue = Math.min(max, Math.max(min, numericValue));
  return `${clampedValue}`;
};

export const sanitizeEmailValue = (rawValue: string): string =>
  rawValue.replace(/\s/g, '').toLowerCase();

export const sanitizeBirthDateValue = (rawValue: string): string => {
  const digits = rawValue.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};
