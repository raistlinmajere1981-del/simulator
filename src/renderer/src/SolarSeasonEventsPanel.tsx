import type { SolarSeasonEventsResult } from '../../simulation/solar-season-events';
import { useI18n } from './I18nProvider';
import { getSolarSeasonEventLabel, getSolarSeasonObserverLabel } from './astronomy-result-presentation';
import { appLocaleTag } from './i18n';
import './solar-season-events-panel.css';

function eventClass(kind: SolarSeasonEventsResult['events'][number]['kind']): string {
  return kind.includes('equinox') ? 'equinox' : 'solstice';
}

export function SolarSeasonEventsPanel({ result }: { result: SolarSeasonEventsResult }): React.JSX.Element {
  const { locale, t } = useI18n();
  const angleFormatter = new Intl.NumberFormat(appLocaleTag(locale), { maximumFractionDigits: 2 });
  const coordinateFormatter = new Intl.NumberFormat(appLocaleTag(locale), { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  const timeFormatter = new Intl.DateTimeFormat(appLocaleTag(locale), { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  const duration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const remainder = Math.round(minutes - hours * 60);
    return `${hours} ${t('unit.hoursShort')} ${String(remainder).padStart(2, '0')} ${t('unit.minutesShort')}`;
  };
  const azimuth = (value: number | null): string => value === null ? '—' : `${angleFormatter.format(value)}°`;

  return (
    <section className="solar-season-panel panel">
      <div className="solar-season-heading">
        <div>
          <span className="eyebrow">{t('solar.season.stage')}</span>
          <h2>{t('solar.season.title')}</h2>
          <p>{t('solar.season.intro', { year: result.year })}</p>
        </div>
        <div className="solar-season-context">
          <span>{result.year}</span>
          <strong>{coordinateFormatter.format(result.latitudeDeg)}°, {coordinateFormatter.format(result.longitudeDeg)}°</strong>
        </div>
      </div>

      <div className="solar-season-track" aria-hidden="true">
        <span className="solar-season-track-line" />
        {result.events.map((event, index) => <span className={`solar-season-track-marker ${eventClass(event.kind)}`} style={{ left: `${(index / 3) * 100}%` }} key={event.kind} />)}
      </div>

      <div className="solar-season-grid">
        {result.events.map((event) => (
          <article className={`solar-season-card ${eventClass(event.kind)}`} key={event.kind}>
            <header>
              <div>
                <small>{getSolarSeasonObserverLabel(locale, event.kind, result.latitudeDeg)}</small>
                <strong>{getSolarSeasonEventLabel(locale, event.kind)}</strong>
              </div>
              <b>λ {angleFormatter.format(event.targetApparentSolarLongitudeDeg)}°</b>
            </header>
            <div className="solar-season-event-time">
              <strong>{timeFormatter.format(new Date(event.eventIso))} UTC</strong>
              <span>{t('solar.season.localDate', { date: event.observerLocalDate })}</span>
            </div>
            <dl>
              <div><dt>{t('solar.season.solarDeclination')}</dt><dd>{angleFormatter.format(event.declinationDeg)}°</dd></div>
              <div><dt>{t('solar.season.standardDayLength')}</dt><dd>{duration(event.observerStandardDaylightMinutes)}</dd></div>
              <div><dt>{t('solar.season.geometricDuration')}</dt><dd>{duration(event.observerGeometricDaylightMinutes)}</dd></div>
              <div><dt>{t('solar.season.solarNoon')}</dt><dd>{angleFormatter.format(event.observerSolarNoonElevationDeg)}°</dd></div>
              <div><dt>{t('solar.season.standardRiseAzimuth')}</dt><dd>{azimuth(event.observerStandardRiseAzimuthDeg)}</dd></div>
              <div><dt>{t('solar.season.standardSetAzimuth')}</dt><dd>{azimuth(event.observerStandardSetAzimuthDeg)}</dd></div>
            </dl>
          </article>
        ))}
      </div>
      <p className="solar-season-note">{t('solar.season.note')}</p>
    </section>
  );
}
