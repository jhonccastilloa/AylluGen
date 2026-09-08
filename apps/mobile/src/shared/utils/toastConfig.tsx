import { ToastProps } from 'react-native-toast-message';
import { JSX } from 'react';
import { CustomToastType } from '../types/CustomToastType';
import CustomToast from '@/presentation/components/CustomToast';

const toastConfig: Record<CustomToastType, (props: ToastProps) => JSX.Element> =
  {
    success: (props: ToastProps) => <CustomToast {...props} type="success" />,
    error: (props: ToastProps) => <CustomToast {...props} type="error" />,
    info: (props: ToastProps) => <CustomToast {...props} type="info" />,
    warning: (props: ToastProps) => <CustomToast {...props} type="warning" />,
  };

export default toastConfig;
