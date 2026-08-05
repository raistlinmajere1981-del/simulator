import { useEffect, useMemo, useState } from 'react';
import { simulationModels } from '../../models';
import type {
  ExperimentDefinition,
  ModelMetadata,
  ModelPrediction,
  ResultStatus
} from '../../shared/domain';
import {
  runSimulationModels,
  type ModelRun
} from '../../simulation/runner';

type ModelTone = 'green' | 'amber' | 'violet';
type ModelShape = 'globe' | 'disk' | 'gleason';

interface ModelPresentation {
  tone: ModelTone;
  shape: ModelShape;
}

interface SimulatorInputs {
  observerHeightM: number;
  targetHeightM: number;
  surfaceDistanceKm: number;
  observedVisiblePercent: number;
  observationUncertaintyPercent: number;
  useStandardRefraction: boolean;
  refractionCoefficient: number;
}

const scenarios = [
  'Ufuk Analizi',
  'Gemi Kaybolma Testi',
  'Uzun Mesafe Görüş',
  'Güneş ve Ay Gözlemleri',
  'Yıldız Gözlemleri',
  'Tutulma Simülasyonları'
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
  unsupported: 'Bu deney için model tanımsız'
};

const numberFormatter = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 2
});

function getPresentation(modelId: string): ModelPresentation {
  return (
    presentationByModelId[modelId] ?? { tone: 'violet', shape: 'gleason' }
  );
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
  if (distanceM === null) {
    return infinite ? '∞' : '—';
  }

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

function Sidebar(): React.JSX.Element {
  const [active, setActive] = useState('Gemi Kaybolma Testi');

  return (
    <aside className="sidebar">
      <section className="side-section">
        <div className="section-heading"><span>Test senaryoları</span><button>+</button></div>
        <nav className="scenario-list">
          {scenarios.map((scenario, index) => (
            <button
              className={active === scenario ? 'active' : ''}
              key={scenario}
              onClick={() => setActive(scenario)}
            >
              <span className="nav-icon">{['◫', '▰', '⌁', '☀', '✦', '◐'][index]}</span>
              {scenario}
            </button>
          ))}
        </nav>
      </section>

      <section className="side-section compact">
        <div className="section-heading"><span>Kaydedilen senaryolar</span></div>
        <div className="saved-row">Deniz seviyesi örneği <span>●</span></div>
        <div className="saved-row">Kule görünürlüğü <span>○</span></div>
        <div className="saved-row">Ufuk çizgisi <span>○</span></div>
      </section>

      <section className="side-section compact">
        <div className="section-heading"><span>Modeller</span><button>+</button></div>
        {simulationModels.map((model) => {
          const presentation = getPresentation(model.metadata.id);
          return (
            <div className="model-toggle" key={model.metadata.id}>
              <span className={`model-dot ${presentation.tone}`} />
              <span>{model.metadata.name}</span>
              <span className="enabled-dot" />
            </div>
          );
        })}
        <div className="model-toggle"><span className="model-dot coral" /><span>Toroidal Model</span><span /></div>
        <div className="model-toggle"><span className="model-dot blue" /><span>İçbükey Dünya</span><span /></div>
      </section>

      <section className="side-section compact grow">
        <div className="section-heading"><span>Görünüm / katmanlar</span></div>
        {['Kıta / Ülke Sınırları', 'Topografya', 'Gece Işıkları', 'Atmosfer', 'Izgara'].map((item, index) => (
          <label className="switch-row" key={item}>
            <span>{item}</span>
            <input type="checkbox" defaultChecked={index !== 2} />
            <span className="switch" />
          </label>
        ))}
      </section>

      <section className="time-card">
        <div className="section-heading"><span>Zaman ve tarih</span></div>
        <div className="time-values"><span>Örnek deney</span><span>15:30</span></div>
        <input type="range" defaultValue="42" />
        <div className="time-actions"><button>▶</button><button className="primary">▶</button><span>● HAZIR</span></div>
      </section>
    </aside>
  );
}

function ScenarioSummary({
  inputs,
  onNumberChange,
  onRefractionChange
}: {
  inputs: SimulatorInputs;
  onNumberChange: (
    key: Exclude<keyof SimulatorInputs, 'useStandardRefraction'>,
    value: number
  ) => void;
  onRefractionChange: (enabled: boolean) => void;
}): React.JSX.Element {
  return (
    <section className="scenario-summary panel">
      <div className="panel-title-row">
        <div><span className="eyebrow">Aktif senaryo</span><h2>Hedef Görünürlüğü Deneyi</h2></div>
        <span className="calculation-badge">CANLI HESAPLAMA</span>
      </div>

      <div className="input-grid">
        <label className="input-field">
          <span>Gözlemci yüksekliği</span>
          <div><input type="number" min="0" step="0.1" value={inputs.observerHeightM} onChange={(event) => onNumberChange('observerHeightM', event.currentTarget.valueAsNumber)} /><b>m</b></div>
        </label>
        <label className="input-field">
          <span>Hedef yüksekliği</span>
          <div><input type="number" min="0.1" step="0.1" value={inputs.targetHeightM} onChange={(event) => onNumberChange('targetHeightM', event.currentTarget.valueAsNumber)} /><b>m</b></div>
        </label>
        <label className="input-field">
          <span>Yüzey mesafesi</span>
          <div><input type="number" min="0" step="0.01" value={inputs.surfaceDistanceKm} onChange={(event) => onNumberChange('surfaceDistanceKm', event.currentTarget.valueAsNumber)} /><b>km</b></div>
        </label>
        <label className="input-field">
          <span>Gözlenen görünürlük</span>
          <div><input type="number" min="0" max="100" step="1" value={inputs.observedVisiblePercent} onChange={(event) => onNumberChange('observedVisiblePercent', event.currentTarget.valueAsNumber)} /><b>%</b></div>
        </label>
        <label className="input-field">
          <span>Gözlem belirsizliği</span>
          <div><input type="number" min="0" max="100" step="1" value={inputs.observationUncertaintyPercent} onChange={(event) => onNumberChange('observationUncertaintyPercent', event.currentTarget.valueAsNumber)} /><b>±%</b></div>
        </label>
        <label className="input-field">
          <span>Kırılma katsayısı</span>
          <div><input type="number" min="-1" max="0.99" step="0.01" disabled={!inputs.useStandardRefraction} value={inputs.refractionCoefficient} onChange={(event) => onNumberChange('refractionCoefficient', event.currentTarget.valueAsNumber)} /><b>k</b></div>
        </label>
      </div>

      <label className="refraction-control">
        <input type="checkbox" checked={inputs.useStandardRefraction} onChange={(event) => onRefractionChange(event.currentTarget.checked)} />
        <span>Standart atmosferik kırılmayı etkin yarıçap yaklaşımıyla uygula</span>
      </label>
    </section>
  );
}

function ObservationPanel({ inputs }: { inputs: SimulatorInputs }): React.JSX.Element {
  return (
    <section className="observation panel">
      <span className="eyebrow">Gerçek gözlem / referans</span>
      <div className="observation-image">
        <div className="reticle">＋</div>
        <div className="ship"><span /><i /><b /></div>
        <div className="scale">5°<br />2,5°<br />0°<br />−2,5°</div>
      </div>
      <div className="observation-meta">
        <span>Gözlenen: %{numberFormatter.format(inputs.observedVisiblePercent)}</span>
        <span>Belirsizlik: ±%{numberFormatter.format(inputs.observationUncertaintyPercent)}</span>
        <button>Görsel yükle</button>
      </div>
      <p className="engine-note">Görsel şu anda açıklayıcıdır; karşılaştırma, soldaki sayısal gözlem girdisine göre yapılır.</p>
    </section>
  );
}

function ModelCard({
  metadata,
  run,
  inputs
}: {
  metadata: ModelMetadata;
  run: ModelRun | undefined;
  inputs: SimulatorInputs;
}): React.JSX.Element {
  const presentation = getPresentation(metadata.id);
  const prediction = run?.prediction;
  const status = prediction?.status ?? 'indeterminate';
  const visibleFraction = getMetric(prediction, 'visibleFraction');
  const hiddenFraction = getMetric(prediction, 'hiddenFraction');
  const horizonDistanceM = getMetric(prediction, 'horizonSurfaceDistanceM');
  const targetAngleDeg = getMetric(prediction, 'targetTopElevationDeg');
  const warning = prediction?.warnings[0];

  return (
    <article className={`model-card ${presentation.tone}`}>
      <header>
        <h3>{metadata.name}</h3>
        <span className={`status-pill status-${status}`}>{statusLabels[status]}</span>
      </header>
      <div className={`world-visual ${presentation.shape}`}>
        <span className="observer-pin">●</span>
        <span className="target-pin">●</span>
        <span className="route" />
      </div>
      <div className="profile-view">
        <div className="profile-label left">Gözlemci<br /><b>{numberFormatter.format(inputs.observerHeightM)} m</b></div>
        <div className="profile-label right">Hedef<br /><b>{numberFormatter.format(inputs.targetHeightM)} m</b></div>
        <span className="line-of-sight" />
        <span className={`surface ${presentation.shape}`} />
      </div>
      <div className="metric-grid">
        <div><small>Beklenen görünürlük</small><strong>{formatPercent(visibleFraction)}</strong></div>
        <div><small>Gizlenen kısım</small><strong>{formatPercent(hiddenFraction)}</strong></div>
        <div><small>Ufuk mesafesi</small><strong>{formatDistance(horizonDistanceM, metadata.id === 'defined-plane')}</strong></div>
        <div><small>Hedef tepe açısı</small><strong>{formatAngle(targetAngleDeg)}</strong></div>
      </div>
      <div className="model-warning">{warning ?? metadata.assumptions[0]}</div>
    </article>
  );
}

function ResultsTable({ runs }: { runs: ModelRun[] }): React.JSX.Element {
  return (
    <section className="results panel">
      <span className="eyebrow">Sonuç karşılaştırma</span>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Model</th><th>Beklenen görünürlük</th><th>Gizlenen</th><th>Görüş açısı</th><th>Ufuk</th><th>Gözlem farkı</th></tr></thead>
          <tbody>
            {simulationModels.map((model) => {
              const run = runs.find((candidate) => candidate.metadata.id === model.metadata.id);
              const prediction = run?.prediction;
              const presentation = getPresentation(model.metadata.id);
              const status = prediction?.status ?? 'indeterminate';
              return (
                <tr key={model.metadata.id}>
                  <td><span className={`model-dot ${presentation.tone}`} />{model.metadata.name}<small>{statusLabels[status]}</small></td>
                  <td>{formatPercent(getMetric(prediction, 'visibleFraction'))}</td>
                  <td>{formatPercent(getMetric(prediction, 'hiddenFraction'))}</td>
                  <td>{formatAngle(getMetric(prediction, 'targetTopElevationDeg'))}</td>
                  <td>{formatDistance(getMetric(prediction, 'horizonSurfaceDistanceM'), model.metadata.id === 'defined-plane')}</td>
                  <td>{formatDifference(getMetric(prediction, 'observationDifferencePp'))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function App(): React.JSX.Element {
  const [inputs, setInputs] = useState<SimulatorInputs>({
    observerHeightM: 10,
    targetHeightM: 15,
    surfaceDistanceKm: 22.38,
    observedVisiblePercent: 52,
    observationUncertaintyPercent: 8,
    useStandardRefraction: true,
    refractionCoefficient: 0.13
  });
  const [runs, setRuns] = useState<ModelRun[]>([]);
  const [isCalculating, setIsCalculating] = useState(true);

  const experiment = useMemo<ExperimentDefinition>(() => ({
    id: 'interactive-target-visibility',
    title: 'Etkileşimli hedef görünürlüğü deneyi',
    type: 'target-visibility',
    observer: {
      latitudeDeg: 0,
      longitudeDeg: 0,
      elevationM: 0,
      eyeHeightM: Math.max(0, inputs.observerHeightM)
    },
    target: {
      label: 'Hedef',
      latitudeDeg: 0,
      longitudeDeg: 0,
      elevationM: 0,
      heightM: Math.max(0.1, inputs.targetHeightM)
    },
    observedAtIso: '2026-08-05T12:30:00.000Z',
    measurements: {
      surfaceDistanceM: {
        value: Math.max(0, inputs.surfaceDistanceKm) * 1_000,
        uncertainty: 20,
        unit: 'm'
      },
      visibleFraction: {
        value: Math.min(1, Math.max(0, inputs.observedVisiblePercent / 100)),
        uncertainty: Math.min(1, Math.max(0, inputs.observationUncertaintyPercent / 100)),
        unit: 'fraction'
      }
    }
  }), [inputs]);

  const context = useMemo(() => ({
    atmosphereMode: inputs.useStandardRefraction ? 'standard' as const : 'off' as const,
    refractionCoefficient: inputs.refractionCoefficient
  }), [inputs.refractionCoefficient, inputs.useStandardRefraction]);

  useEffect(() => {
    let cancelled = false;
    setIsCalculating(true);

    void runSimulationModels(simulationModels, experiment, context).then((nextRuns) => {
      if (!cancelled) {
        setRuns(nextRuns);
        setIsCalculating(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [context, experiment]);

  const handleNumberChange = (
    key: Exclude<keyof SimulatorInputs, 'useStandardRefraction'>,
    value: number
  ): void => {
    if (!Number.isFinite(value)) {
      return;
    }

    setInputs((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><button className="menu-button">☰</button><strong>GEOMETRİK GÖZLEM LABORATUVARI</strong><span>{isCalculating ? 'Hesaplanıyor…' : 'Hesaplama hazır'}</span></div>
        <div className="top-actions"><button>▤ Veri Yöneticisi</button><button>⚙ Ayarlar</button><button>ⓘ Yardım</button></div>
      </header>
      <div className="workspace">
        <Sidebar />
        <main className="main-content">
          <div className="top-grid">
            <ScenarioSummary
              inputs={inputs}
              onNumberChange={handleNumberChange}
              onRefractionChange={(enabled) => setInputs((current) => ({ ...current, useStandardRefraction: enabled }))}
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
              />
            ))}
          </div>
          <div className="bottom-grid">
            <ResultsTable runs={runs} />
            <section className="notes panel">
              <span className="eyebrow">Hesaplama kapsamı</span>
              <ul>
                <li>İdeal küre, ortalama Dünya yarıçapını kullanır.</li>
                <li>Standart kırılma seçeneği etkin yarıçap yaklaşımıdır.</li>
                <li>Düzlem modeli engelsiz yüzey ve doğrusal ışık varsayar.</li>
                <li>Azimutal gösterim fiziksel model olmadığı için sonuç üretmez.</li>
              </ul>
              <p>Sonuçlar ilk sayısal motorun çıktısıdır; arazi, dalga ve gelişmiş atmosfer profili henüz dahil değildir.</p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
