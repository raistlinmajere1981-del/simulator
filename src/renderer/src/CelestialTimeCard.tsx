import {
  formatLocalDateTime24,
  formatUtcOffset,
  instantIsoFromLocalDateTime,
  localDateTimeValueFromInstant,
  systemUtcOffsetMinutes
} from '../../shared/celestial-time';
import { DraftNumberInput } from './DraftNumberInput';
import { PanelHelpButton } from './HelpSystem';
import { useI18n } from './I18nProvider';
import { appLocaleTag } from './i18n';
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
  const { locale, t } = useI18n();

  if (!active) {
    return (
      <section className="time-card disabled-section">
        <div className="section-heading">
          <span>{t('time.title')}</span>
          <span className="section-state">{t('time.astronomyModule')}</span>
        </div>
        <div className="time-placeholder">{t('time.inactiveNote')}</div>
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
        <span>{t('time.title')}</span>
        <div><span className="section-state">{t('time.astronomyUtc')}</span><PanelHelpButton panelId="celestial-time" /></div>
      </div>
      <label>
        <span>{t('time.localDateTime')}</span>
        <input
          aria-label={t('time.localDateTimeAria')}
          lang={appLocaleTag(locale)}
          type="datetime-local"
          step="1"
          value={localValue}
          onChange={(event) => {
            if (!event.currentTarget.value) return;
            onChange(instantIsoFromLocalDateTime(event.currentTarget.value, utcOffsetMinutes), utcOffsetMinutes);
          }}
        />
      </label>
      <div className="celestial-time-exact" aria-label={t('time.exactAria', { time: explicitLocalTime, offset: offsetLabel })}>
        <span>{t('time.exactLocalTime')}</span>
        <strong>{explicitLocalTime}</strong>
        <b>{offsetLabel}</b>
      </div>
      <label>
        <span>{t('time.utcOffset')}</span>
        <div className="celestial-offset-row">
          <DraftNumberInput
            ariaLabel={t('time.utcOffsetAria')}
            min={-12}
            max={14}
            step={0.25}
            value={offsetHours}
            onCommit={(nextHours) => {
              const nextOffset = Math.round(nextHours * 60);
              onChange(instantIsoFromLocalDateTime(localValue, nextOffset), nextOffset);
            }}
          />
          <b>{offsetLabel}</b>
        </div>
      </label>
      <button
        aria-label={t('time.nowAria')}
        className="celestial-now-button"
        type="button"
        onClick={() => {
          const now = new Date();
          onChange(now.toISOString(), systemUtcOffsetMinutes(now));
        }}
      >
        {t('time.now')}
      </button>
      <small title={observedAtIso}>UTC: {observedAtIso.replace('.000Z', 'Z')}</small>
    </section>
  );
}
