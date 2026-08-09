import type { ModelPrediction } from '../../shared/domain';
import type {
  DualShadowComparisonResult,
  DualShadowComparisonSettings,
  DualShadowStationSettings
} from '../../simulation/dual-shadow-comparison';
import type { ShadowObservationResult } from '../../simulation/shadow-observation';
import { DraftNumberInput } from './DraftNumberInput';
import { PanelHelpButton } from './HelpSystem';
import './dual-shadow-comparison-panel.css';

const numberFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 });
const coordinateFormatter = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 6 });

function valueOrDash(value: number | null, unit: string): string {
  return value === null ? '—' : `${numberFormatter.format(value)}${unit}`;
}

function optionalNumber(
  event: React.ChangeEvent<HTMLInputElement>,
  min: number,
  max: number
): number | undefined | null {
  if (event.currentTarget.value.trim() === '') return undefined;
  const value = event.currentTarget.valueAsNumber;
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
}

function statusLabel(prediction: ModelPrediction | undefined): string {
  if (!prediction) return 'KARŞILAŞTIRMA KAPALI';
  if (prediction.status === 'compatible') return 'FARK ÖLÇÜMLE UYUMLU';
  if (prediction.status === 'incompatible') return 'FARK ÖLÇÜMLE UYUMSUZ';
  return 'FARK İÇİN KARAR YOK';
}

function updateStation(
  settings: DualShadowComparisonSettings,
  patch: Partial<DualShadowStationSettings>
): DualShadowComparisonSettings {
  return { stationB: { ...settings.stationB, ...patch } };
}

export function DualShadowComparisonPanel({
  primaryResult,
  settings,
  result,
  prediction,
  onEnable,
  onDisable,
  onChange,
  onShowTrace
}: {
  primaryResult: ShadowObservationResult;
  settings?: DualShadowComparisonSettings;
  result?: DualShadowComparisonResult;
  prediction?: ModelPrediction;
  onEnable(): void;
  onDisable(): void;
  onChange(settings: DualShadowComparisonSettings): void;
  onShowTrace(): void;
}): React.JSX.Element {
  const enabled = settings !== undefined;

  return (
    <section className="dual-shadow-panel panel">
      <div className="panel-title-row">
        <div>
          <span className="eyebrow">Astronomik referans · eşzamanlı iki nokta</span>
          <h2>İki konumlu gölge karşılaştırması</h2>
        </div>
        <div className="title-actions">
          <PanelHelpButton panelId="dual-shadow-comparison" />
          <span className={`dual-shadow-status ${prediction?.status ?? 'off'}`}>{statusLabel(prediction)}</span>
          {enabled && <button type="button" onClick={onShowTrace} disabled={!prediction}>Hesap izi</button>}
          <button type="button" className={enabled ? 'dual-shadow-disable' : 'dual-shadow-enable'} onClick={enabled ? onDisable : onEnable}>
            {enabled ? 'İkinci noktayı kapat' : 'İkinci nokta ekle'}
          </button>
        </div>
      </div>

      {!settings ? (
        <div className="dual-shadow-empty">
          <strong>Tek-konum gölge deneyi etkin.</strong>
          <span>Aynı UTC anında ikinci bir WGS84 konumundaki gnomonu karşılaştırmak için B noktasını ekle.</span>
        </div>
      ) : (
        <>
          <div className="dual-shadow-stations">
            <div className="dual-shadow-station primary">
              <span className="station-letter">A</span>
              <div>
                <strong>Birincil gözlem noktası</strong>
                <small>{coordinateFormatter.format(primaryResult.latitudeDeg)}°, {coordinateFormatter.format(primaryResult.longitudeDeg)}°</small>
              </div>
              <dl>
                <div><dt>Gnomon</dt><dd>{numberFormatter.format(primaryResult.gnomonHeightM)} m</dd></div>
                <div><dt>Güneş</dt><dd>{valueOrDash(primaryResult.solarElevationDeg, '°')}</dd></div>
                <div><dt>Beklenen gölge</dt><dd>{valueOrDash(primaryResult.predictedShadowLengthM, ' m')}</dd></div>
              </dl>
            </div>
            <div className="dual-shadow-station secondary">
              <span className="station-letter">B</span>
              <div>
                <strong>İkinci gözlem noktası</strong>
                <small>Aynı UTC anı kullanılır</small>
              </div>
              <dl>
                <div><dt>Güneş</dt><dd>{valueOrDash(result?.stationB.solarElevationDeg ?? null, '°')}</dd></div>
                <div><dt>Beklenen gölge</dt><dd>{valueOrDash(result?.stationB.predictedShadowLengthM ?? null, ' m')}</dd></div>
              </dl>
            </div>
          </div>

          <div className="dual-shadow-input-grid">
            <label className="input-field">
              <span>B enlemi</span>
              <div><DraftNumberInput min={-90} max={90} step={0.000001} value={settings.stationB.latitudeDeg} onCommit={(value) => onChange(updateStation(settings, { latitudeDeg: value }))} /><b>°</b></div>
            </label>
            <label className="input-field">
              <span>B boylamı</span>
              <div><DraftNumberInput min={-180} max={180} step={0.000001} value={settings.stationB.longitudeDeg} onCommit={(value) => onChange(updateStation(settings, { longitudeDeg: value }))} /><b>°</b></div>
            </label>
            <label className="input-field">
              <span>B gnomon yüksekliği</span>
              <div><DraftNumberInput min={0.001} max={10000} step={0.01} value={settings.stationB.gnomonHeightM} onCommit={(value) => onChange(updateStation(settings, { gnomonHeightM: value }))} /><b>m</b></div>
            </label>
            <label className="input-field">
              <span>B gözlenen gölge</span>
              <div><input type="number" min={0} step={0.01} placeholder="opsiyonel" value={settings.stationB.observedShadowLengthM ?? ''} onChange={(event) => {
                const value = optionalNumber(event, 0, 10_000_000);
                if (value === null) return;
                onChange(updateStation(settings, { observedShadowLengthM: value }));
              }} /><b>m</b></div>
            </label>
            <label className="input-field">
              <span>B uzunluk belirsizliği ±</span>
              <div><input type="number" min={0} step={0.01} placeholder="opsiyonel" value={settings.stationB.observedShadowLengthUncertaintyM ?? ''} onChange={(event) => {
                const value = optionalNumber(event, 0, 1_000_000);
                if (value === null) return;
                onChange(updateStation(settings, { observedShadowLengthUncertaintyM: value }));
              }} /><b>m</b></div>
            </label>
            <label className="input-field">
              <span>B gözlenen gölge azimutu</span>
              <div><input type="number" min={0} max={360} step={0.1} placeholder="opsiyonel" value={settings.stationB.observedShadowAzimuthDeg ?? ''} onChange={(event) => {
                const value = optionalNumber(event, 0, 360);
                if (value === null) return;
                onChange(updateStation(settings, { observedShadowAzimuthDeg: value }));
              }} /><b>°</b></div>
            </label>
            <label className="input-field">
              <span>B azimut belirsizliği ±</span>
              <div><input type="number" min={0} max={180} step={0.1} placeholder="opsiyonel" value={settings.stationB.observedShadowAzimuthUncertaintyDeg ?? ''} onChange={(event) => {
                const value = optionalNumber(event, 0, 180);
                if (value === null) return;
                onChange(updateStation(settings, { observedShadowAzimuthUncertaintyDeg: value }));
              }} /><b>°</b></div>
            </label>
          </div>

          {result && (
            <div className="dual-shadow-metrics">
              <div><small>WGS84 nokta ayrımı</small><strong>{numberFormatter.format(result.separationDistanceM / 1000)} km</strong></div>
              <div><small>A→B başlangıç azimutu</small><strong>{numberFormatter.format(result.initialBearingDeg)}°</strong></div>
              <div><small>Beklenen Güneş yükseklik farkı B−A</small><strong>{numberFormatter.format(result.predictedSolarElevationDifferenceDeg)}°</strong></div>
              <div><small>Gözlenen gölgelerden fark</small><strong>{result.observedSolarElevationDifferenceDeg === null ? '—' : `${numberFormatter.format(result.observedSolarElevationDifferenceDeg)}°${result.observedSolarElevationDifferenceUncertaintyDeg === null ? '' : ` ±${numberFormatter.format(result.observedSolarElevationDifferenceUncertaintyDeg)}°`}`}</strong></div>
              <div><small>Açı farkı artığı</small><strong>{valueOrDash(result.solarElevationDifferenceResidualDeg, '°')}</strong></div>
              <div><small>Beklenen gölge yönü farkı</small><strong>{valueOrDash(result.predictedShadowAzimuthDifferenceDeg, '°')}</strong></div>
              <div><small>Gözlenen yön farkı</small><strong>{result.observedShadowAzimuthDifferenceDeg === null ? '—' : `${numberFormatter.format(result.observedShadowAzimuthDifferenceDeg)}°${result.observedShadowAzimuthDifferenceUncertaintyDeg === null ? '' : ` ±${numberFormatter.format(result.observedShadowAzimuthDifferenceUncertaintyDeg)}°`}`}</strong></div>
              <div><small>Yön farkı artığı</small><strong>{valueOrDash(result.shadowAzimuthDifferenceResidualDeg, '°')}</strong></div>
            </div>
          )}

          <p className="dual-shadow-note">
            A ve B aynı UTC fiziksel anında çözülür. Gnomon yükseklikleri farklı olabilir; saha gölgeleri önce Güneş yüksekliğine dönüştürülerek karşılaştırılır. WGS84 baz çizgisi ve geometrik Güneş referansı burada ölçüm bağlamıdır; Dünya modellerine tanımsız Güneş davranışı eklenmez.
          </p>
        </>
      )}
    </section>
  );
}
