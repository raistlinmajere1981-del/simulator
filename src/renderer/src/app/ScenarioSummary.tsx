import type { AtmosphereMode } from '../../../shared/atmosphere';
import type { SimulationScenarioId } from '../../../shared/scenario';
import type { DistanceSource, SimulatorInputs } from '../../../shared/simulator';
import type { VerticalDatumKind } from '../../../shared/terrain';
import type { GeodesicResult } from '../../../simulation/geodesy';
import { PanelHelpButton } from '../HelpSystem';
import { useI18n } from '../I18nProvider';
import { NumericField } from './NumericField';
import { getDatumLabel, getScenarioPresentation } from './app-config';
import {
  bearingFormatterFor,
  coordinateFormatterFor,
  numberFormatterFor
} from './app-formatters';
import type { NumericInputKey } from './app-types';

export function ScenarioSummary({
  scenarioId,
  activeName,
  inputs,
  atmosphereMode,
  effectiveDistanceKm,
  geodesic,
  isDirty,
  onDistanceSourceChange,
  onDatumChange,
  onNumberChange,
  onReset,
  onSave,
  onShowGeodesicTrace
}: {
  scenarioId: SimulationScenarioId;
  activeName: string;
  inputs: SimulatorInputs;
  atmosphereMode: AtmosphereMode;
  effectiveDistanceKm: number;
  geodesic: GeodesicResult | undefined;
  isDirty: boolean;
  onDistanceSourceChange(source: DistanceSource): void;
  onDatumChange(kind: VerticalDatumKind): void;
  onNumberChange(key: NumericInputKey, value: number): void;
  onReset(): void;
  onSave(): void;
  onShowGeodesicTrace(): void;
}): React.JSX.Element {
  const { locale, t } = useI18n();
  const scenario = getScenarioPresentation(locale, scenarioId);
  const isHorizon = scenarioId === 'horizon';
  const numberFormatter = numberFormatterFor(locale);
  const coordinateFormatter = coordinateFormatterFor(locale);
  const bearingFormatter = bearingFormatterFor(locale);
  const atmosphereModeLabel = atmosphereMode === 'off'
    ? t('atmosphere.off')
    : atmosphereMode === 'standard'
      ? t('atmosphere.standard')
      : t('atmosphere.layered');

  return (
    <section className="scenario-summary panel coordinate-summary">
      <div className="panel-title-row">
        <div>
          <span className="eyebrow">{t('core.activeScenario')}</span>
          <h2>{activeName || scenario.label}</h2>
        </div>
        <div className="title-actions">
          <PanelHelpButton panelId="scenario-summary" />
          {isDirty && <span className="dirty-badge">{t('core.unsaved')}</span>}
          <button className="save-button" onClick={onSave} type="button">{t('core.saveExperiment')}</button>
          <button className="reset-button" onClick={onReset} type="button">{t('core.newDefault')}</button>
          <span className="calculation-badge">{t('core.liveCalculation')}</span>
        </div>
      </div>

      <div className={`input-grid base-input-grid ${isHorizon ? 'horizon-input-grid' : ''}`}>
        <NumericField inputKey="observerHeightM" label={t('field.eyeHeight')} unit="m" step={0.1} inputs={inputs} onNumberChange={onNumberChange} />
        {isHorizon ? (
          <>
            <NumericField inputKey="observerGroundElevationM" label={t('field.observerGroundElevation')} unit="m" step={0.1} inputs={inputs} onNumberChange={onNumberChange} />
            <NumericField inputKey="verticalDatumOffsetM" label={t('field.datumOffset')} unit="m" step={0.1} inputs={inputs} onNumberChange={onNumberChange} />
            <label className="input-field horizon-datum-field">
              <span>{t('field.verticalDatum')}</span>
              <select value={inputs.verticalDatumKind} onChange={(event) => onDatumChange(event.currentTarget.value as VerticalDatumKind)}>
                <option value="orthometric-msl">{getDatumLabel(locale, 'orthometric-msl')}</option>
                <option value="ellipsoidal-wgs84">{getDatumLabel(locale, 'ellipsoidal-wgs84')}</option>
                <option value="local">{getDatumLabel(locale, 'local')}</option>
              </select>
            </label>
          </>
        ) : (
          <>
            <NumericField inputKey="targetHeightM" label={t('field.targetHeight')} unit="m" step={0.1} inputs={inputs} onNumberChange={onNumberChange} />
            <NumericField inputKey="observedVisiblePercent" label={t('field.observedVisibility')} unit="%" step={1} inputs={inputs} onNumberChange={onNumberChange} />
            <NumericField inputKey="observationUncertaintyPercent" label={t('field.observationUncertainty')} unit="±%" step={1} inputs={inputs} onNumberChange={onNumberChange} />
          </>
        )}
        <NumericField inputKey="refractionCoefficient" label={t('field.refractionCoefficient')} unit="k" step={0.01} inputs={inputs} disabled={atmosphereMode !== 'standard'} onNumberChange={onNumberChange} />
      </div>

      {!isHorizon && <div className="distance-source-panel">
        <div className="distance-source-heading">
          <div>
            <span className="eyebrow">{t('distance.source')}</span>
            <strong>{inputs.distanceSource === 'manual' ? t('distance.manualSurface') : t('distance.coordinateSolution')}</strong>
          </div>
          <div className="distance-mode-buttons">
            <button className={inputs.distanceSource === 'manual' ? 'selected' : ''} type="button" onClick={() => onDistanceSourceChange('manual')}>{t('distance.manual')}</button>
            <button className={inputs.distanceSource === 'coordinates' ? 'selected' : ''} type="button" onClick={() => onDistanceSourceChange('coordinates')}>{t('distance.coordinates')}</button>
          </div>
        </div>

        {inputs.distanceSource === 'manual' ? (
          <div className="manual-distance-row">
            <NumericField inputKey="surfaceDistanceKm" label={t('field.surfaceDistance')} unit="km" step={0.01} inputs={inputs} onNumberChange={onNumberChange} />
            <p>{t('distance.manualNote')}</p>
          </div>
        ) : (
          <>
            <div className="coordinate-grid">
              <NumericField inputKey="observerLatitudeDeg" label={t('field.observerLatitude')} unit="°" step={0.000001} inputs={inputs} onNumberChange={onNumberChange} />
              <NumericField inputKey="observerLongitudeDeg" label={t('field.observerLongitude')} unit="°" step={0.000001} inputs={inputs} onNumberChange={onNumberChange} />
              <NumericField inputKey="targetLatitudeDeg" label={t('field.targetLatitude')} unit="°" step={0.000001} inputs={inputs} onNumberChange={onNumberChange} />
              <NumericField inputKey="targetLongitudeDeg" label={t('field.targetLongitude')} unit="°" step={0.000001} inputs={inputs} onNumberChange={onNumberChange} />
            </div>
            <div className={`geodesic-summary ${geodesic?.method === 'spherical-fallback' ? 'fallback' : ''}`}>
              <div><small>{t('geodesic.distance')}</small><strong>{numberFormatter.format(effectiveDistanceKm)} km</strong></div>
              <div><small>{t('geodesic.initialBearing')}</small><strong>{geodesic ? `${bearingFormatter.format(geodesic.initialBearingDeg)}°` : '—'}</strong></div>
              <div><small>{t('geodesic.finalBearing')}</small><strong>{geodesic ? `${bearingFormatter.format(geodesic.finalBearingDeg)}°` : '—'}</strong></div>
              <div><small>{t('geodesic.solution')}</small><strong>{geodesic?.method === 'vincenty' ? t('geodesic.vincentySolution', { iterations: geodesic.iterations }) : t('geodesic.sphericalFallback')}</strong></div>
              <button type="button" onClick={onShowGeodesicTrace}>{t('geodesic.trace')}</button>
            </div>
            <p className="coordinate-note">
              {t('geodesic.coordinateNote', {
                observerLat: coordinateFormatter.format(inputs.observerLatitudeDeg),
                observerLon: coordinateFormatter.format(inputs.observerLongitudeDeg),
                targetLat: coordinateFormatter.format(inputs.targetLatitudeDeg),
                targetLon: coordinateFormatter.format(inputs.targetLongitudeDeg)
              })}
            </p>
          </>
        )}
      </div>}

      {isHorizon && <p className="scenario-scope-note">{t('horizon.scope')}</p>}

      <div className="refraction-control">
        <span>{t('atmosphere.modeSummary', { mode: atmosphereModeLabel })}</span>
      </div>
    </section>
  );
}
