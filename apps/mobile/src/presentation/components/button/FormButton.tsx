import BaseButton, {
  type ButtonSize,
  type ButtonVariant,
} from '@/presentation/components/button/BaseButton';

interface FormButtonProps {
  label: string;
  loadingLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  onPress: () => void;
}

const FormButton = ({
  label,
  loadingLabel,
  loading = false,
  disabled = false,
  variant = 'default',
  size = 'default',
  fullWidth = true,
  onPress,
}: FormButtonProps) => {
  const resolvedLabel = loading ? loadingLabel || label : label;

  return (
    <BaseButton
      label={resolvedLabel}
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      variant={variant}
      size={size}
      fullWidth={fullWidth}
    />
  );
};

export default FormButton;
