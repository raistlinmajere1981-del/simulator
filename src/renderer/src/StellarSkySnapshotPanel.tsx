import type {
  StellarObservationResult,
  StellarObservationSettings
} from '../../simulation/stellar-observation';
import { useI18n } from './I18nProvider';
import { appLocaleTag } from './i18n';
import { projectStellarSkyPoint, stellarSkyMarkerRadius } from './stellar-sky-visualization';

export function StellarSkySnapshotPanel({
  result,
  settings,
  show,
  onShowChange
}: {
  result: StellarObservationResult;
  settings: StellarObservationSettings;
  show: boolean;
  onShowChange(show: boolean): void;
}): React.JSX.Element {
  const { locale, t } = useI18n();
  const angleFormatter = new Intl.NumberFormat(appLocaleTag(locale), { maximumFractionDigits: 2 });
  const showSkySnapshot = show;
  const skyStars = result.skySnapshot.stars.filter((star) => star.aboveGeometricHorizon && star.azimuthDeg !== null);
  const brightestSkyStarIds = new Set([...skyStars].sort((left, right) => left.visualMagnitude - right.visualMagnitude).slice(0, 5).map((star) => star.starId));
  brightestSkyStarIds.add(settings.starId);
  const selectedSkyStar = result.skySnapshot.stars.find((star) => star.starId === settings.starId);
  const plottedLocalCounts = {
    above: skyStars.filter((star) => star.localHorizonStatus === 'above').length,
    onHorizon: skyStars.filter((star) => star.localHorizonStatus === 'on-horizon').length,
    below: skyStars.filter((star) => star.localHorizonStatus === 'below').length
  };

  return (
    <div className={showSkySnapshot ? 'stellar-sky-panel active' : 'stellar-sky-panel'}>
      <div className="stellar-sky-heading">
        <div><strong>{t('stellar.sky.title')}</strong><span>{t('stellar.sky.intro')}</span></div>
        <label className="stellar-sky-toggle"><input type="checkbox" checked={showSkySnapshot} onChange={(event) => onShowChange(event.currentTarget.checked)} /><span>{showSkySnapshot ? t('stellar.sky.shown') : t('stellar.sky.off')}</span></label>
      </div>
      {showSkySnapshot && <>
        <div className="stellar-sky-summary">
          <span>{t('stellar.sky.plotted')} <strong>{skyStars.length}/{result.skySnapshot.starCount}</strong></span>
          <span>{t('stellar.sky.geometricSummary')} <strong>{t('stellar.sky.aboveBelow', { above: result.skySnapshot.aboveGeometricHorizonCount, below: result.skySnapshot.belowGeometricHorizonCount })}</strong></span>
          {result.skySnapshot.localHorizonCounts && <span>{t('stellar.sky.localSummary')} <strong>{t('stellar.sky.localCounts', { above: plottedLocalCounts.above, boundary: plottedLocalCounts.onHorizon, below: plottedLocalCounts.below })}</strong></span>}
          {selectedSkyStar && !selectedSkyStar.aboveGeometricHorizon && <span>{t('stellar.sky.selectedStar')} <strong>{t('stellar.sky.selectedBelow')}</strong></span>}
        </div>
        <div className="stellar-sky-chart-wrap">
          <svg aria-label={t('stellar.sky.aria')} role="img" viewBox="0 0 100 100">
            <circle className="stellar-sky-horizon" cx="50" cy="50" r="43" />
            <circle className="stellar-sky-altitude-ring" cx="50" cy="50" r="28.67" />
            <circle className="stellar-sky-altitude-ring" cx="50" cy="50" r="14.33" />
            <line className="stellar-sky-axis" x1="50" y1="7" x2="50" y2="93" />
            <line className="stellar-sky-axis" x1="7" y1="50" x2="93" y2="50" />
            <text className="stellar-sky-cardinal north" x="50" y="4.5">{t('compass.northShort')}</text>
            <text className="stellar-sky-cardinal east" x="96" y="51.5">{t('compass.eastShort')}</text>
            <text className="stellar-sky-cardinal south" x="50" y="98.5">{t('compass.southShort')}</text>
            <text className="stellar-sky-cardinal west" x="4" y="51.5">{t('compass.westShort')}</text>
            <text className="stellar-sky-altitude-label" x="50" y="20.5">60°</text>
            <text className="stellar-sky-altitude-label" x="50" y="35">30°</text>
            {skyStars.map((star) => {
              const point = projectStellarSkyPoint({ elevationDeg: star.elevationDeg, azimuthDeg: star.azimuthDeg! });
              const selected = star.starId === settings.starId;
              const locallyBlocked = star.localHorizonStatus === 'below';
              const onLocalHorizon = star.localHorizonStatus === 'on-horizon';
              const className = selected ? 'stellar-sky-star selected' : locallyBlocked ? 'stellar-sky-star locally-blocked' : onLocalHorizon ? 'stellar-sky-star local-boundary' : 'stellar-sky-star';
              return <g key={star.starId} className={className}>
                <title>{star.commonName} · h {angleFormatter.format(star.elevationDeg)}° · A {angleFormatter.format(star.azimuthDeg!)}° · V {angleFormatter.format(star.visualMagnitude)}</title>
                <circle cx={point.x} cy={point.y} r={stellarSkyMarkerRadius(star.visualMagnitude) + (selected ? 0.5 : 0)} />
                {brightestSkyStarIds.has(star.starId) && <text x={point.x + 2.2} y={point.y - 1.8}>{star.commonName}</text>}
              </g>;
            })}
          </svg>
          <div className="stellar-sky-legend">
            <span className="catalog-star">{t('stellar.sky.catalogStar')}</span>
            <span className="selected-star">{t('stellar.sky.selectedLegend')}</span>
            {result.skySnapshot.localHorizonApplied && <span className="blocked-star">{t('stellar.sky.blockedLegend')}</span>}
          </div>
        </div>
        <p className="stellar-sky-note">{t('stellar.sky.note')}</p>
      </>}
    </div>
  );
}
