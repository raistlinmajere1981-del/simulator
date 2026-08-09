import { BRIGHT_STAR_CATALOG, BRIGHT_STAR_CATALOG_SOURCE } from '../../simulation/bright-star-catalog';
import type {
  StellarObservationResult,
  StellarObservationSettings
} from '../../simulation/stellar-observation';
import type { ModelPrediction } from '../../shared/domain';
import './stellar-observation-panel.css';

const angleFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });
const preciseFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 5 });

const horizonClassLabels: Record<StellarObservationResult['position']['horizonClass'], string> = {
  'circumpolar-above': 'Çevresel · ufkun üstünde',
  'rises-and-sets': 'Doğar ve batar',
  'never-rises': 'Bu enlemde doğmaz',
  'grazes-horizon': 'Ufka teğet / sınır'
};

function formatAngle(value: number | null): string {
  return value === null ? 'Tanımsız' : `${angleFormatter.format(value)}°`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${angleFormatter.format(minutes)} dk`;
  return `${angleFormatter.format(minutes / 60)} sa`;
}

function formatClock(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZone: 'UTC'
  }).format(new Date(iso));
}

function trailPolyline(result: StellarObservationResult): string {
  const samples = result.trail.samples;
  if (samples.length < 2) return '';
  const duration = Math.max(result.trail.durationMinutes, 1);
  return samples.map((sample) => {
    const x = 4 + (sample.elapsedMinutes / duration) * 92;
    const y = 50 - (sample.elevationDeg / 90) * 44;
    return `${x.toFixed(2)},${Math.max(4, Math.min(96, y)).toFixed(2)}`;
  }).join(' ');
}

export function StellarObservationPanel({
  result,
  prediction,
  settings,
  onChange,
  onShowTrace
}: {
  result: StellarObservationResult;
  prediction: ModelPrediction;
  settings: StellarObservationSettings;
  onChange(settings: StellarObservationSettings): void;
  onShowTrace(): void;
}): React.JSX.Element {
  const position = result.position;
  const crossings = result.trail.horizonCrossings;
  const polyline = trailPolyline(result);

  return (
    <section className="panel stellar-observation-panel">
      <div className="stellar-panel-heading">
        <div>
          <span className="eyebrow">Astronomik referans · yıldız</span>
          <h3>{result.star.commonName} <small>{result.star.bayerDesignation}</small></h3>
          <p>{result.star.constellation} · HR {result.star.hrNumber} · V {angleFormatter.format(result.star.visualMagnitude)}</p>
        </div>
        <div className="stellar-heading-actions">
          <span className={position.aboveGeometricHorizon ? 'stellar-state visible' : 'stellar-state below'}>
            {position.aboveGeometricHorizon ? 'GEOMETRİK UFKUN ÜSTÜNDE' : 'GEOMETRİK UFKUN ALTINDA'}
          </span>
          <button className="trace-button" type="button" onClick={onShowTrace}>Hesap izini aç</button>
        </div>
      </div>

      <div className="stellar-controls">
        <label>
          <span>Katalog yıldızı</span>
          <select
            value={settings.starId}
            onChange={(event) => onChange({ ...settings, starId: event.currentTarget.value })}
          >
            {BRIGHT_STAR_CATALOG.map((star) => (
              <option key={star.id} value={star.id}>
                {star.commonName} · {star.bayerDesignation} · V {star.visualMagnitude.toFixed(2)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>İz süresi</span>
          <select
            value={settings.trailDurationMinutes}
            onChange={(event) => onChange({ ...settings, trailDurationMinutes: Number(event.currentTarget.value) })}
          >
            <option value={180}>3 saat</option>
            <option value={360}>6 saat</option>
            <option value={720}>12 saat</option>
            <option value={1440}>24 saat</option>
            <option value={2880}>48 saat</option>
          </select>
        </label>
        <label>
          <span>Örnekleme</span>
          <select
            value={settings.trailSampleIntervalMinutes}
            onChange={(event) => onChange({ ...settings, trailSampleIntervalMinutes: Number(event.currentTarget.value) })}
          >
            <option value={5}>5 dk</option>
            <option value={10}>10 dk</option>
            <option value={15}>15 dk</option>
            <option value={30}>30 dk</option>
            <option value={60}>60 dk</option>
          </select>
        </label>
      </div>

      <div className="stellar-coordinate-grid">
        <article>
          <span>Katalog · J2000</span>
          <strong>α {preciseFormatter.format(result.sourceRightAscensionJ2000Deg)}°</strong>
          <b>δ {preciseFormatter.format(result.sourceDeclinationJ2000Deg)}°</b>
        </article>
        <article>
          <span>Gözlem tarihi · ortalama</span>
          <strong>α {preciseFormatter.format(result.meanOfDateRightAscensionDeg)}°</strong>
          <b>δ {preciseFormatter.format(result.meanOfDateDeclinationDeg)}°</b>
        </article>
        <article>
          <span>Precession kayması</span>
          <strong>{angleFormatter.format(result.precessionAngularShiftArcsec)}″</strong>
          <b>IAU 2006</b>
        </article>
        <article>
          <span>Yerel yıldız zamanı</span>
          <strong>{angleFormatter.format(position.localMeanSiderealTimeDeg)}°</strong>
          <b>LMST</b>
        </article>
      </div>

      <div className="stellar-position-grid">
        <article><span>Yükseklik</span><strong>{formatAngle(position.elevationDeg)}</strong></article>
        <article><span>Azimut</span><strong>{formatAngle(position.azimuthDeg)}</strong></article>
        <article><span>Saat açısı</span><strong>{formatAngle(position.hourAngleDeg)}</strong></article>
        <article><span>Günlük sınıf</span><strong>{horizonClassLabels[position.horizonClass]}</strong></article>
      </div>

      <div className="stellar-trail-card">
        <div className="stellar-trail-title">
          <div>
            <span>Geometrik yıldız izi</span>
            <strong>{formatDuration(result.trail.durationMinutes)} pencere · {result.trail.samples.length} örnek</strong>
          </div>
          <div>
            <span>Ufuk üstü</span>
            <strong>{formatDuration(result.trail.visibleDurationMinutes)}</strong>
          </div>
        </div>
        <svg aria-label="Yıldız yüksekliğinin zaman içindeki geometrik izi" role="img" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line className="stellar-horizon-line" x1="4" x2="96" y1="50" y2="50" />
          <line className="stellar-guide-line" x1="4" x2="96" y1="6" y2="6" />
          <line className="stellar-guide-line" x1="4" x2="96" y1="94" y2="94" />
          <polyline className="stellar-trail-line" points={polyline} fill="none" />
        </svg>
        <div className="stellar-trail-axis"><span>+90°</span><span>0° ufuk</span><span>−90°</span></div>
      </div>

      <div className="stellar-crossings">
        <span>Geometrik ufuk geçişleri</span>
        {crossings.length === 0 ? (
          <strong>Bu zaman penceresinde doğuş/batış geçişi yok.</strong>
        ) : crossings.map((crossing) => (
          <strong key={`${crossing.kind}-${crossing.observedAtIso}`}>
            {crossing.kind === 'rise' ? 'Doğuş' : 'Batış'} · UTC {formatClock(crossing.observedAtIso)} · A {formatAngle(crossing.azimuthDeg)}
          </strong>
        ))}
      </div>

      <p className="stellar-source-note">
        {BRIGHT_STAR_CATALOG_SOURCE}. Bu panel optik çıplak-göz görünürlüğü iddiası üretmez; kırılma, sönümleme, gökyüzü parlaklığı, topoğrafik ufuk ve proper motion uygulanmaz.
      </p>
      {prediction.warnings.length > 0 && <p className="stellar-warning">{prediction.warnings[2]}</p>}
    </section>
  );
}
