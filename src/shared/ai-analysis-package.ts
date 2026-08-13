import { getSimulationScenario, normalizeSimulationScenarioId } from './scenario';
import type { ModelPrediction, PredictionMetric } from './domain';
import type { SavedExperiment } from './simulator';
import {
  GGL_AI_ANALYSIS_END,
  GGL_AI_ANALYSIS_HEADER,
  GGL_AI_ANALYSIS_PACKAGE_VERSION,
  GGL_AI_COMPARISON_END,
  GGL_AI_COMPARISON_HEADER,
  GGL_AI_COMPARISON_PACKAGE_VERSION
} from './ai-contracts';

export {
  GGL_AI_ANALYSIS_PACKAGE_VERSION,
  GGL_AI_COMPARISON_PACKAGE_VERSION
} from './ai-contracts';

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
    lines.push(`source.photo.file_name: ${scalar(experiment.photoCalibration.source.fileName)}`);
    lines.push(`source.photo.reference_kind: ${experiment.photoCalibration.referenceKind ?? 'unknown'}`);
    lines.push(`source.photo.sha256: ${experiment.photoCalibration.source.sha256}`);
  }
  if (experiment.stellarLocalHorizonSource) {
    lines.push(`source.stellar_horizon.file_name: ${scalar(experiment.stellarLocalHorizonSource.fileName)}`);
    lines.push(`source.stellar_horizon.kind: ${experiment.stellarLocalHorizonSource.format}`);
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

function textSetupLineageLines(experiment: SavedExperiment): string[] {
  const history = experiment.textSetupHistory ?? [];
  const aiEntries = history.filter((item) => item.sourceKind === 'ai-follow-up' && item.aiLineage !== undefined);
  const lines = [
    `provenance.text_setup_count: ${history.length}`,
    `provenance.ai_follow_up_count: ${aiEntries.length}`
  ];
  aiEntries.forEach((item, index) => {
    const lineage = item.aiLineage!;
    const prefix = `provenance.ai_follow_up.${index + 1}`;
    lines.push(`${prefix}.lineage_version: ${lineage.version}`);
    lines.push(`${prefix}.analysis_package_version: ${lineage.analysisPackageVersion}`);
    lines.push(`${prefix}.analysis_generated_at_utc: ${lineage.analysisGeneratedAtIso}`);
    lines.push(`${prefix}.source_experiment_id: ${scalar(lineage.sourceExperimentId)}`);
    lines.push(`${prefix}.source_experiment_updated_at_utc: ${lineage.sourceExperimentUpdatedAtIso}`);
    lines.push(`${prefix}.analysis_sha256: ${lineage.analysisSha256}`);
    lines.push(`${prefix}.canonical_test_sha256: ${lineage.canonicalTestSha256}`);
  });
  return lines;
}

function experimentLines(experiment: SavedExperiment): string[] {
  const scenarioId = normalizeSimulationScenarioId(experiment.scenarioId);
  const scenario = getSimulationScenario(scenarioId);
  const atmosphereMode = experiment.atmosphere?.mode ?? (experiment.inputs.useStandardRefraction ? 'standard' : 'off');
  const uncertainty = experiment.photoModelUncertainty;
  const observedAt = experiment.observedAtIso ?? experiment.createdAtIso;
  const lines = [
    `experiment.id: ${experiment.id}`,
    `experiment.name: ${scalar(experiment.name)}`,
    `experiment.scenario_id: ${scenarioId}`,
    `experiment.scenario_label: ${scalar(scenario.label)}`,
    `experiment.observed_at_utc: ${observedAt}`,
    `experiment.utc_offset: ${utcOffset(experiment.observationUtcOffsetMinutes)}`,
    `scope.uses_target: ${scenario.usesTarget ? 'true' : 'false'}`,
    `scope.uses_route: ${scenario.usesRoute ? 'true' : 'false'}`,
    `scope.uses_observation: ${scenario.usesObservation ? 'true' : 'false'}`,
    `scope.uses_terrain: ${scenario.usesTerrain ? 'true' : 'false'}`,
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
    ...textSetupLineageLines(experiment),
    ...sourceLines(experiment),
    '',
    'RESULTS BEGIN'
  ];

  experiment.predictions.forEach((prediction, index) => {
    lines.push(...resultBlock(prediction, experiment.modelVersions[prediction.modelId], index));
  });
  lines.push('RESULTS END');
  return lines;
}

const SINGLE_AI_TASK = [
  'AI_TASK BEGIN',
  '1. Girdileri, gerçek gözlemleri ve model tahminlerini birbirinden ayrı ele al.',
  '2. scope.* alanı false olan genel UI girdilerini bu senaryonun aktif ölçümüymüş gibi yorumlama.',
  '3. compatible/incompatible/indeterminate/unsupported durumlarını aynen koru; unsupported veya indeterminate sonucu kesin kanıt gibi yorumlama.',
  '4. Modelleri ortak metrikler üzerinden karşılaştır; farkları sayı ve birimleriyle belirt.',
  '5. Belirsizlikleri, uyarıları, varsayımları ve kaynak/provenans durumunu sonucun güvenilirliğine dahil et.',
  '6. Eksik veri varsa uydurma. Sonucu değiştirebilecek eksik ölçüm veya kaynakları ayrıca listele.',
  '7. Bir Dünya şekli veya fiziksel açıklama hakkında hüküm verirken yalnız bu paketteki ölçüm ve hesapların ayırt edebildiği kapsamı kullan; kapsam dışı genelleme yapma.',
  '8. Yanıtı: Kısa sonuç / Sayısal karşılaştırma / Belirsizlik ve sınırlamalar / Önerilen sonraki testler sırasıyla yaz.',
  'AI_TASK END'
] as const;

const COMPARISON_AI_TASK = [
  'AI_TASK BEGIN',
  '1. Her EXPERIMENT bloğunu bağımsız deney olarak koru; girdileri ve model sonuçlarını deneyler arasında karıştırma.',
  '2. Önce deneylerin aynı senaryoyu ve karşılaştırılabilir metrikleri kullanıp kullanmadığını belirle.',
  '3. Yalnız anlamı ve birimi aynı olan metrikleri doğrudan sayısal karşılaştır. Farklı senaryolardaki benzer adlı metrikleri eşdeğer varsayma.',
  '4. compatible/incompatible/indeterminate/unsupported durumlarını aynen koru; oy çokluğu veya tek bir sonuçla genel fiziksel hüküm üretme.',
  '5. scope.* false olan genel UI girdilerini o deneyin aktif ölçümüymüş gibi yorumlama.',
  '6. Belirsizlik, uyarı, varsayım, model sürümü ve kaynak/provenans farklarının karşılaştırmayı etkileyip etkilemediğini açıkça belirt.',
  '7. Deneyler arasında gerçek bir gerilim varsa hangi girdi veya ölçümün ayrımı ürettiğini sayılarla göster; açıklanamıyorsa bunu açık bırak.',
  '8. Eksik veri uydurma ve paketin ayırt edemediği Dünya şekli/fizik açıklamalarına genelleme yapma.',
  '9. Yanıtı: Ortak sonuç / Deney bazında karşılaştırma / Çelişkiler ve belirsizlikler / En ayırt edici sonraki testler sırasıyla yaz.',
  '10. Önerilen sonraki testler için mümkünse GGL-AI-TEST v1 ile doldurulabilecek somut alanları belirt.',
  'AI_TASK END'
] as const;

export function createAiAnalysisPackage(experiment: SavedExperiment, generatedAtIso = new Date().toISOString()): string {
  return [
    GGL_AI_ANALYSIS_HEADER,
    `generated_at_utc: ${generatedAtIso}`,
    ...experimentLines(experiment),
    '',
    ...SINGLE_AI_TASK,
    GGL_AI_ANALYSIS_END
  ].join('\n');
}

export function createAiComparisonPackage(
  experiments: readonly SavedExperiment[],
  generatedAtIso = new Date().toISOString()
): string {
  if (experiments.length < 2 || experiments.length > 12) {
    throw new RangeError('AI karşılaştırma paketi 2 ile 12 deney içermeli.');
  }

  const scenarioIds = new Set(experiments.map((experiment) => normalizeSimulationScenarioId(experiment.scenarioId)));
  const lines = [
    GGL_AI_COMPARISON_HEADER,
    `generated_at_utc: ${generatedAtIso}`,
    `experiment_count: ${experiments.length}`,
    `same_scenario: ${scenarioIds.size === 1 ? 'true' : 'false'}`,
    ''
  ];

  experiments.forEach((experiment, index) => {
    lines.push(`EXPERIMENT ${index + 1} BEGIN`);
    lines.push(...experimentLines(experiment));
    lines.push(`EXPERIMENT ${index + 1} END`, '');
  });

  lines.push(...COMPARISON_AI_TASK, GGL_AI_COMPARISON_END);
  return lines.join('\n');
}
