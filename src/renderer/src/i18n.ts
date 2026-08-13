export type AppLocale = 'tr' | 'en';

export const UI_LOCALE_STORAGE_KEY = 'ggl.ui.locale.v1';

export function parseAppLocale(value: unknown): AppLocale | undefined {
  return value === 'tr' || value === 'en' ? value : undefined;
}

export function resolveInitialAppLocale(
  storedLocale: unknown,
  preferredLanguages: readonly string[]
): AppLocale {
  const stored = parseAppLocale(storedLocale);
  if (stored) return stored;
  return preferredLanguages.some((language) => language.toLocaleLowerCase('en-US').startsWith('tr'))
    ? 'tr'
    : 'en';
}

export function appLocaleTag(locale: AppLocale): 'tr-TR' | 'en-US' {
  return locale === 'tr' ? 'tr-TR' : 'en-US';
}

const trMessages = {
  'app.title': 'Geometrik Gözlem Laboratuvarı',
  'app.brand': 'GEOMETRİK GÖZLEM LABORATUVARI',
  'calculation.busy': 'Hesaplanıyor…',
  'calculation.ready': 'Hesaplama hazır',
  'action.textSetup': 'Metinden Hazırla',
  'action.aiAnalysis': 'AI ile Analiz',
  'action.aiGuide': 'AI Kılavuzu',
  'action.dataManager': 'Veri Yöneticisi',
  'action.settings': 'Ayarlar',
  'action.settingsUnavailable': 'Ayarlar modülü sonraki aşamada',
  'action.help': 'Yardım',
  'language.label': 'Uygulama dili',
  'language.tr': 'Türkçe',
  'language.en': 'English',
  'error.rootMissing': 'Uygulama kök elemanı bulunamadı.',
  'ai.waitCalculation': 'Hesaplama tamamlanmadan AI paketi hazırlanmadı.',
  'ai.waitUncertainty': 'Model girdi belirsizliği hesabı tamamlanmadan AI paketi hazırlanmadı.'
} as const;

export type TranslationKey = keyof typeof trMessages;

const enMessages: Record<TranslationKey, string> = {
  'app.title': 'Geometric Observation Laboratory',
  'app.brand': 'GEOMETRIC OBSERVATION LABORATORY',
  'calculation.busy': 'Calculating…',
  'calculation.ready': 'Calculation ready',
  'action.textSetup': 'Prepare from Text',
  'action.aiAnalysis': 'Analyze with AI',
  'action.aiGuide': 'AI Guide',
  'action.dataManager': 'Data Manager',
  'action.settings': 'Settings',
  'action.settingsUnavailable': 'Settings module will be added in a later stage',
  'action.help': 'Help',
  'language.label': 'Application language',
  'language.tr': 'Türkçe',
  'language.en': 'English',
  'error.rootMissing': 'Application root element was not found.',
  'ai.waitCalculation': 'The AI package was not prepared before the calculation finished.',
  'ai.waitUncertainty': 'The AI package was not prepared before model-input uncertainty finished.'
};

export function translate(locale: AppLocale, key: TranslationKey): string {
  return locale === 'tr' ? trMessages[key] : enMessages[key];
}
