import type {
  SolarRouteComparisonResult,
  SolarRouteSample
} from '../../simulation/solar-route-comparison';
import { formatUtcOffset } from '../../shared/celestial-time';
import { DraftNumberInput } from './DraftNumberInput';
import './solar-route-comparison-panel.css';

const numberFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });
const coordinateFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 4 });

function normalizeLongitude(value: number): number {
  return ((value + 540) % 360) - 180;
}

function signed(value: number, digits = 2): string {
  const formatted = value.toLocaleString('tr-TR', { maximumFractionDigits: digits });
  return value > 0 ? `+${formatted}` : formatted;
}

function clockText(sample: SolarRouteSample): string {
  const rounded = Math.round(sample.apparentSolarClock.minuteOfDay * 60);
  const hour = Math.floor(rounded / 3_600) % 24;
  const minute = Math.floor((rounded % 3_600) / 60);
  const second = rounded % 60;
  const daySuffix = sample.apparentSolarClock.dayOffset === 0
    ? ''
    : sample.apparentSolarClock.dayOffset > 0
      ? ` · +${sample.apparentSolarClock.dayOffset} gün`
      : ` · ${sample.apparentSolarClock.dayOffset} gün`;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}${daySuffix}`;
}

function chartY(elevationDeg: number): number {
  const clamped = Math.max(-90, Math.min(90, elevationDeg));
  return 18 + (90 - clamped) / 180 * 144;
}

function chartX(fraction: number): number {
  return 42 + fraction * 916;
}

function EndpointCard({
  label,
  latitudeDeg,
  longitudeDeg,
  sample,
  editable,
  onLatitudeChange,
  onLongitudeChange
}: {
  label: string;
  latitudeDeg: number;
  longitudeDeg: number;
  sample?: SolarRouteSample;
  editable?: boolean;
  onLatitudeChange?(value: number): void;
  onLongitudeChange?(value: number): void;
}): React.JSX.Element {
  return (
    <article className="solar-route-endpoint-card">
      <header>
        <span>{label}</span>
        <b className={sample && sample.solarElevationDeg >= 0 ? 'above' : 'below'}>
          {sample ? (sample.solarElevationDeg >= 0 ? 'GEOMETRİK UFKUN ÜSTÜ' : 'GEOMETRİK UFKUN ALTI') : '—'}
        </b>
      </header>
      {editable ? (
        <div className="solar-route-coordinate-inputs">
          <label>
            <span>Enlem</span>
            <DraftNumberInput value={latitudeDeg} min={-90} max={90} step={0.1} onCommit={(value) => onLatitudeChange?.(value)} />
            <b>°</b>
          </label>
          <label>
            <span>Boylam</span>
            <DraftNumberInput value={longitudeDeg} min={-180} max={180} step={0.1} onCommit={(value) => onLongitudeChange?.(value)} />
            <b>°</b>
          </label>
        </div>
      ) : (
        <p className="solar-route-coordinate-readout">
          {coordinateFormatter.format(latitudeDeg)}°, {coordinateFormatter.format(longitudeDeg)}°
        </p>
      )}
      <dl>
        <div><dt>Güneş yüksekliği</dt><dd>{sample ? `${numberFormatter.format(sample.solarElevationDeg)}°` : '—'}</dd></div>
        <div><dt>Güneş azimutu</dt><dd>{sample ? `${numberFormatter.format(sample.solarAzimuthDeg)}°` : '—'}</dd></div>
        <div><dt>Görünür Güneş saati</dt><dd>{sample ? clockText(sample) : '—'}</dd></div>
      </dl>
    </article>
  );
}

export function SolarRouteComparisonPanel({
  result,
  error,
  utcOffsetMinutes,
  startLatitudeDeg,
  startLongitudeDeg,
  endLatitudeDeg,
  endLongitudeDeg,
  onEndLatitudeChange,
  onEndLongitudeChange
}: {
  result?: SolarRouteComparisonResult;
  error?: string;
  utcOffsetMinutes: number;
  startLatitudeDeg: number;
  startLongitudeDeg: number;
  endLatitudeDeg: number;
  endLongitudeDeg: number;
  onEndLatitudeChange(value: number): void;
  onEndLongitudeChange(value: number): void;
}): React.JSX.Element {
  const startSample = result?.samples[0];
  const endSample = result?.samples.at(-1);
  const polyline = result?.samples.map((sample) => `${chartX(sample.fraction)},${chartY(sample.solarElevationDeg)}`).join(' ') ?? '';

  return (
    <section className="solar-route-panel panel">
      <div className="solar-route-heading">
        <div>
          <span className="eyebrow">Aşama 7.7 · aynı an / WGS84 rota karşılaştırması</span>
          <h2>Rota boyunca Güneş geometrisi</h2>
          <p>
            A ve B arasındaki jeodezik rota beş eşit mesafe kesrinde örneklenir. Her nokta aynı fiziksel UTC anında çözülür; bu bir seyahat süresi simülasyonu değildir.
          </p>
        </div>
        <div className="solar-route-heading-actions">
          <span>{formatUtcOffset(utcOffsetMinutes)}</span>
          <button
            type="button"
            onClick={() => {
              onEndLatitudeChange(startLatitudeDeg);
              onEndLongitudeChange(normalizeLongitude(startLongitudeDeg + 30));
            }}
          >
            B'yi 30° doğuya al
          </button>
        </div>
      </div>

      <div className="solar-route-endpoint-grid">
        <EndpointCard
          label="A · aktif gözlemci"
          latitudeDeg={startLatitudeDeg}
          longitudeDeg={startLongitudeDeg}
          sample={startSample}
        />
        <div className="solar-route-summary-card">
          <span>WGS84 JEODEZİK ROTA</span>
          <strong>{result ? `${numberFormatter.format(result.routeDistanceM / 1_000)} km` : '—'}</strong>
          <dl>
            <div><dt>Başlangıç azimutu</dt><dd>{result ? `${numberFormatter.format(result.initialBearingDeg)}°` : '—'}</dd></div>
            <div><dt>Çözüm</dt><dd>{result?.routeMethod === 'vincenty' ? 'Vincenty' : result ? 'Küresel yedek' : '—'}</dd></div>
            <div><dt>B − A yükseklik</dt><dd>{result ? `${signed(result.endMinusStartElevationDeg)}°` : '—'}</dd></div>
            <div><dt>B − A Güneş saati</dt><dd>{result ? `${signed(result.apparentSolarClockDifferenceMinutes)} dk` : '—'}</dd></div>
          </dl>
        </div>
        <EndpointCard
          label="B · karşılaştırma noktası · kayda dahil"
          latitudeDeg={endLatitudeDeg}
          longitudeDeg={endLongitudeDeg}
          sample={endSample}
          editable
          onLatitudeChange={onEndLatitudeChange}
          onLongitudeChange={onEndLongitudeChange}
        />
      </div>

      {error ? (
        <div className="solar-route-error">{error}</div>
      ) : result ? (
        <>
          <div className="solar-route-diagnostics">
            <div><span>Örnek min. yükseklik</span><strong>{numberFormatter.format(result.minimumSolarElevationDeg)}°</strong></div>
            <div><span>Örnek maks. yükseklik</span><strong>{numberFormatter.format(result.maximumSolarElevationDeg)}°</strong></div>
            <div><span>Ufuk tarafı değişimi</span><strong>{result.horizonSideChangeCount}</strong><small>yalnız komşu örnek işaret değişimleri</small></div>
            <div><span>Örnek sayısı</span><strong>{result.samples.length}</strong><small>0 / 25 / 50 / 75 / 100%</small></div>
          </div>

          <div className="solar-route-chart-wrap">
            <div className="solar-route-chart-title">
              <span>AYNI ANDA GÜNEŞ YÜKSEKLİĞİ · ROTA KESRİ</span>
              <b>0° çizgisi geometrik ufuktur</b>
            </div>
            <svg className="solar-route-chart" viewBox="0 0 1000 180" role="img" aria-label="Rota boyunca geometrik Güneş yüksekliği profili">
              <line className="solar-route-chart-grid top" x1="42" x2="958" y1="18" y2="18" />
              <line className="solar-route-chart-horizon" x1="42" x2="958" y1="90" y2="90" />
              <line className="solar-route-chart-grid bottom" x1="42" x2="958" y1="162" y2="162" />
              <text x="4" y="22">+90°</text>
              <text x="14" y="94">0°</text>
              <text x="4" y="166">−90°</text>
              <polyline className="solar-route-chart-line" points={polyline} />
              {result.samples.map((sample) => (
                <g key={sample.fraction}>
                  <circle className={sample.solarElevationDeg >= 0 ? 'above' : 'below'} cx={chartX(sample.fraction)} cy={chartY(sample.solarElevationDeg)} r="5">
                    <title>{`${Math.round(sample.fraction * 100)}% · ${numberFormatter.format(sample.solarElevationDeg)}°`}</title>
                  </circle>
                  <text className="fraction-label" x={chartX(sample.fraction)} y="177" textAnchor="middle">{Math.round(sample.fraction * 100)}%</text>
                </g>
              ))}
            </svg>
          </div>

          <div className="solar-route-sample-grid">
            {result.samples.map((sample) => (
              <article key={sample.fraction} className={sample.solarElevationDeg >= 0 ? 'above' : 'below'}>
                <header><span>{Math.round(sample.fraction * 100)}%</span><b>{numberFormatter.format(sample.distanceM / 1_000)} km</b></header>
                <strong>{numberFormatter.format(sample.solarElevationDeg)}°</strong>
                <small>Güneş yüksekliği</small>
                <p>{coordinateFormatter.format(sample.latitudeDeg)}°, {coordinateFormatter.format(sample.longitudeDeg)}°</p>
                <p>Azimut {numberFormatter.format(sample.solarAzimuthDeg)}°</p>
                <p>Güneş saati {clockText(sample)}</p>
              </article>
            ))}
          </div>

          <details className="solar-route-trace">
            <summary>Rota hesap izini göster</summary>
            <p>{result.trace.summary}</p>
            <ol>
              {result.trace.steps.map((step) => (
                <li key={step.id}>
                  <strong>{step.title}</strong>
                  <code>{step.formula}</code>
                  <span>{step.substitution}</span>
                  <b>{step.result}</b>
                </li>
              ))}
            </ol>
          </details>
        </>
      ) : null}

      <p className="solar-route-note">
        B koordinatı artık deney girdisinin hedef koordinat alanlarında saklanır; kaydetme, yeniden açma ve .ggl.json aktarımı bu karşılaştırma noktasını korur. Aynı sabit UTC ofseti bütün rota noktalarında yalnız karşılaştırma amacıyla kullanılır; IANA saat dilimi/DST sınırları, atmosferik kırılma, topoğrafik ufuk ve seyahat süresi uygulanmaz.
      </p>
    </section>
  );
}
