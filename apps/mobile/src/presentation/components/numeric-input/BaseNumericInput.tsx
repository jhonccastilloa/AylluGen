import BaseInput, { type BaseInputProps } from '../input/BaseInput';
import { sanitizeNumericValue } from '@/shared/utils/inputSanitizers';

export interface BaseNumericInputProps extends Omit<
  BaseInputProps,
  'onChangeText' | 'keyboardType'
> {
  onChangeText: (value: string) => void;
  allowDecimal?: boolean;
  maxDecimals?: number;
  allowNegative?: boolean;
}

const BaseNumericInput = ({
  onChangeText,
  allowDecimal = false,
  maxDecimals = 2,
  allowNegative = false,
  ...baseInputProps
}: BaseNumericInputProps) => (
  <BaseInput
    keyboardType={allowDecimal ? 'decimal-pad' : 'number-pad'}
    onChangeText={text => {
      const sanitizedValue = sanitizeNumericValue(text, {
        allowDecimal,
        maxDecimals,
        allowNegative,
      });
      onChangeText(sanitizedValue);
    }}
    {...baseInputProps}
  />
);

export default BaseNumericInput;
