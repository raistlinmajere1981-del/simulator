import type { ModelPrediction } from '../../shared/domain';
import type {
  ShadowObservationResult,
  ShadowObservationSettings
} from '../../simulation/shadow-observation';
import { PanelHelpButton } from './HelpSystem';
import './shadow-observation-panel.css';

const numberFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 });

function valueOrDash(value: number | null, unit: string): string {
  return value === null ? '—' : `${numberFormatter.format(value)}${unit}`;
}

function statusLabel(prediction: ModelPrediction): string {
  if (prediction.status === 'compatible') return 'ÖLÇÜMLE UYUMLU';
  if (prediction.status === 'incompatible') return 'ÖLÇÜMLE UYUMSUZ';
  return 'GÖZLEM KARARI YOK';
}

function optionalNumber(event: React.ChangeEvent<HTMLInputElement>): number | undefined {
  return event.currentTarget.value.trim() === '' ? undefined : event.currentTarget.valueAsNumber;
}

export function ShadowObservationPanel({
  result,
  prediction,
  settings,
  onChange,
  onShowTrace
}: {
  result: ShadowObservationResult;
  prediction: ModelPrediction;
  settings: ShadowObservationSettings;
  onChange(settings: ShadowObservationSettings): void;
  onShowTrace(): void;
}): React.JSX.Element {
  const directSun = result.predictedShadowLengthM !== null;
  const visualLength = result.predictedShadowLengthM === null
    ? 0
    : Math.min(78, 18 + 18 * Math.log10(1 + result.predictedShadowLengthM / result.gnomonHeightM));
  const shadowRotation = result.predictedShadowAzimuthDeg ?? 0;

  return (
    <section className="shadow-observation-panel panel">
      <div className="panel-title-row">
        <div>
          <span className="eyebrow">Astronomik referans · gölge</span>
          <h2>Dikey gnomon gölge geometrisi</h2>
        </div>
        <div className="title-actions">
          <PanelHelpButton panelId="shadow-observation" />
          <span className={`shadow-status-badge ${prediction.status}`}>{statusLabel(prediction)}</span>
          <button type="button" onClick={onShowTrace}>Hesap izi</button>
        </div>
      </div>

      <div className="shadow-input-grid">
        <label className="input-field">
          <span>Gnomon yüksekliği</span>
          <div><input min={0.001} max={10000} step={0.01} type="number" value={settings.gnomonHeightM} onChange={(event) => {
            if (!Number.isFinite(event.currentTarget.valueAsNumber)) return;
            onChange({ ...settings, gnomonHeightM: event.currentTarget.valueAsNumber });
          }} /><b>m</b></div>
        </label>
        <label className="input-field">
          <span>Gözlenen gölge uzunluğu</span>
          <div><input min={0} step={0.01} placeholder="opsiyonel" type="number" value={settings.observedShadowLengthM ?? ''} onChange={(event) => onChange({ ...settings, observedShadowLengthM: optionalNumber(event) })} /><b>m</b></div>
        </label>
        <label className="input-field">
          <span>Uzunluk belirsizliği ±</span>
          <div><input min={0} step={0.01} placeholder="opsiyonel" type="number" value={settings.observedShadowLengthUncertaintyM ?? ''} onChange={(event) => onChange({ ...settings, observedShadowLengthUncertaintyM: optionalNumber(event) })} /><b>m</b></div>
        </label>
        <label className="input-field">
          <span>Gözlenen gölge azimutu</span>
          <div><input min={0} max={360} step={0.1} placeholder="opsiyonel" type="number" value={settings.observedShadowAzimuthDeg ?? ''} onChange={(event) => onChange({ ...settings, observedShadowAzimuthDeg: optionalNumber(event) })} /><b>°</b></div>
        </label>
        <label className="input-field">
          <span>Azimut belirsizliği ±</span>
          <div><input min={0} max={180} step={0.1} placeholder="opsiyonel" type="number" value={settings.observedShadowAzimuthUncertaintyDeg ?? ''} onChange={(event) => onChange({ ...settings, observedShadowAzimuthUncertaintyDeg: optionalNumber(event) })} /><b>°</b></div>
        </label>
      </div>

      <div className="shadow-visual" aria-hidden="true">
        <span className="shadow-compass north">K</span>
        <span className="shadow-compass east">D</span>
        <span className="shadow-compass south">G</span>
        <span className="shadow-compass west">B</span>
        <span className="shadow-origin" />
        <span className="shadow-gnomon" />
        {directSun && <span className="shadow-ray" style={{ width: `${visualLength}%`, transform: `rotate(${shadowRotation - 90}deg)` }} />}
        {!directSun && <strong className="shadow-no-direct-sun">Güneş geometrik ufkun altında</strong>}
      </div>

      <div className="shadow-metrics">
        <div><small>Güneş yüksekliği</small><strong>{valueOrDash(result.solarElevationDeg, '°')}</strong></div>
        <div><small>Güneş azimutu</small><strong>{valueOrDash(result.solarAzimuthDeg, '°')}</strong></div>
        <div><small>Beklenen gölge</small><strong>{valueOrDash(result.predictedShadowLengthM, ' m')}</strong></div>
        <div><small>Beklenen yön</small><strong>{valueOrDash(result.predictedShadowAzimuthDeg, '°')}</strong></div>
        <div><small>Gölgeden türetilen Güneş açısı</small><strong>{valueOrDash(result.impliedObservedSolarElevationDeg, '°')}</strong></div>
        <div><small>Uzunluk farkı</small><strong>{valueOrDash(result.shadowLengthDifferenceM, ' m')}</strong></div>
        <div><small>Yön farkı</small><strong>{valueOrDash(result.shadowAzimuthDifferenceDeg, '°')}</strong></div>
      </div>

      <p className="shadow-observation-note">
        Ölçüm yüzeyi yerel yatay, gnomon yerel düşey kabul edilir. Güneş hesabı geometriktir; atmosferik kırılma ve topoğrafik ufuk bu aşamada gölge sonucuna eklenmez. Bu panel Dünya şekli modellerine Güneş davranışı uydurmaz.
      </p>
    </section>
  );
}
