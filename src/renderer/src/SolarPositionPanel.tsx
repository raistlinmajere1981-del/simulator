import type { SolarPositionResult } from '../../simulation/solar-position';
import { PanelHelpButton } from './HelpSystem';
import { useI18n } from './I18nProvider';
import { appLocaleTag, type AppLocale } from './i18n';
import './solar-position-panel.css';

const angleFormatters: Record<AppLocale, Intl.NumberFormat> = {
  tr: new Intl.NumberFormat(appLocaleTag('tr'), { maximumFractionDigits: 3 }),
  en: new Intl.NumberFormat(appLocaleTag('en'), { maximumFractionDigits: 3 })
};
const minuteFormatters: Record<AppLocale, Intl.NumberFormat> = {
  tr: new Intl.NumberFormat(appLocaleTag('tr'), { maximumFractionDigits: 2 }),
  en: new Intl.NumberFormat(appLocaleTag('en'), { maximumFractionDigits: 2 })
};

function angle(value: number, locale: AppLocale): string {
  return `${angleFormatters[locale].format(value)}°`;
}


export function SolarPositionPanel({
  result,
  onShowTrace
}: {
  result: SolarPositionResult;
  onShowTrace(): void;
}): React.JSX.Element {
  const { locale, t } = useI18n();
  const aboveHorizon = result.elevationDeg >= 0;
  const altitudePercent = Math.max(4, Math.min(96, 50 - result.elevationDeg / 1.8));
  const azimuthPercent = Math.max(4, Math.min(96, result.azimuthDeg / 360 * 100));

  return (
    <section className="solar-position-panel panel">
      <div className="panel-title-row">
        <div>
          <span className="eyebrow">{t('astronomy.reference.sun')}</span>
          <h2>{t('astronomy.geometricLocalPosition')}</h2>
        </div>
        <div className="title-actions">
          <PanelHelpButton panelId="solar-position" />
          <span className={`solar-horizon-badge ${aboveHorizon ? 'above' : 'below'}`}>
            {aboveHorizon ? t('astronomy.aboveHorizon') : t('astronomy.belowHorizon')}
          </span>
          <button type="button" onClick={onShowTrace}>{t('model.trace')}</button>
        </div>
      </div>

      <div className="solar-sky-reference" aria-hidden="true">
        <span className="solar-sky-horizon" />
        <span className="solar-sky-sun" style={{ left: `${azimuthPercent}%`, top: `${altitudePercent}%` }} />
        <span className="solar-sky-label north">{t('compass.northShort')}</span>
        <span className="solar-sky-label east">{t('compass.eastShort')}</span>
        <span className="solar-sky-label south">{t('compass.southShort')}</span>
        <span className="solar-sky-label west">{t('compass.westShort')}</span>
      </div>

      <div className="solar-position-metrics">
        <div><small>{t('astronomy.metric.geometricElevation')}</small><strong>{angle(result.elevationDeg, locale)}</strong></div>
        <div><small>{t('astronomy.metric.azimuthNorth')}</small><strong>{angle(result.azimuthDeg, locale)}</strong></div>
        <div><small>{t('astronomy.metric.declination')}</small><strong>{angle(result.declinationDeg, locale)}</strong></div>
        <div><small>{t('astronomy.metric.hourAngle')}</small><strong>{angle(result.hourAngleDeg, locale)}</strong></div>
        <div><small>{t('astronomy.metric.zenithAngle')}</small><strong>{angle(result.zenithDeg, locale)}</strong></div>
        <div><small>{t('astronomy.metric.equationOfTime')}</small><strong>{minuteFormatters[locale].format(result.equationOfTimeMinutes)} {t('unit.minutesShort')}</strong></div>
      </div>

      <p className="solar-position-note">{t('solar.position.note')}</p>
    </section>
  );
}
