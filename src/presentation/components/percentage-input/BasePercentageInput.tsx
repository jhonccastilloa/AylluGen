import BaseInput, { BaseInputProps } from '../input/BaseInput';
import {
  clampNumericString,
  sanitizeNumericValue,
} from '@/shared/utils/inputSanitizers';

export interface BasePercentageInputProps extends Omit<
  BaseInputProps,
  'onChangeText' | 'keyboardType' | 'suffix'
> {
  onChangeText: (value: string) => void;
  maxDecimals?: number;
  min?: number;
  max?: number;
}

const BasePercentageInput = ({
  onChangeText,
  maxDecimals = 2,
  min = 0,
  max = 100,
  ...baseInputProps
}: BasePercentageInputProps) => (
  <BaseInput
    keyboardType="decimal-pad"
    suffix="%"
    onChangeText={text => {
      const normalizedValue = sanitizeNumericValue(text, {
        allowDecimal: true,
        maxDecimals,
        allowNegative: false,
      });
      const clampedValue = clampNumericString(normalizedValue, min, max);
      onChangeText(clampedValue);
    }}
    {...baseInputProps}
  />
);

export default BasePercentageInput;
