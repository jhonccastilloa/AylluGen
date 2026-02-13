import type { FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import { type FormControlledFieldProps } from '@/shared/types/FormFieldTypes';
import BasePercentageInput, { BasePercentageInputProps } from './BasePercentageInput';

type FormPercentageInputProps<TFieldValues extends FieldValues> =
  FormControlledFieldProps<TFieldValues> &
    Omit<
      BasePercentageInputProps,
      'value' | 'onChangeText' | 'label' | 'placeholder' | 'errorMessage'
    >;

const FormPercentageInput = <TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  onChangeValue,
  ...percentageInputProps
}: FormPercentageInputProps<TFieldValues>) => (
  <Controller
    control={control}
    name={name}
    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
      <BasePercentageInput
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
        {...percentageInputProps}
      />
    )}
  />
);

export default FormPercentageInput;
