import { getSimulationScenario, normalizeSimulationScenarioId } from './scenario';
import type { ModelPrediction, PredictionMetric } from './domain';
import type { SavedExperiment } from './simulator';

export const GGL_AI_ANALYSIS_PACKAGE_VERSION = 'v1';

function finite(value: number | undefined): string {
  return value === undefined || !Number.isFinite(value) ? 'unknown' : String(value);
}

function utcOffset(minutes: number | undefined): string {
  if (minutes === undefined || !Number.isFinite(minutes)) return 'unknown';
  const sign = minutes < 0 ? '-' : '+';
  const absolute = Math.abs(Math.trunc(minutes));
  return `${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`;
}

function scalar(value: string): string {
  return value.replace(/\r?\n/gu, ' ').trim();
}

function metricLine(metric: PredictionMetric): string {
  const value = metric.value === null || !Number.isFinite(metric.value) ? 'null' : String(metric.value);
  const uncertainty = metric.uncertainty === undefined || !Number.isFinite(metric.uncertainty)
    ? ''
    : ` ±${metric.uncertainty}`;
  return `metric.${metric.key}: ${value}${uncertainty}${metric.unit ? ` ${metric.unit}` : ''} | ${scalar(metric.label)}`;
}

function resultBlock(prediction: ModelPrediction, version: string | undefined, index: number): string[] {
  const lines = [
    `[RESULT ${index + 1}]`,
    `model_id: ${prediction.modelId}`,
    `model_version: ${version ?? 'unknown'}`,
    `status: ${prediction.status}`,
    `trace_id: ${prediction.traceId}`,
    `trace_summary: ${scalar(prediction.trace.summary)}`
  ];
  for (const metric of prediction.metrics) lines.push(metricLine(metric));
  for (const warning of prediction.warnings) lines.push(`warning: ${scalar(warning)}`);
  for (const assumption of prediction.trace.assumptions) lines.push(`assumption: ${scalar(assumption)}`);
  lines.push(`END RESULT ${index + 1}`);
  return lines;
}

function sourceLines(experiment: SavedExperiment): string[] {
  const lines: string[] = [];
  const terrain = experiment.terrainProfileSource;
  if (terrain) {
    lines.push(`source.terrain.kind: ${terrain.kind}`);
    lines.push(`source.terrain.file_name: ${scalar(terrain.fileName)}`);
    if (terrain.sha256) lines.push(`source.terrain.sha256: ${terrain.sha256}`);
    lines.push(`source.terrain.modified_after_import: ${terrain.modifiedAfterImport ? 'true' : 'false'}`);
  }
  if (experiment.photoCalibration) {
    lines.push(`source.photo.file_name: ${scalar(experiment.photoCalibration.fileName)}`);
    lines.push(`source.photo.reference_kind: ${experiment.photoCalibration.referenceKind ?? 'unknown'}`);
    if (experiment.photoCalibration.sha256) lines.push(`source.photo.sha256: ${experiment.photoCalibration.sha256}`);
  }
  if (experiment.stellarLocalHorizonSource) {
    lines.push(`source.stellar_horizon.file_name: ${scalar(experiment.stellarLocalHorizonSource.fileName)}`);
    lines.push(`source.stellar_horizon.kind: ${experiment.stellarLocalHorizonSource.sourceKind ?? 'unknown'}`);
    lines.push(`source.stellar_horizon.sha256: ${experiment.stellarLocalHorizonSource.sha256}`);
    lines.push(`source.stellar_horizon.modified_after_import: ${experiment.stellarLocalHorizonSource.modifiedAfterImport ? 'true' : 'false'}`);
  }
  if (experiment.stellarMotionSource) {
    lines.push(`source.stellar_motion.file_name: ${scalar(experiment.stellarMotionSource.fileName)}`);
    lines.push(`source.stellar_motion.sha256: ${experiment.stellarMotionSource.sha256}`);
    lines.push(`source.stellar_motion.entry_count: ${experiment.stellarMotionSource.entryCount}`);
  }
  return lines;
}

export function createAiAnalysisPackage(experiment: SavedExperiment, generatedAtIso = new Date().toISOString()): string {
  const scenarioId = normalizeSimulationScenarioId(experiment.scenarioId);
  const scenario = getSimulationScenario(scenarioId);
  const atmosphereMode = experiment.atmosphere?.mode ?? (experiment.inputs.useStandardRefraction ? 'standard' : 'off');
  const uncertainty = experiment.photoModelUncertainty;
  const observedAt = experiment.observedAtIso ?? experiment.createdAtIso;
  const lines = [
    `GGL-AI-ANALYSIS ${GGL_AI_ANALYSIS_PACKAGE_VERSION}`,
    `generated_at_utc: ${generatedAtIso}`,
    `experiment.id: ${experiment.id}`,
    `experiment.name: ${scalar(experiment.name)}`,
    `experiment.scenario_id: ${scenarioId}`,
    `experiment.scenario_label: ${scalar(scenario.label)}`,
    `experiment.observed_at_utc: ${observedAt}`,
    `experiment.utc_offset: ${utcOffset(experiment.observationUtcOffsetMinutes)}`,
    `observer.coordinates: ${experiment.inputs.observerLatitudeDeg},${experiment.inputs.observerLongitudeDeg}`,
    `observer.eye_height_m: ${experiment.inputs.observerHeightM}`,
    `observer.ground_elevation_m: ${experiment.inputs.observerGroundElevationM}`,
    `target.coordinates: ${experiment.inputs.targetLatitudeDeg},${experiment.inputs.targetLongitudeDeg}`,
    `target.height_m: ${experiment.inputs.targetHeightM}`,
    `target.ground_elevation_m: ${experiment.inputs.targetGroundElevationM}`,
    `distance.source: ${experiment.inputs.distanceSource}`,
    `distance.surface_km: ${experiment.inputs.surfaceDistanceKm}`,
    `vertical_datum.kind: ${experiment.inputs.verticalDatumKind}`,
    `vertical_datum.offset_m: ${experiment.inputs.verticalDatumOffsetM}`,
    `terrain.mode: ${experiment.inputs.terrainMode}`,
    `atmosphere.mode: ${atmosphereMode}`,
    `atmosphere.refraction_k: ${experiment.inputs.refractionCoefficient}`,
    `observation.visible_percent: ${experiment.inputs.observedVisiblePercent}`,
    `observation.uncertainty_percent: ${experiment.inputs.observationUncertaintyPercent}`,
    `uncertainty.surface_distance_m: ${finite(uncertainty?.surfaceDistanceM)}`,
    `uncertainty.observer_eye_height_m: ${finite(uncertainty?.observerEyeHeightM)}`,
    `uncertainty.observer_ground_elevation_m: ${finite(uncertainty?.observerGroundElevationM)}`,
    `uncertainty.target_height_m: ${finite(uncertainty?.targetHeightM)}`,
    `uncertainty.target_ground_elevation_m: ${finite(uncertainty?.targetGroundElevationM)}`,
    `uncertainty.refraction_k: ${finite(uncertainty?.refractionCoefficient)}`,
    `provenance.text_setup_count: ${experiment.textSetupHistory?.length ?? 0}`,
    ...sourceLines(experiment),
    '',
    'RESULTS BEGIN'
  ];

  experiment.predictions.forEach((prediction, index) => {
    lines.push(...resultBlock(prediction, experiment.modelVersions[prediction.modelId], index));
  });

  lines.push(
    'RESULTS END',
    '',
    'AI_TASK BEGIN',
    '1. Girdileri, gerçek gözlemleri ve model tahminlerini birbirinden ayrı ele al.',
    '2. compatible/incompatible/indeterminate/unsupported durumlarını aynen koru; unsupported veya indeterminate sonucu kesin kanıt gibi yorumlama.',
    '3. Modelleri ortak metrikler üzerinden karşılaştır; farkları sayı ve birimleriyle belirt.',
    '4. Belirsizlikleri, uyarıları, varsayımları ve kaynak/provenans durumunu sonucun güvenilirliğine dahil et.',
    '5. Eksik veri varsa uydurma. Sonucu değiştirebilecek eksik ölçüm veya kaynakları ayrıca listele.',
    '6. Bir Dünya şekli veya fiziksel açıklama hakkında hüküm verirken yalnız bu paketteki ölçüm ve hesapların ayırt edebildiği kapsamı kullan; kapsam dışı genelleme yapma.',
    '7. Yanıtı: Kısa sonuç / Sayısal karşılaştırma / Belirsizlik ve sınırlamalar / Önerilen sonraki testler sırasıyla yaz.',
    'AI_TASK END',
    'END GGL-AI-ANALYSIS'
  );

  return lines.join('\n');
}
