import type { FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import BaseNumericInput, {
  type BaseNumericInputProps,
} from '@/presentation/components/numeric-input/BaseNumericInput';
import { type FormControlledFieldProps } from '@/shared/types/FormFieldTypes';

type FormNumericInputProps<TFieldValues extends FieldValues> =
  FormControlledFieldProps<TFieldValues> &
    Omit<
      BaseNumericInputProps,
      'value' | 'onChangeText' | 'label' | 'placeholder' | 'errorMessage'
    >;

const FormNumericInput = <TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  onChangeValue,
  ...numericInputProps
}: FormNumericInputProps<TFieldValues>) => (
  <Controller
    control={control}
    name={name}
    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
      <BaseNumericInput
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
        {...numericInputProps}
      />
    )}
  />
);

export default FormNumericInput;
