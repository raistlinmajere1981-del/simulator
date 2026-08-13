import { formatUtcOffset, localDateTimeValueFromInstant } from '../../shared/celestial-time';
import type {
  SolarDayEventsResult,
  SolarThresholdEvents
} from '../../simulation/solar-day-events';
import type { SolarSeasonEventsResult } from '../../simulation/solar-season-events';
import type { SolarTimeOffsetResult } from '../../simulation/solar-time-offset';
import type { SolarRouteComparisonResult } from '../../simulation/solar-route-comparison';
import { PanelHelpButton } from './HelpSystem';
import { useI18n } from './I18nProvider';
import { getSolarThresholdStateLabel } from './astronomy-result-presentation';
import { numberFormatterFor } from './app/app-formatters';
import type { AppLocale, TranslationKey, TranslationValues } from './i18n';

type TranslationFunction = (key: TranslationKey, values?: TranslationValues) => string;
import { SolarSeasonEventsPanel } from './SolarSeasonEventsPanel';
import { SolarTimeOffsetPanel } from './SolarTimeOffsetPanel';
import { SolarRouteComparisonPanel } from './SolarRouteComparisonPanel';
import './solar-day-events-panel.css';

const MIN_SEASON_YEAR = 1900;
const MAX_SEASON_YEAR = 2100;

function localClock(iso: string | null, offsetMinutes: number): string {
  if (!iso) return '—';
  const local = localDateTimeValueFromInstant(iso, offsetMinutes);
  return local.slice(11, 16);
}

function localMinuteOfDay(iso: string | null, offsetMinutes: number): number | null {
  if (!iso) return null;
  const local = localDateTimeValueFromInstant(iso, offsetMinutes);
  const hour = Number(local.slice(11, 13));
  const minute = Number(local.slice(14, 16));
  const second = Number(local.slice(17, 19));
  return hour * 60 + minute + second / 60;
}

function duration(minutes: number, locale: AppLocale, t: TranslationFunction): string {
  const hours = Math.floor(minutes / 60);
  const remainder = Math.round(minutes - hours * 60);
  return `${numberFormatterFor(locale).format(hours)} ${t('unit.hoursShort')} ${String(remainder).padStart(2, '0')} ${t('unit.minutesShort')}`;
}

function eventClock(
  events: SolarThresholdEvents,
  kind: 'rise' | 'set',
  offsetMinutes: number,
  t: TranslationFunction
): string {
  if (events.state === 'continuous-above') return t('solar.day.noTransitionAbove');
  if (events.state === 'continuous-below') return t('solar.day.noTransitionBelow');
  if (events.state === 'grazing') return t('solar.day.noReliableTransition');
  return localClock(kind === 'rise' ? events.riseIso : events.setIso, offsetMinutes);
}

function markerStyle(minute: number | null): React.CSSProperties | undefined {
  if (minute === null) return undefined;
  return { left: `${Math.max(0, Math.min(100, minute / 1440 * 100))}%` };
}

export function SolarDayEventsPanel({
  result,
  solarTimeResult,
  seasonResult,
  routeResult,
  routeError,
  routeEndLatitudeDeg,
  routeEndLongitudeDeg,
  onRouteEndCoordinateChange,
  onShowTrace
}: {
  result: SolarDayEventsResult;
  solarTimeResult: SolarTimeOffsetResult;
  seasonResult?: SolarSeasonEventsResult;
  routeResult?: SolarRouteComparisonResult;
  routeError?: string;
  routeEndLatitudeDeg: number;
  routeEndLongitudeDeg: number;
  onRouteEndCoordinateChange(key: 'latitude' | 'longitude', value: number): void;
  onShowTrace(): void;
}): React.JSX.Element {
  const { locale, t } = useI18n();
  const numberFormatter = numberFormatterFor(locale);
  const geometricRiseMinute = localMinuteOfDay(result.geometric.riseIso, result.utcOffsetMinutes);
  const geometricSetMinute = localMinuteOfDay(result.geometric.setIso, result.utcOffsetMinutes);
  const standardRiseMinute = localMinuteOfDay(result.standardApparent.riseIso, result.utcOffsetMinutes);
  const standardSetMinute = localMinuteOfDay(result.standardApparent.setIso, result.utcOffsetMinutes);
  const noonMinute = localMinuteOfDay(result.solarNoonIso, result.utcOffsetMinutes);
  const angle = (value: number | null): string => value === null ? '—' : `${numberFormatter.format(value)}°`;

  return (
    <>
      <section className="solar-day-events-panel panel">
        <div className="panel-title-row">
          <div>
            <span className="eyebrow">{t('solar.day.stage')}</span>
            <h2>{t('solar.day.title')}</h2>
          </div>
          <div className="title-actions">
            <PanelHelpButton panelId="solar-day-events" />
            <span className="solar-day-date-badge">{result.localDate} · {formatUtcOffset(result.utcOffsetMinutes)}</span>
            <button type="button" onClick={onShowTrace}>{t('model.trace')}</button>
          </div>
        </div>

        <div className="solar-day-timeline" aria-hidden="true">
          <span className="solar-dayline" />
          <span className="solar-time-label start">00</span>
          <span className="solar-time-label q1">06</span>
          <span className="solar-time-label q2">12</span>
          <span className="solar-time-label q3">18</span>
          <span className="solar-time-label end">24</span>
          {standardRiseMinute !== null && <span className="solar-event-marker standard rise" style={markerStyle(standardRiseMinute)} title={t('solar.day.standardRise')} />}
          {standardSetMinute !== null && <span className="solar-event-marker standard set" style={markerStyle(standardSetMinute)} title={t('solar.day.standardSet')} />}
          {geometricRiseMinute !== null && <span className="solar-event-marker geometric rise" style={markerStyle(geometricRiseMinute)} title={t('solar.day.geometricRise')} />}
          {geometricSetMinute !== null && <span className="solar-event-marker geometric set" style={markerStyle(geometricSetMinute)} title={t('solar.day.geometricSet')} />}
          {noonMinute !== null && <span className="solar-event-marker noon" style={markerStyle(noonMinute)} title={t('solar.day.solarNoon')} />}
        </div>

        <div className="solar-event-card-grid">
          <article className="solar-event-card geometric">
            <header>
              <div><span>{t('solar.day.geometricCenter')}</span><strong>{t('solar.day.geometricThreshold')}</strong></div>
              <b>{getSolarThresholdStateLabel(locale, result.geometric.state)}</b>
            </header>
            <dl>
              <div><dt>{t('solar.day.rise')}</dt><dd>{eventClock(result.geometric, 'rise', result.utcOffsetMinutes, t)}</dd><small>{t('solar.day.azimuthValue', { value: angle(result.geometric.riseAzimuthDeg) })}</small></div>
              <div><dt>{t('solar.day.set')}</dt><dd>{eventClock(result.geometric, 'set', result.utcOffsetMinutes, t)}</dd><small>{t('solar.day.azimuthValue', { value: angle(result.geometric.setAzimuthDeg) })}</small></div>
              <div><dt>{t('solar.day.aboveDuration')}</dt><dd>{duration(result.geometric.aboveThresholdDurationMinutes, locale, t)}</dd><small>{t('solar.day.selectedLocalDay')}</small></div>
            </dl>
          </article>

          <article className="solar-event-card standard">
            <header>
              <div><span>{t('solar.day.standardVisibleReference')}</span><strong>{t('solar.day.standardThreshold')}</strong></div>
              <b>{getSolarThresholdStateLabel(locale, result.standardApparent.state)}</b>
            </header>
            <dl>
              <div><dt>{t('solar.day.rise')}</dt><dd>{eventClock(result.standardApparent, 'rise', result.utcOffsetMinutes, t)}</dd><small>{t('solar.day.azimuthValue', { value: angle(result.standardApparent.riseAzimuthDeg) })}</small></div>
              <div><dt>{t('solar.day.set')}</dt><dd>{eventClock(result.standardApparent, 'set', result.utcOffsetMinutes, t)}</dd><small>{t('solar.day.azimuthValue', { value: angle(result.standardApparent.setAzimuthDeg) })}</small></div>
              <div><dt>{t('solar.day.aboveDuration')}</dt><dd>{duration(result.standardApparent.aboveThresholdDurationMinutes, locale, t)}</dd><small>{t('solar.day.approxCalendarReference')}</small></div>
            </dl>
          </article>

          <article className="solar-event-card noon">
            <header><div><span>{t('solar.day.solarNoon').toUpperCase()}</span><strong>{t('solar.day.localMaximumElevation')}</strong></div></header>
            <dl>
              <div><dt>{t('solar.day.time')}</dt><dd>{localClock(result.solarNoonIso, result.utcOffsetMinutes)}</dd><small>{formatUtcOffset(result.utcOffsetMinutes)}</small></div>
              <div><dt>{t('solar.day.maximumElevation')}</dt><dd>{numberFormatter.format(result.solarNoonElevationDeg)}°</dd><small>{t('solar.day.geometricCenterSmall')}</small></div>
              <div><dt>{t('solar.day.azimuth')}</dt><dd>{numberFormatter.format(result.solarNoonAzimuthDeg)}°</dd><small>{t('solar.day.fromGeographicNorth')}</small></div>
            </dl>
          </article>
        </div>

        <div className="solar-day-comparison-strip">
          <span>{t('solar.day.extraDuration')}</span>
          <strong>{numberFormatter.format(result.standardApparent.aboveThresholdDurationMinutes - result.geometric.aboveThresholdDurationMinutes)} {t('unit.minutesShort')}</strong>
        </div>
        <p className="solar-day-events-note">{t('solar.day.note')}</p>
      </section>

      <SolarTimeOffsetPanel result={solarTimeResult} solarNoonIso={result.solarNoonIso} />

      {seasonResult ? (
        <SolarSeasonEventsPanel result={seasonResult} />
      ) : (
        <section className="solar-season-panel panel">
          <span className="eyebrow">{t('solar.season.stage')}</span>
          <h2>{t('solar.season.unsupportedTitle')}</h2>
          <p className="solar-season-note">{t('solar.season.unsupportedNote', { min: MIN_SEASON_YEAR, max: MAX_SEASON_YEAR })}</p>
        </section>
      )}

      <SolarRouteComparisonPanel
        result={routeResult}
        error={routeError}
        utcOffsetMinutes={result.utcOffsetMinutes}
        startLatitudeDeg={result.latitudeDeg}
        startLongitudeDeg={result.longitudeDeg}
        endLatitudeDeg={routeEndLatitudeDeg}
        endLongitudeDeg={routeEndLongitudeDeg}
        onEndLatitudeChange={(value) => onRouteEndCoordinateChange('latitude', value)}
        onEndLongitudeChange={(value) => onRouteEndCoordinateChange('longitude', value)}
      />
    </>
  );
}
