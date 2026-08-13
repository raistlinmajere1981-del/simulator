#!/usr/bin/env python3
"""Localize model result cards/tables on top of the TR/EN core-panel slice.

Temporary helper: remove before merge. Engine-emitted warnings/assumptions remain
untouched in this slice so deterministic/domain text is not silently rewritten.
"""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        fail(f"{path.relative_to(ROOT)}: expected exactly one match, found {count}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


# ---------------------------------------------------------------------------
# i18n catalog
# ---------------------------------------------------------------------------
i18n = ROOT / "src/renderer/src/i18n.ts"
replace_once(
    i18n,
    "  'horizon.engineNote': 'Bu senaryoda hedef görünürlük yüzdesi ölçümü yapılmaz; modellerin geometrik ufuk tanımları karşılaştırılır.'\n",
    "  'horizon.engineNote': 'Bu senaryoda hedef görünürlük yüzdesi ölçümü yapılmaz; modellerin geometrik ufuk tanımları karşılaştırılır.',\n"
    "  'result.status.compatible': 'Gözlem aralığıyla uyumlu',\n"
    "  'result.status.incompatible': 'Gözlem aralığıyla uyumsuz',\n"
    "  'result.status.indeterminate': 'Belirsizlik içinde karar verilemedi',\n"
    "  'result.status.unsupported': 'Fiziksel model kuralları tanımsız',\n"
    "  'model.calculated': 'Hesaplandı',\n"
    "  'model.trace': 'Hesap izi',\n"
    "  'model.noCalculation': 'Hesaplama yapılmadı',\n"
    "  'model.unsupportedExplanation': 'Yüzey geometrisi, yerel dikey yön ve ışık ilerleme kuralları tanımlanmadan sayısal sonuç üretilemez.',\n"
    "  'model.horizonDefinitionNote': 'Hedef ve rota kullanılmadan geometrik ufuk tanımı değerlendirilir.',\n"
    "  'model.observer': 'Gözlemci',\n"
    "  'model.targetTop': 'Hedef tepesi',\n"
    "  'model.manualTerrainProfile': 'Manuel arazi profili',\n"
    "  'model.plane': 'Düzlem',\n"
    "  'metric.geometricHorizon': 'Geometrik ufuk',\n"
    "  'metric.observerTotalElevation': 'Gözlemci toplam kotu',\n"
    "  'metric.effectiveRadius': 'Etkin yarıçap',\n"
    "  'metric.scenario': 'Senaryo',\n"
    "  'metric.expectedVisibility': 'Beklenen görünürlük',\n"
    "  'metric.hiddenFraction': 'Gizlenen kısım',\n"
    "  'metric.horizonDistance': 'Ufuk mesafesi',\n"
    "  'metric.targetTopAngle': 'Hedef tepe açısı',\n"
    "  'metric.terrainClearance': 'Arazi açıklığı',\n"
    "  'results.horizonComparison': 'Ufuk sonucu karşılaştırma',\n"
    "  'results.comparison': 'Sonuç karşılaştırma',\n"
    "  'results.modelDisplay': 'Model / gösterim',\n"
    "  'results.status': 'Durum',\n"
    "  'results.trace': 'İz',\n"
    "  'results.viewAngle': 'Görüş açısı',\n"
    "  'results.horizon': 'Ufuk',\n"
    "  'results.observationDifference': 'Gözlem farkı',\n"
    "  'results.cartographicReference': 'Kartografik referans',\n"
    "  'results.physicalModel': 'Fiziksel model',\n"
    "  'results.open': 'Aç'\n"
)
replace_once(
    i18n,
    "  'horizon.engineNote': 'This scenario does not use a target-visibility percentage measurement; the models’ geometric horizon definitions are compared.'\n",
    "  'horizon.engineNote': 'This scenario does not use a target-visibility percentage measurement; the models’ geometric horizon definitions are compared.',\n"
    "  'result.status.compatible': 'Compatible with observation range',\n"
    "  'result.status.incompatible': 'Incompatible with observation range',\n"
    "  'result.status.indeterminate': 'Indeterminate within uncertainty',\n"
    "  'result.status.unsupported': 'Physical model rules are undefined',\n"
    "  'model.calculated': 'Calculated',\n"
    "  'model.trace': 'Calculation trace',\n"
    "  'model.noCalculation': 'No calculation performed',\n"
    "  'model.unsupportedExplanation': 'A numerical result cannot be produced until surface geometry, local vertical direction and light-propagation rules are defined.',\n"
    "  'model.horizonDefinitionNote': 'The geometric horizon definition is evaluated without using a target or route.',\n"
    "  'model.observer': 'Observer',\n"
    "  'model.targetTop': 'Target top',\n"
    "  'model.manualTerrainProfile': 'Manual terrain profile',\n"
    "  'model.plane': 'Plane',\n"
    "  'metric.geometricHorizon': 'Geometric horizon',\n"
    "  'metric.observerTotalElevation': 'Total observer elevation',\n"
    "  'metric.effectiveRadius': 'Effective radius',\n"
    "  'metric.scenario': 'Scenario',\n"
    "  'metric.expectedVisibility': 'Expected visibility',\n"
    "  'metric.hiddenFraction': 'Hidden fraction',\n"
    "  'metric.horizonDistance': 'Horizon distance',\n"
    "  'metric.targetTopAngle': 'Target-top angle',\n"
    "  'metric.terrainClearance': 'Terrain clearance',\n"
    "  'results.horizonComparison': 'Horizon result comparison',\n"
    "  'results.comparison': 'Result comparison',\n"
    "  'results.modelDisplay': 'Model / presentation',\n"
    "  'results.status': 'Status',\n"
    "  'results.trace': 'Trace',\n"
    "  'results.viewAngle': 'View angle',\n"
    "  'results.horizon': 'Horizon',\n"
    "  'results.observationDifference': 'Observation difference',\n"
    "  'results.cartographicReference': 'Cartographic reference',\n"
    "  'results.physicalModel': 'Physical model',\n"
    "  'results.open': 'Open'\n"
)

# ---------------------------------------------------------------------------
# Shared renderer presentation helpers
# ---------------------------------------------------------------------------
config = ROOT / "src/renderer/src/app/app-config.ts"
replace_once(
    config,
    "export function getSidebarModelLabel(\n"
    "  locale: AppLocale,\n"
    "  modelId: string,\n"
    "  fallbackLabel: string\n"
    "): string {\n"
    "  if (locale === 'tr') return fallbackLabel;\n"
    "  const key = sidebarModelTranslationKeys[modelId];\n"
    "  return key ? translate(locale, key) : fallbackLabel;\n"
    "}\n",
    "export function getModelPresentationLabel(\n"
    "  locale: AppLocale,\n"
    "  modelId: string,\n"
    "  fallbackLabel: string\n"
    "): string {\n"
    "  if (locale === 'tr') return fallbackLabel;\n"
    "  const key = sidebarModelTranslationKeys[modelId];\n"
    "  return key ? translate(locale, key) : fallbackLabel;\n"
    "}\n\n"
    "export function getSidebarModelLabel(\n"
    "  locale: AppLocale,\n"
    "  modelId: string,\n"
    "  fallbackLabel: string\n"
    "): string {\n"
    "  return getModelPresentationLabel(locale, modelId, fallbackLabel);\n"
    "}\n"
)

formatters = ROOT / "src/renderer/src/app/app-formatters.ts"
replace_once(
    formatters,
    "import { appLocaleTag, type AppLocale } from '../i18n';\n",
    "import {\n"
    "  appLocaleTag,\n"
    "  translate,\n"
    "  type AppLocale,\n"
    "  type TranslationKey\n"
    "} from '../i18n';\n"
)
replace_once(
    formatters,
    "export const statusLabels: Record<ResultStatus, string> = {\n"
    "  compatible: 'Gözlem aralığıyla uyumlu',\n"
    "  incompatible: 'Gözlem aralığıyla uyumsuz',\n"
    "  indeterminate: 'Belirsizlik içinde karar verilemedi',\n"
    "  unsupported: 'Fiziksel model kuralları tanımsız'\n"
    "};\n",
    "export const statusLabels: Record<ResultStatus, string> = {\n"
    "  compatible: 'Gözlem aralığıyla uyumlu',\n"
    "  incompatible: 'Gözlem aralığıyla uyumsuz',\n"
    "  indeterminate: 'Belirsizlik içinde karar verilemedi',\n"
    "  unsupported: 'Fiziksel model kuralları tanımsız'\n"
    "};\n\n"
    "const statusTranslationKeys: Record<ResultStatus, TranslationKey> = {\n"
    "  compatible: 'result.status.compatible',\n"
    "  incompatible: 'result.status.incompatible',\n"
    "  indeterminate: 'result.status.indeterminate',\n"
    "  unsupported: 'result.status.unsupported'\n"
    "};\n\n"
    "export function getStatusLabel(locale: AppLocale, status: ResultStatus): string {\n"
    "  return translate(locale, statusTranslationKeys[status]);\n"
    "}\n"
)

# ---------------------------------------------------------------------------
# Model result cards and comparison tables
# ---------------------------------------------------------------------------
model_results = ROOT / "src/renderer/src/app/ModelResults.tsx"
model_results.write_text("""import { simulationModels } from '../../../models';
import type { AtmosphereExperimentState } from '../../../shared/atmosphere';
import type { ModelMetadata } from '../../../shared/domain';
import type { SimulationScenarioId } from '../../../shared/scenario';
import type { SimulatorInputs } from '../../../shared/simulator';
import type { TerrainProfile } from '../../../shared/terrain';
import type { ModelRun } from '../../../simulation/runner';
import { PanelHelpButton } from '../HelpSystem';
import { useI18n } from '../I18nProvider';
import { WorldModelViewport } from '../WorldModelViewport';
import { getModelPresentationLabel, getPresentation } from './app-config';
import {
  formatAngle,
  formatDifference,
  formatDistance,
  formatMetres,
  formatPercent,
  getMetric,
  getStatusLabel,
  numberFormatterFor
} from './app-formatters';
import type { VisualLayerState } from './app-types';

export function ModelCard({
  scenarioId,
  metadata,
  run,
  inputs,
  atmosphereState,
  terrainProfile,
  terrainSourceLabel,
  visualLayers,
  onShowTrace
}: {
  scenarioId: SimulationScenarioId;
  metadata: ModelMetadata;
  run: ModelRun | undefined;
  inputs: SimulatorInputs;
  atmosphereState: AtmosphereExperimentState;
  terrainProfile: TerrainProfile | undefined;
  terrainSourceLabel: string;
  visualLayers: VisualLayerState;
  onShowTrace(): void;
}): React.JSX.Element {
  const { locale, t } = useI18n();
  const presentation = getPresentation(metadata.id);
  const modelLabel = getModelPresentationLabel(locale, metadata.id, metadata.name);
  const numberFormatter = numberFormatterFor(locale);
  const prediction = run?.prediction;
  const status = prediction?.status ?? 'indeterminate';
  const visibleFraction = getMetric(prediction, 'visibleFraction');
  const hiddenFraction = getMetric(prediction, 'hiddenFraction');
  const horizonDistanceM = getMetric(prediction, 'horizonSurfaceDistanceM');
  const targetAngleDeg = getMetric(prediction, 'targetTopElevationDeg');
  const terrainClearanceM = getMetric(prediction, 'terrainMinimumClearanceM');
  const observerTotalElevationM = getMetric(prediction, 'observerTotalElevationM');
  const effectiveRadiusM = getMetric(prediction, 'effectiveRadiusM');
  const warning = prediction?.warnings[0];
  const isProjection = metadata.id === 'azimuthal-projection';
  const isHorizon = scenarioId === 'horizon';
  const statusLabel = isHorizon && status !== 'unsupported'
    ? t('model.calculated')
    : getStatusLabel(locale, status);

  return (
    <article className={`model-card ${presentation.tone} ${isProjection ? 'projection-card' : ''}`}>
      <header>
        <h3>{modelLabel}</h3>
        <div className="model-header-actions">
          <PanelHelpButton panelId="model-visualization" />
          <button className="trace-button" disabled={!prediction} type="button" onClick={onShowTrace}>{t('model.trace')}</button>
          <span className={`status-pill status-${status}`}>{statusLabel}</span>
        </div>
      </header>
      <WorldModelViewport
        kind={presentation.shape === 'disk' ? 'plane' : presentation.shape}
        observerLatitudeDeg={inputs.observerLatitudeDeg}
        observerLongitudeDeg={inputs.observerLongitudeDeg}
        targetLatitudeDeg={inputs.targetLatitudeDeg}
        targetLongitudeDeg={inputs.targetLongitudeDeg}
        showGeographicBoundaries={visualLayers.geographicBoundaries}
        showTarget={!isHorizon}
        showTerrain={!isHorizon && visualLayers.terrain}
        showAtmosphere={visualLayers.atmosphere && atmosphereState.mode === 'profile' && metadata.id === 'ideal-sphere'}
        showGrid={visualLayers.grid}
        atmosphereState={atmosphereState}
        atmospherePrediction={prediction}
        observerAltitudeM={inputs.observerGroundElevationM + inputs.verticalDatumOffsetM + inputs.observerHeightM}
        targetTopAltitudeM={inputs.targetGroundElevationM + inputs.verticalDatumOffsetM + inputs.targetHeightM}
        targetSurfaceDistanceM={inputs.surfaceDistanceKm * 1_000}
        terrainProfile={isHorizon ? undefined : terrainProfile}
        terrainSourceLabel={terrainSourceLabel}
      />
      {isProjection ? (
        <div className="projection-explanation">
          <strong>{t('model.noCalculation')}</strong>
          <p>{t('model.unsupportedExplanation')}</p>
        </div>
      ) : isHorizon ? (
        <div className="horizon-analysis-view">
          <span className="horizon-analysis-observer" />
          <span className={`horizon-analysis-surface ${presentation.shape}`} />
          <span className="horizon-analysis-tangent" />
          <p>{t('model.horizonDefinitionNote')}</p>
        </div>
      ) : (
        <div className="profile-view">
          <div className="profile-label left">{t('model.observer')}<br /><b>{numberFormatter.format(inputs.observerGroundElevationM + inputs.observerHeightM)} m</b></div>
          <div className="profile-label right">{t('model.targetTop')}<br /><b>{numberFormatter.format(inputs.targetGroundElevationM + inputs.targetHeightM)} m</b></div>
          <span className="line-of-sight" /><span className={`surface ${presentation.shape}`} />
          {inputs.terrainMode !== 'off' && <span className="terrain-obstacle" title={t('model.manualTerrainProfile')} />}
        </div>
      )}
      <div className={`metric-grid ${isProjection ? 'unsupported-metrics' : ''} ${isHorizon ? 'horizon-metrics' : ''}`}>
        {isHorizon ? (
          <>
            <div><small>{t('metric.geometricHorizon')}</small><strong>{formatDistance(horizonDistanceM, metadata.id === 'defined-plane', locale)}</strong></div>
            <div><small>{t('metric.observerTotalElevation')}</small><strong>{formatMetres(observerTotalElevationM, locale)}</strong></div>
            <div><small>{t('metric.effectiveRadius')}</small><strong>{effectiveRadiusM === null ? (metadata.id === 'defined-plane' ? t('model.plane') : '—') : formatDistance(effectiveRadiusM, false, locale)}</strong></div>
            <div><small>{t('metric.scenario')}</small><strong>{statusLabel}</strong></div>
          </>
        ) : (
          <>
            <div><small>{t('metric.expectedVisibility')}</small><strong>{formatPercent(visibleFraction, locale)}</strong></div>
            <div><small>{t('metric.hiddenFraction')}</small><strong>{formatPercent(hiddenFraction, locale)}</strong></div>
            <div><small>{t('metric.horizonDistance')}</small><strong>{formatDistance(horizonDistanceM, metadata.id === 'defined-plane', locale)}</strong></div>
            <div><small>{terrainClearanceM === null ? t('metric.targetTopAngle') : t('metric.terrainClearance')}</small><strong>{terrainClearanceM === null ? formatAngle(targetAngleDeg, locale) : formatMetres(terrainClearanceM, locale)}</strong></div>
          </>
        )}
      </div>
      <div className="model-warning">{warning ?? metadata.assumptions[0]}</div>
    </article>
  );
}

export function ResultsTable({
  runs,
  scenarioId,
  onShowTrace
}: {
  runs: ModelRun[];
  scenarioId: SimulationScenarioId;
  onShowTrace(modelId: string): void;
}): React.JSX.Element {
  const { locale, t } = useI18n();

  if (scenarioId === 'horizon') {
    return (
      <section className="results panel">
        <div className="results-help-heading"><span className="eyebrow">{t('results.horizonComparison')}</span><PanelHelpButton panelId="results" /></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t('results.modelDisplay')}</th><th>{t('metric.geometricHorizon')}</th><th>{t('metric.observerTotalElevation')}</th><th>{t('metric.effectiveRadius')}</th><th>{t('results.status')}</th><th>{t('results.trace')}</th></tr></thead>
            <tbody>
              {simulationModels.map((model) => {
                const run = runs.find((candidate) => candidate.metadata.id === model.metadata.id);
                const prediction = run?.prediction;
                const presentation = getPresentation(model.metadata.id);
                const modelLabel = getModelPresentationLabel(locale, model.metadata.id, model.metadata.name);
                const status = prediction?.status ?? 'indeterminate';
                const isProjection = model.metadata.id === 'azimuthal-projection';
                const effectiveRadiusM = getMetric(prediction, 'effectiveRadiusM');
                return (
                  <tr className={isProjection ? 'projection-row' : ''} key={model.metadata.id}>
                    <td><span className={`model-dot ${presentation.tone}`} />{modelLabel}<small>{isProjection ? t('results.cartographicReference') : t('results.physicalModel')}</small></td>
                    <td>{formatDistance(getMetric(prediction, 'horizonSurfaceDistanceM'), model.metadata.id === 'defined-plane', locale)}</td>
                    <td>{formatMetres(getMetric(prediction, 'observerTotalElevationM'), locale)}</td>
                    <td>{effectiveRadiusM === null ? (model.metadata.id === 'defined-plane' ? t('model.plane') : '—') : formatDistance(effectiveRadiusM, false, locale)}</td>
                    <td>{status === 'unsupported' ? getStatusLabel(locale, status) : t('model.calculated')}</td>
                    <td><button className="table-trace-button" disabled={!prediction} type="button" onClick={() => onShowTrace(model.metadata.id)}>{t('results.open')}</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  return (
    <section className="results panel">
      <div className="results-help-heading"><span className="eyebrow">{t('results.comparison')}</span><PanelHelpButton panelId="results" /></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>{t('results.modelDisplay')}</th><th>{t('metric.expectedVisibility')}</th><th>{t('metric.hiddenFraction')}</th><th>{t('results.viewAngle')}</th><th>{t('results.horizon')}</th><th>{t('metric.terrainClearance')}</th><th>{t('results.observationDifference')}</th><th>{t('results.trace')}</th></tr></thead>
          <tbody>
            {simulationModels.map((model) => {
              const run = runs.find((candidate) => candidate.metadata.id === model.metadata.id);
              const prediction = run?.prediction;
              const presentation = getPresentation(model.metadata.id);
              const modelLabel = getModelPresentationLabel(locale, model.metadata.id, model.metadata.name);
              const status = prediction?.status ?? 'indeterminate';
              const isProjection = model.metadata.id === 'azimuthal-projection';
              return (
                <tr className={isProjection ? 'projection-row' : ''} key={model.metadata.id}>
                  <td><span className={`model-dot ${presentation.tone}`} />{modelLabel}<small>{isProjection ? `${t('results.cartographicReference')} · ` : `${t('results.physicalModel')} · `}{getStatusLabel(locale, status)}</small></td>
                  <td>{formatPercent(getMetric(prediction, 'visibleFraction'), locale)}</td>
                  <td>{formatPercent(getMetric(prediction, 'hiddenFraction'), locale)}</td>
                  <td>{formatAngle(getMetric(prediction, 'targetTopElevationDeg'), locale)}</td>
                  <td>{formatDistance(getMetric(prediction, 'horizonSurfaceDistanceM'), model.metadata.id === 'defined-plane', locale)}</td>
                  <td>{formatMetres(getMetric(prediction, 'terrainMinimumClearanceM'), locale)}</td>
                  <td>{formatDifference(getMetric(prediction, 'observationDifferencePp'), locale)}</td>
                  <td><button className="table-trace-button" disabled={!prediction} type="button" onClick={() => onShowTrace(model.metadata.id)}>{t('results.open')}</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
""", encoding="utf-8")

# ---------------------------------------------------------------------------
# Characterization tests
# ---------------------------------------------------------------------------
formatter_test = ROOT / "tests/app-formatters-i18n.test.ts"
replace_once(
    formatter_test,
    "  formatSignedPercentValue,\n  numberFormatterFor\n",
    "  formatSignedPercentValue,\n  getStatusLabel,\n  numberFormatterFor\n"
)
replace_once(
    formatter_test,
    "  it('keeps legacy Turkish defaults while allowing localized difference labels', () => {\n"
    "    expect(formatPercent(0.425)).toBe('%42,5');\n"
    "    expect(formatDifference(1.25)).toBe('1,25 puan');\n"
    "    expect(formatDifference(1.25, 'en')).toBe('1.25 pp');\n"
    "  });\n",
    "  it('keeps legacy Turkish defaults while allowing localized difference labels', () => {\n"
    "    expect(formatPercent(0.425)).toBe('%42,5');\n"
    "    expect(formatDifference(1.25)).toBe('1,25 puan');\n"
    "    expect(formatDifference(1.25, 'en')).toBe('1.25 pp');\n"
    "  });\n\n"
    "  it('localizes result status labels without changing status ids', () => {\n"
    "    expect(getStatusLabel('tr', 'compatible')).toBe('Gözlem aralığıyla uyumlu');\n"
    "    expect(getStatusLabel('en', 'compatible')).toBe('Compatible with observation range');\n"
    "    expect(getStatusLabel('en', 'unsupported')).toBe('Physical model rules are undefined');\n"
    "  });\n"
)

config_test = ROOT / "tests/app-config-i18n.test.ts"
replace_once(
    config_test,
    "  defaultExperimentName,\n  getDatumLabel,\n  getScenarioPresentation,\n  getSidebarModelLabel\n",
    "  defaultExperimentName,\n  getDatumLabel,\n  getModelPresentationLabel,\n  getScenarioPresentation,\n  getSidebarModelLabel\n"
)
replace_once(
    config_test,
    "  it('preserves existing Turkish model metadata labels while supplying English sidebar labels', () => {\n"
    "    expect(getSidebarModelLabel('tr', 'ideal-sphere', 'Mevcut Türkçe Ad')).toBe('Mevcut Türkçe Ad');\n"
    "    expect(getSidebarModelLabel('en', 'ideal-sphere', 'Mevcut Türkçe Ad')).toBe('Ideal Sphere');\n"
    "    expect(getSidebarModelLabel('en', 'unknown-model', 'Custom Model')).toBe('Custom Model');\n"
    "  });\n",
    "  it('preserves existing Turkish model metadata labels while supplying English renderer labels', () => {\n"
    "    expect(getModelPresentationLabel('tr', 'ideal-sphere', 'Mevcut Türkçe Ad')).toBe('Mevcut Türkçe Ad');\n"
    "    expect(getModelPresentationLabel('en', 'ideal-sphere', 'Mevcut Türkçe Ad')).toBe('Ideal Sphere');\n"
    "    expect(getModelPresentationLabel('en', 'defined-plane', 'Tanımlı Düzlem')).toBe('Defined Plane');\n"
    "    expect(getModelPresentationLabel('en', 'unknown-model', 'Custom Model')).toBe('Custom Model');\n"
    "    expect(getSidebarModelLabel('en', 'ideal-sphere', 'Mevcut Türkçe Ad')).toBe('Ideal Sphere');\n"
    "  });\n"
)

# ---------------------------------------------------------------------------
# Progress documentation
# ---------------------------------------------------------------------------
docs = ROOT / "docs/localization.md"
replace_once(
    docs,
    "- Core panel slice: visibility/horizon scenario summary, observation reference panels, vertical datum presentation and explicit locale-aware number/coordinate/bearing/percent formatting.\n\n"
    "Model result cards/tables, astronomy time card, specialized panels, dialogs, help/AI guidance and reports remain separate follow-up slices.\n",
    "- Core panel slice: visibility/horizon scenario summary, observation reference panels, vertical datum presentation and explicit locale-aware number/coordinate/bearing/percent formatting.\n"
    "- Model-results slice: physical/reference model labels, result status presentation, visibility/horizon model cards and comparison tables, all using active-locale human numeric formatting.\n\n"
    "Engine-emitted warnings/assumptions, astronomy time card, specialized panels, dialogs, help/AI guidance and reports remain separate follow-up slices.\n"
)

print("Applied i18n model-results slice successfully.")
