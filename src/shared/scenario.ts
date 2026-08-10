import type { ExperimentDefinition } from './domain';

export type SimulationScenarioId =
  | 'target-visibility'
  | 'horizon'
  | 'long-distance-visibility'
  | 'sun-moon-observation'
  | 'shadow-observation'
  | 'stellar-observation'
  | 'eclipse-simulation';

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

export const SUN_MOON_SCENARIO: SimulationScenarioDefinition = {
  id: 'sun-moon-observation',
  label: 'Güneş ve Ay Gözlemleri',
  icon: '☀',
  experimentType: 'celestial',
  description: 'Tarih, saat ve WGS84 gözlem konumundan Güneş ve Ay için ayrı astronomik referans sonuçları üretir.',
  usesTarget: false,
  usesObservation: false,
  usesRoute: false,
  usesTerrain: false
};

export const SHADOW_SCENARIO: SimulationScenarioDefinition = {
  id: 'shadow-observation',
  label: 'Gölge Deneyi',
  icon: '◒',
  experimentType: 'shadow',
  description: 'Dikey gnomon gölgesinin uzunluk ve yönünü geometrik Güneş referansından hesaplar; isteğe bağlı saha ölçümünü belirsizliğiyle karşılaştırır.',
  usesTarget: false,
  usesObservation: true,
  usesRoute: false,
  usesTerrain: false
};

export const STELLAR_SCENARIO: SimulationScenarioDefinition = {
  id: 'stellar-observation',
  label: 'Yıldız Gözlemleri',
  icon: '✦',
  experimentType: 'celestial',
  description: 'Çevrimdışı parlak yıldız kataloğundan seçilen yıldızın J2000 koordinatını gözlem tarihine dönüştürür; geometrik konum ve zaman içindeki yıldız izini hesaplar.',
  usesTarget: false,
  usesObservation: false,
  usesRoute: false,
  usesTerrain: false
};

export const ECLIPSE_SCENARIO: SimulationScenarioDefinition = {
  id: 'eclipse-simulation',
  label: 'Tutulma Simülasyonları',
  icon: '◐',
  experimentType: 'celestial',
  description: 'Seçili gözlemci ve zaman için Güneş–Ay apparent disk geometrisini ve kullanıcı kontrollü yerel örtüşme zaman penceresini düşük hassasiyetli astronomik referansla inceler.',
  usesTarget: false,
  usesObservation: false,
  usesRoute: false,
  usesTerrain: false
};

export const ALL_SIMULATION_SCENARIOS: readonly SimulationScenarioDefinition[] = [
  ...VISIBILITY_SCENARIOS,
  SUN_MOON_SCENARIO,
  SHADOW_SCENARIO,
  STELLAR_SCENARIO,
  ECLIPSE_SCENARIO
] as const;

const scenarioById = new Map(
  ALL_SIMULATION_SCENARIOS.map((scenario) => [scenario.id, scenario] as const)
);

export function normalizeSimulationScenarioId(value: unknown): SimulationScenarioId {
  return value === 'horizon' ||
    value === 'long-distance-visibility' ||
    value === 'sun-moon-observation' ||
    value === 'shadow-observation' ||
    value === 'stellar-observation' ||
    value === 'eclipse-simulation'
    ? value
    : 'target-visibility';
}

export function getSimulationScenario(
  id: SimulationScenarioId
): SimulationScenarioDefinition {
  return scenarioById.get(id) ?? VISIBILITY_SCENARIOS[0]!;
}
