'use client';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import fr from './fr';
import en from './en';

if (!i18n.isInitialized) {
  i18n.use(LanguageDetector).use(initReactI18next).init({
    resources: { fr, en },
    fallbackLng: 'fr',
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  });
}

export default i18n;
export const changeLanguage = (lang: string) => i18n.changeLanguage(lang);
export const LANGUAGES = ['fr', 'en'] as const;
