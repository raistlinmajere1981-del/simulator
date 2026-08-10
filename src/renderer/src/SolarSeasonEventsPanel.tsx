import type {
  SolarSeasonEvent,
  SolarSeasonEventsResult
} from '../../simulation/solar-season-events';
import './solar-season-events-panel.css';

const angleFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });
const timeFormatter = new Intl.DateTimeFormat('tr-TR', {
  timeZone: 'UTC',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

function duration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = Math.round(minutes - hours * 60);
  return `${hours} sa ${String(remainder).padStart(2, '0')} dk`;
}

function azimuth(value: number | null): string {
  return value === null ? '—' : `${angleFormatter.format(value)}°`;
}

function seasonForObserver(event: SolarSeasonEvent, latitudeDeg: number): string {
  if (Math.abs(latitudeDeg) < 1e-9) return `${event.northernSeason} / ${event.southernSeason}`;
  return latitudeDeg > 0 ? event.northernSeason : event.southernSeason;
}

function eventClass(kind: SolarSeasonEvent['kind']): string {
  return kind.includes('equinox') ? 'equinox' : 'solstice';
}

export function SolarSeasonEventsPanel({ result }: { result: SolarSeasonEventsResult }): React.JSX.Element {
  return (
    <section className="solar-season-panel panel">
      <div className="solar-season-heading">
        <div>
          <span className="eyebrow">Aşama 7.5 · yıllık Güneş döngüsü</span>
          <h2>Ekinokslar, gündönümleri ve yerel gün uzunluğu</h2>
          <p>
            {result.year} yılı için görünür Güneş boylamının dört ana çeyrek geçişi çözülür; aynı anların seçili gözlemci konumundaki yerel Güneş günü karşılaştırılır.
          </p>
        </div>
        <div className="solar-season-context">
          <span>{result.year}</span>
          <strong>{result.latitudeDeg.toFixed(4)}°, {result.longitudeDeg.toFixed(4)}°</strong>
        </div>
      </div>

      <div className="solar-season-track" aria-hidden="true">
        <span className="solar-season-track-line" />
        {result.events.map((event, index) => (
          <span
            className={`solar-season-track-marker ${eventClass(event.kind)}`}
            style={{ left: `${(index / 3) * 100}%` }}
            key={event.kind}
          />
        ))}
      </div>

      <div className="solar-season-grid">
        {result.events.map((event) => (
          <article className={`solar-season-card ${eventClass(event.kind)}`} key={event.kind}>
            <header>
              <div>
                <small>{seasonForObserver(event, result.latitudeDeg)}</small>
                <strong>{event.label}</strong>
              </div>
              <b>λ {event.targetApparentSolarLongitudeDeg}°</b>
            </header>

            <div className="solar-season-event-time">
              <strong>{timeFormatter.format(new Date(event.eventIso))} UTC</strong>
              <span>Yerel tarih {event.observerLocalDate}</span>
            </div>

            <dl>
              <div>
                <dt>Güneş deklinasyonu</dt>
                <dd>{angleFormatter.format(event.declinationDeg)}°</dd>
              </div>
              <div>
                <dt>Standart gün uzunluğu</dt>
                <dd>{duration(event.observerStandardDaylightMinutes)}</dd>
              </div>
              <div>
                <dt>Geometrik 0° süre</dt>
                <dd>{duration(event.observerGeometricDaylightMinutes)}</dd>
              </div>
              <div>
                <dt>Güneş öğlesi</dt>
                <dd>{angleFormatter.format(event.observerSolarNoonElevationDeg)}°</dd>
              </div>
              <div>
                <dt>Standart doğuş azimutu</dt>
                <dd>{azimuth(event.observerStandardRiseAzimuthDeg)}</dd>
              </div>
              <div>
                <dt>Standart batış azimutu</dt>
                <dd>{azimuth(event.observerStandardSetAzimuthDeg)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <p className="solar-season-note">
        Dönüm noktaları mevcut düşük hassasiyetli NOAA tabanlı Güneş çekirdeğinin görünür ekliptik boylamından sayısal olarak bulunur. Bu panel resmi almanak/efemeris değildir. Yerel gün uzunluğu sabit UTC ofsetiyle ve standart -0,833° görünür doğuş/batış eşiğiyle hesaplanır; gerçek atmosfer, topoğrafik ufuk ve otomatik DST uygulanmaz.
      </p>
    </section>
  );
}
