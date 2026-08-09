import { BRIGHT_STAR_CATALOG, BRIGHT_STAR_CATALOG_SOURCE } from '../../simulation/bright-star-catalog';
import {
  STELLAR_LOCAL_HORIZON_DIRECTIONS,
  type StellarObservationResult,
  type StellarObservationSettings
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

function formatDuration(minutes: number | null): string {
  if (minutes === null) return 'Tanımsız';
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

function graphY(altitudeDeg: number): number {
  return Math.max(4, Math.min(96, 50 - (altitudeDeg / 90) * 44));
}

function trailPolyline(result: StellarObservationResult): string {
  const samples = result.trail.samples;
  if (samples.length < 2) return '';
  const duration = Math.max(result.trail.durationMinutes, 1);
  return samples.map((sample) => {
    const x = 4 + (sample.elapsedMinutes / duration) * 92;
    return `${x.toFixed(2)},${graphY(sample.elevationDeg).toFixed(2)}`;
  }).join(' ');
}

function localHorizonPolyline(result: StellarObservationResult): string {
  const localTrail = result.localHorizonTrail;
  if (!localTrail || localTrail.samples.length < 2) return '';
  const duration = Math.max(localTrail.durationMinutes, 1);
  return localTrail.samples
    .filter((sample) => sample.localHorizonAltitudeDeg !== null)
    .map((sample) => {
      const x = 4 + (sample.elapsedMinutes / duration) * 92;
      return `${x.toFixed(2)},${graphY(sample.localHorizonAltitudeDeg!).toFixed(2)}`;
    })
    .join(' ');
}

function currentLocalHorizonState(result: StellarObservationResult): {
  label: string;
  className: string;
} | null {
  const sample = result.localHorizonTrail?.samples[0];
  if (!sample) return null;
  if (sample.status === 'undefined-azimuth') {
    return { label: 'YEREL UFUK AZİMUTU TANIMSIZ', className: 'stellar-state neutral' };
  }
  if (sample.status === 'below') {
    return { label: 'YEREL UFKUN ALTINDA', className: 'stellar-state below' };
  }
  if (sample.status === 'on-horizon') {
    return { label: 'YEREL UFUK SINIRINDA', className: 'stellar-state neutral' };
  }
  return { label: 'YEREL UFKUN ÜSTÜNDE', className: 'stellar-state visible' };
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
  const localCrossings = result.localHorizonTrail?.localHorizonCrossings ?? [];
  const polyline = trailPolyline(result);
  const skylinePolyline = localHorizonPolyline(result);
  const localState = currentLocalHorizonState(result);
  const firstLocalSample = result.localHorizonTrail?.samples[0];

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
            {position.aboveGeometricHorizon ? '0° UFKUN ÜSTÜNDE' : '0° UFKUN ALTINDA'}
          </span>
          {localState && <span className={localState.className}>{localState.label}</span>}
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

      <div className={settings.localHorizonEnabled ? 'stellar-local-horizon-editor active' : 'stellar-local-horizon-editor'}>
        <div className="stellar-local-horizon-heading">
          <div>
            <strong>Yerel ufuk · 8 yönlü skyline</strong>
            <span>Ara yönler döngüsel doğrusal interpolasyonla tamamlanır. Değerler geometrik yüksekliktir.</span>
          </div>
          <label className="stellar-local-horizon-toggle">
            <input
              type="checkbox"
              checked={settings.localHorizonEnabled}
              onChange={(event) => onChange({ ...settings, localHorizonEnabled: event.currentTarget.checked })}
            />
            <span>{settings.localHorizonEnabled ? 'Etkin' : 'Kapalı'}</span>
          </label>
        </div>
        {settings.localHorizonEnabled && (
          <div className="stellar-local-horizon-grid">
            {STELLAR_LOCAL_HORIZON_DIRECTIONS.map((direction) => (
              <label key={direction.key}>
                <span>{direction.label} · {direction.azimuthDeg}°</span>
                <div>
                  <input
                    type="number"
                    min={-90}
                    max={90}
                    step={0.1}
                    value={settings[direction.key]}
                    onChange={(event) => onChange({
                      ...settings,
                      [direction.key]: Number(event.currentTarget.value)
                    })}
                  />
                  <b>°</b>
                </div>
              </label>
            ))}
          </div>
        )}
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
        {settings.localHorizonEnabled && (
          <>
            <article><span>Bu azimutta yerel ufuk</span><strong>{formatAngle(firstLocalSample?.localHorizonAltitudeDeg ?? null)}</strong></article>
            <article><span>Yerel ufuk açıklığı</span><strong>{formatAngle(firstLocalSample?.geometricClearanceDeg ?? null)}</strong></article>
          </>
        )}
      </div>

      <div className="stellar-trail-card">
        <div className="stellar-trail-title">
          <div>
            <span>Geometrik yıldız izi</span>
            <strong>{formatDuration(result.trail.durationMinutes)} pencere · {result.trail.samples.length} örnek</strong>
          </div>
          <div>
            <span>0° ufuk üstü</span>
            <strong>{formatDuration(result.trail.visibleDurationMinutes)}</strong>
          </div>
          {result.localHorizonTrail && (
            <div>
              <span>Yerel ufuk üstü</span>
              <strong>{formatDuration(result.localHorizonTrail.visibleDurationMinutes)}</strong>
            </div>
          )}
        </div>
        <svg aria-label="Yıldız yüksekliğinin ve yerel ufkun zaman içindeki geometrik izi" role="img" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line className="stellar-horizon-line" x1="4" x2="96" y1="50" y2="50" />
          <line className="stellar-guide-line" x1="4" x2="96" y1="6" y2="6" />
          <line className="stellar-guide-line" x1="4" x2="96" y1="94" y2="94" />
          {skylinePolyline && <polyline className="stellar-local-horizon-line" points={skylinePolyline} fill="none" />}
          <polyline className="stellar-trail-line" points={polyline} fill="none" />
        </svg>
        <div className="stellar-trail-axis"><span>+90°</span><span>0° astronomik ufuk</span><span>−90°</span></div>
        {result.localHorizonTrail && (
          <div className="stellar-trail-legend">
            <span className="star-line-key">Yıldız</span>
            <span className="skyline-line-key">Yerel skyline</span>
          </div>
        )}
      </div>

      <div className="stellar-crossings">
        <span>0° astronomik ufuk geçişleri</span>
        {crossings.length === 0 ? (
          <strong>Bu zaman penceresinde 0° doğuş/batış geçişi yok.</strong>
        ) : crossings.map((crossing) => (
          <strong key={`${crossing.kind}-${crossing.observedAtIso}`}>
            {crossing.kind === 'rise' ? 'Doğuş' : 'Batış'} · UTC {formatClock(crossing.observedAtIso)} · A {formatAngle(crossing.azimuthDeg)}
          </strong>
        ))}
      </div>

      {result.localHorizonTrail && (
        <div className="stellar-crossings local">
          <span>Yerel skyline geçişleri</span>
          {localCrossings.length === 0 ? (
            <strong>Bu zaman penceresinde yerel ufuk geçişi yok.</strong>
          ) : localCrossings.map((crossing) => (
            <strong key={`${crossing.kind}-${crossing.observedAtIso}`}>
              {crossing.kind === 'rise' ? 'Yerel doğuş' : 'Yerel batış'} · UTC {formatClock(crossing.observedAtIso)} · A {formatAngle(crossing.azimuthDeg)} · ufuk {formatAngle(crossing.localHorizonAltitudeDeg)}
            </strong>
          ))}
        </div>
      )}

      <p className="stellar-source-note">
        {BRIGHT_STAR_CATALOG_SOURCE}. Yerel ufuk etkinse sekiz yönlü manuel geometrik skyline kullanılır. Atmosferik kırılma, sönümleme, gökyüzü parlaklığı, hava koşulları ve çıplak-göz algı eşiği bu panelde uygulanmaz.
      </p>
      {prediction.warnings.length > 0 && <p className="stellar-warning">{prediction.warnings[2]}</p>}
    </section>
  );
}
