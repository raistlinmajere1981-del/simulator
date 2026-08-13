import type { AtmosphereMode } from '../../shared/atmosphere';
import type { ModelInputUncertaintySettings } from '../../shared/uncertainty';
import type { TranslationKey } from './i18n';
import { useI18n } from './I18nProvider';
import './photo-model-uncertainty-control.css';
import { PanelHelpButton } from './HelpSystem';

type NumericKey = Exclude<keyof ModelInputUncertaintySettings, 'combination'>;

const fields: Array<{
  key: NumericKey;
  labelKey: TranslationKey;
  unit: string;
  step: number;
  standardOnly?: boolean;
}> = [
  {
    key: 'surfaceDistanceM',
    labelKey: 'photo.modelUncertainty.field.surfaceDistance',
    unit: 'm',
    step: 0.1
  },
  {
    key: 'observerEyeHeightM',
    labelKey: 'photo.modelUncertainty.field.observerEyeHeight',
    unit: 'm',
    step: 0.01
  },
  {
    key: 'observerGroundElevationM',
    labelKey: 'photo.modelUncertainty.field.observerGround',
    unit: 'm',
    step: 0.01
  },
  {
    key: 'targetHeightM',
    labelKey: 'photo.modelUncertainty.field.targetHeight',
    unit: 'm',
    step: 0.01
  },
  {
    key: 'targetGroundElevationM',
    labelKey: 'photo.modelUncertainty.field.targetGround',
    unit: 'm',
    step: 0.01
  },
  {
    key: 'refractionCoefficient',
    labelKey: 'photo.modelUncertainty.field.refraction',
    unit: 'k',
    step: 0.001,
    standardOnly: true
  }
];

function definedCount(settings: ModelInputUncertaintySettings): number {
  return fields.filter(({ key }) => {
    const value = settings[key];
    return value !== undefined && Number.isFinite(value) && value > 0;
  }).length;
}

export function PhotoModelUncertaintyControl({
  settings,
  atmosphereMode,
  isCalculating,
  error,
  onChange
}: {
  settings: ModelInputUncertaintySettings;
  atmosphereMode: AtmosphereMode;
  isCalculating: boolean;
  error?: string;
  onChange(settings: ModelInputUncertaintySettings): void;
}): React.JSX.Element {
  const { t } = useI18n();
  const count = definedCount(settings);

  const updateNumber = (key: NumericKey, raw: string): void => {
    const trimmed = raw.trim();
    if (trimmed === '') {
      const next = { ...settings };
      delete next[key];
      onChange(next);
      return;
    }
    const value = Number(trimmed);
    if (!Number.isFinite(value) || value < 0) return;
    onChange({ ...settings, [key]: value });
  };

  const stateLabel = isCalculating
    ? t('photo.modelUncertainty.calculating')
    : count > 0
      ? t('photo.modelUncertainty.componentCount', { count })
      : t('photo.modelUncertainty.undefinedState');

  return (
    <section className="photo-model-uncertainty panel">
      <div className="photo-model-uncertainty-heading">
        <div>
          <span className="eyebrow">{t('photo.modelUncertainty.eyebrow')}</span>
          <strong>{t('photo.modelUncertainty.title')}</strong>
        </div>
        <div className="photo-model-uncertainty-heading-actions">
          <PanelHelpButton panelId="model-uncertainty" />
          <span
            className={`photo-model-uncertainty-state ${
              isCalculating ? 'busy' : count > 0 ? 'active' : ''
            }`}
          >
            {stateLabel}
          </span>
        </div>
      </div>

      <p className="photo-model-uncertainty-note">{t('photo.modelUncertainty.note')}</p>

      <div className="photo-model-uncertainty-grid">
        <label>
          <span>{t('photo.modelUncertainty.combine')}</span>
          <select
            value={settings.combination}
            onChange={(event) => onChange({
              ...settings,
              combination: event.currentTarget.value as ModelInputUncertaintySettings['combination']
            })}
          >
            <option value="linear-conservative">{t('photo.uncertainty.linear')}</option>
            <option value="rss-independent">{t('photo.uncertainty.rss')}</option>
          </select>
        </label>
        {fields.map((field) => {
          const disabled = field.standardOnly && atmosphereMode !== 'standard';
          return (
            <label className={disabled ? 'disabled' : ''} key={field.key}>
              <span>{t(field.labelKey)}</span>
              <div>
                <input
                  disabled={disabled}
                  min={0}
                  step={field.step}
                  type="number"
                  placeholder={t('photo.calibration.undefined')}
                  value={settings[field.key] ?? ''}
                  onChange={(event) => updateNumber(field.key, event.currentTarget.value)}
                />
                <em>{field.unit}</em>
              </div>
            </label>
          );
        })}
      </div>

      {settings.combination === 'rss-independent' && (
        <p className="photo-model-uncertainty-warning">
          {t('photo.modelUncertainty.rssWarning')}
        </p>
      )}
      {atmosphereMode !== 'standard' && settings.refractionCoefficient !== undefined && (
        <p className="photo-model-uncertainty-warning">
          {t('photo.modelUncertainty.kWarning')}
        </p>
      )}
      {atmosphereMode === 'profile' && (
        <p className="photo-model-uncertainty-warning">
          {t('photo.modelUncertainty.profileWarning')}
        </p>
      )}
      {error && <p className="photo-model-uncertainty-error">{error}</p>}
    </section>
  );
}
