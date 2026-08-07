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
    "import type { AtmosphereExperimentState } from './atmosphere';\nimport type { CalculationTrace, ModelPrediction } from './domain';\n",
    'simulator atmosphere import'
)
text = replace_once(
    text,
    "  /** Scenario identity; older records default to target visibility. */\n  scenarioId?: SimulationScenarioId;\n  inputs: SimulatorInputs;\n",
    "  /** Scenario identity; older records default to target visibility. */\n  scenarioId?: SimulationScenarioId;\n  /** Persisted advanced-atmosphere editor state; older records derive mode from the legacy standard-refraction flag. */\n  atmosphere?: AtmosphereExperimentState;\n  inputs: SimulatorInputs;\n",
    'saved atmosphere field'
)
path.write_text(text)

# shared/portable.ts
path = Path('src/shared/portable.ts')
text = path.read_text()
text = replace_once(
    text,
    "import { normalizeSimulationScenarioId } from './scenario';\n",
    "import { normalizeSimulationScenarioId } from './scenario';\nimport { parseAtmosphereExperimentState } from '../simulation/atmosphere-persistence';\n",
    'portable atmosphere import'
)
text = replace_once(
    text,
    """  let terrainProfileSource: TerrainProfileSource | undefined;
  if (value.terrainProfileSource !== undefined) {
    const parsedSource = parseTerrainProfileSource(value.terrainProfileSource);
    if (!parsedSource) return null;
    terrainProfileSource = parsedSource;
  }

  return {""",
    """  let terrainProfileSource: TerrainProfileSource | undefined;
  if (value.terrainProfileSource !== undefined) {
    const parsedSource = parseTerrainProfileSource(value.terrainProfileSource);
    if (!parsedSource) return null;
    terrainProfileSource = parsedSource;
  }

  const atmosphere = value.atmosphere === undefined
    ? undefined
    : parseAtmosphereExperimentState(value.atmosphere);
  if (value.atmosphere !== undefined && !atmosphere) return null;

  return {""",
    'portable atmosphere parse'
)
text = replace_once(
    text,
    """    ...(value.scenarioId === undefined
      ? {}
      : { scenarioId: normalizeSimulationScenarioId(value.scenarioId) }),
    inputs,""",
    """    ...(value.scenarioId === undefined
      ? {}
      : { scenarioId: normalizeSimulationScenarioId(value.scenarioId) }),
    ...(atmosphere === undefined ? {} : { atmosphere }),
    inputs,""",
    'portable atmosphere return'
)
path.write_text(text)

# AppNext.tsx
path = Path('src/renderer/src/AppNext.tsx')
text = path.read_text()
text = replace_once(
    text,
    "import { simulationModels } from '../../models';\n",
    "import { simulationModels } from '../../models';\nimport {\n  createDefaultAtmosphereExperimentState,\n  type AtmosphereExperimentState,\n  type AtmosphereMode\n} from '../../shared/atmosphere';\n",
    'AppNext atmosphere import'
)
text = replace_once(
    text,
    """import {
  runSimulationModels,
  type ModelRun
} from '../../simulation/runner';
""",
    """import {
  runSimulationModels,
  type ModelRun
} from '../../simulation/runner';
import {
  atmosphereStateFromLegacyStandardFlag,
  cloneAtmosphereExperimentState
} from '../../simulation/atmosphere-persistence';
""",
    'AppNext atmosphere persistence import'
)
text = replace_once(
    text,
    "import { GeoidConversionControl } from './GeoidConversionControl';\n",
    "import { GeoidConversionControl } from './GeoidConversionControl';\nimport { AtmosphereProfileControl } from './AtmosphereProfileControl';\n",
    'AppNext atmosphere component import'
)
text = replace_once(
    text,
    """  activeName,
  inputs,
  effectiveDistanceKm,""",
    """  activeName,
  inputs,
  atmosphereMode,
  effectiveDistanceKm,""",
    'ScenarioSummary arg atmosphere'
)
text = replace_once(
    text,
    """  onDatumChange,
  onNumberChange,
  onRefractionChange,
  onReset,""",
    """  onDatumChange,
  onNumberChange,
  onReset,""",
    'ScenarioSummary remove refraction arg'
)
text = replace_once(
    text,
    """  activeName: string;
  inputs: SimulatorInputs;
  effectiveDistanceKm: number;""",
    """  activeName: string;
  inputs: SimulatorInputs;
  atmosphereMode: AtmosphereMode;
  effectiveDistanceKm: number;""",
    'ScenarioSummary atmosphere type'
)
text = replace_once(
    text,
    """  onDatumChange(kind: VerticalDatumKind): void;
  onNumberChange(key: NumericInputKey, value: number): void;
  onRefractionChange(enabled: boolean): void;
  onReset(): void;""",
    """  onDatumChange(kind: VerticalDatumKind): void;
  onNumberChange(key: NumericInputKey, value: number): void;
  onReset(): void;""",
    'ScenarioSummary remove refraction type'
)
text = replace_once(
    text,
    """        <NumericField inputKey=\"refractionCoefficient\" label=\"Kırılma katsayısı\" unit=\"k\" step={0.01} inputs={inputs} disabled={!inputs.useStandardRefraction} onNumberChange={onNumberChange} />""",
    """        <NumericField inputKey=\"refractionCoefficient\" label=\"Kırılma katsayısı\" unit=\"k\" step={0.01} inputs={inputs} disabled={atmosphereMode !== 'standard'} onNumberChange={onNumberChange} />""",
    'ScenarioSummary k disabled state'
)
text = replace_once(
    text,
    """      <label className=\"refraction-control\">
        <input
          checked={inputs.useStandardRefraction}
          type=\"checkbox\"
          onChange={(event) => onRefractionChange(event.currentTarget.checked)}
        />
        <span>Standart atmosferik kırılmayı etkin yarıçap yaklaşımıyla uygula</span>
      </label>""",
    """      <div className=\"refraction-control\">
        <span>Atmosfer modu: {atmosphereMode === 'off' ? 'Kapalı' : atmosphereMode === 'standard' ? 'Standart k' : 'Katmanlı profil'} · ayrıntılar aşağıdaki Atmosfer panelinden yönetilir.</span>
      </div>""",
    'ScenarioSummary atmosphere mode note'
)
text = replace_once(
    text,
    "function HorizonReferencePanel({ inputs }: { inputs: SimulatorInputs }): React.JSX.Element {",
    "function HorizonReferencePanel({ inputs, atmosphereMode }: { inputs: SimulatorInputs; atmosphereMode: AtmosphereMode }): React.JSX.Element {",
    'HorizonReferencePanel props'
)
text = replace_once(
    text,
    """        <div><small>Atmosfer</small><strong>{inputs.useStandardRefraction ? `Standart k=${numberFormatter.format(inputs.refractionCoefficient)}` : 'Kapalı'}</strong></div>""",
    """        <div><small>Atmosfer</small><strong>{atmosphereMode === 'standard' ? `Standart k=${numberFormatter.format(inputs.refractionCoefficient)}` : atmosphereMode === 'profile' ? 'Katmanlı profil' : 'Kapalı'}</strong></div>""",
    'HorizonReferencePanel atmosphere label'
)
text = replace_once(
    text,
    """export function AppNext(): React.JSX.Element {
  const [inputs, setInputs] = useState<SimulatorInputs>(DEFAULT_SIMULATOR_INPUTS);
  const [activeScenarioId,""",
    """export function AppNext(): React.JSX.Element {
  const [inputs, setInputs] = useState<SimulatorInputs>(DEFAULT_SIMULATOR_INPUTS);
  const [atmosphereState, setAtmosphereState] = useState<AtmosphereExperimentState>(() =>
    createDefaultAtmosphereExperimentState(DEFAULT_SIMULATOR_INPUTS.useStandardRefraction ? 'standard' : 'off')
  );
  const [activeScenarioId,""",
    'AppNext atmosphere state'
)
text = replace_once(
    text,
    """  const context = useMemo(() => ({
    atmosphereMode: inputs.useStandardRefraction ? 'standard' as const : 'off' as const,
    refractionCoefficient: inputs.refractionCoefficient
  }), [inputs.refractionCoefficient, inputs.useStandardRefraction]);""",
    """  const context = useMemo(() => ({
    atmosphereMode: atmosphereState.mode,
    refractionCoefficient: inputs.refractionCoefficient,
    ...(atmosphereState.mode === 'profile' ? {
      atmosphereProfile: atmosphereState.profile,
      opticalAtmosphereSettings: atmosphereState.opticalSettings,
      rayTraceStepM: atmosphereState.rayTraceStepM
    } : {})
  }), [atmosphereState, inputs.refractionCoefficient]);""",
    'AppNext atmosphere context'
)
text = replace_once(
    text,
    """    setActiveScenarioId(normalizeSimulationScenarioId(saved.scenarioId));
    setInputs(saved.inputs);""",
    """    setActiveScenarioId(normalizeSimulationScenarioId(saved.scenarioId));
    setInputs(saved.inputs);
    setAtmosphereState(saved.atmosphere
      ? cloneAtmosphereExperimentState(saved.atmosphere)
      : atmosphereStateFromLegacyStandardFlag(saved.inputs.useStandardRefraction));""",
    'load atmosphere state'
)
text = replace_once(
    text,
    """      scenarioId: activeScenarioId,
      inputs,""",
    """      scenarioId: activeScenarioId,
      atmosphere: cloneAtmosphereExperimentState(atmosphereState),
      inputs,""",
    'save atmosphere state'
)
text = replace_once(
    text,
    """      setActiveExperimentName(saved.name);
      setExperimentObservedAtIso(saved.createdAtIso);
      setManualTerrainPoints""",
    """      setActiveExperimentName(saved.name);
      setExperimentObservedAtIso(saved.createdAtIso);
      setAtmosphereState(saved.atmosphere
        ? cloneAtmosphereExperimentState(saved.atmosphere)
        : atmosphereStateFromLegacyStandardFlag(saved.inputs.useStandardRefraction));
      setManualTerrainPoints""",
    'saved response atmosphere state'
)
text = replace_once(
    text,
    """        setExperimentObservedAtIso(new Date().toISOString());
        setGeoidConversionRecord(undefined);""",
    """        setExperimentObservedAtIso(new Date().toISOString());
        setAtmosphereState(createDefaultAtmosphereExperimentState('standard'));
        setGeoidConversionRecord(undefined);""",
    'delete active atmosphere reset'
)
text = replace_once(
    text,
    """              inputs={inputs}
              effectiveDistanceKm={effectiveDistanceKm}""",
    """              inputs={inputs}
              atmosphereMode={atmosphereState.mode}
              effectiveDistanceKm={effectiveDistanceKm}""",
    'render ScenarioSummary atmosphere prop'
)
text = replace_once(
    text,
    """              onNumberChange={handleNumberChange}
              onRefractionChange={(enabled) => updateInputs((current) => ({ ...current, useStandardRefraction: enabled }))}
              onReset={() => {
                setInputs(DEFAULT_SIMULATOR_INPUTS);""",
    """              onNumberChange={handleNumberChange}
              onReset={() => {
                setInputs(DEFAULT_SIMULATOR_INPUTS);
                setAtmosphereState(createDefaultAtmosphereExperimentState('standard'));""",
    'render ScenarioSummary reset atmosphere'
)
text = replace_once(
    text,
    """            {activeScenarioId === 'horizon'
              ? <HorizonReferencePanel inputs={inputs} />
              : <ObservationPanel inputs={inputs} />}
          </div>

          {activeScenarioId !== 'horizon' && <TerrainPanel""",
    """            {activeScenarioId === 'horizon'
              ? <HorizonReferencePanel inputs={inputs} atmosphereMode={atmosphereState.mode} />
              : <ObservationPanel inputs={inputs} />}
          </div>

          <AtmosphereProfileControl
            state={atmosphereState}
            standardRefractionCoefficient={inputs.refractionCoefficient}
            onChange={(nextState) => {
              setAtmosphereState(nextState);
              setInputs((current) => ({
                ...current,
                useStandardRefraction: nextState.mode === 'standard'
              }));
              setIsDirty(true);
            }}
          />

          {activeScenarioId !== 'horizon' && <TerrainPanel""",
    'render atmosphere panel'
)
text = text.replace(
    '<li>Standart kırılma yalnızca kürede etkin yarıçap yaklaşımıdır.</li>',
    '<li>Standart kırılma kürede etkin yarıçap yaklaşımıdır; katmanlı atmosfer modu meteorolojik profil ve Ciddor optik tanılarını ayrı state olarak taşır.</li>',
    1
)
text = text.replace(
    '<p>Kamera kalibrasyonu, katmanlı atmosfer ışın izleme ve dalga yüzeyinin rota boyunca dinamik geometrisi henüz hesaba dahil değildir.</p>',
    '<p>Katmanlı atmosfer profilinin optik ışın izleme çekirdeği hazırdır; görünürlük/ufuk model sonucuna bağlantısı Aşama 4.4 kapsamındadır. Kamera kalibrasyonu ve dalga yüzeyinin rota boyunca dinamik geometrisi henüz hesaba dahil değildir.</p>',
    1
)
path.write_text(text)

# package.json
path = Path('package.json')
text = path.read_text()
text = text.replace('"version": "1.2.2"', '"version": "1.3.0"', 1)
path.write_text(text)

# README.md lightweight status/docs cleanup
path = Path('README.md')
text = path.read_text()
text = text.replace('`1.2.1` ile gelişmiş atmosferin veri katmanı hazırdır:', '`1.3.0` ile gelişmiş atmosferin veri ve arayüz katmanı hazırdır:', 1)
if '- atmosfer modunu `Kapalı / Standart k / Katmanlı profil` olarak deney bazında seçme,' not in text:
    marker = '- profil kapsamı dışında otomatik ekstrapolasyon yapmama.\n'
    text = text.replace(marker, marker + '- atmosfer modunu `Kapalı / Standart k / Katmanlı profil` olarak deney bazında seçme,\n- profil ve optik ayarlarını yerel/taşınabilir deney kaydında koruma,\n- katman örneklerini masaüstü arayüzünden düzenleme ve optik `N`, `dN/dh`, yerel `k` tanılarını görüntüleme.\n', 1)
text = text.replace('- Gelişmiş atmosfer profilini görünür ışık kırılma indisine ve katmanlı ışın izine bağlama\n', '- Katmanlı atmosfer ışın izini İdeal Küre görünürlük/ufuk sonuçlarına bağlama\n', 1)
text = text.replace('- [`docs/roadmap-stage-4.1.md`](docs/roadmap-stage-4.1.md)\n', '- [`docs/roadmap-stage-4.1.md`](docs/roadmap-stage-4.1.md)\n- [`docs/roadmap-stage-4.2.md`](docs/roadmap-stage-4.2.md)\n', 1)
text = text.replace('Aktif geliştirme sürümü `1.2.1`dir.', 'Aktif geliştirme sürümü `1.3.0`dir.', 1)
path.write_text(text)

# docs/roadmap.md mark 4.2 and 4.3
path = Path('docs/roadmap.md')
text = path.read_text()
old = """## Aşama 4.2 — Optik kırılma ve katmanlı ışın izi

- görünür ışık için dalga boyuna bağlı kırılma indisi
- meteorolojik profilden `dn/dh`
- katmanlı ışın izi
- standart `k` yaklaşımıyla ayrı sonuç yolu

## Aşama 4.3 — Atmosfer arayüzü ve deney entegrasyonu

- sıcaklık / basınç / nem profil editörü
- dalga boyu ve optik ayarlar
- deney kayıtlarında atmosfer provenansı
- standart ve gelişmiş sonuçların karşılaştırılması
"""
new = """## Aşama 4.2 — Optik kırılma ve katmanlı ışın izi

Durum: tamamlandı · `1.2.2`

- Ciddor görünür/yakın KIZÖ faz kırılma indisi
- meteorolojik profilden `n`, `N`, `dn/dh`, `dN/dh` ve yerel `k` tanıları
- küresel/radyal katmanlı atmosferde RK4 ışın izleme
- profil kapsamı dışında otomatik ekstrapolasyon yapmama

Ayrıntı: [`roadmap-stage-4.2.md`](roadmap-stage-4.2.md)

## Aşama 4.3 — Atmosfer arayüzü ve deney entegrasyonu

Durum: tamamlandı · `1.3.0`

- atmosfer modu: kapalı / standart `k` / katmanlı profil
- sıcaklık / basınç / nem katman editörü
- dalga boyu, CO₂ ve ışın adımı ayarları
- Ciddor optik N ve katman `dN/dh` / yerel `k` tanıları
- atmosfer state'inin yerel ve taşınabilir deney kayıtlarında korunması
- eski kayıtların legacy standart-k bayrağından güvenli açılması
- profil modunun standart `k` hesabına sessizce düşmemesi

Ayrıntı: [`roadmap-stage-4.3.md`](roadmap-stage-4.3.md)
"""
text = replace_once(text, old, new, 'roadmap 4.2/4.3')
path.write_text(text)
