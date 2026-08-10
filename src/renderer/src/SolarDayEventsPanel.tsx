import { useMemo } from 'react';
import { formatUtcOffset, localDateTimeValueFromInstant } from '../../shared/celestial-time';
import type {
  SolarDayEventsResult,
  SolarThresholdEvents
} from '../../simulation/solar-day-events';
import { calculateSolarSeasonEvents } from '../../simulation/solar-season-events';
import { calculateSolarTimeOffset } from '../../simulation/solar-time-offset';
import { PanelHelpButton } from './HelpSystem';
import { SolarSeasonEventsPanel } from './SolarSeasonEventsPanel';
import { SolarTimeOffsetPanel } from './SolarTimeOffsetPanel';
import { SolarRouteComparisonPanel } from './SolarRouteComparisonPanel';
import './solar-day-events-panel.css';

const numberFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });
const angleFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });
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

function duration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = Math.round(minutes - hours * 60);
  return `${hours} sa ${String(remainder).padStart(2, '0')} dk`;
}

function stateLabel(events: SolarThresholdEvents): string {
  if (events.state === 'continuous-above') return '24 SAAT EŞİK ÜSTÜ';
  if (events.state === 'continuous-below') return '24 SAAT EŞİK ALTI';
  if (events.state === 'grazing') return 'TEĞET / SINIR DURUMU';
  return 'DOĞUŞ + BATIŞ VAR';
}

function eventClock(events: SolarThresholdEvents, kind: 'rise' | 'set', offsetMinutes: number): string {
  if (events.state === 'continuous-above') return 'geçiş yok · sürekli üstte';
  if (events.state === 'continuous-below') return 'geçiş yok · sürekli altta';
  if (events.state === 'grazing') return 'güvenilir geçiş yok';
  return localClock(kind === 'rise' ? events.riseIso : events.setIso, offsetMinutes);
}

function azimuth(value: number | null): string {
  return value === null ? '—' : `${angleFormatter.format(value)}°`;
}

function markerStyle(minute: number | null): React.CSSProperties | undefined {
  if (minute === null) return undefined;
  return { left: `${Math.max(0, Math.min(100, minute / 1440 * 100))}%` };
}

export function SolarDayEventsPanel({
  result,
  onShowTrace
}: {
  result: SolarDayEventsResult;
  onShowTrace(): void;
}): React.JSX.Element {
  const geometricRiseMinute = localMinuteOfDay(result.geometric.riseIso, result.utcOffsetMinutes);
  const geometricSetMinute = localMinuteOfDay(result.geometric.setIso, result.utcOffsetMinutes);
  const standardRiseMinute = localMinuteOfDay(result.standardApparent.riseIso, result.utcOffsetMinutes);
  const standardSetMinute = localMinuteOfDay(result.standardApparent.setIso, result.utcOffsetMinutes);
  const noonMinute = localMinuteOfDay(result.solarNoonIso, result.utcOffsetMinutes);
  const seasonalYear = Number(result.localDate.slice(0, 4));
  const seasonalYearSupported = Number.isInteger(seasonalYear) &&
    seasonalYear >= MIN_SEASON_YEAR && seasonalYear <= MAX_SEASON_YEAR;
  const solarTimeResult = useMemo(() => calculateSolarTimeOffset({
    experimentId: result.experimentId,
    observedAtIso: result.observedAtIso,
    utcOffsetMinutes: result.utcOffsetMinutes,
    longitudeDeg: result.longitudeDeg
  }), [
    result.experimentId,
    result.longitudeDeg,
    result.observedAtIso,
    result.utcOffsetMinutes
  ]);
  const seasonResult = useMemo(() => {
    if (!seasonalYearSupported) return undefined;
    return calculateSolarSeasonEvents({
      experimentId: result.experimentId,
      year: seasonalYear,
      latitudeDeg: result.latitudeDeg,
      longitudeDeg: result.longitudeDeg,
      utcOffsetMinutes: result.utcOffsetMinutes
    });
  }, [
    result.experimentId,
    result.latitudeDeg,
    result.longitudeDeg,
    result.utcOffsetMinutes,
    seasonalYear,
    seasonalYearSupported
  ]);

  return (
    <>
      <section className="solar-day-events-panel panel">
        <div className="panel-title-row">
          <div>
            <span className="eyebrow">Astronomik referans · günlük Güneş olayları</span>
            <h2>Gün doğumu, gün batımı ve güneş öğlesi</h2>
          </div>
          <div className="title-actions">
            <PanelHelpButton panelId="solar-day-events" />
            <span className="solar-day-date-badge">{result.localDate} · {formatUtcOffset(result.utcOffsetMinutes)}</span>
            <button type="button" onClick={onShowTrace}>Hesap izi</button>
          </div>
        </div>

        <div className="solar-day-timeline" aria-hidden="true">
          <span className="solar-dayline" />
          <span className="solar-time-label start">00</span>
          <span className="solar-time-label q1">06</span>
          <span className="solar-time-label q2">12</span>
          <span className="solar-time-label q3">18</span>
          <span className="solar-time-label end">24</span>
          {standardRiseMinute !== null && <span className="solar-event-marker standard rise" style={markerStyle(standardRiseMinute)} title="Standart doğuş" />}
          {standardSetMinute !== null && <span className="solar-event-marker standard set" style={markerStyle(standardSetMinute)} title="Standart batış" />}
          {geometricRiseMinute !== null && <span className="solar-event-marker geometric rise" style={markerStyle(geometricRiseMinute)} title="Geometrik doğuş" />}
          {geometricSetMinute !== null && <span className="solar-event-marker geometric set" style={markerStyle(geometricSetMinute)} title="Geometrik batış" />}
          {noonMinute !== null && <span className="solar-event-marker noon" style={markerStyle(noonMinute)} title="Güneş öğlesi" />}
        </div>

        <div className="solar-event-card-grid">
          <article className="solar-event-card geometric">
            <header>
              <div><span>GEOMETRİK MERKEZ</span><strong>Ufuk eşiği 0°</strong></div>
              <b>{stateLabel(result.geometric)}</b>
            </header>
            <dl>
              <div><dt>Doğuş</dt><dd>{eventClock(result.geometric, 'rise', result.utcOffsetMinutes)}</dd><small>azimut {azimuth(result.geometric.riseAzimuthDeg)}</small></div>
              <div><dt>Batış</dt><dd>{eventClock(result.geometric, 'set', result.utcOffsetMinutes)}</dd><small>azimut {azimuth(result.geometric.setAzimuthDeg)}</small></div>
              <div><dt>Eşik üstü süre</dt><dd>{duration(result.geometric.aboveThresholdDurationMinutes)}</dd><small>seçilen yerel gün içinde</small></div>
            </dl>
          </article>

          <article className="solar-event-card standard">
            <header>
              <div><span>STANDART GÖRÜNÜR REFERANS</span><strong>Merkez eşiği -0,833°</strong></div>
              <b>{stateLabel(result.standardApparent)}</b>
            </header>
            <dl>
              <div><dt>Doğuş</dt><dd>{eventClock(result.standardApparent, 'rise', result.utcOffsetMinutes)}</dd><small>azimut {azimuth(result.standardApparent.riseAzimuthDeg)}</small></div>
              <div><dt>Batış</dt><dd>{eventClock(result.standardApparent, 'set', result.utcOffsetMinutes)}</dd><small>azimut {azimuth(result.standardApparent.setAzimuthDeg)}</small></div>
              <div><dt>Eşik üstü süre</dt><dd>{duration(result.standardApparent.aboveThresholdDurationMinutes)}</dd><small>yaklaşık takvim referansı</small></div>
            </dl>
          </article>

          <article className="solar-event-card noon">
            <header>
              <div><span>GÜNEŞ ÖĞLESİ</span><strong>Yerel gün içi maksimum yükseklik</strong></div>
            </header>
            <dl>
              <div><dt>Saat</dt><dd>{localClock(result.solarNoonIso, result.utcOffsetMinutes)}</dd><small>{formatUtcOffset(result.utcOffsetMinutes)}</small></div>
              <div><dt>Maks. yükseklik</dt><dd>{angleFormatter.format(result.solarNoonElevationDeg)}°</dd><small>geometrik merkez</small></div>
              <div><dt>Azimut</dt><dd>{angleFormatter.format(result.solarNoonAzimuthDeg)}°</dd><small>coğrafi kuzeyden</small></div>
            </dl>
          </article>
        </div>

        <div className="solar-day-comparison-strip">
          <span>Standart referansın geometrik 0° kanalına göre ek eşik-üstü süresi</span>
          <strong>{numberFormatter.format(result.standardApparent.aboveThresholdDurationMinutes - result.geometric.aboveThresholdDurationMinutes)} dk</strong>
        </div>

        <p className="solar-day-events-note">
          0° kanalı Güneş merkezinin geometrik ufuk geçişidir. -0,833° kanalı gerçek atmosfer ölçümü değildir; Güneşin görünür üst kenarı ve standart kırılma için kullanılan sabit yaklaşık takvim eşiğidir. Yerel gün, kaydedilmiş açık UTC ofsetiyle kurulmuştur; saat dilimi adı veya DST kuralı otomatik uygulanmaz.
        </p>
      </section>

      <SolarTimeOffsetPanel result={solarTimeResult} solarNoonIso={result.solarNoonIso} />

      {seasonResult ? (
        <SolarSeasonEventsPanel result={seasonResult} />
      ) : (
        <section className="solar-season-panel panel">
          <span className="eyebrow">Aşama 7.5 · yıllık Güneş döngüsü</span>
          <h2>Yıllık mevsim referansı bu yıl için kapalı</h2>
          <p className="solar-season-note">
            İlk doğrulama aralığı {MIN_SEASON_YEAR}–{MAX_SEASON_YEAR}. Günlük Güneş hesabı çalışmaya devam eder; bu aralığın dışındaki yıllarda ekinoks/gündönümü kartları güvenli biçimde üretilmez.
          </p>
        </section>
      )}

      <SolarRouteComparisonPanel
        experimentId={result.experimentId}
        observedAtIso={result.observedAtIso}
        utcOffsetMinutes={result.utcOffsetMinutes}
        startLatitudeDeg={result.latitudeDeg}
        startLongitudeDeg={result.longitudeDeg}
      />
    </>
  );
}
