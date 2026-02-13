import { sanitizeNumericValue } from '@/shared/utils/inputSanitizers';
import BaseInput, { BaseInputProps } from '../input/BaseInput';
export interface BaseDniInputProps extends Omit<
  BaseInputProps,
  'onChangeText' | 'keyboardType' | 'maxLength'
> {
  onChangeText: (value: string) => void;
  maxDigits?: number;
}

const BaseDniInput = ({
  onChangeText,
  maxDigits = 8,
  ...baseInputProps
}: BaseDniInputProps) => (
  <BaseInput
    keyboardType="number-pad"
    maxLength={maxDigits}
    onChangeText={text => {
      const normalizedValue = sanitizeNumericValue(text);
      onChangeText(normalizedValue.slice(0, maxDigits));
    }}
    {...baseInputProps}
  />
);

export default BaseDniInput;
