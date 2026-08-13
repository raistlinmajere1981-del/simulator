import type { SimulatorInputs } from '../../shared/simulator';
import { DraftNumberInput } from './DraftNumberInput';
import { PanelHelpButton } from './HelpSystem';
import { useI18n } from './I18nProvider';
import { getScenarioPresentation } from './app/app-config';
import './solar-scenario-summary.css';

export function ShadowScenarioSummary({
  activeName,
  inputs,
  isDirty,
  onCoordinateChange,
  onReset,
  onSave
}: {
  activeName: string;
  inputs: SimulatorInputs;
  isDirty: boolean;
  onCoordinateChange(key: 'observerLatitudeDeg' | 'observerLongitudeDeg', value: number): void;
  onReset(): void;
  onSave(): void;
}): React.JSX.Element {
  const { locale, t } = useI18n();
  const scenario = getScenarioPresentation(locale, 'shadow-observation');

  return (
    <section className="scenario-summary panel solar-scenario-summary">
      <div className="panel-title-row">
        <div>
          <span className="eyebrow">{t('core.activeScenario')}</span>
          <h2>{activeName || scenario.label}</h2>
        </div>
        <div className="title-actions">
          <PanelHelpButton panelId="shadow-observation" />
          {isDirty && <span className="dirty-badge">{t('core.unsaved')}</span>}
          <button className="save-button" onClick={onSave} type="button">{t('core.saveExperiment')}</button>
          <button className="reset-button" onClick={onReset} type="button">{t('core.newDefault')}</button>
          <span className="calculation-badge">{t('core.liveCalculation')}</span>
        </div>
      </div>

      <div className="solar-location-grid">
        <label className="input-field">
          <span>{t('field.observerLatitude')}</span>
          <div><DraftNumberInput min={-90} max={90} step={0.000001} value={inputs.observerLatitudeDeg} onCommit={(value) => onCoordinateChange('observerLatitudeDeg', value)} /><b>°</b></div>
        </label>
        <label className="input-field">
          <span>{t('field.observerLongitude')}</span>
          <div><DraftNumberInput min={-180} max={180} step={0.000001} value={inputs.observerLongitudeDeg} onCommit={(value) => onCoordinateChange('observerLongitudeDeg', value)} /><b>°</b></div>
        </label>
      </div>

      <p className="scenario-scope-note">{t('astronomy.summary.shadowScope')}</p>
    </section>
  );
}
