import BaseInput, { BaseInputProps } from '../input/BaseInput';
import { sanitizeNumericValue } from '@/shared/utils/inputSanitizers';

export interface BasePhoneInputProps extends Omit<
  BaseInputProps,
  'onChangeText' | 'keyboardType'
> {
  onChangeText: (value: string) => void;
  maxDigits?: number;
}

const BasePhoneInput = ({
  onChangeText,
  maxDigits = 15,
  ...baseInputProps
}: BasePhoneInputProps) => (
  <BaseInput
    keyboardType="phone-pad"
    onChangeText={text => {
      const normalizedValue = sanitizeNumericValue(text);
      onChangeText(normalizedValue.slice(0, maxDigits));
    }}
    {...baseInputProps}
  />
);

export default BasePhoneInput;
