import { simulationModels } from '../../../models';
import type { AtmosphereMode } from '../../../shared/atmosphere';
import { getSimulationScenario, type SimulationScenarioId } from '../../../shared/scenario';
import type { SavedExperiment } from '../../../shared/simulator';
import { CelestialTimeCard } from '../CelestialTimeCard';
import { getPresentation, isAstronomyScenario, scenarios } from './app-config';
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
  return (
    <aside className="sidebar">
      <section className="side-section">
        <div className="section-heading">
          <span>Test senaryoları</span>
          <span className="section-state">{scenarios.filter((scenario) => scenario.enabled).length} / {scenarios.length} hazır</span>
        </div>
        <nav className="scenario-list">
          {scenarios.map((scenario) => {
            const isActive = scenario.id === activeScenarioId;
            return (
              <button
                className={!scenario.enabled ? 'unavailable' : isActive ? 'active' : 'available'}
                disabled={!scenario.enabled}
                key={scenario.label}
                title={!scenario.enabled
                  ? 'Bu deney henüz uygulanmadı'
                  : getSimulationScenario(scenario.id!).description}
                type="button"
                onClick={() => scenario.id && onScenarioChange(scenario.id)}
              >
                <span className="nav-icon">{scenario.icon}</span>
                <span className="nav-label">{scenario.label}</span>
                <span className="nav-state">{!scenario.enabled ? 'YAKINDA' : isActive ? 'AKTİF' : 'HAZIR'}</span>
              </button>
            );
          })}
        </nav>
      </section>

      <section className="side-section compact">
        <div className="section-heading">
          <span>Kaydedilen deneyler</span>
          <span className="section-state">{experiments.length} kayıt</span>
        </div>
        {experiments.length === 0 ? (
          <div className="saved-empty">Henüz yerel kayıt yok.</div>
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
          <span>Modeller</span>
          <span className="section-state">{activeScenarioId === 'sun-moon-observation' ? '3 astronomik referans' : activeScenarioId === 'eclipse-simulation' ? '2 tutulma referansı' : activeScenarioId === 'shadow-observation' || activeScenarioId === 'stellar-observation' ? '1 astronomik referans' : '2 fiziksel'}</span>
        </div>
        {activeScenarioId === 'sun-moon-observation' ? (
          <>
            <div className="model-toggle reference-model">
              <span className="model-dot amber" />
              <span>Güneş Konumu · Astronomik Referans</span>
              <span className="reference-badge">REFERANS</span>
            </div>
            <div className="model-toggle reference-model">
              <span className="model-dot violet" />
              <span>Ay Konumu ve Fazı · Astronomik Referans</span>
              <span className="reference-badge">REFERANS</span>
            </div>
            <div className="model-toggle reference-model">
              <span className="model-dot green" />
              <span>Gün Doğumu / Batımı · Astronomik Referans</span>
              <span className="reference-badge">REFERANS</span>
            </div>
          </>
        ) : activeScenarioId === 'eclipse-simulation' ? (
          <>
            <div className="model-toggle reference-model">
              <span className="model-dot amber" />
              <span>Anlık Güneş–Ay Disk Geometrisi</span>
              <span className="reference-badge">REFERANS</span>
            </div>
            <div className="model-toggle reference-model">
              <span className="model-dot violet" />
              <span>Yerel Tutulma Zaman Araması</span>
              <span className="reference-badge">REFERANS</span>
            </div>
          </>
        ) : activeScenarioId === 'shadow-observation' ? (
          <div className="model-toggle reference-model">
            <span className="model-dot amber" />
            <span>Gölge Geometrisi · Astronomik Referans</span>
            <span className="reference-badge">REFERANS</span>
          </div>
        ) : activeScenarioId === 'stellar-observation' ? (
          <div className="model-toggle reference-model">
            <span className="model-dot violet" />
            <span>Yıldız Gözlemi · Astronomik Referans</span>
            <span className="reference-badge">REFERANS</span>
          </div>
        ) : (
          <>
            {simulationModels.map((model) => {
              const presentation = getPresentation(model.metadata.id);
              const isProjection = model.metadata.id === 'azimuthal-projection';
              return (
                <div className={`model-toggle ${isProjection ? 'reference-model' : ''}`} key={model.metadata.id}>
                  <span className={`model-dot ${presentation.tone}`} />
                  <span>{model.metadata.name}</span>
                  {isProjection
                    ? <span className="reference-badge">REFERANS</span>
                    : <span className="enabled-dot" title="Hesaplamaya dahil" />}
                </div>
              );
            })}
            <div className="model-toggle future-model"><span className="model-dot coral" /><span>Toroidal Model</span><span className="future-badge">YAKINDA</span></div>
            <div className="model-toggle future-model"><span className="model-dot blue" /><span>İçbükey Dünya</span><span className="future-badge">YAKINDA</span></div>
          </>
        )}
      </section>

      {isAstronomyScenario(activeScenarioId) ? (
        <section className="side-section compact grow celestial-visual-placeholder">
          <div className="section-heading">
            <span>Görsel katmanlar</span>
            <span className="section-state">astronomi · sonraki dilim</span>
          </div>
          <div className="saved-empty">
            {activeScenarioId === 'eclipse-simulation'
              ? 'Anlık Güneş–Ay disk geometrisi ve kullanıcı kontrollü yerel tutulma zaman penceresi ana deney alanında gösterilir.'
              : activeScenarioId === 'shadow-observation'
                ? 'Gölge yön diyagramı ana deney panelinde gösterilir. Dünya modellerine fiziksel Güneş davranışı atanmaz.'
                : activeScenarioId === 'stellar-observation'
                  ? 'Katalog yıldızı, J2000→gözlem tarihi dönüşümü, geometrik yıldız izi ve isteğe bağlı yerel skyline ana deney alanında gösterilir.'
                  : 'Güneş/Ay konumu ile günlük doğuş-batış zaman çizgisi ana deney alanında gösterilir; ek gökyüzü katmanları sonraki dilimlerde genişletilecektir.'}
          </div>
        </section>
      ) : (
        <section className="side-section compact grow">
          <div className="section-heading">
            <span>Görsel katmanlar</span>
            <span className="section-state">4 / 5 hazır</span>
          </div>
          <label className="switch-row">
            <span>Kıta / Ülke Sınırları</span>
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
              ? 'Ufuk Analizi yerel arazi profilini kullanmaz'
              : 'Arazi profili etkin olduğunda rota boyunca göreli yükselti şeridini gösterir'}
          >
            <span>Topografya Görselleştirme</span>
            <input
              type="checkbox"
              disabled={activeScenarioId === 'horizon'}
              checked={activeScenarioId !== 'horizon' && visualLayers.terrain}
              onChange={(event) => onVisualLayerChange('terrain', event.currentTarget.checked)}
            />
            <span className="switch" />
          </label>
          <label className="switch-row unavailable-layer">
            <span>Gece Işıkları</span><input type="checkbox" disabled /><span className="switch" />
          </label>
          <label
            className={`switch-row ${atmosphereMode !== 'profile' ? 'unavailable-layer' : ''}`}
            title={atmosphereMode === 'profile'
              ? 'Ölçülmüş atmosfer katmanlarını ve İdeal Küre optik ışın yolunu görselleştirir'
              : 'Atmosfer Profili görsel katmanı için Katmanlı profil modunu seçin'}
          >
            <span>Atmosfer Profili</span>
            <input
              type="checkbox"
              disabled={atmosphereMode !== 'profile'}
              checked={atmosphereMode === 'profile' && visualLayers.atmosphere}
              onChange={(event) => onVisualLayerChange('atmosphere', event.currentTarget.checked)}
            />
            <span className="switch" />
          </label>
          <label className="switch-row">
            <span>Izgara</span>
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
