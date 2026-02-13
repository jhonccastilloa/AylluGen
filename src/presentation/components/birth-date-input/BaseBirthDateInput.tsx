import BaseDateInput from '@/presentation/components/date-input/BaseDateInput';
import type { BaseDateInputProps } from '@/presentation/components/date-input/BaseDateInput';

export interface BaseBirthDateInputProps extends Omit<
  BaseDateInputProps,
  'onChangeText'
> {
  onChangeText: (value: string) => void;
}

const BaseBirthDateInput = ({
  onChangeText,
  placeholder = 'YYYY-MM-DD',
  ...baseInputProps
}: BaseBirthDateInputProps) => (
  <BaseDateInput
    placeholder={placeholder}
    onChangeText={onChangeText}
    {...baseInputProps}
  />
);

export default BaseBirthDateInput;
