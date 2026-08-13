import { simulationModels } from '../../../models';
import type { AtmosphereMode } from '../../../shared/atmosphere';
import type { SimulationScenarioId } from '../../../shared/scenario';
import type { SavedExperiment } from '../../../shared/simulator';
import { CelestialTimeCard } from '../CelestialTimeCard';
import { useI18n } from '../I18nProvider';
import {
  getPresentation,
  getScenarioPresentation,
  getSidebarModelLabel,
  isAstronomyScenario,
  scenarios
} from './app-config';
import type { VisualLayerState } from './app-types';

export function AppSidebar({
  experiments,
  activeScenarioId,
  atmosphereMode,
  visualLayers,
  observedAtIso,
  observationUtcOffsetMinutes,
  onScenarioChange,
  onLoadExperiment,
  onVisualLayerChange,
  onObservationTimeChange
}: {
  experiments: SavedExperiment[];
  activeScenarioId: SimulationScenarioId;
  atmosphereMode: AtmosphereMode;
  visualLayers: VisualLayerState;
  observedAtIso: string;
  observationUtcOffsetMinutes: number;
  onScenarioChange(scenarioId: SimulationScenarioId): void;
  onObservationTimeChange(observedAtIso: string, utcOffsetMinutes: number): void;
  onLoadExperiment(experiment: SavedExperiment): void;
  onVisualLayerChange(key: keyof VisualLayerState, enabled: boolean): void;
}): React.JSX.Element {
  const { locale, t } = useI18n();
  const enabledScenarioCount = scenarios.filter((scenario) => scenario.enabled).length;
  const modelCountKey = activeScenarioId === 'sun-moon-observation'
    ? 'sidebar.modelCount.sunMoon'
    : activeScenarioId === 'eclipse-simulation'
      ? 'sidebar.modelCount.eclipse'
      : activeScenarioId === 'shadow-observation' || activeScenarioId === 'stellar-observation'
        ? 'sidebar.modelCount.singleAstronomy'
        : 'sidebar.modelCount.visibility';

  return (
    <aside className="sidebar">
      <section className="side-section">
        <div className="section-heading">
          <span>{t('sidebar.testScenarios')}</span>
          <span className="section-state">{t('sidebar.readyCount', { ready: enabledScenarioCount, total: scenarios.length })}</span>
        </div>
        <nav className="scenario-list">
          {scenarios.map((scenario) => {
            const isActive = scenario.id === activeScenarioId;
            const presentation = getScenarioPresentation(locale, scenario.id);
            return (
              <button
                className={!scenario.enabled ? 'unavailable' : isActive ? 'active' : 'available'}
                disabled={!scenario.enabled}
                key={scenario.id}
                title={!scenario.enabled ? t('sidebar.unavailableScenario') : presentation.description}
                type="button"
                onClick={() => onScenarioChange(scenario.id)}
              >
                <span className="nav-icon">{scenario.icon}</span>
                <span className="nav-label">{presentation.label}</span>
                <span className="nav-state">{!scenario.enabled
                  ? t('common.soon')
                  : isActive
                    ? t('common.active')
                    : t('common.ready')}</span>
              </button>
            );
          })}
        </nav>
      </section>

      <section className="side-section compact">
        <div className="section-heading">
          <span>{t('sidebar.savedExperiments')}</span>
          <span className="section-state">{t('sidebar.savedCount', { count: experiments.length })}</span>
        </div>
        {experiments.length === 0 ? (
          <div className="saved-empty">{t('sidebar.noSaved')}</div>
        ) : (
          experiments.slice(0, 3).map((experiment) => (
            <button
              className="saved-experiment-button"
              key={experiment.id}
              type="button"
              title={experiment.name}
              onClick={() => onLoadExperiment(experiment)}
            >
              <span>{experiment.name}</span>
              <b>↗</b>
            </button>
          ))
        )}
      </section>

      <section className="side-section compact">
        <div className="section-heading">
          <span>{t('sidebar.models')}</span>
          <span className="section-state">{t(modelCountKey)}</span>
        </div>
        {activeScenarioId === 'sun-moon-observation' ? (
          <>
            <div className="model-toggle reference-model">
              <span className="model-dot amber" />
              <span>{t('model.solarPosition')}</span>
              <span className="reference-badge">{t('common.reference')}</span>
            </div>
            <div className="model-toggle reference-model">
              <span className="model-dot violet" />
              <span>{t('model.lunarPosition')}</span>
              <span className="reference-badge">{t('common.reference')}</span>
            </div>
            <div className="model-toggle reference-model">
              <span className="model-dot green" />
              <span>{t('model.solarDayEvents')}</span>
              <span className="reference-badge">{t('common.reference')}</span>
            </div>
          </>
        ) : activeScenarioId === 'eclipse-simulation' ? (
          <>
            <div className="model-toggle reference-model">
              <span className="model-dot amber" />
              <span>{t('model.eclipseGeometry')}</span>
              <span className="reference-badge">{t('common.reference')}</span>
            </div>
            <div className="model-toggle reference-model">
              <span className="model-dot violet" />
              <span>{t('model.eclipseSearch')}</span>
              <span className="reference-badge">{t('common.reference')}</span>
            </div>
          </>
        ) : activeScenarioId === 'shadow-observation' ? (
          <div className="model-toggle reference-model">
            <span className="model-dot amber" />
            <span>{t('model.shadowGeometry')}</span>
            <span className="reference-badge">{t('common.reference')}</span>
          </div>
        ) : activeScenarioId === 'stellar-observation' ? (
          <div className="model-toggle reference-model">
            <span className="model-dot violet" />
            <span>{t('model.stellarObservation')}</span>
            <span className="reference-badge">{t('common.reference')}</span>
          </div>
        ) : (
          <>
            {simulationModels.map((model) => {
              const presentation = getPresentation(model.metadata.id);
              const isProjection = model.metadata.id === 'azimuthal-projection';
              return (
                <div className={`model-toggle ${isProjection ? 'reference-model' : ''}`} key={model.metadata.id}>
                  <span className={`model-dot ${presentation.tone}`} />
                  <span>{getSidebarModelLabel(locale, model.metadata.id, model.metadata.name)}</span>
                  {isProjection
                    ? <span className="reference-badge">{t('common.reference')}</span>
                    : <span className="enabled-dot" title={t('sidebar.includedInCalculation')} />}
                </div>
              );
            })}
            <div className="model-toggle future-model"><span className="model-dot coral" /><span>{t('model.toroidal')}</span><span className="future-badge">{t('common.soon')}</span></div>
            <div className="model-toggle future-model"><span className="model-dot blue" /><span>{t('model.concaveEarth')}</span><span className="future-badge">{t('common.soon')}</span></div>
          </>
        )}
      </section>

      {isAstronomyScenario(activeScenarioId) ? (
        <section className="side-section compact grow celestial-visual-placeholder">
          <div className="section-heading">
            <span>{t('sidebar.visualLayers')}</span>
            <span className="section-state">{t('sidebar.astronomyNextSlice')}</span>
          </div>
          <div className="saved-empty">
            {activeScenarioId === 'eclipse-simulation'
              ? t('astronomy.placeholder.eclipse')
              : activeScenarioId === 'shadow-observation'
                ? t('astronomy.placeholder.shadow')
                : activeScenarioId === 'stellar-observation'
                  ? t('astronomy.placeholder.stellar')
                  : t('astronomy.placeholder.sunMoon')}
          </div>
        </section>
      ) : (
        <section className="side-section compact grow">
          <div className="section-heading">
            <span>{t('sidebar.visualLayers')}</span>
            <span className="section-state">{t('sidebar.visualReadyCount')}</span>
          </div>
          <label className="switch-row">
            <span>{t('visual.geographicBoundaries')}</span>
            <input
              type="checkbox"
              checked={visualLayers.geographicBoundaries}
              onChange={(event) => onVisualLayerChange('geographicBoundaries', event.currentTarget.checked)}
            />
            <span className="switch" />
          </label>
          <label
            className={`switch-row ${activeScenarioId === 'horizon' ? 'unavailable-layer' : ''}`}
            title={activeScenarioId === 'horizon'
              ? t('visual.terrainHorizonUnavailable')
              : t('visual.terrainDescription')}
          >
            <span>{t('visual.terrain')}</span>
            <input
              type="checkbox"
              disabled={activeScenarioId === 'horizon'}
              checked={activeScenarioId !== 'horizon' && visualLayers.terrain}
              onChange={(event) => onVisualLayerChange('terrain', event.currentTarget.checked)}
            />
            <span className="switch" />
          </label>
          <label className="switch-row unavailable-layer">
            <span>{t('visual.nightLights')}</span><input type="checkbox" disabled /><span className="switch" />
          </label>
          <label
            className={`switch-row ${atmosphereMode !== 'profile' ? 'unavailable-layer' : ''}`}
            title={atmosphereMode === 'profile'
              ? t('visual.atmosphereEnabledDescription')
              : t('visual.atmosphereSelectProfile')}
          >
            <span>{t('visual.atmosphereProfile')}</span>
            <input
              type="checkbox"
              disabled={atmosphereMode !== 'profile'}
              checked={atmosphereMode === 'profile' && visualLayers.atmosphere}
              onChange={(event) => onVisualLayerChange('atmosphere', event.currentTarget.checked)}
            />
            <span className="switch" />
          </label>
          <label className="switch-row">
            <span>{t('visual.grid')}</span>
            <input
              type="checkbox"
              checked={visualLayers.grid}
              onChange={(event) => onVisualLayerChange('grid', event.currentTarget.checked)}
            />
            <span className="switch" />
          </label>
        </section>
      )}

      <CelestialTimeCard
        active={isAstronomyScenario(activeScenarioId)}
        observedAtIso={observedAtIso}
        utcOffsetMinutes={observationUtcOffsetMinutes}
        onChange={onObservationTimeChange}
      />
    </aside>
  );
}
