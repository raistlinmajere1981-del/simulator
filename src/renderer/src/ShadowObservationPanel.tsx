import type { ModelPrediction } from '../../shared/domain';
import type {
  ShadowObservationResult,
  ShadowObservationSettings
} from '../../simulation/shadow-observation';
import { DraftNumberInput } from './DraftNumberInput';
import { PanelHelpButton } from './HelpSystem';
import { useI18n } from './I18nProvider';
import { numberFormatterFor } from './app/app-formatters';
import { translate, type AppLocale } from './i18n';
import './shadow-observation-panel.css';

function valueOrDash(value: number | null, unit: string, locale: AppLocale): string {
  return value === null ? '—' : `${numberFormatterFor(locale).format(value)}${unit}`;
}

function statusLabel(prediction: ModelPrediction, locale: AppLocale): string {
  if (prediction.status === 'compatible') return translate(locale, 'shadow.status.compatible');
  if (prediction.status === 'incompatible') return translate(locale, 'shadow.status.incompatible');
  return translate(locale, 'shadow.status.indeterminate');
}

function optionalBoundedNumber(
  event: React.ChangeEvent<HTMLInputElement>,
  min: number,
  max: number
): number | undefined | null {
  if (event.currentTarget.value.trim() === '') return undefined;
  const value = event.currentTarget.valueAsNumber;
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
}

export function ShadowObservationPanel({
  result,
  prediction,
  settings,
  onChange,
  onShowTrace
}: {
  result: ShadowObservationResult;
  prediction: ModelPrediction;
  settings: ShadowObservationSettings;
  onChange(settings: ShadowObservationSettings): void;
  onShowTrace(): void;
}): React.JSX.Element {
  const { locale, t } = useI18n();
  const directSun = result.predictedShadowLengthM !== null;
  const visualLength = result.predictedShadowLengthM === null
    ? 0
    : Math.min(78, 18 + 18 * Math.log10(1 + result.predictedShadowLengthM / result.gnomonHeightM));
  const shadowRotation = result.predictedShadowAzimuthDeg ?? 0;

  return (
    <section className="shadow-observation-panel panel">
      <div className="panel-title-row">
        <div>
          <span className="eyebrow">{t('shadow.stage')}</span>
          <h2>{t('shadow.title')}</h2>
        </div>
        <div className="title-actions">
          <PanelHelpButton panelId="shadow-observation" />
          <span className={`shadow-status-badge ${prediction.status}`}>{statusLabel(prediction, locale)}</span>
          <button type="button" onClick={onShowTrace}>{t('model.trace')}</button>
        </div>
      </div>

      <div className="shadow-input-grid">
        <label className="input-field">
          <span>{t('shadow.gnomonHeight')}</span>
          <div><DraftNumberInput min={0.001} max={10000} step={0.01} value={settings.gnomonHeightM} onCommit={(value) => onChange({ ...settings, gnomonHeightM: value })} /><b>m</b></div>
        </label>
        <label className="input-field">
          <span>{t('shadow.observedLength')}</span>
          <div><input min={0} step={0.01} placeholder={t('shadow.optional')} type="number" value={settings.observedShadowLengthM ?? ''} onChange={(event) => {
            const value = optionalBoundedNumber(event, 0, 10_000_000);
            if (value === null) return;
            onChange({ ...settings, observedShadowLengthM: value });
          }} /><b>m</b></div>
        </label>
        <label className="input-field">
          <span>{t('shadow.lengthUncertainty')}</span>
          <div><input min={0} step={0.01} placeholder={t('shadow.optional')} type="number" value={settings.observedShadowLengthUncertaintyM ?? ''} onChange={(event) => {
            const value = optionalBoundedNumber(event, 0, 1_000_000);
            if (value === null) return;
            onChange({ ...settings, observedShadowLengthUncertaintyM: value });
          }} /><b>m</b></div>
        </label>
        <label className="input-field">
          <span>{t('shadow.observedAzimuth')}</span>
          <div><input min={0} max={360} step={0.1} placeholder={t('shadow.optional')} type="number" value={settings.observedShadowAzimuthDeg ?? ''} onChange={(event) => {
            const value = optionalBoundedNumber(event, 0, 360);
            if (value === null) return;
            onChange({ ...settings, observedShadowAzimuthDeg: value });
          }} /><b>°</b></div>
        </label>
        <label className="input-field">
          <span>{t('shadow.azimuthUncertainty')}</span>
          <div><input min={0} max={180} step={0.1} placeholder={t('shadow.optional')} type="number" value={settings.observedShadowAzimuthUncertaintyDeg ?? ''} onChange={(event) => {
            const value = optionalBoundedNumber(event, 0, 180);
            if (value === null) return;
            onChange({ ...settings, observedShadowAzimuthUncertaintyDeg: value });
          }} /><b>°</b></div>
        </label>
      </div>

      <div className="shadow-visual" aria-hidden="true">
        <span className="shadow-compass north">{t('compass.northShort')}</span>
        <span className="shadow-compass east">{t('compass.eastShort')}</span>
        <span className="shadow-compass south">{t('compass.southShort')}</span>
        <span className="shadow-compass west">{t('compass.westShort')}</span>
        <span className="shadow-origin" />
        <span className="shadow-gnomon" />
        {directSun && <span className="shadow-ray" style={{ width: `${visualLength}%`, transform: `rotate(${shadowRotation - 90}deg)` }} />}
        {!directSun && <strong className="shadow-no-direct-sun">{t('shadow.noDirectSun')}</strong>}
      </div>

      <div className="shadow-metrics">
        <div><small>{t('shadow.solarElevation')}</small><strong>{valueOrDash(result.solarElevationDeg, '°', locale)}</strong></div>
        <div><small>{t('shadow.solarAzimuth')}</small><strong>{valueOrDash(result.solarAzimuthDeg, '°', locale)}</strong></div>
        <div><small>{t('shadow.predictedLength')}</small><strong>{valueOrDash(result.predictedShadowLengthM, ' m', locale)}</strong></div>
        <div><small>{t('shadow.predictedDirection')}</small><strong>{valueOrDash(result.predictedShadowAzimuthDeg, '°', locale)}</strong></div>
        <div><small>{t('shadow.impliedSolarElevation')}</small><strong>{valueOrDash(result.impliedObservedSolarElevationDeg, '°', locale)}</strong></div>
        <div><small>{t('shadow.lengthDifference')}</small><strong>{valueOrDash(result.shadowLengthDifferenceM, ' m', locale)}</strong></div>
        <div><small>{t('shadow.directionDifference')}</small><strong>{valueOrDash(result.shadowAzimuthDifferenceDeg, '°', locale)}</strong></div>
      </div>

      <p className="shadow-observation-note">{t('shadow.note')}</p>
    </section>
  );
}
