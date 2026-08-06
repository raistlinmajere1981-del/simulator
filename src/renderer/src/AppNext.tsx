import { useEffect, useMemo, useState } from 'react';
import { simulationModels } from '../../models';
import type {
  ExperimentDefinition,
  ModelMetadata,
  ModelPrediction,
  ResultStatus
} from '../../shared/domain';
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
  inverseWgs84Geodesic,
  type GeodesicResult
} from '../../simulation/geodesy';
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
  DataManagerDialog,
  SaveExperimentDialog,
  TraceDialog
} from './dialogs';
import {
  MultiPointTerrainEditor,
  type TerrainProfileImportOptions
} from './MultiPointTerrainEditor';
import { GeoidConversionControl } from './GeoidConversionControl';

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
  label: string;
  icon: string;
  enabled: boolean;
}

const scenarios: ScenarioDefinition[] = [
  { label: 'Hedef Görünürlüğü', icon: '▰', enabled: true },
  { label: 'Ufuk Analizi', icon: '◫', enabled: false },
  { label: 'Uzun Mesafe Görüş', icon: '⌁', enabled: false },
  { label: 'Güneş ve Ay Gözlemleri', icon: '☀', enabled: false },
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

function defaultExperimentName(): string {
  return `Hedef Görünürlüğü ${new Intl.DateTimeFormat('tr-TR', {
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
  onLoadExperiment
}: {
  experiments: SavedExperiment[];
  onLoadExperiment(experiment: SavedExperiment): void;
}): React.JSX.Element {
  return (
    <aside className="sidebar">
      <section className="side-section">
        <div className="section-heading">
          <span>Test senaryoları</span>
          <span className="section-state">1 / 6 hazır</span>
        </div>
        <nav className="scenario-list">
          {scenarios.map((scenario) => (
            <button
              className={scenario.enabled ? 'active' : 'unavailable'}
              disabled={!scenario.enabled}
              key={scenario.label}
              title={scenario.enabled ? 'Aktif deney' : 'Bu deney henüz uygulanmadı'}
            >
              <span className="nav-icon">{scenario.icon}</span>
              <span className="nav-label">{scenario.label}</span>
              <span className="nav-state">{scenario.enabled ? 'AKTİF' : 'YAKINDA'}</span>
            </button>
          ))}
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
          <span className="section-state">2 fiziksel</span>
        </div>
        {simulationModels.map((model) => {
          const presentation = getPresentation(model.metadata.id);
          const isProjection = model.metadata.id === 'azimuthal-projection';
          return (
            <div
              className={`model-toggle ${isProjection ? 'reference-model' : ''}`}
              key={model.metadata.id}
            >
              <span className={`model-dot ${presentation.tone}`} />
              <span>{model.metadata.name}</span>
              {isProjection ? (
                <span className="reference-badge">REFERANS</span>
              ) : (
                <span className="enabled-dot" title="Hesaplamaya dahil" />
              )}
            </div>
          );
        })}
        <div className="model-toggle future-model">
          <span className="model-dot coral" /><span>Toroidal Model</span>
          <span className="future-badge">YAKINDA</span>
        </div>
        <div className="model-toggle future-model">
          <span className="model-dot blue" /><span>İçbükey Dünya</span>
          <span className="future-badge">YAKINDA</span>
        </div>
      </section>

      <section className="side-section compact grow disabled-section">
        <div className="section-heading">
          <span>Görsel katmanlar</span>
          <span className="section-state">sonraki aşama</span>
        </div>
        {['Kıta / Ülke Sınırları', 'Topografya Görselleştirme', 'Gece Işıkları', 'Atmosfer Profili', 'Izgara'].map((item) => (
          <label className="switch-row unavailable-layer" key={item}>
            <span>{item}</span><input type="checkbox" disabled /><span className="switch" />
          </label>
        ))}
      </section>

      <section className="time-card disabled-section">
        <div className="section-heading">
          <span>Zaman ve tarih</span>
          <span className="section-state">astronomi modülü</span>
        </div>
        <div className="time-placeholder">
          Güneş, Ay ve yıldız deneyleri eklendiğinde etkinleşecek.
        </div>
      </section>
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
  activeName,
  inputs,
  effectiveDistanceKm,
  geodesic,
  isDirty,
  onDistanceSourceChange,
  onNumberChange,
  onRefractionChange,
  onReset,
  onSave,
  onShowGeodesicTrace
}: {
  activeName: string;
  inputs: SimulatorInputs;
  effectiveDistanceKm: number;
  geodesic: GeodesicResult | undefined;
  isDirty: boolean;
  onDistanceSourceChange(source: DistanceSource): void;
  onNumberChange(key: NumericInputKey, value: number): void;
  onRefractionChange(enabled: boolean): void;
  onReset(): void;
  onSave(): void;
  onShowGeodesicTrace(): void;
}): React.JSX.Element {
  return (
    <section className="scenario-summary panel coordinate-summary">
      <div className="panel-title-row">
        <div>
          <span className="eyebrow">Aktif senaryo</span>
          <h2>{activeName || 'Hedef Görünürlüğü'}</h2>
        </div>
        <div className="title-actions">
          {isDirty && <span className="dirty-badge">KAYDEDİLMEDİ</span>}
          <button className="save-button" onClick={onSave} type="button">Deneyi Kaydet</button>
          <button className="reset-button" onClick={onReset} type="button">Yeni / Varsayılan</button>
          <span className="calculation-badge">CANLI HESAPLAMA</span>
        </div>
      </div>

      <div className="input-grid base-input-grid">
        <NumericField inputKey="observerHeightM" label="Göz yüksekliği" unit="m" step={0.1} inputs={inputs} onNumberChange={onNumberChange} />
        <NumericField inputKey="targetHeightM" label="Hedef yüksekliği" unit="m" step={0.1} inputs={inputs} onNumberChange={onNumberChange} />
        <NumericField inputKey="observedVisiblePercent" label="Gözlenen görünürlük" unit="%" step={1} inputs={inputs} onNumberChange={onNumberChange} />
        <NumericField inputKey="observationUncertaintyPercent" label="Gözlem belirsizliği" unit="±%" step={1} inputs={inputs} onNumberChange={onNumberChange} />
        <NumericField inputKey="refractionCoefficient" label="Kırılma katsayısı" unit="k" step={0.01} inputs={inputs} disabled={!inputs.useStandardRefraction} onNumberChange={onNumberChange} />
      </div>

      <div className="distance-source-panel">
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
      </div>

      <label className="refraction-control">
        <input
          checked={inputs.useStandardRefraction}
          type="checkbox"
          onChange={(event) => onRefractionChange(event.currentTarget.checked)}
        />
        <span>Standart atmosferik kırılmayı etkin yarıçap yaklaşımıyla uygula</span>
      </label>
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
        <button disabled title="Fotoğraf kalibrasyon modülü henüz eklenmedi" type="button">
          Görsel yükleme yakında
        </button>
      </div>
      <p className="engine-note">
        Görsel açıklayıcıdır. Karşılaştırma, sayısal görünürlük ve belirsizlik girdileriyle yapılır.
      </p>
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

function TerrainPanel({
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
  onApplyGeoidConversion(
    targetDatum: VerticalDatumKind,
    observerGroundElevationM: number,
    targetGroundElevationM: number,
    points: ManualTerrainPoint[]
  ): void;
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
  metadata,
  run,
  inputs,
  onShowTrace
}: {
  metadata: ModelMetadata;
  run: ModelRun | undefined;
  inputs: SimulatorInputs;
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
  const warning = prediction?.warnings[0];
  const isProjection = metadata.id === 'azimuthal-projection';

  return (
    <article className={`model-card ${presentation.tone} ${isProjection ? 'projection-card' : ''}`}>
      <header>
        <h3>{metadata.name}</h3>
        <div className="model-header-actions">
          <button className="trace-button" disabled={!prediction} type="button" onClick={onShowTrace}>Hesap izi</button>
          <span className={`status-pill status-${status}`}>{statusLabels[status]}</span>
        </div>
      </header>
      <div className={`world-visual ${presentation.shape} ${isProjection ? 'projection-only' : ''}`}>
        <span className="observer-pin">●</span><span className="target-pin">●</span><span className="route" />
        {isProjection && (
          <div className="projection-overlay">
            <strong>HARİTA PROJEKSİYONU</strong>
            <span>Konumları gösterebilir; fiziksel görüş tahmini üretemez.</span>
          </div>
        )}
      </div>
      {isProjection ? (
        <div className="projection-explanation">
          <strong>Hesaplama yapılmadı</strong>
          <p>Yüzey geometrisi, yerel dikey yön ve ışık ilerleme kuralları tanımlanmadan sayısal sonuç üretilemez.</p>
        </div>
      ) : (
        <div className="profile-view">
          <div className="profile-label left">Gözlemci<br /><b>{numberFormatter.format(inputs.observerGroundElevationM + inputs.observerHeightM)} m</b></div>
          <div className="profile-label right">Hedef tepesi<br /><b>{numberFormatter.format(inputs.targetGroundElevationM + inputs.targetHeightM)} m</b></div>
          <span className="line-of-sight" /><span className={`surface ${presentation.shape}`} />
          {inputs.terrainMode !== 'off' && <span className="terrain-obstacle" title="Manuel arazi profili" />}
        </div>
      )}
      <div className={`metric-grid ${isProjection ? 'unsupported-metrics' : ''}`}>
        <div><small>Beklenen görünürlük</small><strong>{formatPercent(visibleFraction)}</strong></div>
        <div><small>Gizlenen kısım</small><strong>{formatPercent(hiddenFraction)}</strong></div>
        <div><small>Ufuk mesafesi</small><strong>{formatDistance(horizonDistanceM, metadata.id === 'defined-plane')}</strong></div>
        <div><small>{terrainClearanceM === null ? 'Hedef tepe açısı' : 'Arazi açıklığı'}</small><strong>{terrainClearanceM === null ? formatAngle(targetAngleDeg) : formatMetres(terrainClearanceM)}</strong></div>
      </div>
      <div className="model-warning">{warning ?? metadata.assumptions[0]}</div>
    </article>
  );
}

function ResultsTable({ runs, onShowTrace }: { runs: ModelRun[]; onShowTrace(modelId: string): void }): React.JSX.Element {
  return (
    <section className="results panel">
      <span className="eyebrow">Sonuç karşılaştırma</span>
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
  const [manualTerrainPoints, setManualTerrainPoints] = useState<ManualTerrainPoint[]>(
    defaultTerrainPoints()
  );
  const [terrainProfileSource, setTerrainProfileSource] = useState<TerrainProfileSource>();
  const [runs, setRuns] = useState<ModelRun[]>([]);
  const [savedExperiments, setSavedExperiments] = useState<SavedExperiment[]>([]);
  const [activeExperimentId, setActiveExperimentId] = useState<string>();
  const [activeExperimentName, setActiveExperimentName] = useState('');
  const [isCalculating, setIsCalculating] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [dataManagerOpen, setDataManagerOpen] = useState(false);
  const [traceModelId, setTraceModelId] = useState<string>();
  const [storageMessage, setStorageMessage] = useState('');

  const geodesic = useMemo(() => {
    if (inputs.distanceSource !== 'coordinates') return undefined;
    return inverseWgs84Geodesic(
      { latitudeDeg: inputs.observerLatitudeDeg, longitudeDeg: inputs.observerLongitudeDeg },
      { latitudeDeg: inputs.targetLatitudeDeg, longitudeDeg: inputs.targetLongitudeDeg }
    );
  }, [
    inputs.distanceSource,
    inputs.observerLatitudeDeg,
    inputs.observerLongitudeDeg,
    inputs.targetLatitudeDeg,
    inputs.targetLongitudeDeg
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

  const experiment = useMemo<ExperimentDefinition>(() => ({
    id: activeExperimentId ?? 'interactive-target-visibility',
    title: activeExperimentName || 'Etkileşimli hedef görünürlüğü deneyi',
    type: 'target-visibility',
    observer: {
      latitudeDeg: inputs.observerLatitudeDeg,
      longitudeDeg: inputs.observerLongitudeDeg,
      elevationM: inputs.observerGroundElevationM + inputs.verticalDatumOffsetM,
      eyeHeightM: inputs.observerHeightM
    },
    target: {
      label: 'Hedef',
      latitudeDeg: inputs.targetLatitudeDeg,
      longitudeDeg: inputs.targetLongitudeDeg,
      elevationM: inputs.targetGroundElevationM + inputs.verticalDatumOffsetM,
      heightM: inputs.targetHeightM
    },
    terrainProfile,
    observedAtIso: new Date().toISOString(),
    measurements: {
      surfaceDistanceM: { value: effectiveDistanceKm * 1_000, uncertainty: inputs.distanceSource === 'coordinates' ? 0.01 : 20, unit: 'm' },
      visibleFraction: { value: inputs.observedVisiblePercent / 100, uncertainty: inputs.observationUncertaintyPercent / 100, unit: 'fraction' }
    }
  }), [activeExperimentId, activeExperimentName, effectiveDistanceKm, inputs, terrainProfile]);

  const context = useMemo(() => ({
    atmosphereMode: inputs.useStandardRefraction ? 'standard' as const : 'off' as const,
    refractionCoefficient: inputs.refractionCoefficient
  }), [inputs.refractionCoefficient, inputs.useStandardRefraction]);

  useEffect(() => {
    void window.simulatorDesktop.listExperiments()
      .then(setSavedExperiments)
      .catch((error: unknown) => {
        setStorageMessage(error instanceof Error ? error.message : 'Kayıtlar okunamadı.');
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsCalculating(true);
    void runSimulationModels(simulationModels, experiment, context).then((nextRuns) => {
      if (!cancelled) {
        setRuns(nextRuns);
        setIsCalculating(false);
      }
    });
    return () => { cancelled = true; };
  }, [context, experiment]);

  const markTerrainSourceModified = (): void => {
    setTerrainProfileSource((current) => current
      ? { ...current, modifiedAfterImport: true }
      : current);
  };

  const updateInputs = (updater: (current: SimulatorInputs) => SimulatorInputs): void => {
    setInputs(updater);
    setIsDirty(true);
  };

  const updateTerrainPoints = (points: ManualTerrainPoint[]): void => {
    setManualTerrainPoints(points);
    markTerrainSourceModified();
    setIsDirty(true);
  };

  const applyGeoidConversion = (
    targetDatum: VerticalDatumKind,
    observerGroundElevationM: number,
    targetGroundElevationM: number,
    points: ManualTerrainPoint[]
  ): void => {
    setInputs((current) => ({
      ...current,
      verticalDatumKind: targetDatum,
      observerGroundElevationM,
      targetGroundElevationM
    }));
    setManualTerrainPoints(points);
    markTerrainSourceModified();
    setIsDirty(true);
    setStorageMessage(
      `Bütün zemin ve arazi kotları ${datumLabels[targetDatum]} datumuna dönüştürüldü.`
    );
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

    setManualTerrainPoints(profile.points);
    setInputs((current) => applyImportedTerrainInputs(current, profile, options));
    setTerrainProfileSource(source);
    setIsDirty(true);
  };

  const loadExperiment = (saved: SavedExperiment): void => {
    setInputs(saved.inputs);
    setManualTerrainPoints(saved.manualTerrainPoints ?? defaultTerrainPoints(saved.inputs));
    setTerrainProfileSource(saved.terrainProfileSource);
    setActiveExperimentId(saved.id);
    setActiveExperimentName(saved.name);
    setIsDirty(false);
    setStorageMessage(`“${saved.name}” açıldı.`);
  };

  const saveExperiment = async (name: string): Promise<void> => {
    const now = new Date().toISOString();
    const existing = savedExperiments.find((item) => item.id === activeExperimentId);
    const record: SavedExperiment = {
      id: activeExperimentId ?? crypto.randomUUID(),
      name,
      createdAtIso: existing?.createdAtIso ?? now,
      updatedAtIso: now,
      inputs,
      manualTerrainPoints,
      terrainProfileSource,
      geodesic,
      modelVersions: Object.fromEntries([
        ...simulationModels.map((model) => [model.metadata.id, model.metadata.version] as const),
        [geodesicMetadata.id, geodesicMetadata.version]
      ]),
      predictions: runs.map((run) => run.prediction)
    };

    try {
      const saved = await window.simulatorDesktop.saveExperiment(record);
      setSavedExperiments((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setActiveExperimentId(saved.id);
      setActiveExperimentName(saved.name);
      setManualTerrainPoints(saved.manualTerrainPoints ?? manualTerrainPoints);
      setTerrainProfileSource(saved.terrainProfileSource);
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
        setActiveExperimentId(undefined);
        setActiveExperimentName('');
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
  const selectedMetadata = traceModelId === geodesicMetadata.id
    ? geodesicMetadata
    : modelRun?.metadata;
  const selectedPrediction = traceModelId === geodesicMetadata.id
    ? geoPrediction
    : modelRun?.prediction;
  const idealSpherePrediction = runs.find(
    (run) => run.metadata.id === 'ideal-sphere'
  )?.prediction;
  const criticalTerrainDistanceM = getMetric(
    idealSpherePrediction,
    'terrainCriticalDistanceM'
  );

  return (
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
          <button type="button" onClick={() => setDataManagerOpen(true)}>▤ Veri Yöneticisi</button>
          <button disabled title="Ayarlar modülü sonraki aşamada" type="button">⚙ Ayarlar</button>
          <button disabled title="Yardım içeriği sonraki aşamada" type="button">ⓘ Yardım</button>
        </div>
      </header>

      <div className="workspace">
        <Sidebar experiments={savedExperiments} onLoadExperiment={loadExperiment} />
        <main className="main-content">
          <div className="top-grid geodesic-top-grid">
            <ScenarioSummary
              activeName={activeExperimentName}
              inputs={inputs}
              effectiveDistanceKm={effectiveDistanceKm}
              geodesic={geodesic}
              isDirty={isDirty}
              onDistanceSourceChange={(distanceSource) => {
                markTerrainSourceModified();
                updateInputs((current) => ({ ...current, distanceSource }));
              }}
              onNumberChange={handleNumberChange}
              onRefractionChange={(enabled) => updateInputs((current) => ({ ...current, useStandardRefraction: enabled }))}
              onReset={() => {
                setInputs(DEFAULT_SIMULATOR_INPUTS);
                setManualTerrainPoints(defaultTerrainPoints());
                setTerrainProfileSource(undefined);
                setActiveExperimentId(undefined);
                setActiveExperimentName('');
                setIsDirty(false);
                setStorageMessage('Yeni deney hazırlandı.');
              }}
              onSave={() => setSaveDialogOpen(true)}
              onShowGeodesicTrace={() => setTraceModelId(geodesicMetadata.id)}
            />
            <ObservationPanel inputs={inputs} />
          </div>

          <TerrainPanel
            inputs={inputs}
            points={manualTerrainPoints}
            source={terrainProfileSource}
            effectiveDistanceKm={effectiveDistanceKm}
            criticalDistanceM={criticalTerrainDistanceM}
            allowRouteDistanceImport={inputs.distanceSource === 'manual'}
            allowDemImport={inputs.distanceSource === 'coordinates'}
            onDatumChange={(verticalDatumKind) => updateInputs((current) => ({ ...current, verticalDatumKind }))}
            onModeChange={(terrainMode) => updateInputs((current) => ({ ...current, terrainMode }))}
            onNumberChange={handleNumberChange}
            onPointsChange={updateTerrainPoints}
            onApplyGeoidConversion={applyGeoidConversion}
            onApplyImport={applyTerrainImport}
          />

          <div className="model-grid">
            {simulationModels.map((model) => (
              <ModelCard
                key={model.metadata.id}
                metadata={model.metadata}
                run={runs.find((candidate) => candidate.metadata.id === model.metadata.id)}
                inputs={effectiveInputs}
                onShowTrace={() => setTraceModelId(model.metadata.id)}
              />
            ))}
          </div>

          <div className="bottom-grid">
            <ResultsTable runs={runs} onShowTrace={setTraceModelId} />
            <section className="notes panel">
              <span className="eyebrow">Hesaplama kapsamı</span>
              <ul>
                <li>Koordinat modu WGS84 ters jeodezik çözümünü kullanır.</li>
                <li>Zemin ve hedef kotları seçilen ortak düşey datumda yorumlanır.</li>
                <li>Manuel profil sıralı ve düzenlenebilir ara noktaları iki uç kotuyla birleştirir.</li>
                <li>Küre ve düzlem aynı profili kendi geometrilerinde ayrı çözer.</li>
                <li>Standart kırılma yalnızca kürede etkin yarıçap yaklaşımıdır.</li>
                <li>Azimutal gösterim yalnızca kartografik referanstır.</li>
              </ul>
              <p>DEM verisi, dalga yüzeyi, kamera kalibrasyonu ve katmanlı atmosfer profili henüz hesaba dahil değildir.</p>
            </section>
          </div>
        </main>
      </div>

      <SaveExperimentDialog
        initialName={activeExperimentName || defaultExperimentName()}
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
    </div>
  );
}
