import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  UI_LOCALE_STORAGE_KEY,
  type AppLocale,
  type TranslationKey,
  translate
} from './i18n';

interface I18nContextValue {
  locale: AppLocale;
  setLocale(locale: AppLocale): void;
  t(key: TranslationKey): string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({
  initialLocale,
  children
}: {
  initialLocale: AppLocale;
  children: ReactNode;
}): React.JSX.Element {
  const [locale, setLocale] = useState<AppLocale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = translate(locale, 'app.title');
    try {
      window.localStorage.setItem(UI_LOCALE_STORAGE_KEY, locale);
    } catch {
      // A disabled/unavailable localStorage must not prevent the desktop UI from working.
    }
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale,
    t: (key) => translate(locale, key)
  }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider.');
  return value;
}
