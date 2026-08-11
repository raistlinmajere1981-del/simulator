import type { GeoidConversionApplication } from '../../../simulation/geoid-conversion-provenance';
import type {
  SimulatorInputs,
  TerrainMode,
  TerrainProfileImport,
  TerrainProfileSource
} from '../../../shared/simulator';
import type { ManualTerrainPoint, VerticalDatumKind } from '../../../shared/terrain';
import { GeoidConversionControl } from '../GeoidConversionControl';
import { PanelHelpButton } from '../HelpSystem';
import {
  MultiPointTerrainEditor,
  type TerrainProfileImportOptions
} from '../MultiPointTerrainEditor';
import { NumericField } from './NumericField';
import { datumLabels } from './app-config';
import { numberFormatter } from './app-formatters';
import type { NumericInputKey } from './app-types';

export function TerrainPanel({
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
