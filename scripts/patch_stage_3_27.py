from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        if new in text:
            return text
        raise SystemExit(f'{label}: anchor not found')
    return text.replace(old, new, 1)


# shared/simulator.ts
path = Path('src/shared/simulator.ts')
text = path.read_text()
text = replace_once(
    text,
    "import type { CalculationTrace, ModelPrediction } from './domain';\n",
    "import type { CalculationTrace, ModelPrediction } from './domain';\nimport type { SimulationScenarioId } from './scenario';\n",
    'simulator scenario import'
)
text = replace_once(
    text,
    "  updatedAtIso: string;\n  inputs: SimulatorInputs;",
    "  updatedAtIso: string;\n  /** Scenario identity; older records default to target visibility. */\n  scenarioId?: SimulationScenarioId;\n  inputs: SimulatorInputs;",
    'saved experiment scenario field'
)
path.write_text(text)


# shared/portable.ts
path = Path('src/shared/portable.ts')
text = path.read_text()
text = replace_once(
    text,
    "import type { ManualTerrainPoint, VerticalDatumKind } from './terrain';\n",
    "import type { ManualTerrainPoint, VerticalDatumKind } from './terrain';\nimport { normalizeSimulationScenarioId } from './scenario';\n",
    'portable scenario import'
)
text = replace_once(
    text,
    "    updatedAtIso: value.updatedAtIso,\n    inputs,",
    "    updatedAtIso: value.updatedAtIso,\n    scenarioId: normalizeSimulationScenarioId(value.scenarioId),\n    inputs,",
    'portable scenario normalization'
)
path.write_text(text)


# Ideal sphere horizon support
path = Path('src/models/ideal-sphere.ts')
text = path.read_text()
text = text.replace("version: '0.3.0'", "version: '0.4.0'", 1)
old_validation = """    if (experiment.type !== 'target-visibility') {
      errors.push('Bu sürüm yalnızca hedef görünürlüğü deneyini destekler.');
    }
    if (!experiment.target) errors.push('Hedef bilgisi zorunludur.');
    if (!distance || distance.value < 0) {
      errors.push('Metre biriminde geçerli surfaceDistanceM ölçümü zorunludur.');
    }
    if (experiment.terrainProfile) {
      errors.push(...validateTerrainProfile(experiment.terrainProfile));
      if (distance && Math.abs(experiment.terrainProfile.totalDistanceM - distance.value) > 1e-6) {
        errors.push('Arazi profili ile deney yüzey mesafesi aynı olmalıdır.');
      }
    }
"""
new_validation = """    if (experiment.type !== 'target-visibility' && experiment.type !== 'horizon') {
      errors.push('Bu sürüm hedef görünürlüğü ve ufuk deneylerini destekler.');
    }
    if (experiment.type === 'target-visibility') {
      if (!experiment.target) errors.push('Hedef bilgisi zorunludur.');
      if (!distance || distance.value < 0) {
        errors.push('Metre biriminde geçerli surfaceDistanceM ölçümü zorunludur.');
      }
      if (experiment.terrainProfile) {
        errors.push(...validateTerrainProfile(experiment.terrainProfile));
        if (distance && Math.abs(experiment.terrainProfile.totalDistanceM - distance.value) > 1e-6) {
          errors.push('Arazi profili ile deney yüzey mesafesi aynı olmalıdır.');
        }
      }
    }
"""
text = replace_once(text, old_validation, new_validation, 'sphere validation')
text = replace_once(
    text,
    "    if (validationErrors.length > 0 || !experiment.target) {",
    "    if (validationErrors.length > 0) {",
    'sphere unsupported guard'
)
old_setup = """    const distanceMeasurement = getMeasurement(experiment, 'surfaceDistanceM', 'm');
    if (!distanceMeasurement) throw new Error('Yüzey mesafesi bulunamadı.');

    const warnings: string[] = [];
    const baseRadiusM = MEAN_EARTH_RADIUS_M;
    let radiusM = baseRadiusM;
    const coefficient = context.refractionCoefficient ?? 0.13;

    if (context.atmosphereMode === 'standard') {
      radiusM = effectiveRadiusM(radiusM, coefficient);
      warnings.push(
        `Standart kırılma etkin yarıçap yaklaşımıyla uygulandı (k=${coefficient.toFixed(3)}).`
      );
    }

    const observerHeightM = experiment.observer.elevationM + experiment.observer.eyeHeightM;
    const targetBaseHeightM = experiment.target.elevationM;
"""
new_setup = """    const warnings: string[] = [];
    const baseRadiusM = MEAN_EARTH_RADIUS_M;
    let radiusM = baseRadiusM;
    const coefficient = context.refractionCoefficient ?? 0.13;

    if (context.atmosphereMode === 'standard') {
      radiusM = effectiveRadiusM(radiusM, coefficient);
      warnings.push(
        `Standart kırılma etkin yarıçap yaklaşımıyla uygulandı (k=${coefficient.toFixed(3)}).`
      );
    }

    const observerHeightM = experiment.observer.elevationM + experiment.observer.eyeHeightM;

    if (experiment.type === 'horizon') {
      const horizonSurfaceDistanceM = surfaceHorizonDistanceM(observerHeightM, radiusM);
      return {
        modelId: this.metadata.id,
        experimentId: experiment.id,
        status: 'compatible',
        metrics: [
          metric('horizonSurfaceDistanceM', 'Geometrik ufuk mesafesi', horizonSurfaceDistanceM, 'm'),
          metric('observerTotalElevationM', 'Gözlemci toplam kotu', observerHeightM, 'm'),
          metric('effectiveRadiusM', 'Kullanılan etkin yarıçap', radiusM, 'm')
        ],
        warnings,
        traceId: `${this.metadata.id}:${experiment.id}:horizon`,
        trace: {
          summary: 'Küresel yüzeyde gözlemcinin toplam kotundan geometrik ufuk yüzey mesafesi hesaplandı.',
          assumptions: this.metadata.assumptions,
          steps: [
            {
              id: 'effective-radius',
              title: 'Kullanılan yarıçap',
              formula: context.atmosphereMode === 'standard' ? 'Rₑ = R / (1 - k)' : 'Rₑ = R',
              substitution: context.atmosphereMode === 'standard'
                ? `${format(baseRadiusM)} / (1 - ${format(coefficient)})`
                : `${format(baseRadiusM)}`,
              result: `${format(radiusM)} m`
            },
            {
              id: 'horizon-distance',
              title: 'Geometrik ufuk mesafesi',
              formula: 'sₕ = Rₑ · acos(Rₑ / (Rₑ + hₒ))',
              substitution: `hₒ=${format(observerHeightM)} m, Rₑ=${format(radiusM)} m`,
              result: `${format(horizonSurfaceDistanceM)} m`
            }
          ]
        }
      };
    }

    if (!experiment.target) throw new Error('Hedef bilgisi bulunamadı.');
    const distanceMeasurement = getMeasurement(experiment, 'surfaceDistanceM', 'm');
    if (!distanceMeasurement) throw new Error('Yüzey mesafesi bulunamadı.');
    const targetBaseHeightM = experiment.target.elevationM;
"""
text = replace_once(text, old_setup, new_setup, 'sphere horizon branch')
path.write_text(text)


# Defined plane horizon support
path = Path('src/models/defined-plane.ts')
text = path.read_text()
text = text.replace("version: '0.3.0'", "version: '0.4.0'", 1)
old_validation = """    if (experiment.type !== 'target-visibility') {
      errors.push('Bu sürüm yalnızca hedef görünürlüğü deneyini destekler.');
    }
    if (!experiment.target) errors.push('Hedef bilgisi zorunludur.');
    if (!distance || distance.value < 0) {
      errors.push('Metre biriminde geçerli surfaceDistanceM ölçümü zorunludur.');
    }
    if (experiment.terrainProfile) {
      errors.push(...validateTerrainProfile(experiment.terrainProfile));
      if (distance && Math.abs(experiment.terrainProfile.totalDistanceM - distance.value) > 1e-6) {
        errors.push('Arazi profili ile deney yüzey mesafesi aynı olmalıdır.');
      }
    }
"""
new_validation = """    if (experiment.type !== 'target-visibility' && experiment.type !== 'horizon') {
      errors.push('Bu sürüm hedef görünürlüğü ve ufuk deneylerini destekler.');
    }
    if (experiment.type === 'target-visibility') {
      if (!experiment.target) errors.push('Hedef bilgisi zorunludur.');
      if (!distance || distance.value < 0) {
        errors.push('Metre biriminde geçerli surfaceDistanceM ölçümü zorunludur.');
      }
      if (experiment.terrainProfile) {
        errors.push(...validateTerrainProfile(experiment.terrainProfile));
        if (distance && Math.abs(experiment.terrainProfile.totalDistanceM - distance.value) > 1e-6) {
          errors.push('Arazi profili ile deney yüzey mesafesi aynı olmalıdır.');
        }
      }
    }
"""
text = replace_once(text, old_validation, new_validation, 'plane validation')
text = replace_once(
    text,
    "    if (validationErrors.length > 0 || !experiment.target) {",
    "    if (validationErrors.length > 0) {",
    'plane unsupported guard'
)
old_setup = """    const distanceMeasurement = getMeasurement(experiment, 'surfaceDistanceM', 'm');
    if (!distanceMeasurement) throw new Error('Yüzey mesafesi bulunamadı.');

    const warnings: string[] = [];
    if (context.atmosphereMode !== 'off') {
      warnings.push(
        'Bu düzlem tanımı atmosferik kırılma kuralı içermediği için kırılma uygulanmadı.'
      );
    }

    const observerHeightM = experiment.observer.elevationM + experiment.observer.eyeHeightM;
    const targetBaseHeightM = experiment.target.elevationM;
"""
new_setup = """    const warnings: string[] = [];
    if (context.atmosphereMode !== 'off') {
      warnings.push(
        'Bu düzlem tanımı atmosferik kırılma kuralı içermediği için kırılma uygulanmadı.'
      );
    }

    const observerHeightM = experiment.observer.elevationM + experiment.observer.eyeHeightM;

    if (experiment.type === 'horizon') {
      return {
        modelId: this.metadata.id,
        experimentId: experiment.id,
        status: 'compatible',
        metrics: [
          metric('horizonSurfaceDistanceM', 'Geometrik ufuk mesafesi', null, 'm'),
          metric('observerTotalElevationM', 'Gözlemci toplam kotu', observerHeightM, 'm')
        ],
        warnings,
        traceId: `${this.metadata.id}:${experiment.id}:horizon`,
        trace: {
          summary: 'Tanımlı sonsuz düzlemde yüzey eğriliğinden kaynaklanan sonlu geometrik ufuk yoktur.',
          assumptions: this.metadata.assumptions,
          steps: [
            {
              id: 'horizon',
              title: 'Geometrik ufuk',
              formula: 'sₕ = ∞',
              substitution: 'Yüzey sonsuz düzlem ve ışık doğrusal tanımlıdır.',
              result: '∞',
              note: 'Yerel arazi veya fiziksel engeller bu geometrik tanımdan ayrı değerlendirilir.'
            }
          ]
        }
      };
    }

    if (!experiment.target) throw new Error('Hedef bilgisi bulunamadı.');
    const distanceMeasurement = getMeasurement(experiment, 'surfaceDistanceM', 'm');
    if (!distanceMeasurement) throw new Error('Yüzey mesafesi bulunamadı.');
    const targetBaseHeightM = experiment.target.elevationM;
"""
text = replace_once(text, old_setup, new_setup, 'plane horizon branch')
path.write_text(text)


# Azimuthal reference wording
path = Path('src/models/azimuthal-projection.ts')
text = path.read_text()
text = text.replace("version: '0.2.0'", "version: '0.2.1'", 1)
text = replace_once(
    text,
    """  validateExperiment(_experiment: ExperimentDefinition): string[] {
    return [
      'Azimutal projeksiyon tek başına hedef görünürlüğü tahmini üretemez.'
    ];
  }""",
    """  validateExperiment(experiment: ExperimentDefinition): string[] {
    return [
      experiment.type === 'horizon'
        ? 'Azimutal projeksiyon tek başına fiziksel ufuk mesafesi üretemez.'
        : 'Azimutal projeksiyon tek başına hedef görünürlüğü tahmini üretemez.'
    ];
  }""",
    'azimuthal validation wording'
)
text = text.replace(
    "Projeksiyon konumları harita düzlemine dönüştürür; hedef görünürlüğü için gerekli fiziksel kuralları tanımlamaz.",
    "Projeksiyon konumları harita düzlemine dönüştürür; görünürlük veya fiziksel ufuk için gerekli yüzey ve ışık kurallarını tanımlamaz.",
    1
)
path.write_text(text)


# AppNext scenario workflow
path = Path('src/renderer/src/AppNext.tsx')
text = path.read_text()
text = replace_once(
    text,
    "import type {\n  ManualTerrainPoint,\n  TerrainProfile,\n  VerticalDatumKind\n} from '../../shared/terrain';\n",
    "import type {\n  ManualTerrainPoint,\n  TerrainProfile,\n  VerticalDatumKind\n} from '../../shared/terrain';\nimport {\n  VISIBILITY_SCENARIOS,\n  getSimulationScenario,\n  normalizeSimulationScenarioId,\n  type SimulationScenarioId\n} from '../../shared/scenario';\n",
    'AppNext scenario import'
)
text = replace_once(
    text,
    """interface ScenarioDefinition {
  label: string;
  icon: string;
  enabled: boolean;
}""",
    """interface ScenarioDefinition {
  id?: SimulationScenarioId;
  label: string;
  icon: string;
  enabled: boolean;
}""",
    'scenario definition interface'
)
old_scenarios = """const scenarios: ScenarioDefinition[] = [
  { label: 'Hedef Görünürlüğü', icon: '▰', enabled: true },
  { label: 'Ufuk Analizi', icon: '◫', enabled: false },
  { label: 'Uzun Mesafe Görüş', icon: '⌁', enabled: false },
  { label: 'Güneş ve Ay Gözlemleri', icon: '☀', enabled: false },
  { label: 'Yıldız Gözlemleri', icon: '✦', enabled: false },
  { label: 'Tutulma Simülasyonları', icon: '◐', enabled: false }
];"""
new_scenarios = """const scenarios: ScenarioDefinition[] = [
  ...VISIBILITY_SCENARIOS.map((scenario) => ({
    id: scenario.id,
    label: scenario.label,
    icon: scenario.icon,
    enabled: true
  })),
  { label: 'Güneş ve Ay Gözlemleri', icon: '☀', enabled: false },
  { label: 'Yıldız Gözlemleri', icon: '✦', enabled: false },
  { label: 'Tutulma Simülasyonları', icon: '◐', enabled: false }
];"""
text = replace_once(text, old_scenarios, new_scenarios, 'scenario list')
old_default_name = """function defaultExperimentName(): string {
  return `Hedef Görünürlüğü ${new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date())}`;
}"""
new_default_name = """function defaultExperimentName(scenarioId: SimulationScenarioId): string {
  return `${getSimulationScenario(scenarioId).label} ${new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date())}`;
}"""
text = replace_once(text, old_default_name, new_default_name, 'default experiment name')

old_sidebar_sig = """function Sidebar({
  experiments,
  visualLayers,
  onLoadExperiment,
  onVisualLayerChange
}: {
  experiments: SavedExperiment[];
  visualLayers: VisualLayerState;
  onLoadExperiment(experiment: SavedExperiment): void;
  onVisualLayerChange(key: keyof VisualLayerState, enabled: boolean): void;
}): React.JSX.Element {"""
new_sidebar_sig = """function Sidebar({
  experiments,
  activeScenarioId,
  visualLayers,
  onScenarioChange,
  onLoadExperiment,
  onVisualLayerChange
}: {
  experiments: SavedExperiment[];
  activeScenarioId: SimulationScenarioId;
  visualLayers: VisualLayerState;
  onScenarioChange(scenarioId: SimulationScenarioId): void;
  onLoadExperiment(experiment: SavedExperiment): void;
  onVisualLayerChange(key: keyof VisualLayerState, enabled: boolean): void;
}): React.JSX.Element {"""
text = replace_once(text, old_sidebar_sig, new_sidebar_sig, 'Sidebar props')
text = text.replace('<span className="section-state">1 / 6 hazır</span>', '<span className="section-state">3 / 6 hazır</span>', 1)
old_nav = """          {scenarios.map((scenario) => (
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
          ))}"""
new_nav = """          {scenarios.map((scenario) => {
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
          })}"""
text = replace_once(text, old_nav, new_nav, 'Sidebar scenario nav')

old_summary_sig = """function ScenarioSummary({
  activeName,
  inputs,
  effectiveDistanceKm,
  geodesic,
  isDirty,
  onDistanceSourceChange,
  onNumberChange,
  onRefractionChange,
  onReset,
  onSave,
  onShowGeodesicTrace
}: {
  activeName: string;
  inputs: SimulatorInputs;
  effectiveDistanceKm: number;
  geodesic: GeodesicResult | undefined;
  isDirty: boolean;
  onDistanceSourceChange(source: DistanceSource): void;
  onNumberChange(key: NumericInputKey, value: number): void;
  onRefractionChange(enabled: boolean): void;
  onReset(): void;
  onSave(): void;
  onShowGeodesicTrace(): void;
}): React.JSX.Element {
  return ("""
new_summary_sig = """function ScenarioSummary({
  scenarioId,
  activeName,
  inputs,
  effectiveDistanceKm,
  geodesic,
  isDirty,
  onDistanceSourceChange,
  onDatumChange,
  onNumberChange,
  onRefractionChange,
  onReset,
  onSave,
  onShowGeodesicTrace
}: {
  scenarioId: SimulationScenarioId;
  activeName: string;
  inputs: SimulatorInputs;
  effectiveDistanceKm: number;
  geodesic: GeodesicResult | undefined;
  isDirty: boolean;
  onDistanceSourceChange(source: DistanceSource): void;
  onDatumChange(kind: VerticalDatumKind): void;
  onNumberChange(key: NumericInputKey, value: number): void;
  onRefractionChange(enabled: boolean): void;
  onReset(): void;
  onSave(): void;
  onShowGeodesicTrace(): void;
}): React.JSX.Element {
  const scenario = getSimulationScenario(scenarioId);
  const isHorizon = scenarioId === 'horizon';
  return ("""
text = replace_once(text, old_summary_sig, new_summary_sig, 'ScenarioSummary signature')
text = text.replace("<h2>{activeName || 'Hedef Görünürlüğü'}</h2>", "<h2>{activeName || scenario.label}</h2>", 1)
old_input_grid = """      <div className="input-grid base-input-grid">
        <NumericField inputKey="observerHeightM" label="Göz yüksekliği" unit="m" step={0.1} inputs={inputs} onNumberChange={onNumberChange} />
        <NumericField inputKey="targetHeightM" label="Hedef yüksekliği" unit="m" step={0.1} inputs={inputs} onNumberChange={onNumberChange} />
        <NumericField inputKey="observedVisiblePercent" label="Gözlenen görünürlük" unit="%" step={1} inputs={inputs} onNumberChange={onNumberChange} />
        <NumericField inputKey="observationUncertaintyPercent" label="Gözlem belirsizliği" unit="±%" step={1} inputs={inputs} onNumberChange={onNumberChange} />
        <NumericField inputKey="refractionCoefficient" label="Kırılma katsayısı" unit="k" step={0.01} inputs={inputs} disabled={!inputs.useStandardRefraction} onNumberChange={onNumberChange} />
      </div>

      <div className="distance-source-panel">"""
new_input_grid = """      <div className={`input-grid base-input-grid ${isHorizon ? 'horizon-input-grid' : ''}`}>
        <NumericField inputKey="observerHeightM" label="Göz yüksekliği" unit="m" step={0.1} inputs={inputs} onNumberChange={onNumberChange} />
        {isHorizon ? (
          <>
            <NumericField inputKey="observerGroundElevationM" label="Gözlemci zemin kotu" unit="m" step={0.1} inputs={inputs} onNumberChange={onNumberChange} />
            <NumericField inputKey="verticalDatumOffsetM" label="Datum / yerel ofset" unit="m" step={0.1} inputs={inputs} onNumberChange={onNumberChange} />
            <label className="input-field horizon-datum-field">
              <span>Düşey datum</span>
              <select value={inputs.verticalDatumKind} onChange={(event) => onDatumChange(event.currentTarget.value as VerticalDatumKind)}>
                <option value="orthometric-msl">Ortalama deniz seviyesi</option>
                <option value="ellipsoidal-wgs84">WGS84 elipsoidal</option>
                <option value="local">Yerel düşey datum</option>
              </select>
            </label>
          </>
        ) : (
          <>
            <NumericField inputKey="targetHeightM" label="Hedef yüksekliği" unit="m" step={0.1} inputs={inputs} onNumberChange={onNumberChange} />
            <NumericField inputKey="observedVisiblePercent" label="Gözlenen görünürlük" unit="%" step={1} inputs={inputs} onNumberChange={onNumberChange} />
            <NumericField inputKey="observationUncertaintyPercent" label="Gözlem belirsizliği" unit="±%" step={1} inputs={inputs} onNumberChange={onNumberChange} />
          </>
        )}
        <NumericField inputKey="refractionCoefficient" label="Kırılma katsayısı" unit="k" step={0.01} inputs={inputs} disabled={!inputs.useStandardRefraction} onNumberChange={onNumberChange} />
      </div>

      {!isHorizon && <div className="distance-source-panel">"""
text = replace_once(text, old_input_grid, new_input_grid, 'scenario input grid')
# close conditional around distance panel: first matching panel close immediately before refraction control
old_distance_close = """      </div>

      <label className="refraction-control">"""
new_distance_close = """      </div>}

      {isHorizon && (
        <p className="scenario-scope-note">
          Ufuk Analizi hedef, rota ve arazi profilini kullanmaz. Sonuç yalnız gözlemci toplam kotu,
          seçilen yüzey geometrisi ve desteklenen atmosfer varsayımından üretilir.
        </p>
      )}

      <label className="refraction-control">"""
text = replace_once(text, old_distance_close, new_distance_close, 'distance panel conditional close')

observation_end = """function isImportedDemTerrainProfile(
  profile: TerrainProfileImport
): profile is ImportedDemTerrainProfile {"""
horizon_panel = """function HorizonReferencePanel({ inputs }: { inputs: SimulatorInputs }): React.JSX.Element {
  const observerTotalElevationM = inputs.observerGroundElevationM +
    inputs.verticalDatumOffsetM + inputs.observerHeightM;
  return (
    <section className="observation panel horizon-reference-panel">
      <div className="observation-heading">
        <span className="eyebrow">Ufuk deney özeti</span>
        <span className="reference-mode">GEOMETRİK HESAP</span>
      </div>
      <div className="horizon-reference-visual">
        <span className="horizon-reference-observer" />
        <span className="horizon-reference-tangent" />
        <span className="horizon-reference-arc" />
      </div>
      <div className="horizon-reference-metrics">
        <div><small>Toplam gözlemci kotu</small><strong>{formatMetres(observerTotalElevationM)}</strong></div>
        <div><small>Düşey datum</small><strong>{datumLabels[inputs.verticalDatumKind]}</strong></div>
        <div><small>Atmosfer</small><strong>{inputs.useStandardRefraction ? `Standart k=${numberFormatter.format(inputs.refractionCoefficient)}` : 'Kapalı'}</strong></div>
      </div>
      <p className="engine-note">Bu senaryoda hedef görünürlük yüzdesi ölçümü yapılmaz; modellerin geometrik ufuk tanımları karşılaştırılır.</p>
    </section>
  );
}

""" + observation_end
text = replace_once(text, observation_end, horizon_panel, 'Horizon reference panel')

old_model_sig = """function ModelCard({
  metadata,
  run,
  inputs,
  terrainProfile,
  terrainSourceLabel,
  visualLayers,
  onShowTrace
}: {
  metadata: ModelMetadata;
  run: ModelRun | undefined;
  inputs: SimulatorInputs;
  terrainProfile: TerrainProfile | undefined;
  terrainSourceLabel: string;
  visualLayers: VisualLayerState;
  onShowTrace(): void;
}): React.JSX.Element {"""
new_model_sig = """function ModelCard({
  scenarioId,
  metadata,
  run,
  inputs,
  terrainProfile,
  terrainSourceLabel,
  visualLayers,
  onShowTrace
}: {
  scenarioId: SimulationScenarioId;
  metadata: ModelMetadata;
  run: ModelRun | undefined;
  inputs: SimulatorInputs;
  terrainProfile: TerrainProfile | undefined;
  terrainSourceLabel: string;
  visualLayers: VisualLayerState;
  onShowTrace(): void;
}): React.JSX.Element {"""
text = replace_once(text, old_model_sig, new_model_sig, 'ModelCard signature')
text = replace_once(
    text,
    """  const terrainClearanceM = getMetric(prediction, 'terrainMinimumClearanceM');
  const warning = prediction?.warnings[0];
  const isProjection = metadata.id === 'azimuthal-projection';""",
    """  const terrainClearanceM = getMetric(prediction, 'terrainMinimumClearanceM');
  const observerTotalElevationM = getMetric(prediction, 'observerTotalElevationM');
  const effectiveRadiusM = getMetric(prediction, 'effectiveRadiusM');
  const warning = prediction?.warnings[0];
  const isProjection = metadata.id === 'azimuthal-projection';
  const isHorizon = scenarioId === 'horizon';
  const statusLabel = isHorizon && status !== 'unsupported' ? 'Hesaplandı' : statusLabels[status];""",
    'ModelCard horizon metrics'
)
text = text.replace("{statusLabels[status]}</span>", "{statusLabel}</span>", 1)
text = replace_once(
    text,
    """  showGeographicBoundaries={visualLayers.geographicBoundaries}
  showTerrain={visualLayers.terrain}
  showGrid={visualLayers.grid}
  terrainProfile={terrainProfile}
  terrainSourceLabel={terrainSourceLabel}""",
    """  showGeographicBoundaries={visualLayers.geographicBoundaries}
  showTarget={!isHorizon}
  showTerrain={!isHorizon && visualLayers.terrain}
  showGrid={visualLayers.grid}
  terrainProfile={isHorizon ? undefined : terrainProfile}
  terrainSourceLabel={terrainSourceLabel}""",
    'viewport scenario props'
)
old_profile_branch = """      {isProjection ? (
        <div className="projection-explanation">
          <strong>Hesaplama yapılmadı</strong>
          <p>Yüzey geometrisi, yerel dikey yön ve ışık ilerleme kuralları tanımlanmadan sayısal sonuç üretilemez.</p>
        </div>
      ) : (
        <div className="profile-view">
          <div className="profile-label left">Gözlemci<br /><b>{numberFormatter.format(inputs.observerGroundElevationM + inputs.observerHeightM)} m</b></div>
          <div className="profile-label right">Hedef tepesi<br /><b>{numberFormatter.format(inputs.targetGroundElevationM + inputs.targetHeightM)} m</b></div>
          <span className="line-of-sight" /><span className={`surface ${presentation.shape}`} />
          {inputs.terrainMode !== 'off' && <span className="terrain-obstacle" title="Manuel arazi profili" />}
        </div>
      )}
      <div className={`metric-grid ${isProjection ? 'unsupported-metrics' : ''}`}>
        <div><small>Beklenen görünürlük</small><strong>{formatPercent(visibleFraction)}</strong></div>
        <div><small>Gizlenen kısım</small><strong>{formatPercent(hiddenFraction)}</strong></div>
        <div><small>Ufuk mesafesi</small><strong>{formatDistance(horizonDistanceM, metadata.id === 'defined-plane')}</strong></div>
        <div><small>{terrainClearanceM === null ? 'Hedef tepe açısı' : 'Arazi açıklığı'}</small><strong>{terrainClearanceM === null ? formatAngle(targetAngleDeg) : formatMetres(terrainClearanceM)}</strong></div>
      </div>"""
new_profile_branch = """      {isProjection ? (
        <div className="projection-explanation">
          <strong>Hesaplama yapılmadı</strong>
          <p>Yüzey geometrisi, yerel dikey yön ve ışık ilerleme kuralları tanımlanmadan sayısal sonuç üretilemez.</p>
        </div>
      ) : isHorizon ? (
        <div className="horizon-analysis-view">
          <span className="horizon-analysis-observer" />
          <span className={`horizon-analysis-surface ${presentation.shape}`} />
          <span className="horizon-analysis-tangent" />
          <p>Hedef ve rota kullanılmadan geometrik ufuk tanımı değerlendirilir.</p>
        </div>
      ) : (
        <div className="profile-view">
          <div className="profile-label left">Gözlemci<br /><b>{numberFormatter.format(inputs.observerGroundElevationM + inputs.observerHeightM)} m</b></div>
          <div className="profile-label right">Hedef tepesi<br /><b>{numberFormatter.format(inputs.targetGroundElevationM + inputs.targetHeightM)} m</b></div>
          <span className="line-of-sight" /><span className={`surface ${presentation.shape}`} />
          {inputs.terrainMode !== 'off' && <span className="terrain-obstacle" title="Manuel arazi profili" />}
        </div>
      )}
      <div className={`metric-grid ${isProjection ? 'unsupported-metrics' : ''} ${isHorizon ? 'horizon-metrics' : ''}`}>
        {isHorizon ? (
          <>
            <div><small>Geometrik ufuk</small><strong>{formatDistance(horizonDistanceM, metadata.id === 'defined-plane')}</strong></div>
            <div><small>Gözlemci toplam kotu</small><strong>{formatMetres(observerTotalElevationM)}</strong></div>
            <div><small>Etkin yarıçap</small><strong>{effectiveRadiusM === null ? (metadata.id === 'defined-plane' ? 'Düzlem' : '—') : formatDistance(effectiveRadiusM)}</strong></div>
            <div><small>Senaryo</small><strong>{statusLabel}</strong></div>
          </>
        ) : (
          <>
            <div><small>Beklenen görünürlük</small><strong>{formatPercent(visibleFraction)}</strong></div>
            <div><small>Gizlenen kısım</small><strong>{formatPercent(hiddenFraction)}</strong></div>
            <div><small>Ufuk mesafesi</small><strong>{formatDistance(horizonDistanceM, metadata.id === 'defined-plane')}</strong></div>
            <div><small>{terrainClearanceM === null ? 'Hedef tepe açısı' : 'Arazi açıklığı'}</small><strong>{terrainClearanceM === null ? formatAngle(targetAngleDeg) : formatMetres(terrainClearanceM)}</strong></div>
          </>
        )}
      </div>"""
text = replace_once(text, old_profile_branch, new_profile_branch, 'ModelCard scenario body')

old_results_sig = "function ResultsTable({ runs, onShowTrace }: { runs: ModelRun[]; onShowTrace(modelId: string): void }): React.JSX.Element {\n  return ("
new_results_sig = """function ResultsTable({
  runs,
  scenarioId,
  onShowTrace
}: {
  runs: ModelRun[];
  scenarioId: SimulationScenarioId;
  onShowTrace(modelId: string): void;
}): React.JSX.Element {
  if (scenarioId === 'horizon') {
    return (
      <section className="results panel">
        <span className="eyebrow">Ufuk sonucu karşılaştırma</span>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Model / gösterim</th><th>Geometrik ufuk</th><th>Gözlemci toplam kotu</th><th>Etkin yarıçap</th><th>Durum</th><th>İz</th></tr></thead>
            <tbody>
              {simulationModels.map((model) => {
                const run = runs.find((candidate) => candidate.metadata.id === model.metadata.id);
                const prediction = run?.prediction;
                const presentation = getPresentation(model.metadata.id);
                const status = prediction?.status ?? 'indeterminate';
                const isProjection = model.metadata.id === 'azimuthal-projection';
                return (
                  <tr className={isProjection ? 'projection-row' : ''} key={model.metadata.id}>
                    <td><span className={`model-dot ${presentation.tone}`} />{model.metadata.name}<small>{isProjection ? 'Kartografik referans' : 'Fiziksel model'}</small></td>
                    <td>{formatDistance(getMetric(prediction, 'horizonSurfaceDistanceM'), model.metadata.id === 'defined-plane')}</td>
                    <td>{formatMetres(getMetric(prediction, 'observerTotalElevationM'))}</td>
                    <td>{getMetric(prediction, 'effectiveRadiusM') === null ? (model.metadata.id === 'defined-plane' ? 'Düzlem' : '—') : formatDistance(getMetric(prediction, 'effectiveRadiusM'))}</td>
                    <td>{status === 'unsupported' ? statusLabels[status] : 'Hesaplandı'}</td>
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

  return ("""
text = replace_once(text, old_results_sig, new_results_sig, 'ResultsTable scenario signature')

text = replace_once(
    text,
    """  const [inputs, setInputs] = useState<SimulatorInputs>(DEFAULT_SIMULATOR_INPUTS);
  const [manualTerrainPoints,""",
    """  const [inputs, setInputs] = useState<SimulatorInputs>(DEFAULT_SIMULATOR_INPUTS);
  const [activeScenarioId, setActiveScenarioId] = useState<SimulationScenarioId>('target-visibility');
  const [manualTerrainPoints,""",
    'active scenario state'
)

old_experiment = """  const experiment = useMemo<ExperimentDefinition>(() => ({
    id: activeExperimentId,
    title: activeExperimentName || 'Etkileşimli hedef görünürlüğü deneyi',
    type: 'target-visibility',
    observer: {
      latitudeDeg: inputs.observerLatitudeDeg,
      longitudeDeg: inputs.observerLongitudeDeg,
      elevationM: inputs.observerGroundElevationM + inputs.verticalDatumOffsetM,
      eyeHeightM: inputs.observerHeightM
    },
    target: {
      label: 'Hedef',
      latitudeDeg: inputs.targetLatitudeDeg,
      longitudeDeg: inputs.targetLongitudeDeg,
      elevationM: inputs.targetGroundElevationM + inputs.verticalDatumOffsetM,
      heightM: inputs.targetHeightM
    },
    terrainProfile,
    observedAtIso: experimentObservedAtIso,
    measurements: {
      surfaceDistanceM: { value: effectiveDistanceKm * 1_000, uncertainty: inputs.distanceSource === 'coordinates' ? 0.01 : 20, unit: 'm' },
      visibleFraction: { value: inputs.observedVisiblePercent / 100, uncertainty: inputs.observationUncertaintyPercent / 100, unit: 'fraction' }
    }
  }), [activeExperimentId, activeExperimentName, effectiveDistanceKm, experimentObservedAtIso, inputs, terrainProfile]);"""
new_experiment = """  const experiment = useMemo<ExperimentDefinition>(() => {
    const scenario = getSimulationScenario(activeScenarioId);
    const isHorizon = activeScenarioId === 'horizon';
    return {
      id: activeExperimentId,
      title: activeExperimentName || `Etkileşimli ${scenario.label.toLocaleLowerCase('tr-TR')} deneyi`,
      type: scenario.experimentType,
      observer: {
        latitudeDeg: inputs.observerLatitudeDeg,
        longitudeDeg: inputs.observerLongitudeDeg,
        elevationM: inputs.observerGroundElevationM + inputs.verticalDatumOffsetM,
        eyeHeightM: inputs.observerHeightM
      },
      ...(!isHorizon ? {
        target: {
          label: 'Hedef',
          latitudeDeg: inputs.targetLatitudeDeg,
          longitudeDeg: inputs.targetLongitudeDeg,
          elevationM: inputs.targetGroundElevationM + inputs.verticalDatumOffsetM,
          heightM: inputs.targetHeightM
        },
        terrainProfile,
        measurements: {
          surfaceDistanceM: { value: effectiveDistanceKm * 1_000, uncertainty: inputs.distanceSource === 'coordinates' ? 0.01 : 20, unit: 'm' },
          visibleFraction: { value: inputs.observedVisiblePercent / 100, uncertainty: inputs.observationUncertaintyPercent / 100, unit: 'fraction' }
        }
      } : { measurements: {} }),
      observedAtIso: experimentObservedAtIso
    };
  }, [activeExperimentId, activeExperimentName, activeScenarioId, effectiveDistanceKm, experimentObservedAtIso, inputs, terrainProfile]);"""
text = replace_once(text, old_experiment, new_experiment, 'scenario experiment definition')

# load/save scenario identity
text = replace_once(
    text,
    """    setInputs(saved.inputs);
    setManualTerrainPoints""",
    """    setActiveScenarioId(normalizeSimulationScenarioId(saved.scenarioId));
    setInputs(saved.inputs);
    setManualTerrainPoints""",
    'load scenario identity'
)
text = replace_once(
    text,
    """      updatedAtIso: now,
      inputs,""",
    """      updatedAtIso: now,
      scenarioId: activeScenarioId,
      inputs,""",
    'save scenario identity'
)

# Sidebar call and scenario switch
text = replace_once(
    text,
    """        <Sidebar
          experiments={savedExperiments}
          visualLayers={visualLayers}
          onLoadExperiment={loadExperiment}""",
    """        <Sidebar
          experiments={savedExperiments}
          activeScenarioId={activeScenarioId}
          visualLayers={visualLayers}
          onScenarioChange={(scenarioId) => {
            if (scenarioId === activeScenarioId) return;
            setActiveScenarioId(scenarioId);
            setActiveExperimentId(crypto.randomUUID());
            setActiveExperimentName('');
            setExperimentObservedAtIso(new Date().toISOString());
            setGeoidConversionRecord(undefined);
            setWaterObservationRecord(undefined);
            setWaterApplicationRecord(undefined);
            setIsDirty(false);
            setStorageMessage(`${getSimulationScenario(scenarioId).label} senaryosu hazırlandı.`);
          }}
          onLoadExperiment={loadExperiment}""",
    'Sidebar call'
)

text = replace_once(
    text,
    """            <ScenarioSummary
              activeName={activeExperimentName}""",
    """            <ScenarioSummary
              scenarioId={activeScenarioId}
              activeName={activeExperimentName}""",
    'ScenarioSummary call scenario'
)
text = replace_once(
    text,
    """              onDistanceSourceChange={(distanceSource) => {
                markTerrainSourceModified();
                updateInputs((current) => ({ ...current, distanceSource }));
              }}
              onNumberChange={handleNumberChange}""",
    """              onDistanceSourceChange={(distanceSource) => {
                markTerrainSourceModified();
                updateInputs((current) => ({ ...current, distanceSource }));
              }}
              onDatumChange={(verticalDatumKind) => {
                markGeoidConversionModified();
                markWaterApplicationModified();
                updateInputs((current) => ({ ...current, verticalDatumKind }));
              }}
              onNumberChange={handleNumberChange}""",
    'ScenarioSummary datum callback'
)
text = replace_once(
    text,
    """            />
            <ObservationPanel inputs={inputs} />
          </div>

          <TerrainPanel""",
    """            />
            {activeScenarioId === 'horizon'
              ? <HorizonReferencePanel inputs={inputs} />
              : <ObservationPanel inputs={inputs} />}
          </div>

          {activeScenarioId !== 'horizon' && <TerrainPanel""",
    'horizon top panels'
)
text = replace_once(
    text,
    """            onApplyImport={applyTerrainImport}
          />

          <WaterSurfaceControl""",
    """            onApplyImport={applyTerrainImport}
          />}

          {activeScenarioId !== 'horizon' && <WaterSurfaceControl""",
    'horizon terrain close and water open'
)
text = replace_once(
    text,
    """            onShowTrace={setTraceModelId}
          />

          <div className="model-grid">""",
    """            onShowTrace={setTraceModelId}
          />}

          <div className="model-grid">""",
    'horizon water close'
)
text = replace_once(
    text,
    """              <ModelCard
                key={model.metadata.id}
                metadata={model.metadata}""",
    """              <ModelCard
                key={model.metadata.id}
                scenarioId={activeScenarioId}
                metadata={model.metadata}""",
    'ModelCard call scenario'
)
text = replace_once(
    text,
    "<ResultsTable runs={runs} onShowTrace={setTraceModelId} />",
    "<ResultsTable runs={runs} scenarioId={activeScenarioId} onShowTrace={setTraceModelId} />",
    'ResultsTable call scenario'
)
text = replace_once(
    text,
    "initialName={activeExperimentName || defaultExperimentName()}",
    "initialName={activeExperimentName || defaultExperimentName(activeScenarioId)}",
    'save dialog default scenario name'
)
path.write_text(text)


# WorldModelViewport target-less horizon scene
path = Path('src/renderer/src/WorldModelViewport.tsx')
text = path.read_text()
text = replace_once(
    text,
    """  targetLongitudeDeg: number;
  showGeographicBoundaries: boolean;
  showTerrain: boolean;""",
    """  targetLongitudeDeg: number;
  showGeographicBoundaries: boolean;
  showTarget: boolean;
  showTerrain: boolean;""",
    'viewport showTarget prop interface'
)
text = replace_once(
    text,
    """  targetLongitudeDeg,
  showGeographicBoundaries,
  showTerrain,""",
    """  targetLongitudeDeg,
  showGeographicBoundaries,
  showTarget,
  showTerrain,""",
    'viewport showTarget destructure'
)
old_globe_targets = """        const targetPosition = vector(latitudeLongitudeToSpherePoint(
          targetCoordinate,
          radius * 1.02
        ));
        world.add(
          pin(observerPosition, 0xffa94d),
          pin(targetPosition, 0x58d6ff)
        );

        try {
          const route = buildWgs84VisualizationRoute(
            observerCoordinate,
            targetCoordinate,
            72
          ).map((coordinate) => vector(latitudeLongitudeToSpherePoint(
            coordinate,
            radius * 1.025
          )));
          world.add(line(route, 0xf2dc72, 0.96));
        } catch {
          world.add(line([observerPosition, targetPosition], 0xf2dc72, 0.75));
        }"""
new_globe_targets = """        world.add(pin(observerPosition, 0xffa94d));
        if (showTarget) {
          const targetPosition = vector(latitudeLongitudeToSpherePoint(
            targetCoordinate,
            radius * 1.02
          ));
          world.add(pin(targetPosition, 0x58d6ff));
          try {
            const route = buildWgs84VisualizationRoute(
              observerCoordinate,
              targetCoordinate,
              72
            ).map((coordinate) => vector(latitudeLongitudeToSpherePoint(
              coordinate,
              radius * 1.025
            )));
            world.add(line(route, 0xf2dc72, 0.96));
          } catch {
            world.add(line([observerPosition, targetPosition], 0xf2dc72, 0.75));
          }
        }"""
text = replace_once(text, old_globe_targets, new_globe_targets, 'globe target conditional')
old_plane_targets = """          const observerPosition = new THREE.Vector3(-0.92, 0.025, 0);
          const targetPosition = new THREE.Vector3(0.92, 0.025, 0);
          world.add(
            pin(observerPosition, 0xffa94d),
            pin(targetPosition, 0x58d6ff)
          );
          world.add(line([
            new THREE.Vector3(-0.92, 0.035, 0),
            new THREE.Vector3(0.92, 0.035, 0)
          ], 0xf2dc72, 0.96));"""
new_plane_targets = """          const observerPosition = new THREE.Vector3(showTarget ? -0.92 : 0, 0.025, 0);
          world.add(pin(observerPosition, 0xffa94d));
          if (showTarget) {
            const targetPosition = new THREE.Vector3(0.92, 0.025, 0);
            world.add(pin(targetPosition, 0x58d6ff));
            world.add(line([
              new THREE.Vector3(-0.92, 0.035, 0),
              new THREE.Vector3(0.92, 0.035, 0)
            ], 0xf2dc72, 0.96));
          }"""
text = replace_once(text, old_plane_targets, new_plane_targets, 'plane target conditional')
old_gleason_targets = """          const targetPosition = vector(
            latitudeLongitudeToNorthPolarAzimuthalPoint(
              targetCoordinate,
              radius * 0.94
            )
          );
          observerPosition.y = 0.025;
          targetPosition.y = 0.025;
          world.add(
            pin(observerPosition, 0xffa94d),
            pin(targetPosition, 0x58d6ff)
          );

          try {
            const route = buildWgs84VisualizationRoute(
              observerCoordinate,
              targetCoordinate,
              72
            ).map((coordinate) => {
              const point = vector(
                latitudeLongitudeToNorthPolarAzimuthalPoint(
                  coordinate,
                  radius * 0.94
                )
              );
              point.y = 0.035;
              return point;
            });
            world.add(line(route, 0xf2dc72, 0.96));
          } catch {
            world.add(line([observerPosition, targetPosition], 0xf2dc72, 0.75));
          }"""
new_gleason_targets = """          observerPosition.y = 0.025;
          world.add(pin(observerPosition, 0xffa94d));
          if (showTarget) {
            const targetPosition = vector(
              latitudeLongitudeToNorthPolarAzimuthalPoint(
                targetCoordinate,
                radius * 0.94
              )
            );
            targetPosition.y = 0.025;
            world.add(pin(targetPosition, 0x58d6ff));
            try {
              const route = buildWgs84VisualizationRoute(
                observerCoordinate,
                targetCoordinate,
                72
              ).map((coordinate) => {
                const point = vector(
                  latitudeLongitudeToNorthPolarAzimuthalPoint(
                    coordinate,
                    radius * 0.94
                  )
                );
                point.y = 0.035;
                return point;
              });
              world.add(line(route, 0xf2dc72, 0.96));
            } catch {
              world.add(line([observerPosition, targetPosition], 0xf2dc72, 0.75));
            }
          }"""
text = replace_once(text, old_gleason_targets, new_gleason_targets, 'azimuthal target conditional')
text = replace_once(
    text,
    """    targetLongitudeDeg,
    terrainProfile
  ]);""",
    """    targetLongitudeDeg,
    showTarget,
    terrainProfile
  ]);""",
    'viewport effect showTarget dependency'
)
text = replace_once(
    text,
    """        <span><i className="observer" /> Gözlemci</span>
        <span><i className="target" /> Hedef</span>""",
    """        <span><i className="observer" /> Gözlemci</span>
        {showTarget && <span><i className="target" /> Hedef</span>}""",
    'viewport target legend'
)
path.write_text(text)


# CSS scenario-specific presentation
path = Path('src/renderer/src/styles.css')
text = path.read_text()
text += """

/* Stage 3.27 scenario workflows */
.scenario-list button.available { background: rgba(19, 39, 55, .42); color: #c5d4df; }
.scenario-list button.available:hover { background: #183149; }
.scenario-list button.unavailable { opacity: .48; cursor: default; }
.scenario-list .nav-state { margin-left: auto; font-size: 8px; letter-spacing: .06em; color: #87a0b5; }
.scenario-list button.active .nav-state { color: #a9d0ff; }
.horizon-input-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); }
.horizon-datum-field select { width: 100%; min-height: 32px; border: 1px solid #2a4052; border-radius: 3px; background: #0b1721; color: #dce7ef; padding: 5px 7px; }
.scenario-scope-note { margin: 9px 0 0; padding: 8px 10px; border: 1px solid #31516a; border-radius: 3px; background: rgba(25, 55, 76, .35); color: #b9cad7; font-size: 10px; line-height: 1.45; }
.horizon-reference-panel { display: flex; flex-direction: column; }
.horizon-reference-visual { flex: 1; min-height: 112px; position: relative; overflow: hidden; margin-top: 7px; border: 1px solid #34495c; background: radial-gradient(circle at 50% 115%, #214c68 0 37%, #0a1b2a 38% 100%); }
.horizon-reference-arc { position: absolute; width: 330px; height: 150px; left: 50%; bottom: -104px; transform: translateX(-50%); border: 2px solid #5e9cc5; border-radius: 50% 50% 0 0; }
.horizon-reference-observer { position: absolute; width: 8px; height: 28px; left: 50%; bottom: 39px; transform: translateX(-4px); background: #ffad52; box-shadow: 0 0 8px #ffad52aa; }
.horizon-reference-observer::after { content: ''; position: absolute; width: 10px; height: 10px; left: -1px; top: -7px; border-radius: 50%; background: #ffad52; }
.horizon-reference-tangent { position: absolute; width: 44%; left: 50%; bottom: 64px; border-top: 1px dashed #f0dd72; transform-origin: left center; transform: rotate(-7deg); }
.horizon-reference-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; margin-top: 6px; }
.horizon-reference-metrics > div { padding: 7px; border: 1px solid #293a49; border-radius: 3px; background: #101e2b; }
.horizon-reference-metrics small { display: block; color: #8fa2b4; font-size: 8px; }
.horizon-reference-metrics strong { display: block; margin-top: 5px; font-size: 10px; font-weight: 550; }
.horizon-analysis-view { height: 145px; position: relative; overflow: hidden; border-top: 1px solid #2a3b48; border-bottom: 1px solid #243745; background: linear-gradient(#0b1824, #102234); }
.horizon-analysis-surface { position: absolute; width: 115%; height: 130px; left: -7.5%; top: 86px; background: linear-gradient(#193f66, #08203a); border-top: 1px solid #5d9ed2; }
.horizon-analysis-surface.globe { top: 72px; border-radius: 50% 50% 0 0; }
.horizon-analysis-surface.disk { top: 94px; }
.horizon-analysis-observer { position: absolute; z-index: 3; width: 5px; height: 27px; left: 28%; top: 52px; background: #ffad52; box-shadow: 0 0 7px #ffad52aa; }
.horizon-analysis-observer::after { content: ''; position: absolute; width: 9px; height: 9px; left: -2px; top: -6px; border-radius: 50%; background: #ffad52; }
.horizon-analysis-tangent { position: absolute; z-index: 2; left: 28%; right: 10%; top: 51px; border-top: 1px dashed #f0dd72; transform-origin: left center; transform: rotate(-4deg); }
.horizon-analysis-view p { position: absolute; left: 12px; right: 12px; bottom: 6px; z-index: 4; margin: 0; color: #aebdca; font-size: 9px; }
.metric-grid.horizon-metrics strong { font-size: 14px; }
"""
path.write_text(text)


# package version
path = Path('package.json')
text = path.read_text().replace('"version": "1.1.2"', '"version": "1.2.0"', 1)
path.write_text(text)


# Tests
Path('tests/scenario-workflows.test.ts').write_text("""import { describe, expect, it } from 'vitest';
import { IdealSphereModel } from '../src/models/ideal-sphere';
import { DefinedPlaneModel } from '../src/models/defined-plane';
import { AzimuthalProjectionReference } from '../src/models/azimuthal-projection';
import type { ExperimentDefinition } from '../src/shared/domain';
import { DEFAULT_SIMULATOR_INPUTS, type SavedExperiment } from '../src/shared/simulator';
import { createPortableExperimentFile, parsePortableExperimentFile } from '../src/shared/portable';
import { getSimulationScenario, normalizeSimulationScenarioId } from '../src/shared/scenario';

function horizonExperiment(): ExperimentDefinition {
  return {
    id: 'horizon-test',
    title: 'Ufuk testi',
    type: 'horizon',
    observer: {
      latitudeDeg: 41,
      longitudeDeg: 29,
      elevationM: 90,
      eyeHeightM: 10
    },
    observedAtIso: '2026-08-07T12:00:00Z',
    measurements: {}
  };
}

describe('scenario workflow contracts', () => {
  it('defines three ready visibility scenarios with a real horizon experiment type', () => {
    expect(getSimulationScenario('target-visibility').experimentType).toBe('target-visibility');
    expect(getSimulationScenario('horizon').experimentType).toBe('horizon');
    expect(getSimulationScenario('long-distance-visibility').experimentType).toBe('target-visibility');
    expect(normalizeSimulationScenarioId('unknown')).toBe('target-visibility');
  });

  it('computes a finite spherical horizon and an infinite planar horizon without a target', async () => {
    const experiment = horizonExperiment();
    const sphere = await new IdealSphereModel().predict(experiment, { atmosphereMode: 'off' });
    const plane = await new DefinedPlaneModel().predict(experiment, { atmosphereMode: 'off' });
    const projection = await new AzimuthalProjectionReference().predict(experiment, { atmosphereMode: 'off' });

    const sphereHorizon = sphere.metrics.find((metric) => metric.key === 'horizonSurfaceDistanceM')?.value;
    const planeHorizon = plane.metrics.find((metric) => metric.key === 'horizonSurfaceDistanceM')?.value;

    expect(sphere.status).toBe('compatible');
    expect(sphereHorizon).toBeTypeOf('number');
    expect(sphereHorizon).toBeGreaterThan(30_000);
    expect(sphereHorizon).toBeLessThan(40_000);
    expect(plane.status).toBe('compatible');
    expect(planeHorizon).toBeNull();
    expect(projection.status).toBe('unsupported');
    expect(projection.warnings.join(' ')).toContain('ufuk');
  });

  it('preserves scenario identity through the portable experiment normalizer', () => {
    const saved: SavedExperiment = {
      id: 'saved-horizon',
      name: 'Ufuk kaydı',
      createdAtIso: '2026-08-07T12:00:00Z',
      updatedAtIso: '2026-08-07T12:00:00Z',
      scenarioId: 'horizon',
      inputs: DEFAULT_SIMULATOR_INPUTS,
      modelVersions: {},
      predictions: []
    };
    const portable = createPortableExperimentFile(saved, '1.2.0', '2026-08-07T12:01:00Z');
    expect(parsePortableExperimentFile(portable).experiment.scenarioId).toBe('horizon');

    const legacy = { ...saved } as Record<string, unknown>;
    delete legacy.scenarioId;
    expect(parsePortableExperimentFile(legacy).experiment.scenarioId).toBe('target-visibility');
  });
});
""")
