#!/usr/bin/env python3
"""Add the first TR/EN UI localization foundation slice.

Temporary helper: remove before merge. This slice intentionally localizes only the
application shell and language selection. Domain/protocol/storage strings are not
rewritten here; broader UI/help/report translation follows in separate PRs.
"""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    if text.count(old) != 1:
        fail(f"expected exactly one marker in {path.relative_to(ROOT)}: {old[:120]!r}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


i18n = ROOT / "src/renderer/src/i18n.ts"
i18n.write_text("""export type AppLocale = 'tr' | 'en';

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
""", encoding="utf-8")

provider = ROOT / "src/renderer/src/I18nProvider.tsx"
provider.write_text("""import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
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
""", encoding="utf-8")

main = ROOT / "src/renderer/src/main.tsx"
replace_once(
    main,
    "import { AppNext } from './AppNext';\n",
    "import { AppNext } from './AppNext';\nimport { I18nProvider } from './I18nProvider';\nimport { UI_LOCALE_STORAGE_KEY, resolveInitialAppLocale, translate } from './i18n';\n"
)
replace_once(
    main,
    """const root = document.getElementById('root');

if (!root) {
  throw new Error('Uygulama kök elemanı bulunamadı.');
}

createRoot(root).render(
  <StrictMode>
    <AppNext />
  </StrictMode>
);
""",
    """const storedLocale = (() => {
  try {
    return window.localStorage.getItem(UI_LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
})();
const preferredLanguages = navigator.languages.length > 0
  ? navigator.languages
  : [navigator.language];
const initialLocale = resolveInitialAppLocale(storedLocale, preferredLanguages);
document.documentElement.lang = initialLocale;
document.title = translate(initialLocale, 'app.title');

const root = document.getElementById('root');

if (!root) {
  throw new Error(translate(initialLocale, 'error.rootMissing'));
}

createRoot(root).render(
  <StrictMode>
    <I18nProvider initialLocale={initialLocale}>
      <AppNext />
    </I18nProvider>
  </StrictMode>
);
"""
)

app = ROOT / "src/renderer/src/AppNext.tsx"
replace_once(
    app,
    "import { StellarObservationPanel } from './StellarObservationPanel';\n",
    "import { StellarObservationPanel } from './StellarObservationPanel';\nimport { useI18n } from './I18nProvider';\n"
)
replace_once(
    app,
    "export function AppNext(): React.JSX.Element {\n",
    "export function AppNext(): React.JSX.Element {\n  const { locale, setLocale, t } = useI18n();\n"
)
replace_once(app, "<strong>GEOMETRİK GÖZLEM LABORATUVARI</strong>", "<strong>{t('app.brand')}</strong>")
replace_once(
    app,
    "{isCalculating ? 'Hesaplanıyor…' : 'Hesaplama hazır'}",
    "{isCalculating ? t('calculation.busy') : t('calculation.ready')}"
)
replace_once(app, ">✦ Metinden Hazırla</button>", ">✦ {t('action.textSetup')}</button>")
replace_once(
    app,
    "setStorageMessage('Hesaplama tamamlanmadan AI paketi hazırlanmadı.');",
    "setStorageMessage(t('ai.waitCalculation'));"
)
replace_once(
    app,
    "setStorageMessage('Model girdi belirsizliği hesabı tamamlanmadan AI paketi hazırlanmadı.');",
    "setStorageMessage(t('ai.waitUncertainty'));"
)
replace_once(app, ">◇ AI ile Analiz</button>", ">◇ {t('action.aiAnalysis')}</button>")
replace_once(app, ">▧ AI Kılavuzu</button>", ">▧ {t('action.aiGuide')}</button>")
replace_once(app, ">▤ Veri Yöneticisi</button>", ">▤ {t('action.dataManager')}</button>")
replace_once(
    app,
    "<button disabled title=\"Ayarlar modülü sonraki aşamada\" type=\"button\">⚙ Ayarlar</button>",
    "<button disabled title={t('action.settingsUnavailable')} type=\"button\">⚙ {t('action.settings')}</button>"
)
replace_once(app, ">ⓘ Yardım</button>", ">ⓘ {t('action.help')}</button>")
replace_once(
    app,
    """        <div className="top-actions">
          <button type="button" onClick={() => {
""",
    """        <div className="top-actions">
          <div className="language-switch" role="group" aria-label={t('language.label')}>
            <button
              aria-pressed={locale === 'tr'}
              className={locale === 'tr' ? 'active' : ''}
              title={t('language.tr')}
              type="button"
              onClick={() => setLocale('tr')}
            >TR</button>
            <button
              aria-pressed={locale === 'en'}
              className={locale === 'en' ? 'active' : ''}
              title={t('language.en')}
              type="button"
              onClick={() => setLocale('en')}
            >EN</button>
          </div>
          <button type="button" onClick={() => {
"""
)

styles = ROOT / "src/renderer/src/styles.css"
replace_once(
    styles,
    ".top-actions button { color: #c5d0da; font-size: 12px; }\n",
    """.top-actions button { color: #c5d0da; font-size: 12px; }
.language-switch { display: inline-flex; align-items: center; gap: 2px; padding: 2px; border: 1px solid #2a3c4b; border-radius: 4px; background: #0c1822; }
.top-actions .language-switch button { min-width: 30px; padding: 3px 6px; border-radius: 3px; color: #8497a8; }
.top-actions .language-switch button.active { background: #204d88; color: #f0f6fb; }
"""
)

test = ROOT / "tests/i18n.test.ts"
test.write_text("""import { describe, expect, it } from 'vitest';
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
""", encoding="utf-8")

doc = ROOT / "docs/localization.md"
doc.write_text("""# TR/EN localization architecture

GGL supports Turkish and English as user-interface languages. Localization is introduced in small functional slices so protocol, persistence and deterministic calculation semantics are never mixed with presentation translation.

## Language selection

- An explicit user choice is persisted under the UI-only key `ggl.ui.locale.v1`.
- A persisted valid choice wins over operating-system/browser language detection.
- Without a persisted choice, Turkish (`tr-*`) systems start in Turkish; all other systems start in English.
- The application shell exposes explicit `TR` / `EN` controls.
- `document.documentElement.lang` and the window document title follow the active locale.
- If localStorage is unavailable, the application continues to work; only preference persistence is lost.

## Non-localizable contracts

The following are language-invariant and must not be translated:

- `GGL-AI-TEST v1`, `GGL-AI-ANALYSIS v1`, `GGL-AI-COMPARISON v1` headers/end markers and canonical keys/enum values,
- `ai-follow-up-lineage v1`, SHA-256 inputs and canonical serialization,
- portable/local JSON schema identifiers, versions and storage field names,
- scenario/model IDs, units used by machine contracts and persisted enum values,
- deterministic numeric/physical calculation semantics.

Human-readable descriptions around those contracts may be localized, but machine-readable protocol text must remain byte/semantic compatible.

## Delivery slices

1. Foundation: typed `tr`/`en` locale, OS fallback, persisted explicit switch, document language/title and top application shell.
2. Navigation and core experiment panels, including locale-aware human number/date formatting.
3. Specialized observation/calibration/terrain/astronomy panels and dialogs.
4. Help catalog, AI workflow guidance and user-facing validation/error explanations while canonical AI blocks remain invariant.
5. HTML reports and public documentation, followed by a final untranslated-string audit.

The localization stage is complete only after both languages cover all user-facing application/report/help surfaces; the foundation PR by itself is intentionally partial.
""", encoding="utf-8")

print("TR/EN i18n foundation applied successfully.")
print("Created:")
for path in [i18n, provider, test, doc]:
    print(f"  - {path.relative_to(ROOT)}")
print("Updated:")
for path in [main, app, styles]:
    print(f"  - {path.relative_to(ROOT)}")
