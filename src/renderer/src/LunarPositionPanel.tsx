import { useState } from 'react';
import type { LunarPositionResult } from '../../simulation/lunar-position';
import { calculateSolarEclipseOverlap } from '../../simulation/solar-eclipse-overlap';
import { calculateSolarPosition } from '../../simulation/solar-position';
import { EclipseEventSearchPanel } from './EclipseEventSearchPanel';
import { EclipseOverlapPanel } from './EclipseOverlapPanel';
import { PanelHelpButton } from './HelpSystem';
import { useI18n } from './I18nProvider';
import { getLunarPhaseLabel } from './astronomy-result-presentation';
import { appLocaleTag, type AppLocale } from './i18n';
import { formatPercentValue } from './app/app-formatters';
import './lunar-position-panel.css';

const angleFormatters: Record<AppLocale, Intl.NumberFormat> = {
  tr: new Intl.NumberFormat(appLocaleTag('tr'), { maximumFractionDigits: 3 }),
  en: new Intl.NumberFormat(appLocaleTag('en'), { maximumFractionDigits: 3 })
};
const distanceFormatters: Record<AppLocale, Intl.NumberFormat> = {
  tr: new Intl.NumberFormat(appLocaleTag('tr'), { maximumFractionDigits: 0 }),
  en: new Intl.NumberFormat(appLocaleTag('en'), { maximumFractionDigits: 0 })
};
const ageFormatters: Record<AppLocale, Intl.NumberFormat> = {
  tr: new Intl.NumberFormat(appLocaleTag('tr'), { maximumFractionDigits: 2 }),
  en: new Intl.NumberFormat(appLocaleTag('en'), { maximumFractionDigits: 2 })
};

function angle(value: number, locale: AppLocale): string {
  return `${angleFormatters[locale].format(value)}°`;
}

export function LunarPositionPanel({
  result,
  onShowTrace
}: {
  result: LunarPositionResult;
  onShowTrace(): void;
}): React.JSX.Element {
  const { locale, t } = useI18n();
  const aboveHorizon = result.elevationDeg >= 0;
  const altitudePercent = Math.max(4, Math.min(96, 50 - result.elevationDeg / 1.8));
  const azimuthPercent = Math.max(4, Math.min(96, result.azimuthDeg / 360 * 100));
  const illuminationPercent = result.illuminatedFraction * 100;
  const phaseLabel = getLunarPhaseLabel(locale, result.phaseName);
  const [halfWindowHours, setHalfWindowHours] = useState(12);
  const solarForOverlap = calculateSolarPosition({
    observedAtIso: result.observedAtIso,
    latitudeDeg: result.latitudeDeg,
    longitudeDeg: result.longitudeDeg
  });
  const eclipseOverlap = calculateSolarEclipseOverlap({
    solarPosition: solarForOverlap,
    lunarPosition: result
  });

  return (
    <>
      <section className="lunar-position-panel panel">
        <div className="panel-title-row">
          <div>
            <span className="eyebrow">{t('astronomy.reference.moon')}</span>
            <h2>{t('astronomy.topocentricPositionPhase')}</h2>
          </div>
          <div className="title-actions">
            <PanelHelpButton panelId="lunar-position" />
            <span className={`lunar-horizon-badge ${aboveHorizon ? 'above' : 'below'}`}>
              {aboveHorizon ? t('astronomy.aboveHorizon') : t('astronomy.belowHorizon')}
            </span>
            <button type="button" onClick={onShowTrace}>{t('model.trace')}</button>
          </div>
        </div>

        <div className="lunar-sky-reference" aria-hidden="true">
          <span className="lunar-sky-horizon" />
          <span className="lunar-sky-moon" style={{ left: `${azimuthPercent}%`, top: `${altitudePercent}%` }}>
            <span style={{ opacity: Math.max(0.12, result.illuminatedFraction) }} />
          </span>
          <span className="lunar-sky-label north">{t('compass.northShort')}</span>
          <span className="lunar-sky-label east">{t('compass.eastShort')}</span>
          <span className="lunar-sky-label south">{t('compass.southShort')}</span>
          <span className="lunar-sky-label west">{t('compass.westShort')}</span>
          <strong className="lunar-phase-label">{phaseLabel} · {formatPercentValue(illuminationPercent, locale)}</strong>
        </div>

        <div className="lunar-position-metrics">
          <div><small>{t('astronomy.metric.geometricElevation')}</small><strong>{angle(result.elevationDeg, locale)}</strong></div>
          <div><small>{t('astronomy.metric.azimuthNorth')}</small><strong>{angle(result.azimuthDeg, locale)}</strong></div>
          <div><small>{t('astronomy.metric.illumination')}</small><strong>{formatPercentValue(illuminationPercent, locale)}</strong></div>
          <div><small>{t('astronomy.metric.phaseAge')}</small><strong>{phaseLabel}</strong><em>{ageFormatters[locale].format(result.phaseAgeDays)} {t('unit.days')}</em></div>
          <div><small>{t('astronomy.metric.elongation')}</small><strong>{angle(result.elongationDeg, locale)}</strong></div>
          <div><small>{t('astronomy.metric.moonDistance')}</small><strong>{distanceFormatters[locale].format(result.distanceKm)} km</strong></div>
          <div><small>{t('astronomy.metric.declination')}</small><strong>{angle(result.declinationDeg, locale)}</strong></div>
          <div><small>{t('astronomy.metric.horizontalParallax')}</small><strong>{angle(result.horizontalParallaxDeg, locale)}</strong></div>
        </div>

        <p className="lunar-position-note">{t('lunar.position.note')}</p>
      </section>

      <EclipseOverlapPanel result={eclipseOverlap} />
      <EclipseEventSearchPanel
        anchorObservedAtIso={result.observedAtIso}
        latitudeDeg={result.latitudeDeg}
        longitudeDeg={result.longitudeDeg}
        halfWindowHours={halfWindowHours}
        onHalfWindowHoursChange={setHalfWindowHours}
      />
    </>
  );
}
