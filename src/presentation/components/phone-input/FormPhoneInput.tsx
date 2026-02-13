import type { FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import BasePhoneInput, {
  type BasePhoneInputProps,
} from '@/presentation/components/phone-input/BasePhoneInput';
import { type FormControlledFieldProps } from '@/shared/types/FormFieldTypes';

type FormPhoneInputProps<TFieldValues extends FieldValues> =
  FormControlledFieldProps<TFieldValues> &
    Omit<
      BasePhoneInputProps,
      'value' | 'onChangeText' | 'label' | 'placeholder' | 'errorMessage'
    >;

const FormPhoneInput = <TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  onChangeValue,
  ...phoneInputProps
}: FormPhoneInputProps<TFieldValues>) => (
  <Controller
    control={control}
    name={name}
    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
      <BasePhoneInput
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
        {...phoneInputProps}
      />
    )}
  />
);

export default FormPhoneInput;
