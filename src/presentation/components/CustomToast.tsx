import { BaseToast, ToastProps } from 'react-native-toast-message';
import { View } from 'react-native';
import { CustomToastType } from '@/shared/types/CustomToastType';
import { IconName } from './appIcon/iconRegistry';
import { ColorTheme } from '@/core/constants/theme';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import AppIcon from './appIcon/AppIcon';

interface CustomToastProps extends ToastProps {
  type: CustomToastType;
}

const toastIcons: Record<CustomToastType, IconName> = {
  success: 'toastSuccess',
  error: 'toastError',
  info: 'toastInfo',
  warning: 'toastWarning',
};
const colors: Record<CustomToastType, ColorTheme> = {
  success: 'success',
  error: 'error',
  info: 'info',
  warning: 'warning',
};

const styles = StyleSheet.create(appTheme => ({
  container: {
    backgroundColor: appTheme.colors.background,
    borderLeftWidth: appTheme.spacing.sm + appTheme.spacing.xs / 2,
  },
  iconContainer: {
    justifyContent: 'center',
    paddingRight: appTheme.spacing.md,
  },
}));

const CustomToast = (props: CustomToastProps) => {
  const { type } = props;
  const { theme } = useUnistyles();

  return (
    <BaseToast
      {...props}
      style={[
        styles.container,
        {
          borderLeftColor: theme.colors[colors[type]],
        },
      ]}
      text1Style={{ color: theme.colors[colors[type]] }}
      text2Style={{ color: theme.colors.primary }}
      renderTrailingIcon={() => (
        <View style={styles.iconContainer}>
          <AppIcon name={toastIcons[type]} color={colors[type]} />
        </View>
      )}
    />
  );
};

export default CustomToast;
