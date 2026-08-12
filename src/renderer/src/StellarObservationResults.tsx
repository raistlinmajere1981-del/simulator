import { BRIGHT_STAR_CATALOG_SOURCE } from '../../simulation/bright-star-catalog';
import type {
  StellarObservationResult,
  StellarObservationSettings
} from '../../simulation/stellar-observation';
import type { ModelPrediction } from '../../shared/domain';
import {
  angleFormatter,
  apparentTrailPolyline,
  formatAngle,
  formatClock,
  formatDuration,
  horizonClassLabels,
  localHorizonPolyline,
  preciseFormatter,
  trailPolyline
} from './stellar-observation-view-model';

export function StellarObservationResults({
  result,
  prediction,
  settings,
  showRefractionDiagnostic
}: {
  result: StellarObservationResult;
  prediction: ModelPrediction;
  settings: StellarObservationSettings;
  showRefractionDiagnostic: boolean;
}): React.JSX.Element {
  const position = result.position;
  const firstLocalSample = result.localHorizonTrail?.samples[0];
  const crossings = result.trail.horizonCrossings;
  const localCrossings = result.localHorizonTrail?.localHorizonCrossings ?? [];
  const polyline = trailPolyline(result);
  const apparentPolyline = apparentTrailPolyline(result);
  const skylinePolyline = localHorizonPolyline(result);

  return (
    <>
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
        <svg aria-label="Geometrik yıldız yüksekliği, isteğe bağlı standart apparent yıldız yüksekliği ve yerel skyline zaman izi" role="img" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line className="stellar-horizon-line" x1="4" x2="96" y1="50" y2="50" />
          <line className="stellar-guide-line" x1="4" x2="96" y1="6" y2="6" />
          <line className="stellar-guide-line" x1="4" x2="96" y1="94" y2="94" />
          {skylinePolyline && <polyline className="stellar-local-horizon-line" points={skylinePolyline} fill="none" />}
          <polyline className="stellar-trail-line" points={polyline} fill="none" />
          {showRefractionDiagnostic && apparentPolyline && <polyline className="stellar-apparent-trail-line" points={apparentPolyline} fill="none" />}
        </svg>
        <div className="stellar-trail-axis"><span>+90°</span><span>0° astronomik ufuk</span><span>−90°</span></div>
        {(result.localHorizonTrail || showRefractionDiagnostic) && (
          <div className="stellar-trail-legend">
            <span className="star-line-key">Geometrik yıldız</span>
            {showRefractionDiagnostic && <span className="apparent-line-key">Standart apparent</span>}
            {result.localHorizonTrail && <span className="skyline-line-key">Yerel skyline</span>}
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
        {BRIGHT_STAR_CATALOG_SOURCE}. Geometrik yıldız izi ve yerel skyline ana sonuçlardır. Standart kırılma tanısı yalnız yıldız ışını için yaklaşık apparent yüksekliği ayrı gösterir; geometrik skyline ile karma fark yerel optik görünürlük değildir. Sönümleme, gökyüzü parlaklığı, gerçek hava profili, bulut, seeing ve çıplak-göz algı eşiği uygulanmaz.
      </p>
      {prediction.warnings.length > 0 && <p className="stellar-warning">{prediction.warnings[2]}</p>}
    </>
  );
}
