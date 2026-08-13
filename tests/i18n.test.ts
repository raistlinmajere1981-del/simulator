import { describe, expect, it } from 'vitest';
import {
  UI_LOCALE_STORAGE_KEY,
  appLocaleTag,
  parseAppLocale,
  resolveInitialAppLocale,
  translate
} from '../src/renderer/src/i18n';

describe('renderer i18n foundation', () => {
  it('uses a versioned UI-only locale preference key', () => {
    expect(UI_LOCALE_STORAGE_KEY).toBe('ggl.ui.locale.v1');
  });

  it('accepts only supported explicit locale values', () => {
    expect(parseAppLocale('tr')).toBe('tr');
    expect(parseAppLocale('en')).toBe('en');
    expect(parseAppLocale('tr-TR')).toBeUndefined();
    expect(parseAppLocale('de')).toBeUndefined();
  });

  it('lets an explicit persisted preference override operating-system languages', () => {
    expect(resolveInitialAppLocale('en', ['tr-TR', 'tr'])).toBe('en');
    expect(resolveInitialAppLocale('tr', ['en-US'])).toBe('tr');
  });

  it('defaults Turkish systems to Turkish when no explicit preference exists', () => {
    expect(resolveInitialAppLocale(null, ['tr-TR', 'en-US'])).toBe('tr');
  });

  it('defaults non-Turkish systems to English', () => {
    expect(resolveInitialAppLocale(undefined, ['de-DE', 'en-US'])).toBe('en');
    expect(resolveInitialAppLocale('invalid', [])).toBe('en');
  });

  it('exposes locale tags and bilingual shell messages without changing protocol text', () => {
    expect(appLocaleTag('tr')).toBe('tr-TR');
    expect(appLocaleTag('en')).toBe('en-US');
    expect(translate('tr', 'action.dataManager')).toBe('Veri Yöneticisi');
    expect(translate('en', 'action.dataManager')).toBe('Data Manager');
  });
});
