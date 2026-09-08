import BaseInput, { type BaseInputProps } from '../input/BaseInput';
import { sanitizeEmailValue } from '@/shared/utils/inputSanitizers';

export interface BaseEmailInputProps extends Omit<
  BaseInputProps,
  'onChangeText' | 'keyboardType'
> {
  onChangeText: (value: string) => void;
}

const BaseEmailInput = ({
  onChangeText,
  ...baseInputProps
}: BaseEmailInputProps) => (
  <BaseInput
    keyboardType="email-address"
    autoCapitalize="none"
    autoCorrect={false}
    onChangeText={text => onChangeText(sanitizeEmailValue(text))}
    {...baseInputProps}
  />
);

export default BaseEmailInput;
