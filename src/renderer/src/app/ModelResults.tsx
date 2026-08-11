import { simulationModels } from '../../../models';
import type { AtmosphereExperimentState } from '../../../shared/atmosphere';
import type { ModelMetadata } from '../../../shared/domain';
import type { SimulationScenarioId } from '../../../shared/scenario';
import type { SimulatorInputs } from '../../../shared/simulator';
import type { TerrainProfile } from '../../../shared/terrain';
import type { ModelRun } from '../../../simulation/runner';
import { PanelHelpButton } from '../HelpSystem';
import { WorldModelViewport } from '../WorldModelViewport';
import { getPresentation } from './app-config';
import {
  formatAngle,
  formatDifference,
  formatDistance,
  formatMetres,
  formatPercent,
  getMetric,
  numberFormatter,
  statusLabels
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
  const presentation = getPresentation(metadata.id);
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
  const statusLabel = isHorizon && status !== 'unsupported' ? 'Hesaplandı' : statusLabels[status];

  return (
    <article className={`model-card ${presentation.tone} ${isProjection ? 'projection-card' : ''}`}>
      <header>
        <h3>{metadata.name}</h3>
        <div className="model-header-actions">
          <PanelHelpButton panelId="model-visualization" />
          <button className="trace-button" disabled={!prediction} type="button" onClick={onShowTrace}>Hesap izi</button>
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
          <strong>Hesaplama yapılmadı</strong>
          <p>Yüzey geometrisi, yerel dikey yön ve ışık ilerleme kuralları tanımlanmadan sayısal sonuç üretilemez.</p>
        </div>
      ) : isHorizon ? (
        <div className="horizon-analysis-view">
          <span className="horizon-analysis-observer" />
          <span className={`horizon-analysis-surface ${presentation.shape}`} />
          <span className="horizon-analysis-tangent" />
          <p>Hedef ve rota kullanılmadan geometrik ufuk tanımı değerlendirilir.</p>
        </div>
      ) : (
        <div className="profile-view">
          <div className="profile-label left">Gözlemci<br /><b>{numberFormatter.format(inputs.observerGroundElevationM + inputs.observerHeightM)} m</b></div>
          <div className="profile-label right">Hedef tepesi<br /><b>{numberFormatter.format(inputs.targetGroundElevationM + inputs.targetHeightM)} m</b></div>
          <span className="line-of-sight" /><span className={`surface ${presentation.shape}`} />
          {inputs.terrainMode !== 'off' && <span className="terrain-obstacle" title="Manuel arazi profili" />}
        </div>
      )}
      <div className={`metric-grid ${isProjection ? 'unsupported-metrics' : ''} ${isHorizon ? 'horizon-metrics' : ''}`}>
        {isHorizon ? (
          <>
            <div><small>Geometrik ufuk</small><strong>{formatDistance(horizonDistanceM, metadata.id === 'defined-plane')}</strong></div>
            <div><small>Gözlemci toplam kotu</small><strong>{formatMetres(observerTotalElevationM)}</strong></div>
            <div><small>Etkin yarıçap</small><strong>{effectiveRadiusM === null ? (metadata.id === 'defined-plane' ? 'Düzlem' : '—') : formatDistance(effectiveRadiusM)}</strong></div>
            <div><small>Senaryo</small><strong>{statusLabel}</strong></div>
          </>
        ) : (
          <>
            <div><small>Beklenen görünürlük</small><strong>{formatPercent(visibleFraction)}</strong></div>
            <div><small>Gizlenen kısım</small><strong>{formatPercent(hiddenFraction)}</strong></div>
            <div><small>Ufuk mesafesi</small><strong>{formatDistance(horizonDistanceM, metadata.id === 'defined-plane')}</strong></div>
            <div><small>{terrainClearanceM === null ? 'Hedef tepe açısı' : 'Arazi açıklığı'}</small><strong>{terrainClearanceM === null ? formatAngle(targetAngleDeg) : formatMetres(terrainClearanceM)}</strong></div>
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
  if (scenarioId === 'horizon') {
    return (
      <section className="results panel">
        <div className="results-help-heading"><span className="eyebrow">Ufuk sonucu karşılaştırma</span><PanelHelpButton panelId="results" /></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Model / gösterim</th><th>Geometrik ufuk</th><th>Gözlemci toplam kotu</th><th>Etkin yarıçap</th><th>Durum</th><th>İz</th></tr></thead>
            <tbody>
              {simulationModels.map((model) => {
                const run = runs.find((candidate) => candidate.metadata.id === model.metadata.id);
                const prediction = run?.prediction;
                const presentation = getPresentation(model.metadata.id);
                const status = prediction?.status ?? 'indeterminate';
                const isProjection = model.metadata.id === 'azimuthal-projection';
                return (
                  <tr className={isProjection ? 'projection-row' : ''} key={model.metadata.id}>
                    <td><span className={`model-dot ${presentation.tone}`} />{model.metadata.name}<small>{isProjection ? 'Kartografik referans' : 'Fiziksel model'}</small></td>
                    <td>{formatDistance(getMetric(prediction, 'horizonSurfaceDistanceM'), model.metadata.id === 'defined-plane')}</td>
                    <td>{formatMetres(getMetric(prediction, 'observerTotalElevationM'))}</td>
                    <td>{getMetric(prediction, 'effectiveRadiusM') === null ? (model.metadata.id === 'defined-plane' ? 'Düzlem' : '—') : formatDistance(getMetric(prediction, 'effectiveRadiusM'))}</td>
                    <td>{status === 'unsupported' ? statusLabels[status] : 'Hesaplandı'}</td>
                    <td><button className="table-trace-button" disabled={!prediction} type="button" onClick={() => onShowTrace(model.metadata.id)}>Aç</button></td>
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
      <div className="results-help-heading"><span className="eyebrow">Sonuç karşılaştırma</span><PanelHelpButton panelId="results" /></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Model / gösterim</th><th>Beklenen görünürlük</th><th>Gizlenen</th><th>Görüş açısı</th><th>Ufuk</th><th>Arazi açıklığı</th><th>Gözlem farkı</th><th>İz</th></tr></thead>
          <tbody>
            {simulationModels.map((model) => {
              const run = runs.find((candidate) => candidate.metadata.id === model.metadata.id);
              const prediction = run?.prediction;
              const presentation = getPresentation(model.metadata.id);
              const status = prediction?.status ?? 'indeterminate';
              const isProjection = model.metadata.id === 'azimuthal-projection';
              return (
                <tr className={isProjection ? 'projection-row' : ''} key={model.metadata.id}>
                  <td><span className={`model-dot ${presentation.tone}`} />{model.metadata.name}<small>{isProjection ? 'Kartografik referans · ' : 'Fiziksel model · '}{statusLabels[status]}</small></td>
                  <td>{formatPercent(getMetric(prediction, 'visibleFraction'))}</td>
                  <td>{formatPercent(getMetric(prediction, 'hiddenFraction'))}</td>
                  <td>{formatAngle(getMetric(prediction, 'targetTopElevationDeg'))}</td>
                  <td>{formatDistance(getMetric(prediction, 'horizonSurfaceDistanceM'), model.metadata.id === 'defined-plane')}</td>
                  <td>{formatMetres(getMetric(prediction, 'terrainMinimumClearanceM'))}</td>
                  <td>{formatDifference(getMetric(prediction, 'observationDifferencePp'))}</td>
                  <td><button className="table-trace-button" disabled={!prediction} type="button" onClick={() => onShowTrace(model.metadata.id)}>Aç</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
