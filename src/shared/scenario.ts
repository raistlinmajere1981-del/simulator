import type { ExperimentDefinition } from './domain';

export type SimulationScenarioId =
  | 'target-visibility'
  | 'horizon'
  | 'long-distance-visibility';

export interface SimulationScenarioDefinition {
  id: SimulationScenarioId;
  label: string;
  icon: string;
  experimentType: ExperimentDefinition['type'];
  description: string;
  usesTarget: boolean;
  usesObservation: boolean;
  usesRoute: boolean;
  usesTerrain: boolean;
}

export const VISIBILITY_SCENARIOS: readonly SimulationScenarioDefinition[] = [
  {
    id: 'target-visibility',
    label: 'Hedef Görünürlüğü',
    icon: '▰',
    experimentType: 'target-visibility',
    description: 'Belirli bir hedefin ne kadarının görünmesi gerektiğini ölçümle karşılaştırır.',
    usesTarget: true,
    usesObservation: true,
    usesRoute: true,
    usesTerrain: true
  },
  {
    id: 'horizon',
    label: 'Ufuk Analizi',
    icon: '◫',
    experimentType: 'horizon',
    description: 'Gözlemci kotu ve atmosfer varsayımından geometrik ufuk mesafesini hesaplar.',
    usesTarget: false,
    usesObservation: false,
    usesRoute: false,
    usesTerrain: false
  },
  {
    id: 'long-distance-visibility',
    label: 'Uzun Mesafe Görüş',
    icon: '⌁',
    experimentType: 'target-visibility',
    description: 'Aynı görünürlük motorunu rota, arazi ve uzak hedef bağlamını öne çıkaran ayrı bir iş akışında kullanır.',
    usesTarget: true,
    usesObservation: true,
    usesRoute: true,
    usesTerrain: true
  }
] as const;

const scenarioById = new Map(
  VISIBILITY_SCENARIOS.map((scenario) => [scenario.id, scenario] as const)
);

export function normalizeSimulationScenarioId(value: unknown): SimulationScenarioId {
  return value === 'horizon' || value === 'long-distance-visibility'
    ? value
    : 'target-visibility';
}

export function getSimulationScenario(
  id: SimulationScenarioId
): SimulationScenarioDefinition {
  return scenarioById.get(id) ?? VISIBILITY_SCENARIOS[0]!;
}
