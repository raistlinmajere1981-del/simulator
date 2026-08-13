import { BRIGHT_STAR_CATALOG_SOURCE } from '../../simulation/bright-star-catalog';
import type {
  StellarObservationResult,
  StellarObservationSettings
} from '../../simulation/stellar-observation';
import type { ModelPrediction } from '../../shared/domain';
import { useI18n } from './I18nProvider';
import { getStellarHorizonClassLabel } from './astronomy-result-presentation';
import { appLocaleTag } from './i18n';
import {
  apparentTrailPolyline,
  localHorizonPolyline,
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
  const { locale, t } = useI18n();
  const angleFormatter = new Intl.NumberFormat(appLocaleTag(locale), { maximumFractionDigits: 2 });
  const preciseFormatter = new Intl.NumberFormat(appLocaleTag(locale), { maximumFractionDigits: 5 });
  const formatAngle = (value: number | null): string => value === null ? t('stellar.undefined') : `${angleFormatter.format(value)}°`;
  const formatDuration = (minutes: number | null): string => {
    if (minutes === null) return t('stellar.undefined');
    return minutes < 60
      ? `${angleFormatter.format(minutes)} ${t('unit.minutesShort')}`
      : `${angleFormatter.format(minutes / 60)} ${t('unit.hoursShort')}`;
  };
  const clockFormatter = new Intl.DateTimeFormat(appLocaleTag(locale), {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZone: 'UTC'
  });
  const formatClock = (iso: string): string => clockFormatter.format(new Date(iso));
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
        <article><span>{t('stellar.results.catalogJ2000')}</span><strong>α {preciseFormatter.format(result.sourceRightAscensionJ2000Deg)}°</strong><b>δ {preciseFormatter.format(result.sourceDeclinationJ2000Deg)}°</b></article>
        <article><span>{t('stellar.results.meanDate')}</span><strong>α {preciseFormatter.format(result.meanOfDateRightAscensionDeg)}°</strong><b>δ {preciseFormatter.format(result.meanOfDateDeclinationDeg)}°</b></article>
        <article><span>{t('stellar.results.precessionShift')}</span><strong>{angleFormatter.format(result.precessionAngularShiftArcsec)}″</strong><b>IAU 2006</b></article>
        <article><span>{t('stellar.results.lmst')}</span><strong>{angleFormatter.format(position.localMeanSiderealTimeDeg)}°</strong><b>LMST</b></article>
      </div>

      <div className="stellar-position-grid">
        <article><span>{t('stellar.results.elevation')}</span><strong>{formatAngle(position.elevationDeg)}</strong></article>
        <article><span>{t('stellar.results.azimuth')}</span><strong>{formatAngle(position.azimuthDeg)}</strong></article>
        <article><span>{t('stellar.results.hourAngle')}</span><strong>{formatAngle(position.hourAngleDeg)}</strong></article>
        <article><span>{t('stellar.results.dailyClass')}</span><strong>{getStellarHorizonClassLabel(locale, position.horizonClass)}</strong></article>
        {settings.localHorizonEnabled && <>
          <article><span>{t('stellar.results.localHorizonAtAzimuth')}</span><strong>{formatAngle(firstLocalSample?.localHorizonAltitudeDeg ?? null)}</strong></article>
          <article><span>{t('stellar.results.localHorizonClearance')}</span><strong>{formatAngle(firstLocalSample?.geometricClearanceDeg ?? null)}</strong></article>
        </>}
      </div>

      <div className="stellar-trail-card">
        <div className="stellar-trail-title">
          <div><span>{t('stellar.results.trailTitle')}</span><strong>{t('stellar.results.windowSamples', { duration: formatDuration(result.trail.durationMinutes), count: result.trail.samples.length })}</strong></div>
          <div><span>{t('stellar.results.zeroHorizonAbove')}</span><strong>{formatDuration(result.trail.visibleDurationMinutes)}</strong></div>
          {result.localHorizonTrail && <div><span>{t('stellar.results.localHorizonAbove')}</span><strong>{formatDuration(result.localHorizonTrail.visibleDurationMinutes)}</strong></div>}
        </div>
        <svg aria-label={t('stellar.results.trailAria')} role="img" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line className="stellar-horizon-line" x1="4" x2="96" y1="50" y2="50" />
          <line className="stellar-guide-line" x1="4" x2="96" y1="6" y2="6" />
          <line className="stellar-guide-line" x1="4" x2="96" y1="94" y2="94" />
          {skylinePolyline && <polyline className="stellar-local-horizon-line" points={skylinePolyline} fill="none" />}
          <polyline className="stellar-trail-line" points={polyline} fill="none" />
          {showRefractionDiagnostic && apparentPolyline && <polyline className="stellar-apparent-trail-line" points={apparentPolyline} fill="none" />}
        </svg>
        <div className="stellar-trail-axis"><span>+90°</span><span>{t('stellar.results.axisHorizon')}</span><span>−90°</span></div>
        {(result.localHorizonTrail || showRefractionDiagnostic) && <div className="stellar-trail-legend">
          <span className="star-line-key">{t('stellar.results.geometricStar')}</span>
          {showRefractionDiagnostic && <span className="apparent-line-key">{t('stellar.results.standardApparent')}</span>}
          {result.localHorizonTrail && <span className="skyline-line-key">{t('stellar.results.localSkyline')}</span>}
        </div>}
      </div>

      <div className="stellar-crossings">
        <span>{t('stellar.results.astronomicalCrossings')}</span>
        {crossings.length === 0 ? <strong>{t('stellar.results.noAstronomicalCrossing')}</strong> : crossings.map((crossing) => (
          <strong key={`${crossing.kind}-${crossing.observedAtIso}`}>{crossing.kind === 'rise' ? t('stellar.results.rise') : t('stellar.results.set')} · UTC {formatClock(crossing.observedAtIso)} · A {formatAngle(crossing.azimuthDeg)}</strong>
        ))}
      </div>

      {result.localHorizonTrail && <div className="stellar-crossings local">
        <span>{t('stellar.results.localCrossings')}</span>
        {localCrossings.length === 0 ? <strong>{t('stellar.results.noLocalCrossing')}</strong> : localCrossings.map((crossing) => (
          <strong key={`${crossing.kind}-${crossing.observedAtIso}`}>{crossing.kind === 'rise' ? t('stellar.results.localRise') : t('stellar.results.localSet')} · UTC {formatClock(crossing.observedAtIso)} · A {formatAngle(crossing.azimuthDeg)} · {t('stellar.results.horizonWord')} {formatAngle(crossing.localHorizonAltitudeDeg)}</strong>
        ))}
      </div>}

      <p className="stellar-source-note">{t('stellar.results.sourceNote', { source: BRIGHT_STAR_CATALOG_SOURCE })}</p>
      {prediction.warnings.length > 0 && <p className="stellar-warning">{prediction.warnings[2]}</p>}
    </>
  );
}
