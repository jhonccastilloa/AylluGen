import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import type { KeyboardTypeOptions, TextInputProps } from 'react-native';
import BaseInput from './BaseInput';

interface FormInputProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  sanitizeValue?: (value: string) => string;
  onChangeValue?: () => void;
}

const FormInput = <TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  secureTextEntry = false,
  keyboardType,
  maxLength,
  autoCapitalize = 'none',
  sanitizeValue,
  onChangeValue,
}: FormInputProps<TFieldValues>) => (
  <Controller
    control={control}
    name={name}
    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
      <BaseInput
        value={
          typeof value === 'string' ? value : value == null ? '' : String(value)
        }
        onBlur={onBlur}
        onChangeText={text => {
          const normalizedValue = sanitizeValue ? sanitizeValue(text) : text;
          onChange(normalizedValue);
          onChangeValue?.();
        }}
        label={label}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        errorMessage={error?.message}
      />
    )}
  />
);

export default FormInput;
