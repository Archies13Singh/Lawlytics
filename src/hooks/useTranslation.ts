import { useLanguage } from '@/contexts/LanguageContext';
import { translations, TranslationKey, Language } from '@/utils/translations';

export const useTranslation = () => {
  const { language } = useLanguage();

  const t = (key: TranslationKey): string => {
    const currentLang = language as Language;
    return translations[currentLang]?.[key] || translations.en[key] || key;
  };

  return { t, language };
};
