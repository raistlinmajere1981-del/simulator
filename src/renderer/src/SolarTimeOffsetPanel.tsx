import { formatUtcOffset, localDateTimeValueFromInstant } from '../../shared/celestial-time';
import type { SolarTimeOffsetResult, SolarClockReading } from '../../simulation/solar-time-offset';
import './solar-time-offset-panel.css';

const numberFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });

function formatClock(reading: SolarClockReading): string {
  let totalSeconds = Math.round(reading.minuteOfDay * 60);
  totalSeconds = ((totalSeconds % 86_400) + 86_400) % 86_400;
  const hour = Math.floor(totalSeconds / 3_600);
  const minute = Math.floor((totalSeconds % 3_600) / 60);
  const second = totalSeconds % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
}

function dayLabel(dayOffset: number): string {
  if (dayOffset === 0) return 'aynı sivil gün';
  if (dayOffset === -1) return 'önceki güne taşar';
  if (dayOffset === 1) return 'sonraki güne taşar';
  return dayOffset < 0 ? `${Math.abs(dayOffset)} gün önce` : `${dayOffset} gün sonra`;
}

function signedMinutes(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '±';
  return `${sign}${numberFormatter.format(Math.abs(value))} dk`;
}

function cardinalLongitude(value: number): string {
  const absolute = numberFormatter.format(Math.abs(value));
  if (Math.abs(value) < 0.000001) return '0°';
  return `${absolute}° ${value > 0 ? 'D' : 'B'}`;
}

function localClockFromIso(iso: string, offsetMinutes: number): string {
  return localDateTimeValueFromInstant(iso, offsetMinutes).slice(11, 19);
}

function localMinuteFromIso(iso: string, offsetMinutes: number): number {
  const local = localDateTimeValueFromInstant(iso, offsetMinutes);
  return Number(local.slice(11, 13)) * 60 + Number(local.slice(14, 16)) + Number(local.slice(17, 19)) / 60;
}

export function SolarTimeOffsetPanel({
  result,
  solarNoonIso
}: {
  result: SolarTimeOffsetResult;
  solarNoonIso: string;
}): React.JSX.Element {
  const noonMinute = localMinuteFromIso(solarNoonIso, result.utcOffsetMinutes);
  const noonDelta = noonMinute - 720;
  const correctionDirection = result.apparentSolarCorrectionMinutes > 0
    ? 'Görünür Güneş saati sivil saatten ileride.'
    : result.apparentSolarCorrectionMinutes < 0
      ? 'Görünür Güneş saati sivil saatten geride.'
      : 'Görünür Güneş saati sivil saatle çakışıyor.';

  return (
    <section className="solar-time-offset-panel panel">
      <div className="solar-time-offset-heading">
        <div>
          <span className="eyebrow">Aşama 7.6 · Sivil saat ↔ Güneş zamanı</span>
          <h2>UTC ofseti, standart meridyen ve Güneş saati</h2>
          <p>
            Kaydedilmiş sabit UTC ofsetinin temsil ettiği meridyeni gözlem boylamıyla karşılaştırır;
            boylam farkı ve zaman denkleminin sivil saate etkisini ayrı gösterir.
          </p>
        </div>
        <div className="solar-time-offset-context">
          <span>{formatUtcOffset(result.utcOffsetMinutes)}</span>
          <strong>Standart meridyen {cardinalLongitude(result.standardMeridianDeg)}</strong>
          <small>Gözlem {cardinalLongitude(result.longitudeDeg)}</small>
        </div>
      </div>

      <div className="solar-clock-grid">
        <article className="solar-clock-card civil">
          <span>SİVİL SAAT</span>
          <strong>{formatClock(result.civilClock)}</strong>
          <small>{result.localCivilDateTime.slice(0, 10)} · sabit UTC ofseti</small>
        </article>
        <article className="solar-clock-card mean">
          <span>ORTALAMA GÜNEŞ ZAMANI</span>
          <strong>{formatClock(result.meanSolarClock)}</strong>
          <small>{dayLabel(result.meanSolarClock.dayOffset)} · yalnız boylam düzeltmesi</small>
        </article>
        <article className="solar-clock-card apparent">
          <span>GÖRÜNÜR GÜNEŞ ZAMANI</span>
          <strong>{formatClock(result.apparentSolarClock)}</strong>
          <small>{dayLabel(result.apparentSolarClock.dayOffset)} · boylam + zaman denklemi</small>
        </article>
      </div>

      <div className="solar-time-correction-grid">
        <article>
          <span>BOYLAM FARKI</span>
          <strong>{numberFormatter.format(result.longitudeDeltaDeg)}°</strong>
          <small>gözlem − standart meridyen</small>
        </article>
        <article>
          <span>BOYLAM DÜZELTMESİ</span>
          <strong>{signedMinutes(result.longitudeCorrectionMinutes)}</strong>
          <small>4 dakika / derece</small>
        </article>
        <article>
          <span>ZAMAN DENKLEMİ · EoT</span>
          <strong>{signedMinutes(result.equationOfTimeMinutes)}</strong>
          <small>seçili astronomik an</small>
        </article>
        <article className="total">
          <span>TOPLAM GÖRÜNÜR FARK</span>
          <strong>{signedMinutes(result.apparentSolarCorrectionMinutes)}</strong>
          <small>{correctionDirection}</small>
        </article>
      </div>

      <div className="solar-time-equation-strip">
        <span>Sivil saat</span>
        <b>{signedMinutes(result.longitudeCorrectionMinutes)}</b>
        <span>boylam</span>
        <b>{signedMinutes(result.equationOfTimeMinutes)}</b>
        <span>EoT</span>
        <strong>= {formatClock(result.apparentSolarClock)}</strong>
      </div>

      <div className="solar-time-noon-strip">
        <div>
          <span>Bu yerel gündeki geometrik Güneş öğlesi</span>
          <strong>{localClockFromIso(solarNoonIso, result.utcOffsetMinutes)}</strong>
        </div>
        <div>
          <span>Sivil 12:00'dan fark</span>
          <strong>{signedMinutes(noonDelta)}</strong>
        </div>
        <p>
          Güneş öğlesi günlük konum çözümündeki maksimum geometrik Güneş yüksekliğidir; saat 12:00 olmak zorunda değildir.
        </p>
      </div>

      <p className="solar-time-offset-note">
        Standart meridyen yalnız sabit UTC ofsetinden 15°/saat ile türetilen geometrik bir referanstır; yasal saat dilimi sınırı değildir.
        DST/saat dilimi veritabanı otomatik uygulanmaz. Görünür Güneş zamanı mevcut düşük hassasiyetli astronomik Güneş çekirdeğinin zaman denklemini kullanır.
      </p>
    </section>
  );
}
