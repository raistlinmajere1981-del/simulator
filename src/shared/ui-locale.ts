export type UiLocale = 'tr' | 'en';

export function normalizeUiLocale(value: unknown): UiLocale {
  return value === 'en' ? 'en' : 'tr';
}

export function uiLocaleTag(locale: UiLocale): 'tr-TR' | 'en-US' {
  return locale === 'en' ? 'en-US' : 'tr-TR';
}
