import {
  formatLocalDateTime24,
  formatUtcOffset,
  instantIsoFromLocalDateTime,
  localDateTimeValueFromInstant,
  systemUtcOffsetMinutes
} from '../../shared/celestial-time';
import { PanelHelpButton } from './HelpSystem';
import './celestial-time-card.css';

export function CelestialTimeCard({
  active,
  observedAtIso,
  utcOffsetMinutes,
  onChange
}: {
  active: boolean;
  observedAtIso: string;
  utcOffsetMinutes: number;
  onChange(observedAtIso: string, utcOffsetMinutes: number): void;
}): React.JSX.Element {
  if (!active) {
    return (
      <section className="time-card disabled-section">
        <div className="section-heading">
          <span>Zaman ve tarih</span>
          <span className="section-state">astronomi modülü</span>
        </div>
        <div className="time-placeholder">Güneş ve Ay gözlem senaryosunda etkinleşir.</div>
      </section>
    );
  }

  const localValue = localDateTimeValueFromInstant(observedAtIso, utcOffsetMinutes);
  const explicitLocalTime = formatLocalDateTime24(observedAtIso, utcOffsetMinutes);
  const offsetLabel = formatUtcOffset(utcOffsetMinutes);
  const offsetHours = utcOffsetMinutes / 60;

  return (
    <section className="time-card celestial-time-card">
      <div className="section-heading celestial-time-heading">
        <span>Zaman ve tarih</span>
        <div><span className="section-state">GÜNEŞ + AY · 6.2</span><PanelHelpButton panelId="celestial-time" /></div>
      </div>
      <label>
        <span>Yerel tarih / saat · sistem görünümü</span>
        <input
          aria-label="Astronomi gözlemi yerel tarih ve saati"
          lang="tr-TR"
          type="datetime-local"
          step="1"
          value={localValue}
          onChange={(event) => {
            if (!event.currentTarget.value) return;
            onChange(instantIsoFromLocalDateTime(event.currentTarget.value, utcOffsetMinutes), utcOffsetMinutes);
          }}
        />
      </label>
      <div className="celestial-time-exact" aria-label={`24 saatlik kesin yerel gözlem zamanı ${explicitLocalTime} ${offsetLabel}`}>
        <span>Kesin yerel zaman · 24 saat</span>
        <strong>{explicitLocalTime}</strong>
        <b>{offsetLabel}</b>
      </div>
      <label>
        <span>UTC ofseti</span>
        <div className="celestial-offset-row">
          <input
            aria-label="Astronomi gözlemi UTC ofseti saat"
            type="number"
            min={-12}
            max={14}
            step={0.25}
            value={offsetHours}
            onChange={(event) => {
              const nextHours = event.currentTarget.valueAsNumber;
              if (!Number.isFinite(nextHours) || nextHours < -12 || nextHours > 14) return;
              const nextOffset = Math.round(nextHours * 60);
              onChange(instantIsoFromLocalDateTime(localValue, nextOffset), nextOffset);
            }}
          />
          <b>{offsetLabel}</b>
        </div>
      </label>
      <button
        aria-label="Astronomi gözlem zamanını şimdi yap"
        className="celestial-now-button"
        type="button"
        onClick={() => {
          const now = new Date();
          onChange(now.toISOString(), systemUtcOffsetMinutes(now));
        }}
      >
        Şimdi
      </button>
      <small title={observedAtIso}>UTC: {observedAtIso.replace('.000Z', 'Z')}</small>
    </section>
  );
}
