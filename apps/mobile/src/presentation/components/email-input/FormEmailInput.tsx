import type { FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import BaseEmailInput, {
  type BaseEmailInputProps,
} from '@/presentation/components/email-input/BaseEmailInput';
import { type FormControlledFieldProps } from '@/shared/types/FormFieldTypes';

type FormEmailInputProps<TFieldValues extends FieldValues> =
  FormControlledFieldProps<TFieldValues> &
    Omit<
      BaseEmailInputProps,
      'value' | 'onChangeText' | 'label' | 'placeholder' | 'errorMessage'
    >;

const FormEmailInput = <TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  onChangeValue,
  ...emailInputProps
}: FormEmailInputProps<TFieldValues>) => (
  <Controller
    control={control}
    name={name}
    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
      <BaseEmailInput
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
        {...emailInputProps}
      />
    )}
  />
);

export default FormEmailInput;
