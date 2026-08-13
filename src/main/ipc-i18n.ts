import {
  normalizeUiLocale,
  type UiLocale
} from '../shared/ui-locale';

export function resolveIpcLocale(value: unknown): UiLocale {
  return normalizeUiLocale(value);
}

export function ipcText(locale: UiLocale, tr: string, en: string): string {
  return locale === 'en' ? en : tr;
}
