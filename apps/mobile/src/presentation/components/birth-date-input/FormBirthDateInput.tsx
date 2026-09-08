import type { FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import BaseBirthDateInput, {
  type BaseBirthDateInputProps,
} from '@/presentation/components/birth-date-input/BaseBirthDateInput';
import { type FormControlledFieldProps } from '@/shared/types/FormFieldTypes';

type FormBirthDateInputProps<TFieldValues extends FieldValues> =
  FormControlledFieldProps<TFieldValues> &
    Omit<
      BaseBirthDateInputProps,
      'value' | 'onChangeText' | 'label' | 'placeholder' | 'errorMessage'
    >;

const FormBirthDateInput = <TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  onChangeValue,
  ...birthDateInputProps
}: FormBirthDateInputProps<TFieldValues>) => (
  <Controller
    control={control}
    name={name}
    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
      <BaseBirthDateInput
        value={
          typeof value === 'string' ? value : value == null ? '' : String(value)
        }
        onBlur={onBlur}
        onChangeText={text => {
          onChange(text);
          onChangeValue?.();
        }}
        label={label}
        placeholder={placeholder}
        errorMessage={error?.message}
        {...birthDateInputProps}
      />
    )}
  />
);

export default FormBirthDateInput;
