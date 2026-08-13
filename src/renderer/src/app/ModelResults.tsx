import { simulationModels } from '../../../models';
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
