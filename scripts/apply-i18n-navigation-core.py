#!/usr/bin/env python3
"""Localize navigation/scenario presentation on top of the TR/EN foundation.

Temporary helper: remove before merge.
"""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def read(path: Path) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


def require_once(path: Path, marker: str) -> str:
    text = read(path)
    if text.count(marker) != 1:
        fail(f"expected exactly one marker in {path.relative_to(ROOT)}: {marker[:100]!r}")
    return text


def replace_once(path: Path, old: str, new: str) -> None:
    text = require_once(path, old)
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def replace_count(path: Path, old: str, new: str, expected: int) -> None:
    text = read(path)
    if text.count(old) != expected:
        fail(
            f"expected {expected} occurrences in {path.relative_to(ROOT)}, "
            f"found {text.count(old)}: {old[:100]!r}"
        )
    path.write_text(text.replace(old, new), encoding="utf-8")


i18n = ROOT / "src/renderer/src/i18n.ts"
if "'sidebar.testScenarios'" in read(i18n):
    fail("navigation localization already appears to be applied")
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
  'ai.waitUncertainty': 'Model girdi belirsizliği hesabı tamamlanmadan AI paketi hazırlanmadı.',
  'common.reference': 'REFERANS',
  'common.soon': 'YAKINDA',
  'common.active': 'AKTİF',
  'common.ready': 'HAZIR',
  'sidebar.testScenarios': 'Test senaryoları',
  'sidebar.readyCount': '{ready} / {total} hazır',
  'sidebar.unavailableScenario': 'Bu deney henüz uygulanmadı',
  'sidebar.savedExperiments': 'Kaydedilen deneyler',
  'sidebar.savedCount': '{count} kayıt',
  'sidebar.noSaved': 'Henüz yerel kayıt yok.',
  'sidebar.models': 'Modeller',
  'sidebar.modelCount.sunMoon': '3 astronomik referans',
  'sidebar.modelCount.eclipse': '2 tutulma referansı',
  'sidebar.modelCount.singleAstronomy': '1 astronomik referans',
  'sidebar.modelCount.visibility': '2 fiziksel',
  'sidebar.includedInCalculation': 'Hesaplamaya dahil',
  'sidebar.visualLayers': 'Görsel katmanlar',
  'sidebar.astronomyNextSlice': 'astronomi · sonraki dilim',
  'sidebar.visualReadyCount': '4 / 5 hazır',
  'model.solarPosition': 'Güneş Konumu · Astronomik Referans',
  'model.lunarPosition': 'Ay Konumu ve Fazı · Astronomik Referans',
  'model.solarDayEvents': 'Gün Doğumu / Batımı · Astronomik Referans',
  'model.eclipseGeometry': 'Anlık Güneş–Ay Disk Geometrisi',
  'model.eclipseSearch': 'Yerel Tutulma Zaman Araması',
  'model.shadowGeometry': 'Gölge Geometrisi · Astronomik Referans',
  'model.stellarObservation': 'Yıldız Gözlemi · Astronomik Referans',
  'model.idealSphere': 'İdeal Küre',
  'model.definedPlane': 'Tanımlı Düzlem',
  'model.azimuthalProjection': 'Azimutal Projeksiyon',
  'model.toroidal': 'Toroidal Model',
  'model.concaveEarth': 'İçbükey Dünya',
  'visual.geographicBoundaries': 'Kıta / Ülke Sınırları',
  'visual.terrain': 'Topografya Görselleştirme',
  'visual.nightLights': 'Gece Işıkları',
  'visual.atmosphereProfile': 'Atmosfer Profili',
  'visual.grid': 'Izgara',
  'visual.terrainHorizonUnavailable': 'Ufuk Analizi yerel arazi profilini kullanmaz',
  'visual.terrainDescription': 'Arazi profili etkin olduğunda rota boyunca göreli yükselti şeridini gösterir',
  'visual.atmosphereEnabledDescription': 'Ölçülmüş atmosfer katmanlarını ve İdeal Küre optik ışın yolunu görselleştirir',
  'visual.atmosphereSelectProfile': 'Atmosfer Profili görsel katmanı için Katmanlı profil modunu seçin',
  'astronomy.placeholder.eclipse': 'Anlık Güneş–Ay disk geometrisi ve kullanıcı kontrollü yerel tutulma zaman penceresi ana deney alanında gösterilir.',
  'astronomy.placeholder.shadow': 'Gölge yön diyagramı ana deney panelinde gösterilir. Dünya modellerine fiziksel Güneş davranışı atanmaz.',
  'astronomy.placeholder.stellar': 'Katalog yıldızı, J2000→gözlem tarihi dönüşümü, geometrik yıldız izi ve isteğe bağlı yerel skyline ana deney alanında gösterilir.',
  'astronomy.placeholder.sunMoon': 'Güneş/Ay konumu ile günlük doğuş-batış zaman çizgisi ana deney alanında gösterilir; ek gökyüzü katmanları sonraki dilimlerde genişletilecektir.',
  'scenario.targetVisibility.label': 'Hedef Görünürlüğü',
  'scenario.targetVisibility.description': 'Belirli bir hedefin ne kadarının görünmesi gerektiğini ölçümle karşılaştırır.',
  'scenario.horizon.label': 'Ufuk Analizi',
  'scenario.horizon.description': 'Gözlemci kotu ve atmosfer varsayımından geometrik ufuk mesafesini hesaplar.',
  'scenario.longDistanceVisibility.label': 'Uzun Mesafe Görüş',
  'scenario.longDistanceVisibility.description': 'Aynı görünürlük motorunu rota, arazi ve uzak hedef bağlamını öne çıkaran ayrı bir iş akışında kullanır.',
  'scenario.sunMoon.label': 'Güneş ve Ay Gözlemleri',
  'scenario.sunMoon.description': 'Tarih, saat ve WGS84 gözlem konumundan Güneş ve Ay için ayrı astronomik referans sonuçları üretir.',
  'scenario.shadow.label': 'Gölge Deneyi',
  'scenario.shadow.description': 'Dikey gnomon gölgesinin uzunluk ve yönünü geometrik Güneş referansından hesaplar; isteğe bağlı saha ölçümünü belirsizliğiyle karşılaştırır.',
  'scenario.stellar.label': 'Yıldız Gözlemleri',
  'scenario.stellar.description': 'Çevrimdışı parlak yıldız kataloğundan seçilen yıldızın J2000 koordinatını gözlem tarihine dönüştürür; geometrik konum ve zaman içindeki yıldız izini hesaplar.',
  'scenario.eclipse.label': 'Tutulma Simülasyonları',
  'scenario.eclipse.description': 'Seçili gözlemci ve zaman için Güneş–Ay apparent disk geometrisini ve kullanıcı kontrollü yerel örtüşme zaman penceresini düşük hassasiyetli astronomik referansla inceler.',
  'scenario.readyMessage': '{scenario} senaryosu hazırlandı.',
  'experiment.newReady': 'Yeni deney hazırlandı.'
} as const;

export type TranslationKey = keyof typeof trMessages;
export type TranslationValues = Readonly<Record<string, string | number>>;

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
  'ai.waitUncertainty': 'The AI package was not prepared before model-input uncertainty finished.',
  'common.reference': 'REFERENCE',
  'common.soon': 'SOON',
  'common.active': 'ACTIVE',
  'common.ready': 'READY',
  'sidebar.testScenarios': 'Test scenarios',
  'sidebar.readyCount': '{ready} / {total} ready',
  'sidebar.unavailableScenario': 'This experiment is not implemented yet',
  'sidebar.savedExperiments': 'Saved experiments',
  'sidebar.savedCount': '{count} saved',
  'sidebar.noSaved': 'No local records yet.',
  'sidebar.models': 'Models',
  'sidebar.modelCount.sunMoon': '3 astronomical references',
  'sidebar.modelCount.eclipse': '2 eclipse references',
  'sidebar.modelCount.singleAstronomy': '1 astronomical reference',
  'sidebar.modelCount.visibility': '2 physical',
  'sidebar.includedInCalculation': 'Included in calculation',
  'sidebar.visualLayers': 'Visual layers',
  'sidebar.astronomyNextSlice': 'astronomy · next slice',
  'sidebar.visualReadyCount': '4 / 5 ready',
  'model.solarPosition': 'Solar Position · Astronomical Reference',
  'model.lunarPosition': 'Lunar Position and Phase · Astronomical Reference',
  'model.solarDayEvents': 'Sunrise / Sunset · Astronomical Reference',
  'model.eclipseGeometry': 'Instantaneous Sun–Moon Disk Geometry',
  'model.eclipseSearch': 'Local Eclipse Time Search',
  'model.shadowGeometry': 'Shadow Geometry · Astronomical Reference',
  'model.stellarObservation': 'Stellar Observation · Astronomical Reference',
  'model.idealSphere': 'Ideal Sphere',
  'model.definedPlane': 'Defined Plane',
  'model.azimuthalProjection': 'Azimuthal Projection',
  'model.toroidal': 'Toroidal Model',
  'model.concaveEarth': 'Concave Earth',
  'visual.geographicBoundaries': 'Continent / Country Boundaries',
  'visual.terrain': 'Topography Visualization',
  'visual.nightLights': 'Night Lights',
  'visual.atmosphereProfile': 'Atmosphere Profile',
  'visual.grid': 'Grid',
  'visual.terrainHorizonUnavailable': 'Horizon Analysis does not use the local terrain profile',
  'visual.terrainDescription': 'Shows the relative elevation strip along the route when the terrain profile is enabled',
  'visual.atmosphereEnabledDescription': 'Visualizes measured atmospheric layers and the Ideal Sphere optical ray path',
  'visual.atmosphereSelectProfile': 'Select Layered profile mode to enable the Atmosphere Profile visual layer',
  'astronomy.placeholder.eclipse': 'Instantaneous Sun–Moon disk geometry and the user-controlled local eclipse time window are shown in the main experiment area.',
  'astronomy.placeholder.shadow': 'The shadow-direction diagram is shown in the main experiment panel. Physical Sun behavior is not assigned to world models.',
  'astronomy.placeholder.stellar': 'The catalog star, J2000-to-observation-date transform, geometric star trail and optional local skyline are shown in the main experiment area.',
  'astronomy.placeholder.sunMoon': 'Sun/Moon position and the daily rise-set timeline are shown in the main experiment area; additional sky layers will be expanded in later slices.',
  'scenario.targetVisibility.label': 'Target Visibility',
  'scenario.targetVisibility.description': 'Compares the expected visible fraction of a specific target with the observation.',
  'scenario.horizon.label': 'Horizon Analysis',
  'scenario.horizon.description': 'Calculates geometric horizon distance from observer elevation and the atmosphere assumption.',
  'scenario.longDistanceVisibility.label': 'Long-Distance Visibility',
  'scenario.longDistanceVisibility.description': 'Uses the same visibility engine in a separate workflow emphasizing route, terrain and distant-target context.',
  'scenario.sunMoon.label': 'Sun and Moon Observations',
  'scenario.sunMoon.description': 'Produces separate astronomical reference results for the Sun and Moon from date, time and WGS84 observer location.',
  'scenario.shadow.label': 'Shadow Experiment',
  'scenario.shadow.description': 'Calculates vertical-gnomon shadow length and direction from the geometric Sun reference and optionally compares a field measurement with uncertainty.',
  'scenario.stellar.label': 'Stellar Observations',
  'scenario.stellar.description': 'Transforms a selected offline bright-star catalog entry from J2000 coordinates to the observation date and calculates geometric position and trail over time.',
  'scenario.eclipse.label': 'Eclipse Simulations',
  'scenario.eclipse.description': 'Examines apparent Sun–Moon disk geometry and a user-controlled local overlap time window using the low-precision astronomical reference.',
  'scenario.readyMessage': '{scenario} scenario is ready.',
  'experiment.newReady': 'New experiment is ready.'
};

export function translate(
  locale: AppLocale,
  key: TranslationKey,
  values?: TranslationValues
): string {
  const template = locale === 'tr' ? trMessages[key] : enMessages[key];
  if (!values) return template;
  return template.replace(/\\{([A-Za-z0-9_]+)\\}/g, (match, name: string) => (
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match
  ));
}
""", encoding="utf-8")

provider = ROOT / "src/renderer/src/I18nProvider.tsx"
if "type TranslationValues" in read(provider):
    fail("I18nProvider navigation update already appears to be applied")
provider.write_text("""import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import {
  UI_LOCALE_STORAGE_KEY,
  type AppLocale,
  type TranslationKey,
  type TranslationValues,
  translate
} from './i18n';

interface I18nContextValue {
  locale: AppLocale;
  setLocale(locale: AppLocale): void;
  t(key: TranslationKey, values?: TranslationValues): string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({
  initialLocale,
  children
}: {
  initialLocale: AppLocale;
  children: ReactNode;
}): React.JSX.Element {
  const [locale, setLocaleState] = useState<AppLocale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = translate(locale, 'app.title');
  }, [locale]);

  const setLocale = useCallback((nextLocale: AppLocale): void => {
    setLocaleState(nextLocale);
    try {
      window.localStorage.setItem(UI_LOCALE_STORAGE_KEY, nextLocale);
    } catch {
      // A disabled/unavailable localStorage must not prevent the desktop UI from working.
    }
  }, []);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale,
    t: (key, values) => translate(locale, key, values)
  }), [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider.');
  return value;
}
""", encoding="utf-8")

config = ROOT / "src/renderer/src/app/app-config.ts"
if "getScenarioPresentation" in read(config):
    fail("app-config localization already appears to be applied")
config.write_text("""import {
  ALL_SIMULATION_SCENARIOS,
  type SimulationScenarioId
} from '../../../shared/scenario';
import type { VerticalDatumKind } from '../../../shared/terrain';
import {
  appLocaleTag,
  translate,
  type AppLocale,
  type TranslationKey
} from '../i18n';

type ModelTone = 'green' | 'amber' | 'violet';
type ModelShape = 'globe' | 'disk' | 'gleason';

export interface ModelPresentation {
  tone: ModelTone;
  shape: ModelShape;
}

export interface ScenarioDefinition {
  id: SimulationScenarioId;
  icon: string;
  enabled: boolean;
}

export const scenarios: ScenarioDefinition[] = ALL_SIMULATION_SCENARIOS.map((scenario) => ({
  id: scenario.id,
  icon: scenario.icon,
  enabled: true
}));

const presentationByModelId: Record<string, ModelPresentation> = {
  'ideal-sphere': { tone: 'green', shape: 'globe' },
  'defined-plane': { tone: 'amber', shape: 'disk' },
  'azimuthal-projection': { tone: 'violet', shape: 'gleason' }
};

const scenarioTranslationKeys: Record<SimulationScenarioId, {
  label: TranslationKey;
  description: TranslationKey;
}> = {
  'target-visibility': {
    label: 'scenario.targetVisibility.label',
    description: 'scenario.targetVisibility.description'
  },
  horizon: {
    label: 'scenario.horizon.label',
    description: 'scenario.horizon.description'
  },
  'long-distance-visibility': {
    label: 'scenario.longDistanceVisibility.label',
    description: 'scenario.longDistanceVisibility.description'
  },
  'sun-moon-observation': {
    label: 'scenario.sunMoon.label',
    description: 'scenario.sunMoon.description'
  },
  'shadow-observation': {
    label: 'scenario.shadow.label',
    description: 'scenario.shadow.description'
  },
  'stellar-observation': {
    label: 'scenario.stellar.label',
    description: 'scenario.stellar.description'
  },
  'eclipse-simulation': {
    label: 'scenario.eclipse.label',
    description: 'scenario.eclipse.description'
  }
};

const sidebarModelTranslationKeys: Record<string, TranslationKey> = {
  'ideal-sphere': 'model.idealSphere',
  'defined-plane': 'model.definedPlane',
  'azimuthal-projection': 'model.azimuthalProjection'
};

export const datumLabels: Record<VerticalDatumKind, string> = {
  'orthometric-msl': 'Ortalama deniz seviyesi',
  'ellipsoidal-wgs84': 'WGS84 elipsoidal yükseklik',
  local: 'Yerel düşey referans'
};

export function getPresentation(modelId: string): ModelPresentation {
  return presentationByModelId[modelId] ?? { tone: 'violet', shape: 'gleason' };
}

export function getScenarioPresentation(
  locale: AppLocale,
  scenarioId: SimulationScenarioId
): { label: string; description: string } {
  const keys = scenarioTranslationKeys[scenarioId];
  return {
    label: translate(locale, keys.label),
    description: translate(locale, keys.description)
  };
}

export function getSidebarModelLabel(
  locale: AppLocale,
  modelId: string,
  fallbackLabel: string
): string {
  if (locale === 'tr') return fallbackLabel;
  const key = sidebarModelTranslationKeys[modelId];
  return key ? translate(locale, key) : fallbackLabel;
}

export function isAstronomyScenario(scenarioId: SimulationScenarioId): boolean {
  return scenarioId === 'sun-moon-observation' ||
    scenarioId === 'shadow-observation' ||
    scenarioId === 'stellar-observation' ||
    scenarioId === 'eclipse-simulation';
}

export function defaultExperimentName(
  scenarioId: SimulationScenarioId,
  locale: AppLocale = 'tr',
  now: Date = new Date()
): string {
  return `${getScenarioPresentation(locale, scenarioId).label} ${new Intl.DateTimeFormat(appLocaleTag(locale), {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(now)}`;
}
""", encoding="utf-8")

sidebar = ROOT / "src/renderer/src/app/AppSidebar.tsx"
if "useI18n" in read(sidebar):
    fail("AppSidebar localization already appears to be applied")
sidebar.write_text("""import { simulationModels } from '../../../models';
import type { AtmosphereMode } from '../../../shared/atmosphere';
import type { SimulationScenarioId } from '../../../shared/scenario';
import type { SavedExperiment } from '../../../shared/simulator';
import { CelestialTimeCard } from '../CelestialTimeCard';
import { useI18n } from '../I18nProvider';
import {
  getPresentation,
  getScenarioPresentation,
  getSidebarModelLabel,
  isAstronomyScenario,
  scenarios
} from './app-config';
import type { VisualLayerState } from './app-types';

export function AppSidebar({
  experiments,
  activeScenarioId,
  atmosphereMode,
  visualLayers,
  observedAtIso,
  observationUtcOffsetMinutes,
  onScenarioChange,
  onLoadExperiment,
  onVisualLayerChange,
  onObservationTimeChange
}: {
  experiments: SavedExperiment[];
  activeScenarioId: SimulationScenarioId;
  atmosphereMode: AtmosphereMode;
  visualLayers: VisualLayerState;
  observedAtIso: string;
  observationUtcOffsetMinutes: number;
  onScenarioChange(scenarioId: SimulationScenarioId): void;
  onObservationTimeChange(observedAtIso: string, utcOffsetMinutes: number): void;
  onLoadExperiment(experiment: SavedExperiment): void;
  onVisualLayerChange(key: keyof VisualLayerState, enabled: boolean): void;
}): React.JSX.Element {
  const { locale, t } = useI18n();
  const enabledScenarioCount = scenarios.filter((scenario) => scenario.enabled).length;
  const modelCountKey = activeScenarioId === 'sun-moon-observation'
    ? 'sidebar.modelCount.sunMoon'
    : activeScenarioId === 'eclipse-simulation'
      ? 'sidebar.modelCount.eclipse'
      : activeScenarioId === 'shadow-observation' || activeScenarioId === 'stellar-observation'
        ? 'sidebar.modelCount.singleAstronomy'
        : 'sidebar.modelCount.visibility';

  return (
    <aside className="sidebar">
      <section className="side-section">
        <div className="section-heading">
          <span>{t('sidebar.testScenarios')}</span>
          <span className="section-state">{t('sidebar.readyCount', { ready: enabledScenarioCount, total: scenarios.length })}</span>
        </div>
        <nav className="scenario-list">
          {scenarios.map((scenario) => {
            const isActive = scenario.id === activeScenarioId;
            const presentation = getScenarioPresentation(locale, scenario.id);
            return (
              <button
                className={!scenario.enabled ? 'unavailable' : isActive ? 'active' : 'available'}
                disabled={!scenario.enabled}
                key={scenario.id}
                title={!scenario.enabled ? t('sidebar.unavailableScenario') : presentation.description}
                type="button"
                onClick={() => onScenarioChange(scenario.id)}
              >
                <span className="nav-icon">{scenario.icon}</span>
                <span className="nav-label">{presentation.label}</span>
                <span className="nav-state">{!scenario.enabled
                  ? t('common.soon')
                  : isActive
                    ? t('common.active')
                    : t('common.ready')}</span>
              </button>
            );
          })}
        </nav>
      </section>

      <section className="side-section compact">
        <div className="section-heading">
          <span>{t('sidebar.savedExperiments')}</span>
          <span className="section-state">{t('sidebar.savedCount', { count: experiments.length })}</span>
        </div>
        {experiments.length === 0 ? (
          <div className="saved-empty">{t('sidebar.noSaved')}</div>
        ) : (
          experiments.slice(0, 3).map((experiment) => (
            <button
              className="saved-experiment-button"
              key={experiment.id}
              type="button"
              title={experiment.name}
              onClick={() => onLoadExperiment(experiment)}
            >
              <span>{experiment.name}</span>
              <b>↗</b>
            </button>
          ))
        )}
      </section>

      <section className="side-section compact">
        <div className="section-heading">
          <span>{t('sidebar.models')}</span>
          <span className="section-state">{t(modelCountKey)}</span>
        </div>
        {activeScenarioId === 'sun-moon-observation' ? (
          <>
            <div className="model-toggle reference-model">
              <span className="model-dot amber" />
              <span>{t('model.solarPosition')}</span>
              <span className="reference-badge">{t('common.reference')}</span>
            </div>
            <div className="model-toggle reference-model">
              <span className="model-dot violet" />
              <span>{t('model.lunarPosition')}</span>
              <span className="reference-badge">{t('common.reference')}</span>
            </div>
            <div className="model-toggle reference-model">
              <span className="model-dot green" />
              <span>{t('model.solarDayEvents')}</span>
              <span className="reference-badge">{t('common.reference')}</span>
            </div>
          </>
        ) : activeScenarioId === 'eclipse-simulation' ? (
          <>
            <div className="model-toggle reference-model">
              <span className="model-dot amber" />
              <span>{t('model.eclipseGeometry')}</span>
              <span className="reference-badge">{t('common.reference')}</span>
            </div>
            <div className="model-toggle reference-model">
              <span className="model-dot violet" />
              <span>{t('model.eclipseSearch')}</span>
              <span className="reference-badge">{t('common.reference')}</span>
            </div>
          </>
        ) : activeScenarioId === 'shadow-observation' ? (
          <div className="model-toggle reference-model">
            <span className="model-dot amber" />
            <span>{t('model.shadowGeometry')}</span>
            <span className="reference-badge">{t('common.reference')}</span>
          </div>
        ) : activeScenarioId === 'stellar-observation' ? (
          <div className="model-toggle reference-model">
            <span className="model-dot violet" />
            <span>{t('model.stellarObservation')}</span>
            <span className="reference-badge">{t('common.reference')}</span>
          </div>
        ) : (
          <>
            {simulationModels.map((model) => {
              const presentation = getPresentation(model.metadata.id);
              const isProjection = model.metadata.id === 'azimuthal-projection';
              return (
                <div className={`model-toggle ${isProjection ? 'reference-model' : ''}`} key={model.metadata.id}>
                  <span className={`model-dot ${presentation.tone}`} />
                  <span>{getSidebarModelLabel(locale, model.metadata.id, model.metadata.name)}</span>
                  {isProjection
                    ? <span className="reference-badge">{t('common.reference')}</span>
                    : <span className="enabled-dot" title={t('sidebar.includedInCalculation')} />}
                </div>
              );
            })}
            <div className="model-toggle future-model"><span className="model-dot coral" /><span>{t('model.toroidal')}</span><span className="future-badge">{t('common.soon')}</span></div>
            <div className="model-toggle future-model"><span className="model-dot blue" /><span>{t('model.concaveEarth')}</span><span className="future-badge">{t('common.soon')}</span></div>
          </>
        )}
      </section>

      {isAstronomyScenario(activeScenarioId) ? (
        <section className="side-section compact grow celestial-visual-placeholder">
          <div className="section-heading">
            <span>{t('sidebar.visualLayers')}</span>
            <span className="section-state">{t('sidebar.astronomyNextSlice')}</span>
          </div>
          <div className="saved-empty">
            {activeScenarioId === 'eclipse-simulation'
              ? t('astronomy.placeholder.eclipse')
              : activeScenarioId === 'shadow-observation'
                ? t('astronomy.placeholder.shadow')
                : activeScenarioId === 'stellar-observation'
                  ? t('astronomy.placeholder.stellar')
                  : t('astronomy.placeholder.sunMoon')}
          </div>
        </section>
      ) : (
        <section className="side-section compact grow">
          <div className="section-heading">
            <span>{t('sidebar.visualLayers')}</span>
            <span className="section-state">{t('sidebar.visualReadyCount')}</span>
          </div>
          <label className="switch-row">
            <span>{t('visual.geographicBoundaries')}</span>
            <input
              type="checkbox"
              checked={visualLayers.geographicBoundaries}
              onChange={(event) => onVisualLayerChange('geographicBoundaries', event.currentTarget.checked)}
            />
            <span className="switch" />
          </label>
          <label
            className={`switch-row ${activeScenarioId === 'horizon' ? 'unavailable-layer' : ''}`}
            title={activeScenarioId === 'horizon'
              ? t('visual.terrainHorizonUnavailable')
              : t('visual.terrainDescription')}
          >
            <span>{t('visual.terrain')}</span>
            <input
              type="checkbox"
              disabled={activeScenarioId === 'horizon'}
              checked={activeScenarioId !== 'horizon' && visualLayers.terrain}
              onChange={(event) => onVisualLayerChange('terrain', event.currentTarget.checked)}
            />
            <span className="switch" />
          </label>
          <label className="switch-row unavailable-layer">
            <span>{t('visual.nightLights')}</span><input type="checkbox" disabled /><span className="switch" />
          </label>
          <label
            className={`switch-row ${atmosphereMode !== 'profile' ? 'unavailable-layer' : ''}`}
            title={atmosphereMode === 'profile'
              ? t('visual.atmosphereEnabledDescription')
              : t('visual.atmosphereSelectProfile')}
          >
            <span>{t('visual.atmosphereProfile')}</span>
            <input
              type="checkbox"
              disabled={atmosphereMode !== 'profile'}
              checked={atmosphereMode === 'profile' && visualLayers.atmosphere}
              onChange={(event) => onVisualLayerChange('atmosphere', event.currentTarget.checked)}
            />
            <span className="switch" />
          </label>
          <label className="switch-row">
            <span>{t('visual.grid')}</span>
            <input
              type="checkbox"
              checked={visualLayers.grid}
              onChange={(event) => onVisualLayerChange('grid', event.currentTarget.checked)}
            />
            <span className="switch" />
          </label>
        </section>
      )}

      <CelestialTimeCard
        active={isAstronomyScenario(activeScenarioId)}
        observedAtIso={observedAtIso}
        utcOffsetMinutes={observationUtcOffsetMinutes}
        onChange={onObservationTimeChange}
      />
    </aside>
  );
}
""", encoding="utf-8")

app = ROOT / "src/renderer/src/AppNext.tsx"
replace_once(
    app,
    "  datumLabels,\n  defaultExperimentName,\n  isAstronomyScenario\n} from './app/app-config';",
    "  datumLabels,\n  defaultExperimentName,\n  getScenarioPresentation,\n  isAstronomyScenario\n} from './app/app-config';"
)
replace_count(
    app,
    "defaultExperimentName(activeScenarioId)",
    "defaultExperimentName(activeScenarioId, locale)",
    2
)
replace_once(
    app,
    "    setStorageMessage('Yeni deney hazırlandı.');",
    "    setStorageMessage(t('experiment.newReady'));"
)
replace_once(
    app,
    "            setStorageMessage(`${getSimulationScenario(scenarioId).label} senaryosu hazırlandı.`);",
    "            setStorageMessage(t('scenario.readyMessage', {\n              scenario: getScenarioPresentation(locale, scenarioId).label\n            }));"
)

test = ROOT / "tests/i18n.test.ts"
replace_once(
    test,
    "    expect(translate('en', 'action.dataManager')).toBe('Data Manager');\n  });",
    "    expect(translate('en', 'action.dataManager')).toBe('Data Manager');\n  });\n\n  it('interpolates typed navigation messages without touching unknown placeholders', () => {\n    expect(translate('tr', 'sidebar.readyCount', { ready: 7, total: 7 })).toBe('7 / 7 hazır');\n    expect(translate('en', 'sidebar.savedCount', { count: 3 })).toBe('3 saved');\n    expect(translate('en', 'scenario.readyMessage', { scenario: 'Horizon Analysis' })).toBe('Horizon Analysis scenario is ready.');\n  });"
)

config_test = ROOT / "tests/app-config-i18n.test.ts"
config_test.write_text("""import { describe, expect, it } from 'vitest';
import {
  defaultExperimentName,
  getScenarioPresentation,
  getSidebarModelLabel
} from '../src/renderer/src/app/app-config';

describe('localized renderer scenario presentation', () => {
  it('keeps scenario ids stable while localizing their human presentation', () => {
    expect(getScenarioPresentation('tr', 'horizon')).toEqual({
      label: 'Ufuk Analizi',
      description: 'Gözlemci kotu ve atmosfer varsayımından geometrik ufuk mesafesini hesaplar.'
    });
    expect(getScenarioPresentation('en', 'horizon')).toEqual({
      label: 'Horizon Analysis',
      description: 'Calculates geometric horizon distance from observer elevation and the atmosphere assumption.'
    });
  });

  it('uses the selected locale for generated default experiment names', () => {
    const instant = new Date('2026-08-13T10:00:00.000Z');
    expect(defaultExperimentName('stellar-observation', 'tr', instant)).toMatch(/^Yıldız Gözlemleri /);
    expect(defaultExperimentName('stellar-observation', 'en', instant)).toMatch(/^Stellar Observations /);
  });

  it('preserves existing Turkish model metadata labels while supplying English sidebar labels', () => {
    expect(getSidebarModelLabel('tr', 'ideal-sphere', 'Mevcut Türkçe Ad')).toBe('Mevcut Türkçe Ad');
    expect(getSidebarModelLabel('en', 'ideal-sphere', 'Mevcut Türkçe Ad')).toBe('Ideal Sphere');
    expect(getSidebarModelLabel('en', 'unknown-model', 'Custom Model')).toBe('Custom Model');
  });
});
""", encoding="utf-8")

doc = ROOT / "docs/localization.md"
replace_once(
    doc,
    "The localization stage is complete only after both languages cover all user-facing application/report/help surfaces; the foundation PR by itself is intentionally partial.",
    "The localization stage is complete only after both languages cover all user-facing application/report/help surfaces; the foundation PR by itself is intentionally partial.\n\n## Implemented progress\n\n- Foundation: locale bootstrap, persisted explicit TR/EN switch, document language/title and top application shell.\n- Navigation slice: scenario labels/descriptions, sidebar states/model references/visual layers and locale-aware default experiment names.\n\nThe main experiment panels, astronomy time card, dialogs, help/AI guidance and reports remain separate follow-up slices."
)

print("Navigation/scenario localization slice applied successfully.")
print("Updated:")
for path in [i18n, provider, config, sidebar, app, test, doc]:
    print(f"  - {path.relative_to(ROOT)}")
print("Created:")
print(f"  - {config_test.relative_to(ROOT)}")