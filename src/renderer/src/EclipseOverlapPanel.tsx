import type { SolarEclipseOverlapResult } from '../../simulation/solar-eclipse-overlap';
import { useI18n } from './I18nProvider';
import { getEclipseGeometryFullLabel } from './astronomy-result-presentation';
import { appLocaleTag, type AppLocale } from './i18n';
import { formatPercentValue } from './app/app-formatters';
import './eclipse-overlap-panel.css';

const angleFormatters: Record<AppLocale, Intl.NumberFormat> = {
  tr: new Intl.NumberFormat(appLocaleTag('tr'), { maximumFractionDigits: 5 }),
  en: new Intl.NumberFormat(appLocaleTag('en'), { maximumFractionDigits: 5 })
};
const distanceFormatters: Record<AppLocale, Intl.NumberFormat> = {
  tr: new Intl.NumberFormat(appLocaleTag('tr'), { maximumFractionDigits: 1 }),
  en: new Intl.NumberFormat(appLocaleTag('en'), { maximumFractionDigits: 1 })
};

function classTone(result: SolarEclipseOverlapResult): string {
  return result.geometryClass === 'no-overlap' ? 'clear' : 'overlap';
}

export function EclipseOverlapPanel({
  result,
  onShowTrace
}: {
  result: SolarEclipseOverlapResult;
  onShowTrace?: () => void;
}): React.JSX.Element {
  const { locale, t } = useI18n();
  const angleFormatter = angleFormatters[locale];
  const distanceFormatter = distanceFormatters[locale];
  const sunRadius = 78;
  const moonRadius = sunRadius * result.lunarAngularRadiusDeg / result.solarAngularRadiusDeg;
  const exactSeparationPx = sunRadius * result.centerSeparationDeg / result.solarAngularRadiusDeg;
  const compressed = exactSeparationPx > 220;
  const separationPx = compressed ? 220 : exactSeparationPx;
  const sunX = 265;
  const moonX = sunX + separationPx;
  const centerY = 145;

  return (
    <section className="eclipse-overlap-panel panel">
      <div className="eclipse-overlap-heading">
        <div>
          <span className="eyebrow">{t('eclipse.overlap.stage')}</span>
          <h2>{t('eclipse.overlap.title')}</h2>
          <p>{t('eclipse.overlap.intro')}</p>
        </div>
        <div className="eclipse-overlap-actions">
          {onShowTrace && <button type="button" onClick={onShowTrace}>{t('model.trace')}</button>}
          <strong className={`eclipse-overlap-state ${classTone(result)}`}>{getEclipseGeometryFullLabel(locale, result.geometryClass)}</strong>
        </div>
      </div>

      <div className="eclipse-overlap-body">
        <div className="eclipse-disk-stage">
          <svg viewBox="0 0 600 290" role="img" aria-label={t('eclipse.overlap.aria')}>
            <line className="eclipse-center-line" x1={sunX} y1={centerY} x2={moonX} y2={centerY} />
            <circle className="eclipse-sun-disk" cx={sunX} cy={centerY} r={sunRadius} />
            <circle className="eclipse-moon-disk" cx={moonX} cy={centerY} r={moonRadius} />
            <circle className="eclipse-center-mark" cx={sunX} cy={centerY} r="2.5" />
            <circle className="eclipse-center-mark" cx={moonX} cy={centerY} r="2.5" />
            <text x={sunX} y="258" textAnchor="middle">{t('eclipse.overlap.sun')}</text>
            <text x={Math.min(540, moonX)} y="258" textAnchor="middle">{t('eclipse.overlap.moon')}</text>
          </svg>
          <div className="eclipse-scale-note">
            {compressed
              ? t('eclipse.overlap.compressedScale')
              : t('eclipse.overlap.exactScale')}
          </div>
        </div>

        <div className="eclipse-overlap-metrics">
          <div><small>{t('eclipse.overlap.centerSeparation')}</small><strong>{angleFormatter.format(result.centerSeparationDeg)}°</strong></div>
          <div><small>{t('eclipse.overlap.solarRadius')}</small><strong>{angleFormatter.format(result.solarAngularRadiusDeg)}°</strong></div>
          <div><small>{t('eclipse.overlap.lunarRadius')}</small><strong>{angleFormatter.format(result.lunarAngularRadiusDeg)}°</strong></div>
          <div><small>{t('eclipse.overlap.solarAreaCovered')}</small><strong>{formatPercentValue(result.solarDiskCoveredFraction * 100, locale)}</strong></div>
          <div><small>{t('eclipse.overlap.diameterCoverage')}</small><strong>{formatPercentValue(result.solarDiameterCoverageRatio * 100, locale)}</strong></div>
          <div><small>{t('eclipse.overlap.outerLimbClearance')}</small><strong>{angleFormatter.format(result.outerLimbClearanceDeg)}°</strong></div>
          <div><small>{t('eclipse.overlap.sunElevation')}</small><strong>{angleFormatter.format(result.sunCenterElevationDeg)}°</strong></div>
          <div><small>{t('eclipse.overlap.moonElevation')}</small><strong>{angleFormatter.format(result.moonCenterElevationDeg)}°</strong></div>
        </div>
      </div>

      <div className="eclipse-overlap-provenance">
        <span>{t('eclipse.overlap.solarDistance')} <strong>{result.solarDistanceAu.toFixed(6)} AU</strong></span>
        <span>{t('eclipse.overlap.lunarDistance')} <strong>{distanceFormatter.format(result.lunarDistanceKm)} km</strong></span>
        <span>{t('eclipse.overlap.geometricHorizon')} <strong>{result.bothCentersAboveGeometricHorizon ? t('eclipse.overlap.bothAbove') : t('eclipse.overlap.oneBelow')}</strong></span>
      </div>

      <p className="eclipse-overlap-limit">{t('eclipse.overlap.limit')}</p>
    </section>
  );
}
