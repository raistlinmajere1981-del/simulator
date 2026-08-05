import { useEffect, useMemo, useState } from 'react';
import { simulationModels } from '../../models';
import type {
  ExperimentDefinition,
  ModelMetadata,
  ModelPrediction,
  ResultStatus
} from '../../shared/domain';
import {
  DEFAULT_SIMULATOR_INPUTS,
  type SavedExperiment,
  type SimulatorInputs
} from '../../shared/simulator';
import {
  runSimulationModels,
  type ModelRun
} from '../../simulation/runner';
import {
  DataManagerDialog,
  SaveExperimentDialog,
  TraceDialog
} from './dialogs';

type ModelTone = 'green' | 'amber' | 'violet';
type ModelShape = 'globe' | 'disk' | 'gleason';
type NumericInputKey = Exclude<keyof SimulatorInputs, 'useStandardRefraction'>;

interface ModelPresentation {
  tone: ModelTone;
  shape: ModelShape;
}

interface ScenarioDefinition {
  label: string;
  icon: string;
  enabled: boolean;
}

const scenarios: ScenarioDefinition[] = [
  { label: 'Hedef Görünürlüğü', icon: '▰', enabled: true },
  { label: 'Ufuk Analizi', icon: '◫', enabled: false },
  { label: 'Uzun Mesafe Görüş', icon: '⌁', enabled: false },
  { label: 'Güneş ve Ay Gözlemleri', icon: '☀', enabled: false },
  { label: 'Yıldız Gözlemleri', icon: '✦', enabled: false },
  { label: 'Tutulma Simülasyonları', icon: '◐', enabled: false }
];

const presentationByModelId: Record<string, ModelPresentation> = {
  'ideal-sphere': { tone: 'green', shape: 'globe' },
  'defined-plane': { tone: 'amber', shape: 'disk' },
  'azimuthal-projection': { tone: 'violet', shape: 'gleason' }
};

const statusLabels: Record<ResultStatus, string> = {
  compatible: 'Gözlem aralığıyla uyumlu',
  incompatible: 'Gözlem aralığıyla uyumsuz',
  indeterminate: 'Belirsizlik içinde karar verilemedi',
  unsupported: 'Fiziksel model kuralları tanımsız'
};

const inputRanges: Record<NumericInputKey, { min: number; max: number }> = {
  observerHeightM: { min: 0, max: 100_000 },
  targetHeightM: { min: 0.1, max: 100_000 },
  surfaceDistanceKm: { min: 0, max: 20_000 },
  observedVisiblePercent: { min: 0, max: 100 },
  observationUncertaintyPercent: { min: 0, max: 100 },
  refractionCoefficient: { min: -1, max: 0.99 }
};

const numberFormatter = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 2
});

function getPresentation(modelId: string): ModelPresentation {
  return presentationByModelId[modelId] ?? { tone: 'violet', shape: 'gleason' };
}

function getMetric(
  prediction: ModelPrediction | undefined,
  key: string
): number | null {
  return prediction?.metrics.find((metric) => metric.key === key)?.value ?? null;
}

function formatPercent(fraction: number | null): string {
  return fraction === null ? '—' : `%${numberFormatter.format(fraction * 100)}`;
}

function formatDistance(distanceM: number | null, infinite = false): string {
  if (distanceM === null) return infinite ? '∞' : '—';
  return `${numberFormatter.format(distanceM / 1_000)} km`;
}

function formatAngle(angleDeg: number | null): string {
  return angleDeg === null ? '—' : `${numberFormatter.format(angleDeg)}°`;
}

function formatDifference(differencePp: number | null): string {
  return differencePp === null
    ? '—'
    : `${numberFormatter.format(differencePp)} puan`;
}

function clampInputValue(key: NumericInputKey, value: number): number {
  const range = inputRanges[key];
  return Math.min(range.max, Math.max(range.min, value));
}

function defaultExperimentName(): string {
  return `Hedef Görünürlüğü ${new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date())}`;
}

function Sidebar({
  experiments,
  onLoadExperiment
}: {
  experiments: SavedExperiment[];
  onLoadExperiment(experiment: SavedExperiment): void;
}): React.JSX.Element {
  return (
    <aside className="sidebar">
      <section className="side-section">
        <div className="section-heading">
          <span>Test senaryoları</span>
          <span className="section-state">1 / 6 hazır</span>
        </div>
        <nav className="scenario-list">
          {scenarios.map((scenario) => (
            <button
              className={scenario.enabled ? 'active' : 'unavailable'}
              disabled={!scenario.enabled}
              key={scenario.label}
              title={scenario.enabled ? 'Aktif deney' : 'Bu deney henüz uygulanmadı'}
            >
              <span className="nav-icon">{scenario.icon}</span>
              <span className="nav-label">{scenario.label}</span>
              <span className="nav-state">{scenario.enabled ? 'AKTİF' : 'YAKINDA'}</span>
            </button>
          ))}
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
          <span className="section-state">2 fiziksel</span>
        </div>
        {simulationModels.map((model) => {
          const presentation = getPresentation(model.metadata.id);
          const isProjection = model.metadata.id === 'azimuthal-projection';
          return (
            <div
              className={`model-toggle ${isProjection ? 'reference-model' : ''}`}
              key={model.metadata.id}
            >
              <span className={`model-dot ${presentation.tone}`} />
              <span>{model.metadata.name}</span>
              {isProjection ? (
                <span className="reference-badge">REFERANS</span>
              ) : (
                <span className="enabled-dot" title="Hesaplamaya dahil" />
              )}
            </div>
          );
        })}
        <div className="model-toggle future-model">
          <span className="model-dot coral" /><span>Toroidal Model</span>
          <span className="future-badge">YAKINDA</span>
        </div>
        <div className="model-toggle future-model">
          <span className="model-dot blue" /><span>İçbükey Dünya</span>
          <span className="future-badge">YAKINDA</span>
        </div>
      </section>

      <section className="side-section compact grow disabled-section">
        <div className="section-heading">
          <span>Görsel katmanlar</span>
          <span className="section-state">sonraki aşama</span>
        </div>
        {['Kıta / Ülke Sınırları', 'Topografya', 'Gece Işıkları', 'Atmosfer Profili', 'Izgara'].map((item) => (
          <label className="switch-row unavailable-layer" key={item}>
            <span>{item}</span><input type="checkbox" disabled /><span className="switch" />
          </label>
        ))}
      </section>

      <section className="time-card disabled-section">
        <div className="section-heading">
          <span>Zaman ve tarih</span>
          <span className="section-state">astronomi modülü</span>
        </div>
        <div className="time-placeholder">
          Güneş, Ay ve yıldız deneyleri eklendiğinde etkinleşecek.
        </div>
      </section>
    </aside>
  );
}

function ScenarioSummary({
  activeName,
  inputs,
  isDirty,
  onNumberChange,
  onRefractionChange,
  onReset,
  onSave
}: {
  activeName: string;
  inputs: SimulatorInputs;
  isDirty: boolean;
  onNumberChange(key: NumericInputKey, value: number): void;
  onRefractionChange(enabled: boolean): void;
  onReset(): void;
  onSave(): void;
}): React.JSX.Element {
  return (
    <section className="scenario-summary panel">
      <div className="panel-title-row">
        <div>
          <span className="eyebrow">Aktif senaryo</span>
          <h2>{activeName || 'Hedef Görünürlüğü'}</h2>
        </div>
        <div className="title-actions">
          {isDirty && <span className="dirty-badge">KAYDEDİLMEDİ</span>}
          <button className="save-button" onClick={onSave} type="button">Deneyi Kaydet</button>
          <button className="reset-button" onClick={onReset} type="button">Yeni / Varsayılan</button>
          <span className="calculation-badge">CANLI HESAPLAMA</span>
        </div>
      </div>

      <div className="input-grid">
        {([
          ['observerHeightM', 'Gözlemci yüksekliği', 'm', 0.1],
          ['targetHeightM', 'Hedef yüksekliği', 'm', 0.1],
          ['surfaceDistanceKm', 'Yüzey mesafesi', 'km', 0.01],
          ['observedVisiblePercent', 'Gözlenen görünürlük', '%', 1],
          ['observationUncertaintyPercent', 'Gözlem belirsizliği', '±%', 1],
          ['refractionCoefficient', 'Kırılma katsayısı', 'k', 0.01]
        ] as const).map(([key, label, unit, step]) => (
          <label className="input-field" key={key}>
            <span>{label}</span>
            <div>
              <input
                disabled={key === 'refractionCoefficient' && !inputs.useStandardRefraction}
                min={inputRanges[key].min}
                max={inputRanges[key].max}
                step={step}
                type="number"
                value={inputs[key]}
                onChange={(event) => onNumberChange(key, event.currentTarget.valueAsNumber)}
              />
              <b>{unit}</b>
            </div>
          </label>
        ))}
      </div>

      <label className="refraction-control">
        <input
          checked={inputs.useStandardRefraction}
          type="checkbox"
          onChange={(event) => onRefractionChange(event.currentTarget.checked)}
        />
        <span>Standart atmosferik kırılmayı etkin yarıçap yaklaşımıyla uygula</span>
      </label>
    </section>
  );
}

function ObservationPanel({ inputs }: { inputs: SimulatorInputs }): React.JSX.Element {
  return (
    <section className="observation panel">
      <div className="observation-heading">
        <span className="eyebrow">Gözlem referansı</span>
        <span className="reference-mode">SAYISAL GİRDİ</span>
      </div>
      <div className="observation-image">
        <div className="reticle">＋</div>
        <div className="ship"><span /><i /><b /></div>
        <div className="scale">5°<br />2,5°<br />0°<br />−2,5°</div>
      </div>
      <div className="observation-meta">
        <span>Gözlenen: %{numberFormatter.format(inputs.observedVisiblePercent)}</span>
        <span>Belirsizlik: ±%{numberFormatter.format(inputs.observationUncertaintyPercent)}</span>
        <button disabled title="Fotoğraf kalibrasyon modülü henüz eklenmedi" type="button">
          Görsel yükleme yakında
        </button>
      </div>
      <p className="engine-note">
        Görsel açıklayıcıdır. Karşılaştırma, sayısal görünürlük ve belirsizlik girdileriyle yapılır.
      </p>
    </section>
  );
}

function ModelCard({
  metadata,
  run,
  inputs,
  onShowTrace
}: {
  metadata: ModelMetadata;
  run: ModelRun | undefined;
  inputs: SimulatorInputs;
  onShowTrace(): void;
}): React.JSX.Element {
  const presentation = getPresentation(metadata.id);
  const prediction = run?.prediction;
  const status = prediction?.status ?? 'indeterminate';
  const visibleFraction = getMetric(prediction, 'visibleFraction');
  const hiddenFraction = getMetric(prediction, 'hiddenFraction');
  const horizonDistanceM = getMetric(prediction, 'horizonSurfaceDistanceM');
  const targetAngleDeg = getMetric(prediction, 'targetTopElevationDeg');
  const warning = prediction?.warnings[0];
  const isProjection = metadata.id === 'azimuthal-projection';

  return (
    <article className={`model-card ${presentation.tone} ${isProjection ? 'projection-card' : ''}`}>
      <header>
        <h3>{metadata.name}</h3>
        <div className="model-header-actions">
          <button className="trace-button" disabled={!prediction} type="button" onClick={onShowTrace}>
            Hesap izi
          </button>
          <span className={`status-pill status-${status}`}>{statusLabels[status]}</span>
        </div>
      </header>

      <div className={`world-visual ${presentation.shape} ${isProjection ? 'projection-only' : ''}`}>
        <span className="observer-pin">●</span><span className="target-pin">●</span><span className="route" />
        {isProjection && (
          <div className="projection-overlay">
            <strong>HARİTA PROJEKSİYONU</strong>
            <span>Konumları gösterebilir; fiziksel görüş tahmini üretemez.</span>
          </div>
        )}
      </div>

      {isProjection ? (
        <div className="projection-explanation">
          <strong>Hesaplama yapılmadı</strong>
          <p>Yüzey geometrisi, yerel dikey yön ve ışık ilerleme kuralları tanımlanmadan sayısal sonuç üretilemez.</p>
        </div>
      ) : (
        <div className="profile-view">
          <div className="profile-label left">Gözlemci<br /><b>{numberFormatter.format(inputs.observerHeightM)} m</b></div>
          <div className="profile-label right">Hedef<br /><b>{numberFormatter.format(inputs.targetHeightM)} m</b></div>
          <span className="line-of-sight" /><span className={`surface ${presentation.shape}`} />
        </div>
      )}

      <div className={`metric-grid ${isProjection ? 'unsupported-metrics' : ''}`}>
        <div><small>Beklenen görünürlük</small><strong>{formatPercent(visibleFraction)}</strong></div>
        <div><small>Gizlenen kısım</small><strong>{formatPercent(hiddenFraction)}</strong></div>
        <div><small>Ufuk mesafesi</small><strong>{formatDistance(horizonDistanceM, metadata.id === 'defined-plane')}</strong></div>
        <div><small>Hedef tepe açısı</small><strong>{formatAngle(targetAngleDeg)}</strong></div>
      </div>
      <div className="model-warning">{warning ?? metadata.assumptions[0]}</div>
    </article>
  );
}

function ResultsTable({
  runs,
  onShowTrace
}: {
  runs: ModelRun[];
  onShowTrace(modelId: string): void;
}): React.JSX.Element {
  return (
    <section className="results panel">
      <span className="eyebrow">Sonuç karşılaştırma</span>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Model / gösterim</th><th>Beklenen görünürlük</th><th>Gizlenen</th><th>Görüş açısı</th><th>Ufuk</th><th>Gözlem farkı</th><th>İz</th></tr></thead>
          <tbody>
            {simulationModels.map((model) => {
              const run = runs.find((candidate) => candidate.metadata.id === model.metadata.id);
              const prediction = run?.prediction;
              const presentation = getPresentation(model.metadata.id);
              const status = prediction?.status ?? 'indeterminate';
              const isProjection = model.metadata.id === 'azimuthal-projection';
              return (
                <tr className={isProjection ? 'projection-row' : ''} key={model.metadata.id}>
                  <td><span className={`model-dot ${presentation.tone}`} />{model.metadata.name}<small>{isProjection ? 'Kartografik referans · ' : 'Fiziksel model · '}{statusLabels[status]}</small></td>
                  <td>{formatPercent(getMetric(prediction, 'visibleFraction'))}</td>
                  <td>{formatPercent(getMetric(prediction, 'hiddenFraction'))}</td>
                  <td>{formatAngle(getMetric(prediction, 'targetTopElevationDeg'))}</td>
                  <td>{formatDistance(getMetric(prediction, 'horizonSurfaceDistanceM'), model.metadata.id === 'defined-plane')}</td>
                  <td>{formatDifference(getMetric(prediction, 'observationDifferencePp'))}</td>
                  <td><button className="table-trace-button" disabled={!prediction} type="button" onClick={() => onShowTrace(model.metadata.id)}>Aç</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AppNext(): React.JSX.Element {
  const [inputs, setInputs] = useState<SimulatorInputs>(DEFAULT_SIMULATOR_INPUTS);
  const [runs, setRuns] = useState<ModelRun[]>([]);
  const [savedExperiments, setSavedExperiments] = useState<SavedExperiment[]>([]);
  const [activeExperimentId, setActiveExperimentId] = useState<string>();
  const [activeExperimentName, setActiveExperimentName] = useState('');
  const [isCalculating, setIsCalculating] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [dataManagerOpen, setDataManagerOpen] = useState(false);
  const [traceModelId, setTraceModelId] = useState<string>();
  const [storageMessage, setStorageMessage] = useState('');

  const experiment = useMemo<ExperimentDefinition>(() => ({
    id: activeExperimentId ?? 'interactive-target-visibility',
    title: activeExperimentName || 'Etkileşimli hedef görünürlüğü deneyi',
    type: 'target-visibility',
    observer: { latitudeDeg: 0, longitudeDeg: 0, elevationM: 0, eyeHeightM: inputs.observerHeightM },
    target: { label: 'Hedef', latitudeDeg: 0, longitudeDeg: 0, elevationM: 0, heightM: inputs.targetHeightM },
    observedAtIso: new Date().toISOString(),
    measurements: {
      surfaceDistanceM: { value: inputs.surfaceDistanceKm * 1_000, uncertainty: 20, unit: 'm' },
      visibleFraction: { value: inputs.observedVisiblePercent / 100, uncertainty: inputs.observationUncertaintyPercent / 100, unit: 'fraction' }
    }
  }), [activeExperimentId, activeExperimentName, inputs]);

  const context = useMemo(() => ({
    atmosphereMode: inputs.useStandardRefraction ? 'standard' as const : 'off' as const,
    refractionCoefficient: inputs.refractionCoefficient
  }), [inputs.refractionCoefficient, inputs.useStandardRefraction]);

  useEffect(() => {
    void window.simulatorDesktop.listExperiments()
      .then(setSavedExperiments)
      .catch((error: unknown) => {
        setStorageMessage(error instanceof Error ? error.message : 'Kayıtlar okunamadı.');
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsCalculating(true);
    void runSimulationModels(simulationModels, experiment, context).then((nextRuns) => {
      if (!cancelled) {
        setRuns(nextRuns);
        setIsCalculating(false);
      }
    });
    return () => { cancelled = true; };
  }, [context, experiment]);

  const updateInputs = (updater: (current: SimulatorInputs) => SimulatorInputs): void => {
    setInputs(updater);
    setIsDirty(true);
  };

  const handleNumberChange = (key: NumericInputKey, value: number): void => {
    if (!Number.isFinite(value)) return;
    updateInputs((current) => ({ ...current, [key]: clampInputValue(key, value) }));
  };

  const loadExperiment = (saved: SavedExperiment): void => {
    setInputs(saved.inputs);
    setActiveExperimentId(saved.id);
    setActiveExperimentName(saved.name);
    setIsDirty(false);
    setStorageMessage(`“${saved.name}” açıldı.`);
  };

  const saveExperiment = async (name: string): Promise<void> => {
    const now = new Date().toISOString();
    const existing = savedExperiments.find((item) => item.id === activeExperimentId);
    const record: SavedExperiment = {
      id: activeExperimentId ?? crypto.randomUUID(),
      name,
      createdAtIso: existing?.createdAtIso ?? now,
      updatedAtIso: now,
      inputs,
      modelVersions: Object.fromEntries(simulationModels.map((model) => [model.metadata.id, model.metadata.version])),
      predictions: runs.map((run) => run.prediction)
    };

    try {
      const saved = await window.simulatorDesktop.saveExperiment(record);
      setSavedExperiments((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setActiveExperimentId(saved.id);
      setActiveExperimentName(saved.name);
      setIsDirty(false);
      setSaveDialogOpen(false);
      setStorageMessage(`“${saved.name}” cihazda kaydedildi.`);
    } catch (error) {
      setStorageMessage(error instanceof Error ? error.message : 'Deney kaydedilemedi.');
    }
  };

  const deleteExperiment = async (saved: SavedExperiment): Promise<void> => {
    try {
      const deleted = await window.simulatorDesktop.deleteExperiment(saved.id);
      if (!deleted) return;
      setSavedExperiments((current) => current.filter((item) => item.id !== saved.id));
      if (activeExperimentId === saved.id) {
        setActiveExperimentId(undefined);
        setActiveExperimentName('');
        setIsDirty(true);
      }
      setStorageMessage(`“${saved.name}” silindi.`);
    } catch (error) {
      setStorageMessage(error instanceof Error ? error.message : 'Deney silinemedi.');
    }
  };

  const exportExperiment = async (saved: SavedExperiment): Promise<void> => {
    try {
      const result = await window.simulatorDesktop.exportExperiment(saved.id);
      setStorageMessage(result.message);
    } catch (error) {
      setStorageMessage(error instanceof Error ? error.message : 'Deney dışa aktarılamadı.');
    }
  };

  const importExperiment = async (): Promise<void> => {
    try {
      const result = await window.simulatorDesktop.importExperiment();
      setStorageMessage(result.message);
      if (result.status !== 'success' || !result.experiment) return;

      setSavedExperiments((current) => [
        result.experiment as SavedExperiment,
        ...current.filter((item) => item.id !== result.experiment?.id)
      ]);
    } catch (error) {
      setStorageMessage(error instanceof Error ? error.message : 'Deney içe aktarılamadı.');
    }
  };

  const exportReport = async (saved: SavedExperiment): Promise<void> => {
    try {
      const result = await window.simulatorDesktop.exportExperimentReport(saved.id);
      setStorageMessage(result.message);
    } catch (error) {
      setStorageMessage(error instanceof Error ? error.message : 'Deney raporu oluşturulamadı.');
    }
  };

  const selectedRun = runs.find((run) => run.metadata.id === traceModelId);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <button className="menu-button" type="button">☰</button>
          <strong>GEOMETRİK GÖZLEM LABORATUVARI</strong>
          <span className={isCalculating ? 'calculation-state busy' : 'calculation-state ready'}>
            {isCalculating ? 'Hesaplanıyor…' : 'Hesaplama hazır'}
          </span>
          {storageMessage && <span className="storage-message" title={storageMessage}>{storageMessage}</span>}
        </div>
        <div className="top-actions">
          <button type="button" onClick={() => setDataManagerOpen(true)}>▤ Veri Yöneticisi</button>
          <button disabled title="Ayarlar modülü sonraki aşamada" type="button">⚙ Ayarlar</button>
          <button disabled title="Yardım içeriği sonraki aşamada" type="button">ⓘ Yardım</button>
        </div>
      </header>

      <div className="workspace">
        <Sidebar experiments={savedExperiments} onLoadExperiment={loadExperiment} />
        <main className="main-content">
          <div className="top-grid">
            <ScenarioSummary
              activeName={activeExperimentName}
              inputs={inputs}
              isDirty={isDirty}
              onNumberChange={handleNumberChange}
              onRefractionChange={(enabled) => updateInputs((current) => ({ ...current, useStandardRefraction: enabled }))}
              onReset={() => {
                setInputs(DEFAULT_SIMULATOR_INPUTS);
                setActiveExperimentId(undefined);
                setActiveExperimentName('');
                setIsDirty(false);
                setStorageMessage('Yeni deney hazırlandı.');
              }}
              onSave={() => setSaveDialogOpen(true)}
            />
            <ObservationPanel inputs={inputs} />
          </div>

          <div className="model-grid">
            {simulationModels.map((model) => (
              <ModelCard
                key={model.metadata.id}
                metadata={model.metadata}
                run={runs.find((candidate) => candidate.metadata.id === model.metadata.id)}
                inputs={inputs}
                onShowTrace={() => setTraceModelId(model.metadata.id)}
              />
            ))}
          </div>

          <div className="bottom-grid">
            <ResultsTable runs={runs} onShowTrace={setTraceModelId} />
            <section className="notes panel">
              <span className="eyebrow">Hesaplama kapsamı</span>
              <ul>
                <li>İdeal küre, ortalama Dünya yarıçapını kullanır.</li>
                <li>Standart kırılma seçeneği etkin yarıçap yaklaşımıdır.</li>
                <li>Düzlem modeli engelsiz yüzey ve doğrusal ışık varsayar.</li>
                <li>Azimutal gösterim yalnızca kartografik referanstır.</li>
              </ul>
              <p>Arazi, dalga yüksekliği, kamera kalibrasyonu ve katmanlı atmosfer profili henüz hesaba dahil değildir.</p>
            </section>
          </div>
        </main>
      </div>

      <SaveExperimentDialog
        initialName={activeExperimentName || defaultExperimentName()}
        open={saveDialogOpen}
        onCancel={() => setSaveDialogOpen(false)}
        onSave={saveExperiment}
      />
      <DataManagerDialog
        experiments={savedExperiments}
        open={dataManagerOpen}
        onClose={() => setDataManagerOpen(false)}
        onDelete={deleteExperiment}
        onExport={exportExperiment}
        onImport={importExperiment}
        onLoad={loadExperiment}
        onReport={exportReport}
      />
      <TraceDialog
        metadata={selectedRun?.metadata}
        prediction={selectedRun?.prediction}
        onClose={() => setTraceModelId(undefined)}
      />
    </div>
  );
}
