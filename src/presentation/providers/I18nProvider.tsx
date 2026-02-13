import { initI18n } from '@/core/i18n/i18n';
import { ReactNode, useEffect } from 'react';

interface I18nProviderProps {
  children: ReactNode;
}
const I18nProvider = ({ children }: I18nProviderProps) => {
  useEffect(() => {
    initI18n();
  }, []);

  return <>{children}</>;
};

export default I18nProvider;
