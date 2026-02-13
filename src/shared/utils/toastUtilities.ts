import Toast from 'react-native-toast-message';
import { CustomToastType } from '../types/CustomToastType';
import i18n, { TranslationKeys } from '@/core/i18n/i18n';
//TIMEOUT in milliseconds POR EL BUG de  un toast mientras la pantalla actual se está desmontando.
const TIMEOUT = 200;
export const toast: Record<CustomToastType, (msg: TranslationKeys) => void> = {
  info: msg => {
    setTimeout(() => {
      Toast.show({ type: 'info', text1: '¡Información!', text2: i18n.t(msg) });
    }, TIMEOUT);
  },
  success: msg => {
    setTimeout(() => {
      Toast.show({ type: 'success', text1: '¡Éxito!', text2: i18n.t(msg) });
    }, TIMEOUT);
  },
  error: msg => {
    setTimeout(() => {
      Toast.show({ type: 'error', text1: '¡Error!', text2: i18n.t(msg) });
    }, TIMEOUT);
  },
  warning: msg => {
    setTimeout(() => {
      Toast.show({
        type: 'warning',
        text1: '¡Advertencia!',
        text2: i18n.t(msg),
      });
    }, TIMEOUT);
  },
};
