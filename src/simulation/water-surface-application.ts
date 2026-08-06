import type { CalculationTrace, ModelPrediction } from '../shared/domain';
import type { VerticalDatumKind } from '../shared/terrain';
import type { WaterSurfaceObservationSnapshot } from './water-surface-snapshot';

export const WATER_SURFACE_APPLICATION_MODEL_ID = 'water-surface-application';
export const WATER_SURFACE_APPLICATION_MODEL_VERSION = '0.1.0';

export type WaterSurfaceApplicationTarget =
  | 'observer-ground'
  | 'target-ground'
  | 'both-endpoints';

export type WaterSurfaceScenario =
  | 'mean'
  | 'lower-bound'
  | 'upper-bound';

export interface WaterSurfaceApplicationInput {
  experimentId: string;
  experimentObservedAtIso: string;
  experimentVerticalDatumKind: VerticalDatumKind;
  observerGroundElevationM: number;
  targetGroundElevationM: number;
  snapshot: WaterSurfaceObservationSnapshot;
  target: WaterSurfaceApplicationTarget;
  scenario: WaterSurfaceScenario;
  appliedAtIso: string;
  maximumTimeDifferenceMinutes?: number;
}

export interface WaterSurfaceApplicationResult {
  observerGroundElevationM: number;
  targetGroundElevationM: number;
  appliedWaterSurfaceM: number;
  observationTimeDifferenceMinutes: number;
  prediction: ModelPrediction;
  modelVersion: typeof WATER_SURFACE_APPLICATION_MODEL_VERSION;
}

const explicitOffsetIsoPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

function requiredText(value: string, maximumLength: number, label: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maximumLength) {
    throw new RangeError(`${label} 1…${maximumLength} karakter olmalı.`);
  }
  return trimmed;
}

function explicitIso(value: string, label: string): string {
  const trimmed = value.trim();
  if (!explicitOffsetIsoPattern.test(trimmed) || Number.isNaN(Date.parse(trimmed))) {
    throw new RangeError(`${label} saat dilimi içeren geçerli bir ISO tarih olmalı.`);
  }
  return trimmed;
}

function finiteElevation(value: number, label: string): void {
  if (!Number.isFinite(value) || value < -12_000 || value > 100_000) {
    throw new RangeError(`${label} -12000…100000 m aralığında sonlu olmalı.`);
  }
}

function targetLabel(target: WaterSurfaceApplicationTarget): string {
  if (target === 'observer-ground') return 'gözlemci zemin kotu';
  if (target === 'target-ground') return 'hedef taban kotu';
  return 'gözlemci ve hedef uç kotları';
}

function scenarioLabel(scenario: WaterSurfaceScenario): string {
  if (scenario === 'mean') return 'ortalama / anlık su seviyesi';
  if (scenario === 'lower-bound') return 'alt su yüzeyi sınırı';
  return 'üst su yüzeyi sınırı';
}

function selectedSurface(
  snapshot: WaterSurfaceObservationSnapshot,
  scenario: WaterSurfaceScenario
): number {
  if (scenario === 'mean') return snapshot.waterLevelM;
  if (scenario === 'lower-bound') {
    if (snapshot.lowerWaterSurfaceM === null) {
      throw new RangeError('Alt sınır senaryosu için birleşik su yüzeyi belirsizliği gerekli.');
    }
    return snapshot.lowerWaterSurfaceM;
  }
  if (snapshot.upperWaterSurfaceM === null) {
    throw new RangeError('Üst sınır senaryosu için birleşik su yüzeyi belirsizliği gerekli.');
  }
  return snapshot.upperWaterSurfaceM;
}

export function applyWaterSurfaceToEndpoints(
  input: WaterSurfaceApplicationInput
): WaterSurfaceApplicationResult {
  const experimentId = requiredText(input.experimentId, 200, 'Deney kimliği');
  const experimentObservedAtIso = explicitIso(
    input.experimentObservedAtIso,
    'Deney gözlem zamanı'
  );
  const appliedAtIso = explicitIso(input.appliedAtIso, 'Uygulama zamanı');
  finiteElevation(input.observerGroundElevationM, 'Gözlemci zemin kotu');
  finiteElevation(input.targetGroundElevationM, 'Hedef taban kotu');
  if (input.snapshot.experimentId !== experimentId) {
    throw new RangeError('Su yüzeyi kaydı farklı bir deneye aittir.');
  }
  if (input.snapshot.verticalDatumKind !== input.experimentVerticalDatumKind) {
    throw new RangeError('Su yüzeyi kaydı ile deneyin düşey datumları uyuşmuyor.');
  }
  if (input.maximumTimeDifferenceMinutes !== undefined) {
    if (!Number.isFinite(input.maximumTimeDifferenceMinutes) ||
      input.maximumTimeDifferenceMinutes < 0 ||
      input.maximumTimeDifferenceMinutes > 525_600) {
      throw new RangeError('Azami zaman farkı 0…525600 dakika aralığında olmalı.');
    }
  }

  const observationTimeDifferenceMinutes = Math.abs(
    Date.parse(experimentObservedAtIso) - Date.parse(input.snapshot.observedAtIso)
  ) / 60_000;
  if (input.maximumTimeDifferenceMinutes !== undefined &&
    observationTimeDifferenceMinutes > input.maximumTimeDifferenceMinutes) {
    throw new RangeError(
      `Su yüzeyi gözlemi deney zamanından ${observationTimeDifferenceMinutes.toFixed(2)} dakika uzakta; izin verilen sınır ${input.maximumTimeDifferenceMinutes.toFixed(2)} dakika.`
    );
  }

  const appliedWaterSurfaceM = selectedSurface(input.snapshot, input.scenario);
  finiteElevation(appliedWaterSurfaceM, 'Uygulanacak su yüzeyi');
  const observerGroundElevationM = input.target === 'observer-ground' ||
    input.target === 'both-endpoints'
    ? appliedWaterSurfaceM
    : input.observerGroundElevationM;
  const targetGroundElevationM = input.target === 'target-ground' ||
    input.target === 'both-endpoints'
    ? appliedWaterSurfaceM
    : input.targetGroundElevationM;

  const warnings: string[] = [
    'Su yüzeyi yalnız seçilen uç kotlarına uygulanmıştır; göz ve hedef yükseklikleri değiştirilmemiştir.',
    'Arazi ara noktaları ve datum / gelgit ofseti değiştirilmemiştir.',
    'Anlamlı dalga yüksekliği doğrudan geometri düzeltmesine çevrilmemiştir.'
  ];
  if (observationTimeDifferenceMinutes > 0) {
    warnings.push(
      `Su yüzeyi gözlemi ile deney zamanı arasında ${observationTimeDifferenceMinutes.toFixed(2)} dakika fark vardır.`
    );
  }
  if (input.snapshot.sourceKind === 'tide-prediction') {
    warnings.push('Uygulanan su yüzeyi bir gelgit tahmininden alınmıştır; saha ölçümü değildir.');
  }
  if (input.scenario !== 'mean') {
    warnings.push(
      `${scenarioLabel(input.scenario)} bir duyarlılık sınırı olarak uygulanmıştır; gözlenen anlık yüzey olduğu varsayılmamalıdır.`
    );
  }

  const trace: CalculationTrace = {
    summary: `${scenarioLabel(input.scenario)} ${targetLabel(input.target)} alanına ${appliedWaterSurfaceM.toFixed(3)} m olarak uygulandı.`,
    assumptions: [
      'Su yüzeyi kaydı ve deney aynı düşey datumdadır.',
      'Su yüzeyi kaydı aynı deney kimliğine aittir.',
      'Seçilen su yüzeyi senaryosu yalnız uç zemin kotlarını değiştirir.',
      'Gözlemci göz yüksekliği ve hedef nesne yüksekliği su yüzeyinden bağımsız göreli yükseklikler olarak korunur.',
      'Arazi profili ve datum / gelgit ofseti bu işlemde değiştirilmez.'
    ],
    steps: [
      {
        id: 'identity-datum',
        title: 'Deney kimliği ve düşey datum',
        formula: 'deney kimliği eşitliği + datum eşitliği',
        substitution: `${experimentId}; ${input.experimentVerticalDatumKind}`,
        result: 'Eşleşme doğrulandı.'
      },
      {
        id: 'time-difference',
        title: 'Gözlem zamanı farkı',
        formula: 'Δt = |t_deney - t_su|',
        substitution: `${experimentObservedAtIso}; ${input.snapshot.observedAtIso}`,
        result: `${observationTimeDifferenceMinutes.toFixed(6)} dakika`,
        ...(input.maximumTimeDifferenceMinutes === undefined
          ? {}
          : { note: `Azami izin verilen fark: ${input.maximumTimeDifferenceMinutes.toFixed(6)} dakika` })
      },
      {
        id: 'surface-scenario',
        title: 'Uygulanacak su yüzeyi',
        formula: input.scenario === 'mean'
          ? 'z_uygula = z_su'
          : input.scenario === 'lower-bound'
            ? 'z_uygula = z_alt'
            : 'z_uygula = z_üst',
        substitution: `${scenarioLabel(input.scenario)} = ${appliedWaterSurfaceM.toFixed(6)} m`,
        result: `${appliedWaterSurfaceM.toFixed(6)} m`
      },
      {
        id: 'endpoint-application',
        title: 'Uç kotlarının güncellenmesi',
        formula: `hedef alan = ${input.target}`,
        substitution: `gözlemci: ${input.observerGroundElevationM.toFixed(6)} m; hedef: ${input.targetGroundElevationM.toFixed(6)} m`,
        result: `gözlemci: ${observerGroundElevationM.toFixed(6)} m; hedef: ${targetGroundElevationM.toFixed(6)} m`
      },
      {
        id: 'application-time',
        title: 'Uygulama zamanı',
        formula: 'kullanıcı onaylı işlem zamanı',
        substitution: appliedAtIso,
        result: input.snapshot.recordedAtIso,
        note: 'Sonuç alanı kaynak su yüzeyi kaydının kayıt zamanıdır.'
      }
    ]
  };

  const prediction: ModelPrediction = {
    modelId: WATER_SURFACE_APPLICATION_MODEL_ID,
    experimentId,
    status: 'compatible',
    metrics: [
      {
        key: 'appliedWaterSurfaceM',
        label: 'Uygulanan su yüzeyi',
        value: appliedWaterSurfaceM,
        unit: 'm',
        ...(input.snapshot.combinedUncertaintyM === null || input.scenario !== 'mean'
          ? {}
          : { uncertainty: input.snapshot.combinedUncertaintyM })
      },
      {
        key: 'waterObservationTimeDifferenceMinutes',
        label: 'Su gözlemi ile deney zamanı farkı',
        value: observationTimeDifferenceMinutes,
        unit: 'min'
      },
      {
        key: 'observerGroundElevationAfterWaterM',
        label: 'Su uygulaması sonrası gözlemci zemin kotu',
        value: observerGroundElevationM,
        unit: 'm'
      },
      {
        key: 'targetGroundElevationAfterWaterM',
        label: 'Su uygulaması sonrası hedef taban kotu',
        value: targetGroundElevationM,
        unit: 'm'
      },
      {
        key: 'sourceCombinedWaterUncertaintyM',
        label: 'Kaynak birleşik su yüzeyi belirsizliği',
        value: input.snapshot.combinedUncertaintyM,
        unit: 'm'
      }
    ],
    warnings,
    traceId: `water-application:${appliedAtIso}:${input.target}:${input.scenario}`,
    trace
  };

  return {
    observerGroundElevationM,
    targetGroundElevationM,
    appliedWaterSurfaceM,
    observationTimeDifferenceMinutes,
    prediction,
    modelVersion: WATER_SURFACE_APPLICATION_MODEL_VERSION
  };
}
