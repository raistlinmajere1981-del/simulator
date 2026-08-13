import type { AtmosphereMode } from '../../../shared/atmosphere';
import type { SimulatorInputs } from '../../../shared/simulator';
import { useI18n } from '../I18nProvider';
import { getDatumLabel } from './app-config';
import {
  formatMetres,
  formatPercentValue,
  formatSignedPercentValue,
  numberFormatterFor
} from './app-formatters';

export function ObservationPanel({ inputs }: { inputs: SimulatorInputs }): React.JSX.Element {
  const { locale, t } = useI18n();
  const numberFormatter = numberFormatterFor(locale);
  return (
    <section className="observation panel">
      <div className="observation-heading">
        <span className="eyebrow">{t('observation.reference')}</span>
        <span className="reference-mode">{t('observation.numericInput')}</span>
      </div>
      <div className="observation-image">
        <div className="reticle">＋</div>
        <div className="ship"><span /><i /><b /></div>
        <div className="scale">5°<br />{numberFormatter.format(2.5)}°<br />0°<br />−{numberFormatter.format(2.5)}°</div>
      </div>
      <div className="observation-meta">
        <span>{t('observation.observed', { value: formatPercentValue(inputs.observedVisiblePercent, locale) })}</span>
        <span>{t('observation.uncertainty', { value: formatSignedPercentValue(inputs.observationUncertaintyPercent, locale) })}</span>
        <span>{t('observation.photoNote')}</span>
      </div>
      <p className="engine-note">{t('observation.engineNote')}</p>
    </section>
  );
}

export function HorizonReferencePanel({
  inputs,
  atmosphereMode
}: {
  inputs: SimulatorInputs;
  atmosphereMode: AtmosphereMode;
}): React.JSX.Element {
  const { locale, t } = useI18n();
  const numberFormatter = numberFormatterFor(locale);
  const observerTotalElevationM = inputs.observerGroundElevationM +
    inputs.verticalDatumOffsetM + inputs.observerHeightM;
  const atmosphereLabel = atmosphereMode === 'standard'
    ? t('horizon.standardRefraction', { value: numberFormatter.format(inputs.refractionCoefficient) })
    : atmosphereMode === 'profile'
      ? t('atmosphere.layered')
      : t('atmosphere.off');

  return (
    <section className="observation panel horizon-reference-panel">
      <div className="observation-heading">
        <span className="eyebrow">{t('horizon.referenceSummary')}</span>
        <span className="reference-mode">{t('horizon.geometricCalculation')}</span>
      </div>
      <div className="horizon-reference-visual">
        <span className="horizon-reference-observer" />
        <span className="horizon-reference-tangent" />
        <span className="horizon-reference-arc" />
      </div>
      <div className="horizon-reference-metrics">
        <div><small>{t('horizon.totalObserverElevation')}</small><strong>{formatMetres(observerTotalElevationM, locale)}</strong></div>
        <div><small>{t('horizon.verticalDatum')}</small><strong>{getDatumLabel(locale, inputs.verticalDatumKind)}</strong></div>
        <div><small>{t('horizon.atmosphere')}</small><strong>{atmosphereLabel}</strong></div>
      </div>
      <p className="engine-note">{t('horizon.engineNote')}</p>
    </section>
  );
}
