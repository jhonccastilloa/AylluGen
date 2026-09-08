import BaseInput, { type BaseInputProps } from '../input/BaseInput';
import { sanitizeNumericValue } from '@/shared/utils/inputSanitizers';

export interface BaseCurrencyInputProps extends Omit<
  BaseInputProps,
  'onChangeText' | 'keyboardType' | 'prefix'
> {
  onChangeText: (value: string) => void;
  currencySymbol?: string;
  maxDecimals?: number;
  allowNegative?: boolean;
}

const BaseCurrencyInput = ({
  onChangeText,
  currencySymbol = '$',
  maxDecimals = 2,
  allowNegative = false,
  ...baseInputProps
}: BaseCurrencyInputProps) => (
  <BaseInput
    keyboardType="decimal-pad"
    prefix={currencySymbol}
    onChangeText={text => {
      const normalizedValue = sanitizeNumericValue(text, {
        allowDecimal: true,
        maxDecimals,
        allowNegative,
      });
      onChangeText(normalizedValue);
    }}
    {...baseInputProps}
  />
);

export default BaseCurrencyInput;
