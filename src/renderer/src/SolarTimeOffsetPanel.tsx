import { formatUtcOffset, localDateTimeValueFromInstant } from '../../shared/celestial-time';
import type { SolarTimeOffsetResult, SolarClockReading } from '../../simulation/solar-time-offset';
import { useI18n } from './I18nProvider';
import { numberFormatterFor } from './app/app-formatters';
import type { AppLocale, TranslationKey, TranslationValues } from './i18n';

type TranslationFunction = (key: TranslationKey, values?: TranslationValues) => string;
import './solar-time-offset-panel.css';

function formatClock(reading: SolarClockReading): string {
  let totalSeconds = Math.round(reading.minuteOfDay * 60);
  totalSeconds = ((totalSeconds % 86_400) + 86_400) % 86_400;
  const hour = Math.floor(totalSeconds / 3_600);
  const minute = Math.floor((totalSeconds % 3_600) / 60);
  const second = totalSeconds % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
}

function dayLabel(dayOffset: number, t: TranslationFunction): string {
  if (dayOffset === 0) return t('solar.time.day.same');
  if (dayOffset === -1) return t('solar.time.day.previous');
  if (dayOffset === 1) return t('solar.time.day.next');
  return dayOffset < 0
    ? t('solar.time.day.before', { count: Math.abs(dayOffset) })
    : t('solar.time.day.after', { count: dayOffset });
}

function signedMinutes(value: number, locale: AppLocale, t: TranslationFunction): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '±';
  return `${sign}${numberFormatterFor(locale).format(Math.abs(value))} ${t('unit.minutesShort')}`;
}

function cardinalLongitude(value: number, locale: AppLocale, t: TranslationFunction): string {
  const absolute = numberFormatterFor(locale).format(Math.abs(value));
  if (Math.abs(value) < 0.000001) return '0°';
  return `${absolute}° ${value > 0 ? t('compass.eastShort') : t('compass.westShort')}`;
}

function localClockFromIso(iso: string, offsetMinutes: number): string {
  return localDateTimeValueFromInstant(iso, offsetMinutes).slice(11, 19);
}

function localMinuteFromIso(iso: string, offsetMinutes: number): number {
  const local = localDateTimeValueFromInstant(iso, offsetMinutes);
  return Number(local.slice(11, 13)) * 60 + Number(local.slice(14, 16)) + Number(local.slice(17, 19)) / 60;
}

export function SolarTimeOffsetPanel({ result, solarNoonIso }: { result: SolarTimeOffsetResult; solarNoonIso: string }): React.JSX.Element {
  const { locale, t } = useI18n();
  const numberFormatter = numberFormatterFor(locale);
  const noonMinute = localMinuteFromIso(solarNoonIso, result.utcOffsetMinutes);
  const noonDelta = noonMinute - 720;
  const correctionDirection = result.apparentSolarCorrectionMinutes > 0
    ? t('solar.time.apparentAhead')
    : result.apparentSolarCorrectionMinutes < 0
      ? t('solar.time.apparentBehind')
      : t('solar.time.apparentMatches');

  return (
    <section className="solar-time-offset-panel panel">
      <div className="solar-time-offset-heading">
        <div>
          <span className="eyebrow">{t('solar.time.stage')}</span>
          <h2>{t('solar.time.title')}</h2>
          <p>{t('solar.time.intro')}</p>
        </div>
        <div className="solar-time-offset-context">
          <span>{formatUtcOffset(result.utcOffsetMinutes)}</span>
          <strong>{t('solar.time.standardMeridian', { value: cardinalLongitude(result.standardMeridianDeg, locale, t) })}</strong>
          <small>{t('solar.time.observationLongitude', { value: cardinalLongitude(result.longitudeDeg, locale, t) })}</small>
        </div>
      </div>

      <div className="solar-clock-grid">
        <article className="solar-clock-card civil">
          <span>{t('solar.time.civilClock')}</span>
          <strong>{formatClock(result.civilClock)}</strong>
          <small>{result.localCivilDateTime.slice(0, 10)} · {t('solar.time.fixedUtcOffset')}</small>
        </article>
        <article className="solar-clock-card mean">
          <span>{t('solar.time.meanSolarTime')}</span>
          <strong>{formatClock(result.meanSolarClock)}</strong>
          <small>{dayLabel(result.meanSolarClock.dayOffset, t)} · {t('solar.time.longitudeOnly')}</small>
        </article>
        <article className="solar-clock-card apparent">
          <span>{t('solar.time.apparentSolarTime')}</span>
          <strong>{formatClock(result.apparentSolarClock)}</strong>
          <small>{dayLabel(result.apparentSolarClock.dayOffset, t)} · {t('solar.time.longitudeAndEot')}</small>
        </article>
      </div>

      <div className="solar-time-correction-grid">
        <article><span>{t('solar.time.longitudeDifference')}</span><strong>{numberFormatter.format(result.longitudeDeltaDeg)}°</strong><small>{t('solar.time.observationMinusMeridian')}</small></article>
        <article><span>{t('solar.time.longitudeCorrection')}</span><strong>{signedMinutes(result.longitudeCorrectionMinutes, locale, t)}</strong><small>{t('solar.time.fourMinutesPerDegree')}</small></article>
        <article><span>{t('solar.time.equationOfTime')}</span><strong>{signedMinutes(result.equationOfTimeMinutes, locale, t)}</strong><small>{t('solar.time.selectedInstant')}</small></article>
        <article className="total"><span>{t('solar.time.totalApparentDifference')}</span><strong>{signedMinutes(result.apparentSolarCorrectionMinutes, locale, t)}</strong><small>{correctionDirection}</small></article>
      </div>

      <div className="solar-time-equation-strip">
        <span>{t('solar.time.civilTime')}</span>
        <b>{signedMinutes(result.longitudeCorrectionMinutes, locale, t)}</b>
        <span>{t('solar.time.longitude')}</span>
        <b>{signedMinutes(result.equationOfTimeMinutes, locale, t)}</b>
        <span>EoT</span>
        <strong>= {formatClock(result.apparentSolarClock)}</strong>
      </div>

      <div className="solar-time-noon-strip">
        <div><span>{t('solar.time.solarNoonThisDay')}</span><strong>{localClockFromIso(solarNoonIso, result.utcOffsetMinutes)}</strong></div>
        <div><span>{t('solar.time.differenceFromCivilNoon')}</span><strong>{signedMinutes(noonDelta, locale, t)}</strong></div>
        <p>{t('solar.time.noonNote')}</p>
      </div>
      <p className="solar-time-offset-note">{t('solar.time.note')}</p>
    </section>
  );
}
