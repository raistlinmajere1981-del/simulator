import type { SolarRouteComparisonResult, SolarRouteSample } from '../../simulation/solar-route-comparison';
import { formatUtcOffset } from '../../shared/celestial-time';
import { DraftNumberInput } from './DraftNumberInput';
import { useI18n } from './I18nProvider';
import { appLocaleTag } from './i18n';
import './solar-route-comparison-panel.css';

function normalizeLongitude(value: number): number {
  return ((value + 540) % 360) - 180;
}

function chartY(elevationDeg: number): number {
  const clamped = Math.max(-90, Math.min(90, elevationDeg));
  return 18 + (90 - clamped) / 180 * 144;
}

function chartX(fraction: number): number {
  return 42 + fraction * 916;
}

function EndpointCard({ label, latitudeDeg, longitudeDeg, sample, editable, onLatitudeChange, onLongitudeChange }: {
  label: string;
  latitudeDeg: number;
  longitudeDeg: number;
  sample?: SolarRouteSample;
  editable?: boolean;
  onLatitudeChange?(value: number): void;
  onLongitudeChange?(value: number): void;
}): React.JSX.Element {
  const { locale, t } = useI18n();
  const numberFormatter = new Intl.NumberFormat(appLocaleTag(locale), { maximumFractionDigits: 2 });
  const coordinateFormatter = new Intl.NumberFormat(appLocaleTag(locale), { maximumFractionDigits: 4 });
  const clockText = (value: SolarRouteSample): string => {
    const rounded = Math.round(value.apparentSolarClock.minuteOfDay * 60);
    const hour = Math.floor(rounded / 3_600) % 24;
    const minute = Math.floor((rounded % 3_600) / 60);
    const second = rounded % 60;
    const dayOffset = value.apparentSolarClock.dayOffset;
    const suffix = dayOffset === 0 ? '' : t('solar.route.dayOffset', { value: dayOffset > 0 ? `+${dayOffset}` : dayOffset });
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}${suffix}`;
  };

  return (
    <article className="solar-route-endpoint-card">
      <header>
        <span>{label}</span>
        <b className={sample && sample.solarElevationDeg >= 0 ? 'above' : 'below'}>{sample ? (sample.solarElevationDeg >= 0 ? t('solar.route.aboveHorizon') : t('solar.route.belowHorizon')) : '—'}</b>
      </header>
      {editable ? (
        <div className="solar-route-coordinate-inputs">
          <label><span>{t('solar.route.latitude')}</span><DraftNumberInput value={latitudeDeg} min={-90} max={90} step={0.1} onCommit={(value) => onLatitudeChange?.(value)} /><b>°</b></label>
          <label><span>{t('solar.route.longitude')}</span><DraftNumberInput value={longitudeDeg} min={-180} max={180} step={0.1} onCommit={(value) => onLongitudeChange?.(value)} /><b>°</b></label>
        </div>
      ) : <p className="solar-route-coordinate-readout">{coordinateFormatter.format(latitudeDeg)}°, {coordinateFormatter.format(longitudeDeg)}°</p>}
      <dl>
        <div><dt>{t('solar.route.sunElevation')}</dt><dd>{sample ? `${numberFormatter.format(sample.solarElevationDeg)}°` : '—'}</dd></div>
        <div><dt>{t('solar.route.sunAzimuth')}</dt><dd>{sample ? `${numberFormatter.format(sample.solarAzimuthDeg)}°` : '—'}</dd></div>
        <div><dt>{t('solar.route.apparentSolarClock')}</dt><dd>{sample ? clockText(sample) : '—'}</dd></div>
      </dl>
    </article>
  );
}

export function SolarRouteComparisonPanel({ result, error, utcOffsetMinutes, startLatitudeDeg, startLongitudeDeg, endLatitudeDeg, endLongitudeDeg, onEndLatitudeChange, onEndLongitudeChange }: {
  result?: SolarRouteComparisonResult;
  error?: string;
  utcOffsetMinutes: number;
  startLatitudeDeg: number;
  startLongitudeDeg: number;
  endLatitudeDeg: number;
  endLongitudeDeg: number;
  onEndLatitudeChange(value: number): void;
  onEndLongitudeChange(value: number): void;
}): React.JSX.Element {
  const { locale, t } = useI18n();
  const numberFormatter = new Intl.NumberFormat(appLocaleTag(locale), { maximumFractionDigits: 2 });
  const coordinateFormatter = new Intl.NumberFormat(appLocaleTag(locale), { maximumFractionDigits: 4 });
  const signed = (value: number): string => {
    const formatted = numberFormatter.format(value);
    return value > 0 ? `+${formatted}` : formatted;
  };
  const clockText = (sample: SolarRouteSample): string => {
    const rounded = Math.round(sample.apparentSolarClock.minuteOfDay * 60);
    const hour = Math.floor(rounded / 3_600) % 24;
    const minute = Math.floor((rounded % 3_600) / 60);
    const second = rounded % 60;
    const dayOffset = sample.apparentSolarClock.dayOffset;
    const suffix = dayOffset === 0 ? '' : t('solar.route.dayOffset', { value: dayOffset > 0 ? `+${dayOffset}` : dayOffset });
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}${suffix}`;
  };
  const startSample = result?.samples[0];
  const endSample = result?.samples.at(-1);
  const polyline = result?.samples.map((sample) => `${chartX(sample.fraction)},${chartY(sample.solarElevationDeg)}`).join(' ') ?? '';

  return (
    <section className="solar-route-panel panel">
      <div className="solar-route-heading">
        <div><span className="eyebrow">{t('solar.route.stage')}</span><h2>{t('solar.route.title')}</h2><p>{t('solar.route.intro')}</p></div>
        <div className="solar-route-heading-actions">
          <span>{formatUtcOffset(utcOffsetMinutes)}</span>
          <button type="button" onClick={() => { onEndLatitudeChange(startLatitudeDeg); onEndLongitudeChange(normalizeLongitude(startLongitudeDeg + 30)); }}>{t('solar.route.moveEndEast')}</button>
        </div>
      </div>

      <div className="solar-route-endpoint-grid">
        <EndpointCard label={t('solar.route.endpointA')} latitudeDeg={startLatitudeDeg} longitudeDeg={startLongitudeDeg} sample={startSample} />
        <div className="solar-route-summary-card">
          <span>{t('solar.route.geodesicRoute')}</span>
          <strong>{result ? `${numberFormatter.format(result.routeDistanceM / 1_000)} km` : '—'}</strong>
          <dl>
            <div><dt>{t('solar.route.initialBearing')}</dt><dd>{result ? `${numberFormatter.format(result.initialBearingDeg)}°` : '—'}</dd></div>
            <div><dt>{t('solar.route.solution')}</dt><dd>{result?.routeMethod === 'vincenty' ? 'Vincenty' : result ? t('geodesic.sphericalFallback') : '—'}</dd></div>
            <div><dt>{t('solar.route.deltaElevation')}</dt><dd>{result ? `${signed(result.endMinusStartElevationDeg)}°` : '—'}</dd></div>
            <div><dt>{t('solar.route.deltaSolarTime')}</dt><dd>{result ? `${signed(result.apparentSolarClockDifferenceMinutes)} ${t('unit.minutesShort')}` : '—'}</dd></div>
          </dl>
        </div>
        <EndpointCard label={t('solar.route.endpointB')} latitudeDeg={endLatitudeDeg} longitudeDeg={endLongitudeDeg} sample={endSample} editable onLatitudeChange={onEndLatitudeChange} onLongitudeChange={onEndLongitudeChange} />
      </div>

      {error ? <div className="solar-route-error">{error}</div> : result ? (
        <>
          <div className="solar-route-diagnostics">
            <div><span>{t('solar.route.minimumElevation')}</span><strong>{numberFormatter.format(result.minimumSolarElevationDeg)}°</strong></div>
            <div><span>{t('solar.route.maximumElevation')}</span><strong>{numberFormatter.format(result.maximumSolarElevationDeg)}°</strong></div>
            <div><span>{t('solar.route.horizonSideChanges')}</span><strong>{result.horizonSideChangeCount}</strong><small>{t('solar.route.neighborChangesOnly')}</small></div>
            <div><span>{t('solar.route.sampleCount')}</span><strong>{result.samples.length}</strong><small>0 / 25 / 50 / 75 / 100%</small></div>
          </div>
          <div className="solar-route-chart-wrap">
            <div className="solar-route-chart-title"><span>{t('solar.route.chartTitle')}</span><b>{t('solar.route.zeroLine')}</b></div>
            <svg className="solar-route-chart" viewBox="0 0 1000 180" role="img" aria-label={t('solar.route.chartAria')}>
              <line className="solar-route-chart-grid top" x1="42" x2="958" y1="18" y2="18" />
              <line className="solar-route-chart-horizon" x1="42" x2="958" y1="90" y2="90" />
              <line className="solar-route-chart-grid bottom" x1="42" x2="958" y1="162" y2="162" />
              <text x="4" y="22">+90°</text><text x="14" y="94">0°</text><text x="4" y="166">−90°</text>
              <polyline className="solar-route-chart-line" points={polyline} />
              {result.samples.map((sample) => (
                <g key={sample.fraction}>
                  <circle className={sample.solarElevationDeg >= 0 ? 'above' : 'below'} cx={chartX(sample.fraction)} cy={chartY(sample.solarElevationDeg)} r="5"><title>{`${Math.round(sample.fraction * 100)}% · ${numberFormatter.format(sample.solarElevationDeg)}°`}</title></circle>
                  <text className="fraction-label" x={chartX(sample.fraction)} y="177" textAnchor="middle">{Math.round(sample.fraction * 100)}%</text>
                </g>
              ))}
            </svg>
          </div>
          <div className="solar-route-sample-grid">
            {result.samples.map((sample) => (
              <article key={sample.fraction} className={sample.solarElevationDeg >= 0 ? 'above' : 'below'}>
                <header><span>{Math.round(sample.fraction * 100)}%</span><b>{numberFormatter.format(sample.distanceM / 1_000)} km</b></header>
                <strong>{numberFormatter.format(sample.solarElevationDeg)}°</strong><small>{t('solar.route.sunElevation')}</small>
                <p>{coordinateFormatter.format(sample.latitudeDeg)}°, {coordinateFormatter.format(sample.longitudeDeg)}°</p>
                <p>{t('solar.route.azimuthValue', { value: numberFormatter.format(sample.solarAzimuthDeg) })}</p>
                <p>{t('solar.route.solarClockValue', { value: clockText(sample) })}</p>
              </article>
            ))}
          </div>
          <details className="solar-route-trace">
            <summary>{t('solar.route.showTrace')}</summary>
            <p>{result.trace.summary}</p>
            <ol>{result.trace.steps.map((step) => <li key={step.id}><strong>{step.title}</strong><code>{step.formula}</code><span>{step.substitution}</span><b>{step.result}</b></li>)}</ol>
          </details>
        </>
      ) : null}
      <p className="solar-route-note">{t('solar.route.note')}</p>
    </section>
  );
}
