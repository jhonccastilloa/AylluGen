import type { FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import BaseDniInput, {
  type BaseDniInputProps,
} from '@/presentation/components/dni-input/BaseDniInput';
import { type FormControlledFieldProps } from '@/shared/types/FormFieldTypes';

type FormDniInputProps<TFieldValues extends FieldValues> =
  FormControlledFieldProps<TFieldValues> &
    Omit<
      BaseDniInputProps,
      'value' | 'onChangeText' | 'label' | 'placeholder' | 'errorMessage'
    >;

const FormDniInput = <TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  onChangeValue,
  ...dniInputProps
}: FormDniInputProps<TFieldValues>) => (
  <Controller
    control={control}
    name={name}
    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
      <BaseDniInput
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
        {...dniInputProps}
      />
    )}
  />
);

export default FormDniInput;
