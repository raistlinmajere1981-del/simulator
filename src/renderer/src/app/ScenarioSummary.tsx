import type { AtmosphereMode } from '../../../shared/atmosphere';
import { getSimulationScenario, type SimulationScenarioId } from '../../../shared/scenario';
import type { DistanceSource, SimulatorInputs } from '../../../shared/simulator';
import type { VerticalDatumKind } from '../../../shared/terrain';
import type { GeodesicResult } from '../../../simulation/geodesy';
import { PanelHelpButton } from '../HelpSystem';
import { NumericField } from './NumericField';
import { bearingFormatter, coordinateFormatter, numberFormatter } from './app-formatters';
import type { NumericInputKey } from './app-types';

export function ScenarioSummary({
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
