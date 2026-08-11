import {
  ECLIPSE_SCENARIO,
  SHADOW_SCENARIO,
  STELLAR_SCENARIO,
  SUN_MOON_SCENARIO,
  VISIBILITY_SCENARIOS,
  getSimulationScenario,
  type SimulationScenarioId
} from '../../../shared/scenario';
import type { VerticalDatumKind } from '../../../shared/terrain';

type ModelTone = 'green' | 'amber' | 'violet';
type ModelShape = 'globe' | 'disk' | 'gleason';

export interface ModelPresentation {
  tone: ModelTone;
  shape: ModelShape;
}

export interface ScenarioDefinition {
  id?: SimulationScenarioId;
  label: string;
  icon: string;
  enabled: boolean;
}

export const scenarios: ScenarioDefinition[] = [
  ...VISIBILITY_SCENARIOS.map((scenario) => ({
    id: scenario.id,
    label: scenario.label,
    icon: scenario.icon,
    enabled: true
  })),
  { ...SUN_MOON_SCENARIO, enabled: true },
  { ...SHADOW_SCENARIO, enabled: true },
  { ...STELLAR_SCENARIO, enabled: true },
  { ...ECLIPSE_SCENARIO, enabled: true }
];

const presentationByModelId: Record<string, ModelPresentation> = {
  'ideal-sphere': { tone: 'green', shape: 'globe' },
  'defined-plane': { tone: 'amber', shape: 'disk' },
  'azimuthal-projection': { tone: 'violet', shape: 'gleason' }
};

export const datumLabels: Record<VerticalDatumKind, string> = {
  'orthometric-msl': 'Ortalama deniz seviyesi',
  'ellipsoidal-wgs84': 'WGS84 elipsoidal yükseklik',
  local: 'Yerel düşey referans'
};

export function getPresentation(modelId: string): ModelPresentation {
  return presentationByModelId[modelId] ?? { tone: 'violet', shape: 'gleason' };
}

export function isAstronomyScenario(scenarioId: SimulationScenarioId): boolean {
  return scenarioId === 'sun-moon-observation' ||
    scenarioId === 'shadow-observation' ||
    scenarioId === 'stellar-observation' ||
    scenarioId === 'eclipse-simulation';
}

export function defaultExperimentName(scenarioId: SimulationScenarioId): string {
  return `${getSimulationScenario(scenarioId).label} ${new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date())}`;
}
