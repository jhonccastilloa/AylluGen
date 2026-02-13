import i18n, { PostProcessorModule } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import es from './locales/es.json';
// import zh from './locales/zh.json'; // chino simplificado
// import pt from './locales/pt.json'; // portugués
// import ar from './locales/ar.json'; // árabe
// import fr from './locales/fr.json'; // francés
import ay from './locales/ay.json'; // aymara
import qu from './locales/qu.json'; // quechua
import StorageAdapter from '../storage/StorageAdapter';

export const resources = {
  // en: {
  //   translation: en,
  // },
  es: {
    translation: es,
  },
  // zh: {
  //   translation: zh,
  // },
  // pt: {
  //   translation: pt,
  // },
  // ar: {
  //   translation: ar,
  // },
  // fr: {
  //   translation: fr,
  // },
  ay: {
    translation: ay,
  },
  qu: {
    translation: qu,
  },
} as const;
const lowercaseProcessor: PostProcessorModule = {
  type: 'postProcessor',
  name: 'lowercase',
  process: (value: string) => value.toLowerCase(),
};

const uppercaseProcessor: PostProcessorModule = {
  type: 'postProcessor',
  name: 'uppercase',
  process: (value: string) => value.toUpperCase(),
};

const capitalizeProcessor: PostProcessorModule = {
  type: 'postProcessor',
  name: 'capitalize',
  process: (value: string) =>
    value.charAt(0).toUpperCase() + value.slice(1).toLowerCase(),
};

export const initI18n = () => {
  const savedLanguage = StorageAdapter.getItem('language');
  const defaultLang = savedLanguage || 'en';

  i18n
    .use(initReactI18next)
    .use(lowercaseProcessor)
    .use(uppercaseProcessor)
    .use(capitalizeProcessor)
    .init({
      lng: defaultLang,
      fallbackLng: 'en',
      debug: true,
      resources,
      interpolation: { escapeValue: false },
    });

  i18n.on('languageChanged', lng => {
    StorageAdapter.setItem('language', lng);
  });

  return i18n;
};

type Leaves<T> = T extends object
  ? {
      [K in keyof T]: `${Exclude<K, symbol>}${Leaves<T[K]> extends never
        ? ''
        : `.${Leaves<T[K]>}`}`;
    }[keyof T]
  : never;

export type TranslationKeys = Leaves<(typeof resources)['es']['translation']>;

export type SupportedLanguage = keyof typeof resources;
export const supportedLanguages = Object.keys(resources) as SupportedLanguage[];
export default i18n;
