import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import vi from './locales/vi.json';
import en from './locales/en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { vi: { translation: vi }, en: { translation: en } },
    fallbackLng: 'vi',
    supportedLngs: ['vi', 'en'],
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  });

// Keep <html lang> in sync so the correct font is applied.
i18n.on('languageChanged', (lng) => {
  document.documentElement.setAttribute('lang', lng);
});
document.documentElement.setAttribute('lang', i18n.language || 'vi');

export default i18n;
