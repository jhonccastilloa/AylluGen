import type { FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import BaseCurrencyInput, {
  type BaseCurrencyInputProps,
} from '@/presentation/components/currency-input/BaseCurrencyInput';
import { type FormControlledFieldProps } from '@/shared/types/FormFieldTypes';

type FormCurrencyInputProps<TFieldValues extends FieldValues> =
  FormControlledFieldProps<TFieldValues> &
    Omit<
      BaseCurrencyInputProps,
      'value' | 'onChangeText' | 'label' | 'placeholder' | 'errorMessage'
    >;

const FormCurrencyInput = <TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  onChangeValue,
  ...currencyInputProps
}: FormCurrencyInputProps<TFieldValues>) => (
  <Controller
    control={control}
    name={name}
    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
      <BaseCurrencyInput
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
        {...currencyInputProps}
      />
    )}
  />
);

export default FormCurrencyInput;
