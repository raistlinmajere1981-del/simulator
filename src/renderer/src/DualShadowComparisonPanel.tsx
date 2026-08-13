import type { ModelPrediction } from '../../shared/domain';
import type {
  DualShadowComparisonResult,
  DualShadowComparisonSettings,
  DualShadowStationSettings
} from '../../simulation/dual-shadow-comparison';
import type { ShadowObservationResult } from '../../simulation/shadow-observation';
import { DraftNumberInput } from './DraftNumberInput';
import { PanelHelpButton } from './HelpSystem';
import { useI18n } from './I18nProvider';
import { numberFormatterFor } from './app/app-formatters';
import { appLocaleTag, translate, type AppLocale } from './i18n';
import './dual-shadow-comparison-panel.css';

function valueOrDash(value: number | null, unit: string, locale: AppLocale): string {
  return value === null ? '—' : `${numberFormatterFor(locale).format(value)}${unit}`;
}

function optionalNumber(
  event: React.ChangeEvent<HTMLInputElement>,
  min: number,
  max: number
): number | undefined | null {
  if (event.currentTarget.value.trim() === '') return undefined;
  const value = event.currentTarget.valueAsNumber;
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
}

function statusLabel(prediction: ModelPrediction | undefined, locale: AppLocale): string {
  if (!prediction) return translate(locale, 'dualShadow.status.off');
  if (prediction.status === 'compatible') return translate(locale, 'dualShadow.status.compatible');
  if (prediction.status === 'incompatible') return translate(locale, 'dualShadow.status.incompatible');
  return translate(locale, 'dualShadow.status.indeterminate');
}

function updateStation(
  settings: DualShadowComparisonSettings,
  patch: Partial<DualShadowStationSettings>
): DualShadowComparisonSettings {
  return { stationB: { ...settings.stationB, ...patch } };
}

export function DualShadowComparisonPanel({
  primaryResult,
  settings,
  result,
  prediction,
  onEnable,
  onDisable,
  onChange,
  onShowTrace
}: {
  primaryResult: ShadowObservationResult;
  settings?: DualShadowComparisonSettings;
  result?: DualShadowComparisonResult;
  prediction?: ModelPrediction;
  onEnable(): void;
  onDisable(): void;
  onChange(settings: DualShadowComparisonSettings): void;
  onShowTrace(): void;
}): React.JSX.Element {
  const { locale, t } = useI18n();
  const numberFormatter = numberFormatterFor(locale);
  const coordinateFormatter = new Intl.NumberFormat(appLocaleTag(locale), { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  const enabled = settings !== undefined;

  return (
    <section className="dual-shadow-panel panel">
      <div className="panel-title-row">
        <div>
          <span className="eyebrow">{t('dualShadow.stage')}</span>
          <h2>{t('dualShadow.title')}</h2>
        </div>
        <div className="title-actions">
          <PanelHelpButton panelId="dual-shadow-comparison" />
          <span className={`dual-shadow-status ${prediction?.status ?? 'off'}`}>{statusLabel(prediction, locale)}</span>
          {enabled && <button type="button" onClick={onShowTrace} disabled={!prediction}>{t('model.trace')}</button>}
          <button type="button" className={enabled ? 'dual-shadow-disable' : 'dual-shadow-enable'} onClick={enabled ? onDisable : onEnable}>
            {enabled ? t('dualShadow.disable') : t('dualShadow.enable')}
          </button>
        </div>
      </div>

      {!settings ? (
        <div className="dual-shadow-empty">
          <strong>{t('dualShadow.emptyTitle')}</strong>
          <span>{t('dualShadow.emptyNote')}</span>
        </div>
      ) : (
        <>
          <div className="dual-shadow-stations">
            <div className="dual-shadow-station primary">
              <span className="station-letter">A</span>
              <div>
                <strong>{t('dualShadow.primary')}</strong>
                <small>{coordinateFormatter.format(primaryResult.latitudeDeg)}°, {coordinateFormatter.format(primaryResult.longitudeDeg)}°</small>
              </div>
              <dl>
                <div><dt>{t('dualShadow.gnomon')}</dt><dd>{numberFormatter.format(primaryResult.gnomonHeightM)} m</dd></div>
                <div><dt>{t('dualShadow.sun')}</dt><dd>{valueOrDash(primaryResult.solarElevationDeg, '°', locale)}</dd></div>
                <div><dt>{t('dualShadow.predictedShadow')}</dt><dd>{valueOrDash(primaryResult.predictedShadowLengthM, ' m', locale)}</dd></div>
              </dl>
            </div>
            <div className="dual-shadow-station secondary">
              <span className="station-letter">B</span>
              <div>
                <strong>{t('dualShadow.secondary')}</strong>
                <small>{t('dualShadow.sameUtc')}</small>
              </div>
              <dl>
                <div><dt>{t('dualShadow.sun')}</dt><dd>{valueOrDash(result?.stationB.solarElevationDeg ?? null, '°', locale)}</dd></div>
                <div><dt>{t('dualShadow.predictedShadow')}</dt><dd>{valueOrDash(result?.stationB.predictedShadowLengthM ?? null, ' m', locale)}</dd></div>
              </dl>
            </div>
          </div>

          <div className="dual-shadow-input-grid">
            <label className="input-field">
              <span>{t('dualShadow.bLatitude')}</span>
              <div><DraftNumberInput min={-90} max={90} step={0.000001} value={settings.stationB.latitudeDeg} onCommit={(value) => onChange(updateStation(settings, { latitudeDeg: value }))} /><b>°</b></div>
            </label>
            <label className="input-field">
              <span>{t('dualShadow.bLongitude')}</span>
              <div><DraftNumberInput min={-180} max={180} step={0.000001} value={settings.stationB.longitudeDeg} onCommit={(value) => onChange(updateStation(settings, { longitudeDeg: value }))} /><b>°</b></div>
            </label>
            <label className="input-field">
              <span>{t('dualShadow.bGnomon')}</span>
              <div><DraftNumberInput min={0.001} max={10000} step={0.01} value={settings.stationB.gnomonHeightM} onCommit={(value) => onChange(updateStation(settings, { gnomonHeightM: value }))} /><b>m</b></div>
            </label>
            <label className="input-field">
              <span>{t('dualShadow.bObservedShadow')}</span>
              <div><input type="number" min={0} step={0.01} placeholder={t('shadow.optional')} value={settings.stationB.observedShadowLengthM ?? ''} onChange={(event) => {
                const value = optionalNumber(event, 0, 10_000_000);
                if (value === null) return;
                onChange(updateStation(settings, { observedShadowLengthM: value }));
              }} /><b>m</b></div>
            </label>
            <label className="input-field">
              <span>{t('dualShadow.bLengthUncertainty')}</span>
              <div><input type="number" min={0} step={0.01} placeholder={t('shadow.optional')} value={settings.stationB.observedShadowLengthUncertaintyM ?? ''} onChange={(event) => {
                const value = optionalNumber(event, 0, 1_000_000);
                if (value === null) return;
                onChange(updateStation(settings, { observedShadowLengthUncertaintyM: value }));
              }} /><b>m</b></div>
            </label>
            <label className="input-field">
              <span>{t('dualShadow.bObservedAzimuth')}</span>
              <div><input type="number" min={0} max={360} step={0.1} placeholder={t('shadow.optional')} value={settings.stationB.observedShadowAzimuthDeg ?? ''} onChange={(event) => {
                const value = optionalNumber(event, 0, 360);
                if (value === null) return;
                onChange(updateStation(settings, { observedShadowAzimuthDeg: value }));
              }} /><b>°</b></div>
            </label>
            <label className="input-field">
              <span>{t('dualShadow.bAzimuthUncertainty')}</span>
              <div><input type="number" min={0} max={180} step={0.1} placeholder={t('shadow.optional')} value={settings.stationB.observedShadowAzimuthUncertaintyDeg ?? ''} onChange={(event) => {
                const value = optionalNumber(event, 0, 180);
                if (value === null) return;
                onChange(updateStation(settings, { observedShadowAzimuthUncertaintyDeg: value }));
              }} /><b>°</b></div>
            </label>
          </div>

          {result && (
            <div className="dual-shadow-metrics">
              <div><small>{t('dualShadow.separation')}</small><strong>{numberFormatter.format(result.separationDistanceM / 1000)} km</strong></div>
              <div><small>{t('dualShadow.initialBearing')}</small><strong>{numberFormatter.format(result.initialBearingDeg)}°</strong></div>
              <div><small>{t('dualShadow.predictedElevationDifference')}</small><strong>{numberFormatter.format(result.predictedSolarElevationDifferenceDeg)}°</strong></div>
              <div><small>{t('dualShadow.observedElevationDifference')}</small><strong>{result.observedSolarElevationDifferenceDeg === null ? '—' : `${numberFormatter.format(result.observedSolarElevationDifferenceDeg)}°${result.observedSolarElevationDifferenceUncertaintyDeg === null ? '' : ` ±${numberFormatter.format(result.observedSolarElevationDifferenceUncertaintyDeg)}°`}`}</strong></div>
              <div><small>{t('dualShadow.elevationResidual')}</small><strong>{valueOrDash(result.solarElevationDifferenceResidualDeg, '°', locale)}</strong></div>
              <div><small>{t('dualShadow.predictedDirectionDifference')}</small><strong>{valueOrDash(result.predictedShadowAzimuthDifferenceDeg, '°', locale)}</strong></div>
              <div><small>{t('dualShadow.observedDirectionDifference')}</small><strong>{result.observedShadowAzimuthDifferenceDeg === null ? '—' : `${numberFormatter.format(result.observedShadowAzimuthDifferenceDeg)}°${result.observedShadowAzimuthDifferenceUncertaintyDeg === null ? '' : ` ±${numberFormatter.format(result.observedShadowAzimuthDifferenceUncertaintyDeg)}°`}`}</strong></div>
              <div><small>{t('dualShadow.directionResidual')}</small><strong>{valueOrDash(result.shadowAzimuthDifferenceResidualDeg, '°', locale)}</strong></div>
            </div>
          )}

          <p className="dual-shadow-note">{t('dualShadow.note')}</p>
        </>
      )}
    </section>
  );
}
