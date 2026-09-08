import type { FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import BaseParentSelectorInput, {
  type ParentOption,
} from '@/presentation/components/parent-selector-input/BaseParentSelectorInput';
import { type FormControlledFieldProps } from '@/shared/types/FormFieldTypes';

type FormParentSelectorInputProps<TFieldValues extends FieldValues> =
  FormControlledFieldProps<TFieldValues> & {
    options: ParentOption[];
    modalTitle?: string;
    searchPlaceholder?: string;
    allowClear?: boolean;
  };

const FormParentSelectorInput = <TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  onChangeValue,
  options,
  modalTitle,
  searchPlaceholder,
  allowClear,
}: FormParentSelectorInputProps<TFieldValues>) => (
  <Controller
    control={control}
    name={name}
    render={({ field: { onChange, value }, fieldState: { error } }) => (
      <BaseParentSelectorInput
        value={typeof value === 'string' ? value : ''}
        onChangeText={selectedValue => {
          onChange(selectedValue);
          onChangeValue?.();
        }}
        options={options}
        label={label}
        placeholder={placeholder}
        errorMessage={error?.message}
        modalTitle={modalTitle}
        searchPlaceholder={searchPlaceholder}
        allowClear={allowClear}
      />
    )}
  />
);

export default FormParentSelectorInput;
