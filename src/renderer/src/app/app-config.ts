import {
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

const datumTranslationKeys: Record<VerticalDatumKind, TranslationKey> = {
  'orthometric-msl': 'datum.orthometricMsl',
  'ellipsoidal-wgs84': 'datum.ellipsoidalWgs84',
  local: 'datum.local'
};

export const datumLabels: Record<VerticalDatumKind, string> = {
  'orthometric-msl': 'Ortalama deniz seviyesi',
  'ellipsoidal-wgs84': 'WGS84 elipsoidal yükseklik',
  local: 'Yerel düşey referans'
};

export function getDatumLabel(locale: AppLocale, kind: VerticalDatumKind): string {
  return translate(locale, datumTranslationKeys[kind]);
}

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
