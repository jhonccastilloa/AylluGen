import type { FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import BaseSexInput, {
  type AnimalSexValue,
} from '@/presentation/components/sex-input/BaseSexInput';
import { type FormControlledFieldProps } from '@/shared/types/FormFieldTypes';

type FormSexInputProps<TFieldValues extends FieldValues> =
  FormControlledFieldProps<TFieldValues> & {
    options?: { label: string; value: AnimalSexValue }[];
  };

const FormSexInput = <TFieldValues extends FieldValues>({
  control,
  name,
  label,
  onChangeValue,
  options,
}: FormSexInputProps<TFieldValues>) => (
  <Controller
    control={control}
    name={name}
    render={({ field: { onChange, value }, fieldState: { error } }) => (
      <BaseSexInput
        value={typeof value === 'string' ? (value as AnimalSexValue | '') : ''}
        onChange={selectedValue => {
          onChange(selectedValue);
          onChangeValue?.();
        }}
        label={label}
        errorMessage={error?.message}
        options={options}
      />
    )}
  />
);

export default FormSexInput;
