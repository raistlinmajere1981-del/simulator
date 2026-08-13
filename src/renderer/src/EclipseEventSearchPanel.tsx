import { useEffect, useState } from 'react';
import { searchSolarEclipseEventWindow } from '../../simulation/solar-eclipse-event-search';
import {
  snapshotSolarEclipseEventSearch,
  type SolarEclipseEventSearchSnapshot
} from '../../simulation/solar-eclipse-event-search-prediction';
import { useI18n } from './I18nProvider';
import { getEclipseGeometryLabel } from './astronomy-result-presentation';
import { appLocaleTag, type AppLocale } from './i18n';
import { formatPercentValue } from './app/app-formatters';
import './eclipse-event-search-panel.css';

const angleFormatters: Record<AppLocale, Intl.NumberFormat> = {
  tr: new Intl.NumberFormat(appLocaleTag('tr'), { maximumFractionDigits: 5 }),
  en: new Intl.NumberFormat(appLocaleTag('en'), { maximumFractionDigits: 5 })
};
const durationFormatters: Record<AppLocale, Intl.NumberFormat> = {
  tr: new Intl.NumberFormat(appLocaleTag('tr'), { maximumFractionDigits: 1 }),
  en: new Intl.NumberFormat(appLocaleTag('en'), { maximumFractionDigits: 1 })
};
const coordinateFormatters: Record<AppLocale, Intl.NumberFormat> = {
  tr: new Intl.NumberFormat(appLocaleTag('tr'), { minimumFractionDigits: 5, maximumFractionDigits: 5 }),
  en: new Intl.NumberFormat(appLocaleTag('en'), { minimumFractionDigits: 5, maximumFractionDigits: 5 })
};
const utcFormatters: Record<AppLocale, Intl.DateTimeFormat> = {
  tr: new Intl.DateTimeFormat(appLocaleTag('tr'), { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
  en: new Intl.DateTimeFormat(appLocaleTag('en'), { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
};

function searchKey(anchorObservedAtIso: string, latitudeDeg: number, longitudeDeg: number, halfWindowHours: number): string {
  return `${anchorObservedAtIso}|${latitudeDeg.toFixed(8)}|${longitudeDeg.toFixed(8)}|${halfWindowHours}`;
}

export function EclipseEventSearchPanel({
  anchorObservedAtIso,
  latitudeDeg,
  longitudeDeg,
  initialSnapshot,
  halfWindowHours,
  onHalfWindowHoursChange,
  onSnapshotChange,
  onShowTrace
}: {
  anchorObservedAtIso: string;
  latitudeDeg: number;
  longitudeDeg: number;
  initialSnapshot?: SolarEclipseEventSearchSnapshot;
  halfWindowHours: number;
  onHalfWindowHoursChange(hours: number): void;
  onSnapshotChange?: (snapshot: SolarEclipseEventSearchSnapshot | undefined) => void;
  onShowTrace?: () => void;
}): React.JSX.Element {
  const { locale, t } = useI18n();
  const angleFormatter = angleFormatters[locale];
  const durationFormatter = durationFormatters[locale];
  const coordinateFormatter = coordinateFormatters[locale];
  const utcTime = (value: string | null): string => value
    ? `${utcFormatters[locale].format(new Date(value))} UTC`
    : t('eclipse.search.outsideWindow');
  const geometryLabel = (value: SolarEclipseEventSearchSnapshot['maximumGeometryClass']): string =>
    value ? getEclipseGeometryLabel(locale, value) : '—';
  const [snapshot, setSnapshot] = useState<SolarEclipseEventSearchSnapshot | undefined>(initialSnapshot);
  const [error, setError] = useState<string>();

  useEffect(() => {
    setSnapshot(initialSnapshot);
    if (initialSnapshot) onHalfWindowHoursChange(initialSnapshot.halfWindowHours);
  }, [initialSnapshot]);

  const currentKey = searchKey(anchorObservedAtIso, latitudeDeg, longitudeDeg, halfWindowHours);
  const snapshotKey = snapshot
    ? searchKey(snapshot.anchorObservedAtIso, snapshot.latitudeDeg, snapshot.longitudeDeg, snapshot.halfWindowHours)
    : undefined;
  const stale = snapshot !== undefined && snapshotKey !== currentKey;

  const runSearch = (): void => {
    try {
      setError(undefined);
      const next = snapshotSolarEclipseEventSearch(searchSolarEclipseEventWindow({
        anchorObservedAtIso,
        latitudeDeg,
        longitudeDeg,
        halfWindowHours,
        coarseStepMinutes: 5
      }));
      setSnapshot(next);
      onSnapshotChange?.(next);
    } catch (caught) {
      setSnapshot(undefined);
      onSnapshotChange?.(undefined);
      setError(caught instanceof Error ? caught.message : t('eclipse.search.error'));
    }
  };

  return (
    <section className="eclipse-event-search-panel panel">
      <div className="eclipse-event-search-heading">
        <div>
          <span className="eyebrow">{t('eclipse.search.stage')}</span>
          <h2>{t('eclipse.search.title')}</h2>
          <p>{t('eclipse.search.intro')}</p>
        </div>
        <div className="eclipse-event-search-controls">
          <label>
            <span>{t('eclipse.search.halfWindow')}</span>
            <select value={halfWindowHours} onChange={(event) => onHalfWindowHoursChange(Number(event.target.value))}>
              <option value={6}>{t('eclipse.search.hours', { hours: 6 })}</option>
              <option value={12}>{t('eclipse.search.hours', { hours: 12 })}</option>
              <option value={24}>{t('eclipse.search.hours', { hours: 24 })}</option>
              <option value={48}>{t('eclipse.search.hours', { hours: 48 })}</option>
            </select>
          </label>
          {snapshot && !stale && onShowTrace && <button type="button" className="secondary" onClick={onShowTrace}>{t('model.trace')}</button>}
          <button type="button" onClick={runSearch}>{t('eclipse.search.scan')}</button>
        </div>
      </div>

      <div className="eclipse-event-search-anchor">
        <span>{t('eclipse.search.centerTime')} <strong>{utcTime(anchorObservedAtIso)}</strong></span>
        <span>{t('eclipse.search.location')} <strong>{coordinateFormatter.format(latitudeDeg)}°, {coordinateFormatter.format(longitudeDeg)}°</strong></span>
        <span>{t('eclipse.search.coarseStep')} <strong>5 {t('unit.minutesShort')}</strong></span>
        {snapshot && <span>{t('eclipse.search.saveStatus')} <strong>{stale ? t('eclipse.search.stale') : t('eclipse.search.ready')}</strong></span>}
      </div>

      {error && <div className="eclipse-event-search-error">{error}</div>}
      {!snapshot && !error && (
        <div className="eclipse-event-search-empty">
          {t('eclipse.search.empty')}
        </div>
      )}

      {snapshot && (
        <>
          {stale && (
            <div className="eclipse-event-search-stale">
              {t('eclipse.search.staleNote')}
            </div>
          )}

          {snapshot.status === 'overlap-found' && snapshot.maximumSolarDiskCoveredFraction !== null ? (
            <>
              <div className="eclipse-event-timeline">
                <article>
                  <small>{t('eclipse.search.overlapStart')}</small>
                  <strong>{utcTime(snapshot.overlapStartIso)}</strong>
                  <span>{snapshot.windowClipsEventStart ? t('eclipse.search.mayStartBefore') : t('eclipse.search.outerBoundaryApprox')}</span>
                </article>
                <article className="peak">
                  <small>{t('eclipse.search.maximumOverlap')}</small>
                  <strong>{utcTime(snapshot.maximumOverlapIso)}</strong>
                  <span>{t('eclipse.search.solarDiskArea', { value: formatPercentValue(snapshot.maximumSolarDiskCoveredFraction * 100, locale) })}</span>
                </article>
                <article>
                  <small>{t('eclipse.search.overlapEnd')}</small>
                  <strong>{utcTime(snapshot.overlapEndIso)}</strong>
                  <span>{snapshot.windowClipsEventEnd ? t('eclipse.search.mayContinueAfter') : t('eclipse.search.outerBoundaryApprox')}</span>
                </article>
              </div>

              <div className="eclipse-event-metrics">
                <div><small>{t('eclipse.search.overlapDuration')}</small><strong>{snapshot.overlapDurationMinutes === null ? t('eclipse.search.windowLimited') : `${durationFormatter.format(snapshot.overlapDurationMinutes)} ${t('unit.minutesShort')}`}</strong></div>
                <div><small>{t('eclipse.search.maximumClass')}</small><strong>{geometryLabel(snapshot.maximumGeometryClass)}</strong></div>
                <div><small>{t('eclipse.search.maximumSeparation')}</small><strong>{snapshot.maximumCenterSeparationDeg === null ? '—' : `${angleFormatter.format(snapshot.maximumCenterSeparationDeg)}°`}</strong></div>
                <div><small>{t('eclipse.search.maximumDiameterCoverage')}</small><strong>{snapshot.maximumSolarDiameterCoverageRatio === null ? '—' : formatPercentValue(snapshot.maximumSolarDiameterCoverageRatio * 100, locale)}</strong></div>
                <div><small>{t('eclipse.search.maximumHorizon')}</small><strong>{snapshot.maximumBothCentersAboveGeometricHorizon === null ? '—' : snapshot.maximumBothCentersAboveGeometricHorizon ? t('eclipse.search.bothAbove') : t('eclipse.search.oneBelow')}</strong></div>
                <div><small>{t('eclipse.search.coarseSamples')}</small><strong>{snapshot.coarseSampleCount}</strong></div>
              </div>

              {snapshot.containedStartIso && snapshot.containedEndIso && (
                <div className="eclipse-contained-strip">
                  <strong>{t('eclipse.search.containedFound')}</strong>
                  <span>{utcTime(snapshot.containedStartIso)} → {utcTime(snapshot.containedEndIso)}</span>
                  <span>{snapshot.containedDurationMinutes === null ? '' : t('eclipse.search.approxMinutes', { value: durationFormatter.format(snapshot.containedDurationMinutes) })}</span>
                </div>
              )}
            </>
          ) : (
            <div className="eclipse-no-event-result">
              <div>
                <small>{t('eclipse.search.result')}</small>
                <strong>{t('eclipse.search.noOverlap')}</strong>
              </div>
              <div>
                <small>{t('eclipse.search.closestApproach')}</small>
                <strong>{utcTime(snapshot.closestApproachIso)}</strong>
                <span>{t('eclipse.search.outerClearance', { value: angleFormatter.format(snapshot.closestApproachOuterLimbClearanceDeg) })}</span>
              </div>
            </div>
          )}

          <p className="eclipse-event-search-limit">{t('eclipse.search.limit')}</p>
        </>
      )}
    </section>
  );
}
