import type { Control, FieldPath, FieldValues } from 'react-hook-form';

export interface FormControlledFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  placeholder?: string;
  onChangeValue?: () => void;
}
