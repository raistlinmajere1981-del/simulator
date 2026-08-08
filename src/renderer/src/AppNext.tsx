import { useCallback, useEffect, useMemo, useState } from 'react';
import { simulationModels } from '../../models';
import {
  createDefaultAtmosphereExperimentState,
  type AtmosphereExperimentState,
  type AtmosphereMode
} from '../../shared/atmosphere';
import type {
  ExperimentDefinition,
  ModelMetadata,
  ModelPrediction,
  ResultStatus
} from '../../shared/domain';
import type { SavedPhotoCalibration } from '../../shared/photo-calibration';
import { systemUtcOffsetMinutes } from '../../shared/celestial-time';
import type { HelpPanelId } from '../../shared/help-content';
import type {
  ExperimentSetupApplication,
  TextExperimentSetupProvenance
} from '../../shared/text-experiment-setup';
import {
  DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS,
  hasDefinedModelInputUncertainty,
  type ModelInputUncertaintySettings
} from '../../shared/uncertainty';
import {
  DEFAULT_SIMULATOR_INPUTS,
  type DistanceSource,
  type ImportedDemTerrainProfile,
  type ImportedGeoJsonTerrainProfile,
  type TerrainProfileImport,
  type SavedExperiment,
  type SimulatorInputs,
  type TerrainMode,
  type TerrainProfileSource
} from '../../shared/simulator';
import type {
  ManualTerrainPoint,
  TerrainProfile,
  VerticalDatumKind
} from '../../shared/terrain';
import {
  VISIBILITY_SCENARIOS,
  SUN_MOON_SCENARIO,
  getSimulationScenario,
  normalizeSimulationScenarioId,
  type SimulationScenarioId
} from '../../shared/scenario';
import {
  inverseWgs84Geodesic,
  type GeodesicResult
} from '../../simulation/geodesy';
import {
  GEOID_CONVERSION_MODEL_ID,
  type GeoidConversionApplication
} from '../../simulation/geoid-conversion-provenance';
import {
  buildManualTerrainProfile,
  migrateLegacyManualTerrainPoint
} from '../../simulation/manual-terrain-profile';
import { applyImportedTerrainInputs } from '../../simulation/terrain-import-application';
import {
  runSimulationModels,
  type ModelRun
} from '../../simulation/runner';
import {
  atmosphereStateFromLegacyStandardFlag,
  cloneAtmosphereExperimentState
} from '../../simulation/atmosphere-persistence';
import {
  PHOTO_CALIBRATION_MODEL_ID,
  PHOTO_CALIBRATION_MODEL_VERSION,
  type PhotoCalibrationRecord
} from '../../simulation/photo-calibration';
import {
  PHOTO_ANGULAR_COMPARISON_MODEL_VERSION,
  comparePhotoAngularObservation,
  normalizePhotoReferenceKind
} from '../../simulation/photo-angular-comparison';
import {
  propagateModelAngularUncertainty,
  type ModelAngularUncertaintyResult
} from '../../simulation/photo-model-uncertainty';
import { calculateSolarPosition } from '../../simulation/solar-position';
import { createSolarPositionPrediction, solarPositionMetadata } from '../../simulation/solar-position-prediction';
import {
  WATER_SURFACE_APPLICATION_MODEL_ID,
  type WaterSurfaceApplicationResult
} from '../../simulation/water-surface-application';
import {
  WATER_SURFACE_OBSERVATION_MODEL_ID,
  type WaterSurfaceObservationRecord
} from '../../simulation/water-surface-observation';
import {
  markWaterSurfaceApplicationHistorical,
  readStoredWaterSurfaceState,
  type StoredWaterSurfaceRecord
} from '../../simulation/water-surface-ui-state';
import {
  DataManagerDialog,
  SaveExperimentDialog,
  TraceDialog
} from './dialogs';
import {
  MultiPointTerrainEditor,
  type TerrainProfileImportOptions
} from './MultiPointTerrainEditor';
import { GeoidConversionControl } from './GeoidConversionControl';
import { AtmosphereProfileControl } from './AtmosphereProfileControl';
import { WaterSurfaceControl } from './WaterSurfaceControl';
import { PhotoCalibrationControl } from './PhotoCalibrationControl';
import { PhotoAngularComparisonPanel } from './PhotoAngularComparisonPanel';
import { PhotoModelUncertaintyControl } from './PhotoModelUncertaintyControl';
import { WorldModelViewport } from './WorldModelViewport';
import { HelpOverlay, HelpProvider, PanelHelpButton } from './HelpSystem';
import { TextExperimentSetupDialog } from './TextExperimentSetupDialog';
import { CelestialTimeCard } from './CelestialTimeCard';
import { SolarPositionPanel } from './SolarPositionPanel';
import { SolarScenarioSummary } from './SolarScenarioSummary';

type ModelTone = 'green' | 'amber' | 'violet';
type ModelShape = 'globe' | 'disk' | 'gleason';
type NumericInputKey = Exclude<
  keyof SimulatorInputs,
  | 'useStandardRefraction'
  | 'distanceSource'
  | 'terrainMode'
  | 'verticalDatumKind'
>;

interface ModelPresentation {
  tone: ModelTone;
  shape: ModelShape;
}

interface ScenarioDefinition {
  id?: SimulationScenarioId;
  label: string;
  icon: string;
  enabled: boolean;
}

interface GeoidConversionRecordState {
  prediction: ModelPrediction;
  modelVersion: string;
}

interface PhotoCalibrationRecordState {
  prediction: ModelPrediction;
  modelVersion: string;
}

interface VisualLayerState {
  geographicBoundaries: boolean;
  terrain: boolean;
  atmosphere: boolean;
  grid: boolean;
}

const scenarios: ScenarioDefinition[] = [
  ...VISIBILITY_SCENARIOS.map((scenario) => ({
    id: scenario.id,
    label: scenario.label,
    icon: scenario.icon,
    enabled: true
  })),
  { ...SUN_MOON_SCENARIO, enabled: true },
  { label: 'Yıldız Gözlemleri', icon: '✦', enabled: false },
  { label: 'Tutulma Simülasyonları', icon: '◐', enabled: false }
];

const presentationByModelId: Record<string, ModelPresentation> = {
  'ideal-sphere': { tone: 'green', shape: 'globe' },
  'defined-plane': { tone: 'amber', shape: 'disk' },
  'azimuthal-projection': { tone: 'violet', shape: 'gleason' }
};

const datumLabels: Record<VerticalDatumKind, string> = {
  'orthometric-msl': 'Ortalama deniz seviyesi',
  'ellipsoidal-wgs84': 'WGS84 elipsoidal yükseklik',
  local: 'Yerel düşey referans'
};

const geodesicMetadata: ModelMetadata = {
  id: 'wgs84-geodesic',
  name: 'WGS84 Jeodezik Çözüm',
  version: '0.1.0',
  description: 'İki koordinat arasındaki elipsoidal yüzey mesafesi ve uç azimutları.',
  capabilities: ['surface-distance'],
  assumptions: [
    'Referans elipsoidi WGS84’tür.',
    'Ters problem Vincenty iterasyonuyla çözülür.'
  ]
};

const waterObservationMetadata: ModelMetadata = {
  id: WATER_SURFACE_OBSERVATION_MODEL_ID,
  name: 'Su Yüzeyi Gözlem Kaydı',
  version: '0.1.0',
  description: 'Su seviyesi, gelgit, dalga bağlamı ve düşey belirsizlik provenansı.',
  capabilities: ['water-surface-observation'],
  assumptions: ['Su yüzeyi seçilen düşey datumda yorumlanır.']
};

const waterApplicationMetadata: ModelMetadata = {
  id: WATER_SURFACE_APPLICATION_MODEL_ID,
  name: 'Su Yüzeyi Fiziksel Uygulaması',
  version: '0.1.0',
  description: 'Kayıtlı su yüzeyini seçilen deney uç kotlarına kontrollü uygular.',
  capabilities: ['water-surface-application'],
  assumptions: ['Uygulama yalnız seçilen uç zemin kotlarını değiştirir.']
};

const statusLabels: Record<ResultStatus, string> = {
  compatible: 'Gözlem aralığıyla uyumlu',
  incompatible: 'Gözlem aralığıyla uyumsuz',
  indeterminate: 'Belirsizlik içinde karar verilemedi',
  unsupported: 'Fiziksel model kuralları tanımsız'
};

const inputRanges: Record<NumericInputKey, { min: number; max: number }> = {
  observerHeightM: { min: 0, max: 100_000 },
  targetHeightM: { min: 0.1, max: 100_000 },
  observerGroundElevationM: { min: -12_000, max: 100_000 },
  targetGroundElevationM: { min: -12_000, max: 100_000 },
  verticalDatumOffsetM: { min: -1_000, max: 1_000 },
  terrainIntermediateDistancePercent: { min: 0.001, max: 99.999 },
  terrainIntermediateElevationM: { min: -12_000, max: 100_000 },
  surfaceDistanceKm: { min: 0, max: 20_000 },
  observerLatitudeDeg: { min: -90, max: 90 },
  observerLongitudeDeg: { min: -180, max: 180 },
  targetLatitudeDeg: { min: -90, max: 90 },
  targetLongitudeDeg: { min: -180, max: 180 },
  observedVisiblePercent: { min: 0, max: 100 },
  observationUncertaintyPercent: { min: 0, max: 100 },
  refractionCoefficient: { min: -1, max: 0.99 }
};

const numberFormatter = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 2
});
const coordinateFormatter = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 6
});
const bearingFormatter = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 3
});

function getPresentation(modelId: string): ModelPresentation {
  return presentationByModelId[modelId] ?? { tone: 'violet', shape: 'gleason' };
}

function getMetric(
  prediction: ModelPrediction | undefined,
  key: string
): number | null {
  return prediction?.metrics.find((metric) => metric.key === key)?.value ?? null;
}

function formatPercent(fraction: number | null): string {
  return fraction === null ? '—' : `%${numberFormatter.format(fraction * 100)}`;
}

function formatDistance(distanceM: number | null, infinite = false): string {
  if (distanceM === null) return infinite ? '∞' : '—';
  return `${numberFormatter.format(distanceM / 1_000)} km`;
}

function formatMetres(valueM: number | null): string {
  return valueM === null ? '—' : `${numberFormatter.format(valueM)} m`;
}

function formatAngle(angleDeg: number | null): string {
  return angleDeg === null ? '—' : `${numberFormatter.format(angleDeg)}°`;
}

function formatDifference(differencePp: number | null): string {
  return differencePp === null
    ? '—'
    : `${numberFormatter.format(differencePp)} puan`;
}

function clampInputValue(key: NumericInputKey, value: number): number {
  const range = inputRanges[key];
  return Math.min(range.max, Math.max(range.min, value));
}

function defaultExperimentName(scenarioId: SimulationScenarioId): string {
  return `${getSimulationScenario(scenarioId).label} ${new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date())}`;
}

function defaultTerrainPoints(inputs = DEFAULT_SIMULATOR_INPUTS): ManualTerrainPoint[] {
  return migrateLegacyManualTerrainPoint(
    inputs.terrainIntermediateDistancePercent,
    inputs.terrainIntermediateElevationM
  );
}

function buildTerrainProfile(
  inputs: SimulatorInputs,
  effectiveDistanceM: number,
  manualTerrainPoints: ManualTerrainPoint[]
): TerrainProfile | undefined {
  if (inputs.terrainMode === 'off' || effectiveDistanceM <= 0) return undefined;

  return buildManualTerrainProfile({
    id: 'interactive-manual-points',
    label: `Manuel ${manualTerrainPoints.length} ara noktalı profil`,
    datum: {
      kind: inputs.verticalDatumKind,
      label: datumLabels[inputs.verticalDatumKind],
      offsetM: inputs.verticalDatumOffsetM
    },
    totalDistanceM: effectiveDistanceM,
    observerGroundElevationM: inputs.observerGroundElevationM,
    targetGroundElevationM: inputs.targetGroundElevationM,
    points: manualTerrainPoints
  });
}

function geodesicPrediction(result: GeodesicResult | undefined): ModelPrediction | undefined {
  if (!result) return undefined;
  return {
    modelId: geodesicMetadata.id,
    experimentId: 'interactive-target-visibility',
    status: result.method === 'vincenty' ? 'compatible' : 'indeterminate',
    metrics: [
      { key: 'surfaceDistanceM', label: 'WGS84 yüzey mesafesi', value: result.distanceM, unit: 'm' },
      { key: 'initialBearingDeg', label: 'Başlangıç azimutu', value: result.initialBearingDeg, unit: 'deg' },
      { key: 'finalBearingDeg', label: 'Varış azimutu', value: result.finalBearingDeg, unit: 'deg' },
      { key: 'iterations', label: 'İterasyon sayısı', value: result.iterations, unit: 'count' }
    ],
    warnings: result.warnings,
    traceId: result.traceId,
    trace: result.trace
  };
}

function Sidebar({
  experiments,
  activeScenarioId,
  atmosphereMode,
  visualLayers,
  observedAtIso,
  observationUtcOffsetMinutes,
  onScenarioChange,
  onLoadExperiment,
  onVisualLayerChange,
  onObservationTimeChange
}: {
  experiments: SavedExperiment[];
  activeScenarioId: SimulationScenarioId;
  atmosphereMode: AtmosphereMode;
  visualLayers: VisualLayerState;
  observedAtIso: string;
  observationUtcOffsetMinutes: number;
  onScenarioChange(scenarioId: SimulationScenarioId): void;
  onObservationTimeChange(observedAtIso: string, utcOffsetMinutes: number): void;
  onLoadExperiment(experiment: SavedExperiment): void;
  onVisualLayerChange(key: keyof VisualLayerState, enabled: boolean): void;
}): React.JSX.Element {
  return (
    <aside className="sidebar">
      <section className="side-section">
        <div className="section-heading">
          <span>Test senaryoları</span>
          <span className="section-state">{scenarios.filter((scenario) => scenario.enabled).length} / {scenarios.length} hazır</span>
        </div>
        <nav className="scenario-list">
          {scenarios.map((scenario) => {
            const isActive = scenario.id === activeScenarioId;
            return (
              <button
                className={!scenario.enabled ? 'unavailable' : isActive ? 'active' : 'available'}
                disabled={!scenario.enabled}
                key={scenario.label}
                title={!scenario.enabled
                  ? 'Bu deney henüz uygulanmadı'
                  : getSimulationScenario(scenario.id!).description}
                type="button"
                onClick={() => scenario.id && onScenarioChange(scenario.id)}
              >
                <span className="nav-icon">{scenario.icon}</span>
                <span className="nav-label">{scenario.label}</span>
                <span className="nav-state">{!scenario.enabled ? 'YAKINDA' : isActive ? 'AKTİF' : 'HAZIR'}</span>
              </button>
            );
          })}
        </nav>
      </section>

      <section className="side-section compact">
        <div className="section-heading">
          <span>Kaydedilen deneyler</span>
          <span className="section-state">{experiments.length} kayıt</span>
        </div>
        {experiments.length === 0 ? (
          <div className="saved-empty">Henüz yerel kayıt yok.</div>
        ) : (
          experiments.slice(0, 3).map((experiment) => (
            <button
              className="saved-experiment-button"
              key={experiment.id}
              type="button"
              title={experiment.name}
              onClick={() => onLoadExperiment(experiment)}
            >
              <span>{experiment.name}</span>
              <b>↗</b>
            </button>
          ))
        )}
      </section>

      <section className="side-section compact">
        <div className="section-heading">
          <span>Modeller</span>
          <span className="section-state">{activeScenarioId === 'sun-moon-observation' ? '1 astronomik referans' : '2 fiziksel'}</span>
        </div>
        {activeScenarioId === 'sun-moon-observation' ? (
          <div className="model-toggle reference-model">
            <span className="model-dot amber" />
            <span>Güneş Konumu · Astronomik Referans</span>
            <span className="reference-badge">REFERANS</span>
          </div>
        ) : (<>
          {simulationModels.map((model) => {
            const presentation = getPresentation(model.metadata.id);
            const isProjection = model.metadata.id === 'azimuthal-projection';
            return (
              <div className={`model-toggle ${isProjection ? 'reference-model' : ''}`} key={model.metadata.id}>
                <span className={`model-dot ${presentation.tone}`} />
                <span>{model.metadata.name}</span>
                {isProjection ? <span className="reference-badge">REFERANS</span> : <span className="enabled-dot" title="Hesaplamaya dahil" />}
              </div>
            );
          })}
          <div className="model-toggle future-model"><span className="model-dot coral" /><span>Toroidal Model</span><span className="future-badge">YAKINDA</span></div>
          <div className="model-toggle future-model"><span className="model-dot blue" /><span>İçbükey Dünya</span><span className="future-badge">YAKINDA</span></div>
        </>)}
      </section>

      {activeScenarioId === 'sun-moon-observation' ? (
        <section className="side-section compact grow celestial-visual-placeholder">
          <div className="section-heading">
            <span>Görsel katmanlar</span>
            <span className="section-state">astronomi · sonraki dilim</span>
          </div>
          <div className="saved-empty">
            Güneş gökyüzü/ufuk görselleştirme katmanları daha sonraki astronomi aşamasında etkinleşecek. 6.1 sonucu şu anda sayısal geometrik referanstır.
          </div>
        </section>
      ) : (
      <section className="side-section compact grow">
        <div className="section-heading">
          <span>Görsel katmanlar</span>
          <span className="section-state">4 / 5 hazır</span>
        </div>
        <label className="switch-row">
          <span>Kıta / Ülke Sınırları</span>
          <input
            type="checkbox"
            checked={visualLayers.geographicBoundaries}
            onChange={(event) => onVisualLayerChange('geographicBoundaries', event.currentTarget.checked)}
          />
          <span className="switch" />
        </label>
        <label
          className={`switch-row ${activeScenarioId === 'horizon' ? 'unavailable-layer' : ''}`}
          title={activeScenarioId === 'horizon'
            ? 'Ufuk Analizi yerel arazi profilini kullanmaz'
            : 'Arazi profili etkin olduğunda rota boyunca göreli yükselti şeridini gösterir'}
        >
          <span>Topografya Görselleştirme</span>
          <input
            type="checkbox"
            disabled={activeScenarioId === 'horizon'}
            checked={activeScenarioId !== 'horizon' && visualLayers.terrain}
            onChange={(event) => onVisualLayerChange('terrain', event.currentTarget.checked)}
          />
          <span className="switch" />
        </label>
        <label className="switch-row unavailable-layer">
          <span>Gece Işıkları</span><input type="checkbox" disabled /><span className="switch" />
        </label>
        <label
          className={`switch-row ${atmosphereMode !== 'profile' ? 'unavailable-layer' : ''}`}
          title={atmosphereMode === 'profile'
            ? 'Ölçülmüş atmosfer katmanlarını ve İdeal Küre optik ışın yolunu görselleştirir'
            : 'Atmosfer Profili görsel katmanı için Katmanlı profil modunu seçin'}
        >
          <span>Atmosfer Profili</span>
          <input
            type="checkbox"
            disabled={atmosphereMode !== 'profile'}
            checked={atmosphereMode === 'profile' && visualLayers.atmosphere}
            onChange={(event) => onVisualLayerChange('atmosphere', event.currentTarget.checked)}
          />
          <span className="switch" />
        </label>
        <label className="switch-row">
          <span>Izgara</span>
          <input
            type="checkbox"
            checked={visualLayers.grid}
            onChange={(event) => onVisualLayerChange('grid', event.currentTarget.checked)}
          />
          <span className="switch" />
        </label>
      </section>
      )}

      <CelestialTimeCard
        active={activeScenarioId === 'sun-moon-observation'}
        observedAtIso={observedAtIso}
        utcOffsetMinutes={observationUtcOffsetMinutes}
        onChange={onObservationTimeChange}
      />
    </aside>
  );
}

function NumericField({
  inputKey,
  label,
  unit,
  step,
  inputs,
  disabled,
  onNumberChange
}: {
  inputKey: NumericInputKey;
  label: string;
  unit: string;
  step: number;
  inputs: SimulatorInputs;
  disabled?: boolean;
  onNumberChange(key: NumericInputKey, value: number): void;
}): React.JSX.Element {
  return (
    <label className="input-field">
      <span>{label}</span>
      <div>
        <input
          disabled={disabled}
          min={inputRanges[inputKey].min}
          max={inputRanges[inputKey].max}
          step={step}
          type="number"
          value={inputs[inputKey]}
          onChange={(event) => onNumberChange(inputKey, event.currentTarget.valueAsNumber)}
        />
        <b>{unit}</b>
      </div>
    </label>
  );
}

function ScenarioSummary({
  scenarioId,
  activeName,
  inputs,
  atmosphereMode,
  effectiveDistanceKm,
  geodesic,
  isDirty,
  onDistanceSourceChange,
  onDatumChange,
  onNumberChange,
  onReset,
  onSave,
  onShowGeodesicTrace
}: {
  scenarioId: SimulationScenarioId;
  activeName: string;
  inputs: SimulatorInputs;
  atmosphereMode: AtmosphereMode;
  effectiveDistanceKm: number;
  geodesic: GeodesicResult | undefined;
  isDirty: boolean;
  onDistanceSourceChange(source: DistanceSource): void;
  onDatumChange(kind: VerticalDatumKind): void;
  onNumberChange(key: NumericInputKey, value: number): void;
  onReset(): void;
  onSave(): void;
  onShowGeodesicTrace(): void;
}): React.JSX.Element {
  const scenario = getSimulationScenario(scenarioId);
  const isHorizon = scenarioId === 'horizon';
  return (
    <section className="scenario-summary panel coordinate-summary">
      <div className="panel-title-row">
        <div>
          <span className="eyebrow">Aktif senaryo</span>
          <h2>{activeName || scenario.label}</h2>
        </div>
        <div className="title-actions">
          <PanelHelpButton panelId="scenario-summary" />
          {isDirty && <span className="dirty-badge">KAYDEDİLMEDİ</span>}
          <button className="save-button" onClick={onSave} type="button">Deneyi Kaydet</button>
          <button className="reset-button" onClick={onReset} type="button">Yeni / Varsayılan</button>
          <span className="calculation-badge">CANLI HESAPLAMA</span>
        </div>
      </div>

      <div className={`input-grid base-input-grid ${isHorizon ? 'horizon-input-grid' : ''}`}>
        <NumericField inputKey="observerHeightM" label="Göz yüksekliği" unit="m" step={0.1} inputs={inputs} onNumberChange={onNumberChange} />
        {isHorizon ? (
          <>
            <NumericField inputKey="observerGroundElevationM" label="Gözlemci zemin kotu" unit="m" step={0.1} inputs={inputs} onNumberChange={onNumberChange} />
            <NumericField inputKey="verticalDatumOffsetM" label="Datum / yerel ofset" unit="m" step={0.1} inputs={inputs} onNumberChange={onNumberChange} />
            <label className="input-field horizon-datum-field">
              <span>Düşey datum</span>
              <select value={inputs.verticalDatumKind} onChange={(event) => onDatumChange(event.currentTarget.value as VerticalDatumKind)}>
                <option value="orthometric-msl">Ortalama deniz seviyesi</option>
                <option value="ellipsoidal-wgs84">WGS84 elipsoidal</option>
                <option value="local">Yerel düşey datum</option>
              </select>
            </label>
          </>
        ) : (
          <>
            <NumericField inputKey="targetHeightM" label="Hedef yüksekliği" unit="m" step={0.1} inputs={inputs} onNumberChange={onNumberChange} />
            <NumericField inputKey="observedVisiblePercent" label="Gözlenen görünürlük" unit="%" step={1} inputs={inputs} onNumberChange={onNumberChange} />
            <NumericField inputKey="observationUncertaintyPercent" label="Gözlem belirsizliği" unit="±%" step={1} inputs={inputs} onNumberChange={onNumberChange} />
          </>
        )}
        <NumericField inputKey="refractionCoefficient" label="Kırılma katsayısı" unit="k" step={0.01} inputs={inputs} disabled={atmosphereMode !== 'standard'} onNumberChange={onNumberChange} />
      </div>

      {!isHorizon && <div className="distance-source-panel">
        <div className="distance-source-heading">
          <div>
            <span className="eyebrow">Mesafe kaynağı</span>
            <strong>{inputs.distanceSource === 'manual' ? 'Elle girilen yüzey mesafesi' : 'WGS84 koordinat çözümü'}</strong>
          </div>
          <div className="distance-mode-buttons">
            <button className={inputs.distanceSource === 'manual' ? 'selected' : ''} type="button" onClick={() => onDistanceSourceChange('manual')}>Manuel</button>
            <button className={inputs.distanceSource === 'coordinates' ? 'selected' : ''} type="button" onClick={() => onDistanceSourceChange('coordinates')}>Koordinat</button>
          </div>
        </div>

        {inputs.distanceSource === 'manual' ? (
          <div className="manual-distance-row">
            <NumericField inputKey="surfaceDistanceKm" label="Yüzey mesafesi" unit="km" step={0.01} inputs={inputs} onNumberChange={onNumberChange} />
            <p>Bu değer bütün modellerin ortak deney mesafesi olarak kullanılır.</p>
          </div>
        ) : (
          <>
            <div className="coordinate-grid">
              <NumericField inputKey="observerLatitudeDeg" label="Gözlemci enlemi" unit="°" step={0.000001} inputs={inputs} onNumberChange={onNumberChange} />
              <NumericField inputKey="observerLongitudeDeg" label="Gözlemci boylamı" unit="°" step={0.000001} inputs={inputs} onNumberChange={onNumberChange} />
              <NumericField inputKey="targetLatitudeDeg" label="Hedef enlemi" unit="°" step={0.000001} inputs={inputs} onNumberChange={onNumberChange} />
              <NumericField inputKey="targetLongitudeDeg" label="Hedef boylamı" unit="°" step={0.000001} inputs={inputs} onNumberChange={onNumberChange} />
            </div>
            <div className={`geodesic-summary ${geodesic?.method === 'spherical-fallback' ? 'fallback' : ''}`}>
              <div><small>WGS84 mesafesi</small><strong>{numberFormatter.format(effectiveDistanceKm)} km</strong></div>
              <div><small>Başlangıç azimutu</small><strong>{geodesic ? `${bearingFormatter.format(geodesic.initialBearingDeg)}°` : '—'}</strong></div>
              <div><small>Varış azimutu</small><strong>{geodesic ? `${bearingFormatter.format(geodesic.finalBearingDeg)}°` : '—'}</strong></div>
              <div><small>Çözüm</small><strong>{geodesic?.method === 'vincenty' ? `Vincenty · ${geodesic.iterations} iterasyon` : 'Küresel yedek'}</strong></div>
              <button type="button" onClick={onShowGeodesicTrace}>Jeodezik hesap izi</button>
            </div>
            <p className="coordinate-note">
              Gözlemci {coordinateFormatter.format(inputs.observerLatitudeDeg)}°, {coordinateFormatter.format(inputs.observerLongitudeDeg)}° · Hedef {coordinateFormatter.format(inputs.targetLatitudeDeg)}°, {coordinateFormatter.format(inputs.targetLongitudeDeg)}°
            </p>
          </>
        )}
      </div>}

      {isHorizon && (
        <p className="scenario-scope-note">
          Ufuk Analizi hedef, rota ve arazi profilini kullanmaz. Sonuç yalnız gözlemci toplam kotu,
          seçilen yüzey geometrisi ve desteklenen atmosfer varsayımından üretilir.
        </p>
      )}

      <div className="refraction-control">
        <span>Atmosfer modu: {atmosphereMode === 'off' ? 'Kapalı' : atmosphereMode === 'standard' ? 'Standart k' : 'Katmanlı profil'} · ayrıntılar aşağıdaki Atmosfer panelinden yönetilir.</span>
      </div>
    </section>
  );
}

function ObservationPanel({ inputs }: { inputs: SimulatorInputs }): React.JSX.Element {
  return (
    <section className="observation panel">
      <div className="observation-heading">
        <span className="eyebrow">Gözlem referansı</span>
        <span className="reference-mode">SAYISAL GİRDİ</span>
      </div>
      <div className="observation-image">
        <div className="reticle">＋</div>
        <div className="ship"><span /><i /><b /></div>
        <div className="scale">5°<br />2,5°<br />0°<br />−2,5°</div>
      </div>
      <div className="observation-meta">
        <span>Gözlenen: %{numberFormatter.format(inputs.observedVisiblePercent)}</span>
        <span>Belirsizlik: ±%{numberFormatter.format(inputs.observationUncertaintyPercent)}</span>
        <span>Fotoğraf ölçümü aşağıdaki kalibrasyon panelinden eklenebilir.</span>
      </div>
      <p className="engine-note">
        Görsel açıklayıcıdır. Karşılaştırma, sayısal görünürlük ve belirsizlik girdileriyle yapılır.
      </p>
    </section>
  );
}

function HorizonReferencePanel({ inputs, atmosphereMode }: { inputs: SimulatorInputs; atmosphereMode: AtmosphereMode }): React.JSX.Element {
  const observerTotalElevationM = inputs.observerGroundElevationM +
    inputs.verticalDatumOffsetM + inputs.observerHeightM;
  return (
    <section className="observation panel horizon-reference-panel">
      <div className="observation-heading">
        <span className="eyebrow">Ufuk deney özeti</span>
        <span className="reference-mode">GEOMETRİK HESAP</span>
      </div>
      <div className="horizon-reference-visual">
        <span className="horizon-reference-observer" />
        <span className="horizon-reference-tangent" />
        <span className="horizon-reference-arc" />
      </div>
      <div className="horizon-reference-metrics">
        <div><small>Toplam gözlemci kotu</small><strong>{formatMetres(observerTotalElevationM)}</strong></div>
        <div><small>Düşey datum</small><strong>{datumLabels[inputs.verticalDatumKind]}</strong></div>
        <div><small>Atmosfer</small><strong>{atmosphereMode === 'standard' ? `Standart k=${numberFormatter.format(inputs.refractionCoefficient)}` : atmosphereMode === 'profile' ? 'Katmanlı profil' : 'Kapalı'}</strong></div>
      </div>
      <p className="engine-note">Bu senaryoda hedef görünürlük yüzdesi ölçümü yapılmaz; modellerin geometrik ufuk tanımları karşılaştırılır.</p>
    </section>
  );
}

function isImportedDemTerrainProfile(
  profile: TerrainProfileImport
): profile is ImportedDemTerrainProfile {
  return 'kind' in profile && profile.kind === 'dem';
}

function isImportedGeoJsonTerrainProfile(
  profile: TerrainProfileImport
): profile is ImportedGeoJsonTerrainProfile {
  return 'kind' in profile && profile.kind === 'geojson';
}

function isCsvTerrainProfileSource(
  source: TerrainProfileSource
): source is Extract<TerrainProfileSource, { kind: 'csv' }> {
  return source.kind === 'csv';
}

function terrainVisualizationSourceLabel(source: TerrainProfileSource | undefined): string {
  if (!source) return 'Manuel profil';
  if (source.kind === 'dem') return `DEM · ${source.fileName}`;
  if (source.kind === 'geojson') return `GeoJSON · ${source.fileName}`;
  return `CSV · ${source.fileName}`;
}

function TerrainPanel({
  experimentId,
  inputs,
  points,
  source,
  effectiveDistanceKm,
  criticalDistanceM,
  allowRouteDistanceImport,
  allowDemImport,
  onDatumChange,
  onModeChange,
  onNumberChange,
  onPointsChange,
  onApplyGeoidConversion,
  onApplyImport
}: {
  experimentId: string;
  inputs: SimulatorInputs;
  points: ManualTerrainPoint[];
  source: TerrainProfileSource | undefined;
  effectiveDistanceKm: number;
  criticalDistanceM: number | null;
  allowRouteDistanceImport: boolean;
  allowDemImport: boolean;
  onDatumChange(kind: VerticalDatumKind): void;
  onModeChange(mode: TerrainMode): void;
  onNumberChange(key: NumericInputKey, value: number): void;
  onPointsChange(points: ManualTerrainPoint[]): void;
  onApplyGeoidConversion(application: GeoidConversionApplication): void;
  onApplyImport(
    profile: TerrainProfileImport,
    options: TerrainProfileImportOptions
  ): void;
}): React.JSX.Element {
  const terrainEnabled = inputs.terrainMode !== 'off';
  return (
    <section className={`terrain-panel panel ${terrainEnabled ? 'enabled' : ''}`}>
      <div className="terrain-heading">
        <div>
          <span className="eyebrow">Düşey referans ve arazi</span>
          <strong>{terrainEnabled ? `${points.length} ara noktalı manuel profil` : 'Yalnız uç zemin kotları'}</strong>
        </div>
        <div className="terrain-mode-buttons">
          <PanelHelpButton panelId="terrain-datum" />
          <button className={!terrainEnabled ? 'selected' : ''} type="button" onClick={() => onModeChange('off')}>Profil kapalı</button>
          <button className={terrainEnabled ? 'selected' : ''} type="button" onClick={() => onModeChange('manual-points')}>Manuel profil</button>
        </div>
      </div>

      <div className="terrain-control-grid terrain-control-grid-compact">
        <label className="input-field terrain-select">
          <span>Düşey datum</span>
          <select
            value={inputs.verticalDatumKind}
            onChange={(event) => onDatumChange(event.currentTarget.value as VerticalDatumKind)}
          >
            {Object.entries(datumLabels).map(([kind, label]) => (
              <option key={kind} value={kind}>{label}</option>
            ))}
          </select>
        </label>
        <NumericField inputKey="observerGroundElevationM" label="Gözlemci zemin kotu" unit="m" step={0.1} inputs={inputs} onNumberChange={onNumberChange} />
        <NumericField inputKey="targetGroundElevationM" label="Hedef taban kotu" unit="m" step={0.1} inputs={inputs} onNumberChange={onNumberChange} />
        <NumericField inputKey="verticalDatumOffsetM" label="Datum / gelgit ofseti" unit="m" step={0.01} inputs={inputs} onNumberChange={onNumberChange} />
      </div>

      <p className="terrain-summary">
        {datumLabels[inputs.verticalDatumKind]} · ofset {numberFormatter.format(inputs.verticalDatumOffsetM)} m · gözlemci mutlak göz kotu {numberFormatter.format(inputs.observerGroundElevationM + inputs.verticalDatumOffsetM + inputs.observerHeightM)} m · hedef tepe kotu {numberFormatter.format(inputs.targetGroundElevationM + inputs.verticalDatumOffsetM + inputs.targetHeightM)} m
        {terrainEnabled && ` · ${points.length} ara nokta · ${numberFormatter.format(effectiveDistanceKm)} km rota`}
      </p>

      <GeoidConversionControl
        experimentId={experimentId}
        currentDatum={inputs.verticalDatumKind}
        observerGroundElevationM={inputs.observerGroundElevationM}
        targetGroundElevationM={inputs.targetGroundElevationM}
        points={points}
        onApply={onApplyGeoidConversion}
      />

      {source && (
        <div className={`terrain-source-strip ${source.modifiedAfterImport ? 'modified' : ''}`}>
          <div>
            <strong>{source.kind === 'csv' ? 'CSV kaynağı' : source.kind === 'geojson' ? 'GeoJSON kaynağı' : 'DEM kaynağı'}: {source.fileName}</strong>
            {source.kind === 'csv' ? (
              <span>{source.distanceColumnHeader} → mesafe · {source.elevationColumnHeader} → yükseklik · {source.rowCount} satır</span>
            ) : source.kind === 'geojson' ? (
              <span>
                {source.coordinateCount} koordinat · WGS84 LineString · Z → yükseklik
                {source.appliedRouteCoordinates === true ? ' · deney koordinatlarına uygulandı' : ''}
              </span>
            ) : (
              <span>
                {source.sampleCount} rota örneği ({source.sampleCountMode === 'manual' ? 'manuel' : 'otomatik'}) · {source.columnCount} × {source.rowCount} grid · {source.samplingMethod === 'bilinear' ? 'iki doğrusal' : 'en yakın hücre'}
                {source.diagnosticStatus ? ` · tanı: ${source.diagnosticStatus === 'good' ? 'iyi' : source.diagnosticStatus === 'caution' ? 'dikkat' : 'sınırlı'}` : ''}
              </span>
            )}
          </div>
          <span>
            {source.sha256 ? `SHA-256 ${source.sha256.slice(0, 12)}… · ` : ''}
            {source.modifiedAfterImport ? 'İÇE AKTARIMDAN SONRA DÜZENLENDİ' : 'KAYNAKLA EŞLEŞİYOR'}
          </span>
        </div>
      )}

      {terrainEnabled && (
        <MultiPointTerrainEditor
          points={points}
          routeDistanceKm={effectiveDistanceKm}
          allowRouteDistanceImport={allowRouteDistanceImport}
          allowDemImport={allowDemImport}
          observerLatitudeDeg={inputs.observerLatitudeDeg}
          observerLongitudeDeg={inputs.observerLongitudeDeg}
          targetLatitudeDeg={inputs.targetLatitudeDeg}
          targetLongitudeDeg={inputs.targetLongitudeDeg}
          observerGroundElevationM={inputs.observerGroundElevationM}
          targetGroundElevationM={inputs.targetGroundElevationM}
          observerHeightM={inputs.observerHeightM}
          targetHeightM={inputs.targetHeightM}
          verticalDatumOffsetM={inputs.verticalDatumOffsetM}
          useStandardRefraction={inputs.useStandardRefraction}
          refractionCoefficient={inputs.refractionCoefficient}
          criticalDistanceM={criticalDistanceM}
          onChange={onPointsChange}
          onApplyImport={onApplyImport}
        />
      )}
    </section>
  );
}

function ModelCard({
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

function ResultsTable({
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

export function AppNext(): React.JSX.Element {
  const [inputs, setInputs] = useState<SimulatorInputs>(DEFAULT_SIMULATOR_INPUTS);
  const [atmosphereState, setAtmosphereState] = useState<AtmosphereExperimentState>(() =>
    createDefaultAtmosphereExperimentState(DEFAULT_SIMULATOR_INPUTS.useStandardRefraction ? 'standard' : 'off')
  );
  const [activeScenarioId, setActiveScenarioId] = useState<SimulationScenarioId>('target-visibility');
  const [manualTerrainPoints, setManualTerrainPoints] = useState<ManualTerrainPoint[]>(
    defaultTerrainPoints()
  );
  const [terrainProfileSource, setTerrainProfileSource] = useState<TerrainProfileSource>();
  const [geoidConversionRecord, setGeoidConversionRecord] = useState<GeoidConversionRecordState>();
  const [waterObservationRecord, setWaterObservationRecord] = useState<StoredWaterSurfaceRecord>();
  const [waterApplicationRecord, setWaterApplicationRecord] = useState<StoredWaterSurfaceRecord>();
  const [photoCalibration, setPhotoCalibration] = useState<SavedPhotoCalibration>();
  const [photoCalibrationRecord, setPhotoCalibrationRecord] = useState<PhotoCalibrationRecordState>();
  const [photoModelUncertainty, setPhotoModelUncertainty] = useState<ModelInputUncertaintySettings>(() => ({
    ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS
  }));
  const [modelAngularUncertaintyById, setModelAngularUncertaintyById] = useState<Record<string, ModelAngularUncertaintyResult>>({});
  const [isAngularUncertaintyCalculating, setIsAngularUncertaintyCalculating] = useState(false);
  const [modelUncertaintyError, setModelUncertaintyError] = useState<string>();
  const [runs, setRuns] = useState<ModelRun[]>([]);
  const [savedExperiments, setSavedExperiments] = useState<SavedExperiment[]>([]);
  const [activeExperimentId, setActiveExperimentId] = useState(() => crypto.randomUUID());
  const [activeExperimentName, setActiveExperimentName] = useState('');
  const [experimentObservedAtIso, setExperimentObservedAtIso] = useState(() => new Date().toISOString());
  const [observationUtcOffsetMinutes, setObservationUtcOffsetMinutes] = useState(() => systemUtcOffsetMinutes());
  const [isCalculating, setIsCalculating] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [dataManagerOpen, setDataManagerOpen] = useState(false);
  const [traceModelId, setTraceModelId] = useState<string>();
  const [storageMessage, setStorageMessage] = useState('');
  const [helpPanelId, setHelpPanelId] = useState<HelpPanelId>();
  const [helpCatalogOpen, setHelpCatalogOpen] = useState(false);
  const [textSetupOpen, setTextSetupOpen] = useState(false);
  const [textSetupHistory, setTextSetupHistory] = useState<TextExperimentSetupProvenance[]>([]);
  const [visualLayers, setVisualLayers] = useState<VisualLayerState>({
    geographicBoundaries: true,
    terrain: false,
    atmosphere: false,
    grid: true
  });

  const openHelpPanel = useCallback((panelId: HelpPanelId): void => {
    setHelpCatalogOpen(false);
    setHelpPanelId(panelId);
  }, []);
  const openHelpCatalog = useCallback((): void => {
    setHelpPanelId(undefined);
    setHelpCatalogOpen(true);
  }, []);
  const closeHelp = useCallback((): void => {
    setHelpPanelId(undefined);
    setHelpCatalogOpen(false);
  }, []);

  const geodesic = useMemo(() => {
    if (activeScenarioId === 'sun-moon-observation' || inputs.distanceSource !== 'coordinates') return undefined;
    return inverseWgs84Geodesic(
      { latitudeDeg: inputs.observerLatitudeDeg, longitudeDeg: inputs.observerLongitudeDeg },
      { latitudeDeg: inputs.targetLatitudeDeg, longitudeDeg: inputs.targetLongitudeDeg }
    );
  }, [
    inputs.distanceSource,
    inputs.observerLatitudeDeg,
    inputs.observerLongitudeDeg,
    inputs.targetLatitudeDeg,
    inputs.targetLongitudeDeg,
    activeScenarioId
  ]);

  const effectiveDistanceKm = inputs.distanceSource === 'coordinates' && geodesic
    ? geodesic.distanceM / 1_000
    : inputs.surfaceDistanceKm;
  const effectiveInputs = useMemo<SimulatorInputs>(() => ({
    ...inputs,
    surfaceDistanceKm: effectiveDistanceKm
  }), [effectiveDistanceKm, inputs]);
  const terrainProfile = useMemo(
    () => buildTerrainProfile(inputs, effectiveDistanceKm * 1_000, manualTerrainPoints),
    [effectiveDistanceKm, inputs, manualTerrainPoints]
  );

  const experiment = useMemo<ExperimentDefinition>(() => {
    const scenario = getSimulationScenario(activeScenarioId);
    const observer = {
      latitudeDeg: inputs.observerLatitudeDeg,
      longitudeDeg: inputs.observerLongitudeDeg,
      elevationM: inputs.observerGroundElevationM + inputs.verticalDatumOffsetM,
      eyeHeightM: inputs.observerHeightM
    };

    if (activeScenarioId === 'sun-moon-observation') {
      return {
        id: activeExperimentId,
        title: activeExperimentName || 'Etkileşimli güneş gözlemi',
        type: 'celestial',
        observer,
        observedAtIso: experimentObservedAtIso,
        measurements: {}
      };
    }

    if (activeScenarioId === 'horizon') {
      const horizonExperiment: ExperimentDefinition = {
        id: activeExperimentId,
        title: activeExperimentName || `Etkileşimli ${scenario.label.toLocaleLowerCase('tr-TR')} deneyi`,
        type: 'horizon',
        observer,
        observedAtIso: experimentObservedAtIso,
        measurements: {}
      };
      return horizonExperiment;
    }

    const targetExperiment: ExperimentDefinition = {
      id: activeExperimentId,
      title: activeExperimentName || `Etkileşimli ${scenario.label.toLocaleLowerCase('tr-TR')} deneyi`,
      type: 'target-visibility',
      observer,
      target: {
        label: 'Hedef',
        latitudeDeg: inputs.targetLatitudeDeg,
        longitudeDeg: inputs.targetLongitudeDeg,
        elevationM: inputs.targetGroundElevationM + inputs.verticalDatumOffsetM,
        heightM: inputs.targetHeightM
      },
      terrainProfile,
      observedAtIso: experimentObservedAtIso,
      measurements: {
        surfaceDistanceM: { value: effectiveDistanceKm * 1_000, uncertainty: inputs.distanceSource === 'coordinates' ? 0.01 : 20, unit: 'm' },
        visibleFraction: { value: inputs.observedVisiblePercent / 100, uncertainty: inputs.observationUncertaintyPercent / 100, unit: 'fraction' }
      }
    };
    return targetExperiment;
  }, [activeExperimentId, activeExperimentName, activeScenarioId, effectiveDistanceKm, experimentObservedAtIso, inputs, terrainProfile]);

  const solarPosition = useMemo(() => activeScenarioId === 'sun-moon-observation'
    ? calculateSolarPosition({
        observedAtIso: experimentObservedAtIso,
        latitudeDeg: inputs.observerLatitudeDeg,
        longitudeDeg: inputs.observerLongitudeDeg
      })
    : undefined, [activeScenarioId, experimentObservedAtIso, inputs.observerLatitudeDeg, inputs.observerLongitudeDeg]);
  const solarPositionPrediction = useMemo(() => solarPosition
    ? createSolarPositionPrediction(activeExperimentId, solarPosition)
    : undefined, [activeExperimentId, solarPosition]);

  const context = useMemo(() => ({
    atmosphereMode: atmosphereState.mode,
    refractionCoefficient: inputs.refractionCoefficient,
    ...(atmosphereState.mode === 'profile' ? {
      atmosphereProfile: atmosphereState.profile,
      opticalAtmosphereSettings: atmosphereState.opticalSettings,
      rayTraceStepM: atmosphereState.rayTraceStepM
    } : {})
  }), [atmosphereState, inputs.refractionCoefficient]);

  useEffect(() => {
    void window.simulatorDesktop.listExperiments()
      .then(setSavedExperiments)
      .catch((error: unknown) => {
        setStorageMessage(error instanceof Error ? error.message : 'Kayıtlar okunamadı.');
      });
  }, []);

  useEffect(() => {
    if (activeScenarioId === 'sun-moon-observation') {
      setRuns([]);
      setIsCalculating(false);
      return;
    }
    let cancelled = false;
    setIsCalculating(true);
    void runSimulationModels(simulationModels, experiment, context).then((nextRuns) => {
      if (!cancelled) {
        setRuns(nextRuns);
        setIsCalculating(false);
      }
    });
    return () => { cancelled = true; };
  }, [activeScenarioId, context, experiment]);

  const modelInputUncertaintyDefined = hasDefinedModelInputUncertainty(photoModelUncertainty);

  useEffect(() => {
    if (!photoCalibrationRecord || !modelInputUncertaintyDefined || runs.length === 0) {
      setModelAngularUncertaintyById({});
      setIsAngularUncertaintyCalculating(false);
      setModelUncertaintyError(undefined);
      return;
    }

    let cancelled = false;
    setIsAngularUncertaintyCalculating(true);
    setModelUncertaintyError(undefined);
    const timer = window.setTimeout(() => {
      void Promise.all(simulationModels.map(async (model) => {
        const run = runs.find((candidate) => candidate.metadata.id === model.metadata.id);
        if (!run || run.prediction.status === 'unsupported') return undefined;
        const result = await propagateModelAngularUncertainty({
          model,
          baselinePrediction: run.prediction,
          experiment,
          context,
          settings: photoModelUncertainty
        });
        return [model.metadata.id, result] as const;
      })).then((entries) => {
        if (cancelled) return;
        setModelAngularUncertaintyById(Object.fromEntries(
          entries.filter((entry): entry is readonly [string, ModelAngularUncertaintyResult] => entry !== undefined)
        ));
        setIsAngularUncertaintyCalculating(false);
      }).catch((error: unknown) => {
        if (cancelled) return;
        setModelAngularUncertaintyById({});
        setModelUncertaintyError(error instanceof Error ? error.message : 'Model belirsizliği yayılamadı.');
        setIsAngularUncertaintyCalculating(false);
      });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [context, experiment, modelInputUncertaintyDefined, photoCalibrationRecord, photoModelUncertainty, runs]);

  const modelUncertaintyReady = !photoCalibrationRecord || !modelInputUncertaintyDefined || (
    !isAngularUncertaintyCalculating &&
    modelUncertaintyError === undefined &&
    runs.filter((run) => run.prediction.status !== 'unsupported').every(
      (run) => modelAngularUncertaintyById[run.metadata.id] !== undefined
    )
  );

  const photoReferenceKind = normalizePhotoReferenceKind(photoCalibration?.referenceKind);
  const photoAngularComparisons = useMemo(() => {
    if (!photoCalibrationRecord || !modelUncertaintyReady) return [];
    return runs.map((run) => comparePhotoAngularObservation({
      experimentId: activeExperimentId,
      sourceModelId: run.metadata.id,
      sourceModelName: run.metadata.name,
      modelPrediction: run.prediction,
      photoPrediction: photoCalibrationRecord.prediction,
      referenceKind: photoReferenceKind,
      ...(modelInputUncertaintyDefined && modelAngularUncertaintyById[run.metadata.id]
        ? { modelUncertainty: modelAngularUncertaintyById[run.metadata.id] }
        : {})
    }));
  }, [activeExperimentId, modelAngularUncertaintyById, modelInputUncertaintyDefined, modelUncertaintyReady, photoCalibrationRecord, photoReferenceKind, runs]);

  const markTerrainSourceModified = (): void => {
    setTerrainProfileSource((current) => current
      ? { ...current, modifiedAfterImport: true }
      : current);
  };

  const markGeoidConversionModified = (): void => {
    const warning = 'Jeoit dönüşümünden sonra datum veya arazi kotları değiştirildi; kayıt tarihsel işlem provenansı olarak korunuyor.';
    setGeoidConversionRecord((current) => current
      ? {
          ...current,
          prediction: {
            ...current.prediction,
            status: 'indeterminate',
            warnings: current.prediction.warnings.includes(warning)
              ? current.prediction.warnings
              : [...current.prediction.warnings, warning]
          }
        }
      : current);
  };

  const markWaterApplicationModified = (): void => {
    setWaterApplicationRecord((current) => markWaterSurfaceApplicationHistorical(current));
  };

  const updateInputs = (updater: (current: SimulatorInputs) => SimulatorInputs): void => {
    setInputs(updater);
    setIsDirty(true);
  };

  const applyTextExperimentSetup = (application: ExperimentSetupApplication): void => {
    const nextScenario = application.scenarioId;
    const scenarioChanged = nextScenario !== undefined && nextScenario !== activeScenarioId;
    const changed = application.inputChanges;
    const terrainRelevant = changed.surfaceDistanceKm !== undefined || changed.distanceSource !== undefined ||
      changed.observerLatitudeDeg !== undefined || changed.observerLongitudeDeg !== undefined ||
      changed.targetLatitudeDeg !== undefined || changed.targetLongitudeDeg !== undefined ||
      changed.observerGroundElevationM !== undefined || changed.targetGroundElevationM !== undefined;
    const verticalRelevant = changed.verticalDatumKind !== undefined || changed.verticalDatumOffsetM !== undefined ||
      changed.observerGroundElevationM !== undefined || changed.targetGroundElevationM !== undefined;

    if (terrainRelevant) markTerrainSourceModified();
    if (verticalRelevant) {
      markGeoidConversionModified();
      markWaterApplicationModified();
    }

    if (scenarioChanged && nextScenario) {
      setActiveScenarioId(nextScenario);
      setActiveExperimentId(crypto.randomUUID());
      setActiveExperimentName('');
      setExperimentObservedAtIso(new Date().toISOString());
      setObservationUtcOffsetMinutes(systemUtcOffsetMinutes());
      setGeoidConversionRecord(undefined);
      setWaterObservationRecord(undefined);
      setWaterApplicationRecord(undefined);
      setPhotoCalibration(undefined);
      setPhotoCalibrationRecord(undefined);
      setPhotoModelUncertainty({ ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS, ...application.modelUncertaintyChanges });
      setModelAngularUncertaintyById({});
      setModelUncertaintyError(undefined);
      setTextSetupHistory([application.provenance]);
    } else {
      if (Object.keys(application.modelUncertaintyChanges).length > 0) {
        setPhotoModelUncertainty((current) => ({ ...current, ...application.modelUncertaintyChanges }));
      }
      setTextSetupHistory((current) => [...current, application.provenance].slice(-50));
    }

    setInputs((current) => ({ ...current, ...application.inputChanges }));
    if (application.atmosphereMode) {
      setAtmosphereState((current) => ({ ...current, mode: application.atmosphereMode! }));
    }
    setIsDirty(true);
    const count = application.provenance.appliedFields.length;
    setStorageMessage(`Metinden hazırlanan taslaktan ${count} alan uygulandı.`);
  };

  const updateTerrainPoints = (points: ManualTerrainPoint[]): void => {
    setManualTerrainPoints(points);
    markTerrainSourceModified();
    markGeoidConversionModified();
    setIsDirty(true);
  };

  const applyGeoidConversion = (application: GeoidConversionApplication): void => {
    markWaterApplicationModified();
    setInputs((current) => ({
      ...current,
      verticalDatumKind: application.targetDatum,
      observerGroundElevationM: application.observerGroundElevationM,
      targetGroundElevationM: application.targetGroundElevationM
    }));
    setManualTerrainPoints(application.points);
    setGeoidConversionRecord({
      prediction: application.prediction,
      modelVersion: application.modelVersion
    });
    markTerrainSourceModified();
    setIsDirty(true);
    setStorageMessage(
      `Bütün zemin ve arazi kotları ${datumLabels[application.targetDatum]} datumuna dönüştürüldü; provenans kayda hazır.`
    );
  };

  const recordWaterSurface = (record: WaterSurfaceObservationRecord): void => {
    setWaterObservationRecord({
      prediction: record.prediction,
      modelVersion: record.modelVersion
    });
    setWaterApplicationRecord(undefined);
    setIsDirty(true);
    setStorageMessage('Su yüzeyi gözlem kaydı deneye eklendi.');
  };

  const applyWaterSurface = (result: WaterSurfaceApplicationResult): void => {
    setInputs((current) => ({
      ...current,
      observerGroundElevationM: result.observerGroundElevationM,
      targetGroundElevationM: result.targetGroundElevationM
    }));
    setWaterApplicationRecord({
      prediction: result.prediction,
      modelVersion: result.modelVersion
    });
    markTerrainSourceModified();
    markGeoidConversionModified();
    setIsDirty(true);
    setStorageMessage(`Su yüzeyi ${numberFormatter.format(result.appliedWaterSurfaceM)} m olarak seçilen uçlara uygulandı.`);
  };

  const handleNumberChange = (key: NumericInputKey, value: number): void => {
    if (!Number.isFinite(value)) return;
    if (key === 'observerGroundElevationM' ||
      key === 'targetGroundElevationM' ||
      key === 'surfaceDistanceKm' ||
      key === 'observerLatitudeDeg' ||
      key === 'observerLongitudeDeg' ||
      key === 'targetLatitudeDeg' ||
      key === 'targetLongitudeDeg') {
      markTerrainSourceModified();
    }
    if (key === 'observerGroundElevationM' || key === 'targetGroundElevationM') {
      markGeoidConversionModified();
      markWaterApplicationModified();
    }
    if (key === 'verticalDatumOffsetM') {
      markWaterApplicationModified();
    }
    updateInputs((current) => ({ ...current, [key]: clampInputValue(key, value) }));
  };

  const applyTerrainImport = (
    profile: TerrainProfileImport,
    options: TerrainProfileImportOptions
  ): void => {
    const appliedRouteCoordinates = Boolean(
      options.applyRouteCoordinates && isImportedGeoJsonTerrainProfile(profile)
    );
    const appliedRouteDistance = Boolean(
      !appliedRouteCoordinates &&
      options.applyRouteDistance &&
      inputs.distanceSource === 'manual' &&
      profile.sourceDistanceM !== null
    );
    const commonSource = {
      fileName: profile.fileName,
      importedAtIso: new Date().toISOString(),
      sourceDistanceM: profile.sourceDistanceM,
      observerEndpointElevationM: profile.observerEndpointElevationM,
      targetEndpointElevationM: profile.targetEndpointElevationM,
      appliedObserverEndpoint: options.applyObserverEndpoint,
      appliedTargetEndpoint: options.applyTargetEndpoint,
      appliedRouteDistance,
      appliedRouteCoordinates,
      ...(profile.fileSizeBytes !== undefined && profile.sha256 !== undefined
        ? { fileSizeBytes: profile.fileSizeBytes, sha256: profile.sha256 }
        : {}),
      modifiedAfterImport: false
    };
    const source: TerrainProfileSource = isImportedDemTerrainProfile(profile)
      ? {
          ...commonSource,
          kind: 'dem',
          format: profile.format,
          samplingMethod: profile.samplingMethod,
          geodesicMethod: profile.geodesicMethod,
          columnCount: profile.columnCount,
          rowCount: profile.rowCount,
          sampleCount: profile.sampleCount,
          sampleCountMode: profile.sampleCountMode,
          sampleSpacingM: profile.sampleSpacingM,
          cellSizeDeg: profile.cellSizeDeg,
          noDataValue: profile.noDataValue,
          westBoundaryDeg: profile.westBoundaryDeg,
          eastBoundaryDeg: profile.eastBoundaryDeg,
          southBoundaryDeg: profile.southBoundaryDeg,
          northBoundaryDeg: profile.northBoundaryDeg,
          diagnosticStatus: profile.diagnosticStatus,
          effectiveCellSpanM: profile.effectiveCellSpanM,
          sampleSpacingToCellRatio: profile.sampleSpacingToCellRatio,
          minimumCoverageMarginM: profile.minimumCoverageMarginM,
          coverageMarginCellRatio: profile.coverageMarginCellRatio,
          minimumElevationM: profile.minimumElevationM,
          maximumElevationM: profile.maximumElevationM,
          elevationRangeM: profile.elevationRangeM
        }
      : isImportedGeoJsonTerrainProfile(profile)
        ? {
            ...commonSource,
            kind: 'geojson',
            geometryType: profile.geometryType,
            coordinateCount: profile.coordinateCount,
            startLongitudeDeg: profile.startLongitudeDeg,
            startLatitudeDeg: profile.startLatitudeDeg,
            endLongitudeDeg: profile.endLongitudeDeg,
            endLatitudeDeg: profile.endLatitudeDeg,
            elevationSource: profile.elevationSource
          }
        : {
            ...commonSource,
            kind: 'csv',
            delimiter: profile.delimiter,
            distanceUnit: profile.distanceUnit,
            rowCount: profile.rowCount,
            distanceColumnHeader: profile.distanceColumnHeader,
            elevationColumnHeader: profile.elevationColumnHeader
          };

    if (options.applyObserverEndpoint || options.applyTargetEndpoint) {
      markWaterApplicationModified();
    }
    setManualTerrainPoints(profile.points);
    setInputs((current) => applyImportedTerrainInputs(current, profile, options));
    setTerrainProfileSource(source);
    setGeoidConversionRecord(undefined);
    setIsDirty(true);
  };

  const loadExperiment = (saved: SavedExperiment): void => {
    const geoidPrediction = saved.predictions.find(
      (prediction) => prediction.modelId === GEOID_CONVERSION_MODEL_ID
    );
    const storedWater = readStoredWaterSurfaceState(saved.predictions, saved.modelVersions);
    const photoPrediction = saved.predictions.find(
      (prediction) => prediction.modelId === PHOTO_CALIBRATION_MODEL_ID
    );
    setActiveScenarioId(normalizeSimulationScenarioId(saved.scenarioId));
    setInputs(saved.inputs);
    setAtmosphereState(saved.atmosphere
      ? cloneAtmosphereExperimentState(saved.atmosphere)
      : atmosphereStateFromLegacyStandardFlag(saved.inputs.useStandardRefraction));
    setManualTerrainPoints(saved.manualTerrainPoints ?? defaultTerrainPoints(saved.inputs));
    setTerrainProfileSource(saved.terrainProfileSource);
    setGeoidConversionRecord(geoidPrediction
      ? {
          prediction: geoidPrediction,
          modelVersion: saved.modelVersions[GEOID_CONVERSION_MODEL_ID] ?? 'bilinmiyor'
        }
      : undefined);
    setWaterObservationRecord(storedWater.observation);
    setWaterApplicationRecord(storedWater.application);
    setPhotoCalibration(saved.photoCalibration);
    setPhotoModelUncertainty(saved.photoModelUncertainty ?? { ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS });
    setTextSetupHistory(saved.textSetupHistory ?? []);
    setPhotoCalibrationRecord(photoPrediction
      ? {
          prediction: photoPrediction,
          modelVersion: saved.modelVersions[PHOTO_CALIBRATION_MODEL_ID] ?? PHOTO_CALIBRATION_MODEL_VERSION
        }
      : undefined);
    setActiveExperimentId(saved.id);
    setActiveExperimentName(saved.name);
    setExperimentObservedAtIso(saved.observedAtIso ?? saved.createdAtIso);
    setObservationUtcOffsetMinutes(saved.observationUtcOffsetMinutes ?? systemUtcOffsetMinutes(new Date(saved.observedAtIso ?? saved.createdAtIso)));
    setIsDirty(false);
    setStorageMessage(`“${saved.name}” açıldı.`);
  };

  const saveExperiment = async (name: string): Promise<void> => {
    if (!modelUncertaintyReady) {
      setStorageMessage('Model girdi belirsizliği hesabı tamamlanmadan deney kaydedilmedi.');
      return;
    }
    const now = new Date().toISOString();
    const existing = savedExperiments.find((item) => item.id === activeExperimentId);
    const record: SavedExperiment = {
      id: activeExperimentId,
      name,
      createdAtIso: existing?.createdAtIso ?? now,
      updatedAtIso: now,
      observedAtIso: experimentObservedAtIso,
      observationUtcOffsetMinutes,
      scenarioId: activeScenarioId,
      atmosphere: cloneAtmosphereExperimentState(atmosphereState),
      ...(photoCalibration ? { photoCalibration } : {}),
      ...(modelInputUncertaintyDefined ? { photoModelUncertainty } : {}),
      ...(textSetupHistory.length > 0 ? { textSetupHistory } : {}),
      inputs,
      manualTerrainPoints,
      terrainProfileSource,
      geodesic,
      modelVersions: Object.fromEntries([
        ...simulationModels.map((model) => [model.metadata.id, model.metadata.version] as const),
        [geodesicMetadata.id, geodesicMetadata.version],
        ...(solarPositionPrediction
          ? [[solarPositionMetadata.id, solarPositionMetadata.version] as const]
          : []),
        ...(geoidConversionRecord
          ? [[GEOID_CONVERSION_MODEL_ID, geoidConversionRecord.modelVersion] as const]
          : []),
        ...(waterObservationRecord
          ? [[WATER_SURFACE_OBSERVATION_MODEL_ID, waterObservationRecord.modelVersion] as const]
          : []),
        ...(waterApplicationRecord
          ? [[WATER_SURFACE_APPLICATION_MODEL_ID, waterApplicationRecord.modelVersion] as const]
          : []),
        ...(photoCalibrationRecord
          ? [[PHOTO_CALIBRATION_MODEL_ID, photoCalibrationRecord.modelVersion] as const]
          : []),
        ...photoAngularComparisons.map((comparison) => [
          comparison.prediction.modelId,
          PHOTO_ANGULAR_COMPARISON_MODEL_VERSION
        ] as const)
      ]),
      predictions: [
        ...(solarPositionPrediction ? [solarPositionPrediction] : []),
        ...runs.map((run) => run.prediction),
        ...(geoidConversionRecord ? [geoidConversionRecord.prediction] : []),
        ...(waterObservationRecord ? [waterObservationRecord.prediction] : []),
        ...(waterApplicationRecord ? [waterApplicationRecord.prediction] : []),
        ...(photoCalibrationRecord ? [photoCalibrationRecord.prediction] : []),
        ...photoAngularComparisons.map((comparison) => comparison.prediction)
      ]
    };

    try {
      const saved = await window.simulatorDesktop.saveExperiment(record);
      const savedGeoidPrediction = saved.predictions.find(
        (prediction) => prediction.modelId === GEOID_CONVERSION_MODEL_ID
      );
      const savedWater = readStoredWaterSurfaceState(saved.predictions, saved.modelVersions);
      const savedPhotoPrediction = saved.predictions.find(
        (prediction) => prediction.modelId === PHOTO_CALIBRATION_MODEL_ID
      );
      setSavedExperiments((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setActiveExperimentId(saved.id);
      setActiveExperimentName(saved.name);
      setExperimentObservedAtIso(saved.observedAtIso ?? saved.createdAtIso);
    setObservationUtcOffsetMinutes(saved.observationUtcOffsetMinutes ?? systemUtcOffsetMinutes(new Date(saved.observedAtIso ?? saved.createdAtIso)));
      setAtmosphereState(saved.atmosphere
        ? cloneAtmosphereExperimentState(saved.atmosphere)
        : atmosphereStateFromLegacyStandardFlag(saved.inputs.useStandardRefraction));
      setManualTerrainPoints(saved.manualTerrainPoints ?? manualTerrainPoints);
      setTerrainProfileSource(saved.terrainProfileSource);
      setGeoidConversionRecord(savedGeoidPrediction
        ? {
            prediction: savedGeoidPrediction,
            modelVersion: saved.modelVersions[GEOID_CONVERSION_MODEL_ID] ??
              geoidConversionRecord?.modelVersion ?? 'bilinmiyor'
          }
        : undefined);
      setWaterObservationRecord(savedWater.observation);
      setWaterApplicationRecord(savedWater.application);
      setPhotoCalibration(saved.photoCalibration);
      setPhotoModelUncertainty(saved.photoModelUncertainty ?? { ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS });
      setTextSetupHistory(saved.textSetupHistory ?? []);
      setPhotoCalibrationRecord(savedPhotoPrediction
        ? {
            prediction: savedPhotoPrediction,
            modelVersion: saved.modelVersions[PHOTO_CALIBRATION_MODEL_ID] ?? PHOTO_CALIBRATION_MODEL_VERSION
          }
        : undefined);
      setIsDirty(false);
      setSaveDialogOpen(false);
      setStorageMessage(`“${saved.name}” cihazda kaydedildi.`);
    } catch (error) {
      setStorageMessage(error instanceof Error ? error.message : 'Deney kaydedilemedi.');
    }
  };

  const deleteExperiment = async (saved: SavedExperiment): Promise<void> => {
    try {
      const deleted = await window.simulatorDesktop.deleteExperiment(saved.id);
      if (!deleted) return;
      setSavedExperiments((current) => current.filter((item) => item.id !== saved.id));
      if (activeExperimentId === saved.id) {
        setActiveExperimentId(crypto.randomUUID());
        setActiveExperimentName('');
        setExperimentObservedAtIso(new Date().toISOString());
      setObservationUtcOffsetMinutes(systemUtcOffsetMinutes());
        setAtmosphereState(createDefaultAtmosphereExperimentState('standard'));
        setGeoidConversionRecord(undefined);
        setWaterObservationRecord(undefined);
        setWaterApplicationRecord(undefined);
        setPhotoCalibration(undefined);
        setPhotoCalibrationRecord(undefined);
        setPhotoModelUncertainty({ ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS });
        setTextSetupHistory([]);
        setModelAngularUncertaintyById({});
        setModelUncertaintyError(undefined);
        setIsDirty(true);
      }
      setStorageMessage(`“${saved.name}” silindi.`);
    } catch (error) {
      setStorageMessage(error instanceof Error ? error.message : 'Deney silinemedi.');
    }
  };

  const exportExperiment = async (saved: SavedExperiment): Promise<void> => {
    try {
      const result = await window.simulatorDesktop.exportExperiment(saved.id);
      setStorageMessage(result.message);
    } catch (error) {
      setStorageMessage(error instanceof Error ? error.message : 'Deney dışa aktarılamadı.');
    }
  };

  const importExperiment = async (): Promise<void> => {
    try {
      const result = await window.simulatorDesktop.importExperiment();
      setStorageMessage(result.message);
      if (result.status !== 'success' || !result.experiment) return;
      setSavedExperiments((current) => [
        result.experiment as SavedExperiment,
        ...current.filter((item) => item.id !== result.experiment?.id)
      ]);
    } catch (error) {
      setStorageMessage(error instanceof Error ? error.message : 'Deney içe aktarılamadı.');
    }
  };

  const exportReport = async (saved: SavedExperiment): Promise<void> => {
    try {
      const result = await window.simulatorDesktop.exportExperimentReport(saved.id);
      setStorageMessage(result.message);
    } catch (error) {
      setStorageMessage(error instanceof Error ? error.message : 'Deney raporu oluşturulamadı.');
    }
  };

  const modelRun = runs.find((run) => run.metadata.id === traceModelId);
  const geoPrediction = geodesicPrediction(geodesic);
  const selectedMetadata = traceModelId === solarPositionMetadata.id
    ? solarPositionMetadata
    : traceModelId === geodesicMetadata.id
    ? geodesicMetadata
    : traceModelId === WATER_SURFACE_OBSERVATION_MODEL_ID
      ? waterObservationMetadata
      : traceModelId === WATER_SURFACE_APPLICATION_MODEL_ID
        ? waterApplicationMetadata
        : modelRun?.metadata;
  const selectedPrediction = traceModelId === solarPositionMetadata.id
    ? solarPositionPrediction
    : traceModelId === geodesicMetadata.id
    ? geoPrediction
    : traceModelId === WATER_SURFACE_OBSERVATION_MODEL_ID
      ? waterObservationRecord?.prediction
      : traceModelId === WATER_SURFACE_APPLICATION_MODEL_ID
        ? waterApplicationRecord?.prediction
        : modelRun?.prediction;
  const idealSpherePrediction = runs.find(
    (run) => run.metadata.id === 'ideal-sphere'
  )?.prediction;
  const criticalTerrainDistanceM = getMetric(
    idealSpherePrediction,
    'terrainCriticalDistanceM'
  );

  const resetExperiment = (): void => {
    setInputs(DEFAULT_SIMULATOR_INPUTS);
    setAtmosphereState(createDefaultAtmosphereExperimentState('standard'));
    setManualTerrainPoints(defaultTerrainPoints());
    setTerrainProfileSource(undefined);
    setGeoidConversionRecord(undefined);
    setWaterObservationRecord(undefined);
    setWaterApplicationRecord(undefined);
    setPhotoCalibration(undefined);
    setPhotoCalibrationRecord(undefined);
    setPhotoModelUncertainty({ ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS });
    setTextSetupHistory([]);
    setModelAngularUncertaintyById({});
    setModelUncertaintyError(undefined);
    setActiveExperimentId(crypto.randomUUID());
    setActiveExperimentName('');
    setExperimentObservedAtIso(new Date().toISOString());
    setObservationUtcOffsetMinutes(systemUtcOffsetMinutes());
    setIsDirty(false);
    setStorageMessage('Yeni deney hazırlandı.');
  };

  return (
    <HelpProvider onOpenPanel={openHelpPanel} onOpenCatalog={openHelpCatalog}>
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <button className="menu-button" type="button">☰</button>
          <strong>GEOMETRİK GÖZLEM LABORATUVARI</strong>
          <span className={isCalculating ? 'calculation-state busy' : 'calculation-state ready'}>
            {isCalculating ? 'Hesaplanıyor…' : 'Hesaplama hazır'}
          </span>
          {storageMessage && <span className="storage-message" title={storageMessage}>{storageMessage}</span>}
        </div>
        <div className="top-actions">
          <button type="button" onClick={() => setTextSetupOpen(true)}>✦ Metinden Hazırla</button>
          <button type="button" onClick={() => setDataManagerOpen(true)}>▤ Veri Yöneticisi</button>
          <button disabled title="Ayarlar modülü sonraki aşamada" type="button">⚙ Ayarlar</button>
          <button type="button" onClick={openHelpCatalog}>ⓘ Yardım</button>
        </div>
      </header>

      <div className="workspace">
        <Sidebar
          experiments={savedExperiments}
          activeScenarioId={activeScenarioId}
          atmosphereMode={atmosphereState.mode}
          visualLayers={visualLayers}
          observedAtIso={experimentObservedAtIso}
          observationUtcOffsetMinutes={observationUtcOffsetMinutes}
          onObservationTimeChange={(observedAtIso, utcOffsetMinutes) => {
            setExperimentObservedAtIso(observedAtIso);
            setObservationUtcOffsetMinutes(utcOffsetMinutes);
            setIsDirty(true);
          }}
          onScenarioChange={(scenarioId) => {
            if (scenarioId === activeScenarioId) return;
            setActiveScenarioId(scenarioId);
            setActiveExperimentId(crypto.randomUUID());
            setActiveExperimentName('');
            setExperimentObservedAtIso(new Date().toISOString());
      setObservationUtcOffsetMinutes(systemUtcOffsetMinutes());
            setGeoidConversionRecord(undefined);
            setWaterObservationRecord(undefined);
            setWaterApplicationRecord(undefined);
            setPhotoCalibration(undefined);
            setPhotoCalibrationRecord(undefined);
            setPhotoModelUncertainty({ ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS });
            setTextSetupHistory([]);
            setModelAngularUncertaintyById({});
            setModelUncertaintyError(undefined);
            setIsDirty(false);
            setStorageMessage(`${getSimulationScenario(scenarioId).label} senaryosu hazırlandı.`);
          }}
          onLoadExperiment={loadExperiment}
          onVisualLayerChange={(key, enabled) => {
            setVisualLayers((current) => ({ ...current, [key]: enabled }));
          }}
        />
        <main className="main-content">
          <div className="top-grid geodesic-top-grid">
            {activeScenarioId === 'sun-moon-observation' ? (
              <SolarScenarioSummary
                activeName={activeExperimentName}
                inputs={inputs}
                isDirty={isDirty}
                onCoordinateChange={(key, value) => handleNumberChange(key, value)}
                onReset={resetExperiment}
                onSave={() => setSaveDialogOpen(true)}
              />
            ) : (
            <ScenarioSummary
              scenarioId={activeScenarioId}
              activeName={activeExperimentName}
              inputs={inputs}
              atmosphereMode={atmosphereState.mode}
              effectiveDistanceKm={effectiveDistanceKm}
              geodesic={geodesic}
              isDirty={isDirty}
              onDistanceSourceChange={(distanceSource) => {
                markTerrainSourceModified();
                updateInputs((current) => ({ ...current, distanceSource }));
              }}
              onDatumChange={(verticalDatumKind) => {
                markGeoidConversionModified();
                markWaterApplicationModified();
                updateInputs((current) => ({ ...current, verticalDatumKind }));
              }}
              onNumberChange={handleNumberChange}
              onReset={resetExperiment}
              onSave={() => setSaveDialogOpen(true)}
              onShowGeodesicTrace={() => setTraceModelId(geodesicMetadata.id)}
            />
            )}
            {activeScenarioId === 'sun-moon-observation' && solarPosition
              ? <SolarPositionPanel result={solarPosition} onShowTrace={() => setTraceModelId(solarPositionMetadata.id)} />
              : activeScenarioId === 'horizon'
              ? <HorizonReferencePanel inputs={inputs} atmosphereMode={atmosphereState.mode} />
              : <ObservationPanel inputs={inputs} />}
          </div>

          {activeScenarioId !== 'horizon' && activeScenarioId !== 'sun-moon-observation' && (
            <PhotoCalibrationControl
              key={activeExperimentId}
              experimentId={activeExperimentId}
              savedCalibration={photoCalibration}
              savedPrediction={photoCalibrationRecord?.prediction}
              onSave={(calibration: SavedPhotoCalibration, record: PhotoCalibrationRecord) => {
                setPhotoCalibration(calibration);
                setPhotoCalibrationRecord({
                  prediction: record.prediction,
                  modelVersion: record.modelVersion
                });
                setIsDirty(true);
                setStorageMessage('Fotoğraf kalibrasyonu deneye eklendi.');
              }}
              onClear={() => {
                setPhotoCalibration(undefined);
                setPhotoCalibrationRecord(undefined);
                setPhotoModelUncertainty({ ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS });
                setTextSetupHistory([]);
                setModelAngularUncertaintyById({});
                setModelUncertaintyError(undefined);
                setIsDirty(true);
              }}
            />
          )}

          {activeScenarioId !== 'sun-moon-observation' && <AtmosphereProfileControl
            state={atmosphereState}
            standardRefractionCoefficient={inputs.refractionCoefficient}
            onChange={(nextState) => {
              setAtmosphereState(nextState);
              setInputs((current) => ({
                ...current,
                useStandardRefraction: nextState.mode === 'standard'
              }));
              setIsDirty(true);
            }}
          />}

          {activeScenarioId !== 'horizon' && activeScenarioId !== 'sun-moon-observation' && <TerrainPanel
            experimentId={activeExperimentId}
            inputs={inputs}
            points={manualTerrainPoints}
            source={terrainProfileSource}
            effectiveDistanceKm={effectiveDistanceKm}
            criticalDistanceM={criticalTerrainDistanceM}
            allowRouteDistanceImport={inputs.distanceSource === 'manual'}
            allowDemImport={inputs.distanceSource === 'coordinates'}
            onDatumChange={(verticalDatumKind) => {
              markGeoidConversionModified();
              markWaterApplicationModified();
              updateInputs((current) => ({ ...current, verticalDatumKind }));
            }}
            onModeChange={(terrainMode) => updateInputs((current) => ({ ...current, terrainMode }))}
            onNumberChange={handleNumberChange}
            onPointsChange={updateTerrainPoints}
            onApplyGeoidConversion={applyGeoidConversion}
            onApplyImport={applyTerrainImport}
          />}

          {activeScenarioId !== 'horizon' && activeScenarioId !== 'sun-moon-observation' && <WaterSurfaceControl
            experimentId={activeExperimentId}
            experimentObservedAtIso={experimentObservedAtIso}
            verticalDatumKind={inputs.verticalDatumKind}
            observerGroundElevationM={inputs.observerGroundElevationM}
            targetGroundElevationM={inputs.targetGroundElevationM}
            observationRecord={waterObservationRecord}
            applicationRecord={waterApplicationRecord}
            onRecord={recordWaterSurface}
            onApply={applyWaterSurface}
            onShowTrace={setTraceModelId}
          />}

          {activeScenarioId !== 'sun-moon-observation' && <div className="model-grid">
            {simulationModels.map((model) => (
              <ModelCard
                key={model.metadata.id}
                scenarioId={activeScenarioId}
                metadata={model.metadata}
                run={runs.find((candidate) => candidate.metadata.id === model.metadata.id)}
                inputs={effectiveInputs}
                atmosphereState={atmosphereState}
                terrainProfile={terrainProfile}
                terrainSourceLabel={terrainVisualizationSourceLabel(terrainProfileSource)}
                visualLayers={visualLayers}
                onShowTrace={() => setTraceModelId(model.metadata.id)}
              />
            ))}
          </div>}

          {photoCalibrationRecord && (
            <PhotoModelUncertaintyControl
              settings={photoModelUncertainty}
              atmosphereMode={atmosphereState.mode}
              isCalculating={isAngularUncertaintyCalculating}
              error={modelUncertaintyError}
              onChange={(settings) => {
                setPhotoModelUncertainty(settings);
                setIsDirty(true);
              }}
            />
          )}

          <PhotoAngularComparisonPanel
            comparisons={photoAngularComparisons}
            referenceKind={photoReferenceKind}
          />

          {activeScenarioId !== 'sun-moon-observation' && <div className="bottom-grid">
            <ResultsTable runs={runs} scenarioId={activeScenarioId} onShowTrace={setTraceModelId} />
            <section className="notes panel">
              <div className="notes-help-heading"><span className="eyebrow">Hesaplama kapsamı</span><PanelHelpButton panelId="calculation-scope" /></div>
              <ul>
                <li>Koordinat modu WGS84 ters jeodezik çözümünü kullanır.</li>
                <li>Zemin ve hedef kotları seçilen ortak düşey datumda yorumlanır.</li>
                <li>Manuel, CSV, GeoJSON ve ESRI ASCII DEM profilleri aynı arazi sözleşmesine bağlanır.</li>
                <li>Jeoit profil dönüşümü kaynak, sürüm/epok, N, belirsizlik ve hesap izini deney sonucunda korur.</li>
                <li>Su yüzeyi kaydı gelgit/dalga belirsizliğini provenans olarak tutar ve yalnız seçilen uç kotlarına kontrollü uygulanır.</li>
                <li>Küre ve düzlem aynı profili kendi geometrilerinde ayrı çözer.</li>
                <li>Standart kırılma kürede etkin yarıçap yaklaşımıdır; katmanlı atmosfer modu meteorolojik profil ve Ciddor optik tanılarını ayrı state olarak taşır.</li>
                <li>Azimutal gösterim yalnızca kartografik referanstır.</li>
              </ul>
              <p>Katmanlı atmosfer profilinin optik ışın izleme çekirdeği hazırdır; görünürlük/ufuk model sonucuna bağlantısı Aşama 4.4 kapsamındadır. Fotoğraf kalibrasyonu bağımsız açısal gözlem kanalı olarak model sonuçlarıyla sonradan karşılaştırılır; dalga yüzeyinin rota boyunca dinamik geometrisi henüz hesaba dahil değildir.</p>
            </section>
          </div>}
        </main>
      </div>

      <TextExperimentSetupDialog
        open={textSetupOpen}
        scenarioId={activeScenarioId}
        inputs={inputs}
        atmosphereMode={atmosphereState.mode}
        modelUncertainty={photoModelUncertainty}
        onClose={() => setTextSetupOpen(false)}
        onApply={applyTextExperimentSetup}
      />
      <SaveExperimentDialog
        initialName={activeExperimentName || defaultExperimentName(activeScenarioId)}
        open={saveDialogOpen}
        onCancel={() => setSaveDialogOpen(false)}
        onSave={saveExperiment}
      />
      <DataManagerDialog
        experiments={savedExperiments}
        open={dataManagerOpen}
        onClose={() => setDataManagerOpen(false)}
        onDelete={deleteExperiment}
        onExport={exportExperiment}
        onImport={importExperiment}
        onLoad={loadExperiment}
        onReport={exportReport}
      />
      <TraceDialog
        metadata={selectedMetadata}
        prediction={selectedPrediction}
        onClose={() => setTraceModelId(undefined)}
      />
      <HelpOverlay panelId={helpPanelId} catalogOpen={helpCatalogOpen} onClose={closeHelp} />
    </div>
    </HelpProvider>
  );
}
