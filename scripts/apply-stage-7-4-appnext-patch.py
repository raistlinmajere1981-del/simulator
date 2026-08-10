from pathlib import Path
import re

PATH = Path('src/renderer/src/AppNext.tsx')
text = PATH.read_text(encoding='utf-8')

if "ECLIPSE_SCENARIO" in text and "EclipseSimulationPanel" in text:
    print('Stage 7.4 AppNext integration already appears to be applied.')
    raise SystemExit(0)


def replace_once(label: str, old: str, new: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    text = text.replace(old, new, 1)


replace_once(
    'scenario import',
    """  SHADOW_SCENARIO,
  STELLAR_SCENARIO,
  getSimulationScenario,
""",
    """  SHADOW_SCENARIO,
  STELLAR_SCENARIO,
  ECLIPSE_SCENARIO,
  getSimulationScenario,
"""
)

replace_once(
    'eclipse simulation imports',
    """import { calculateLunarPosition } from '../../simulation/lunar-position';
import { createLunarPositionPrediction, lunarPositionMetadata } from '../../simulation/lunar-position-prediction';
import {
  DEFAULT_SHADOW_OBSERVATION_SETTINGS,
""",
    """import { calculateLunarPosition } from '../../simulation/lunar-position';
import { createLunarPositionPrediction, lunarPositionMetadata } from '../../simulation/lunar-position-prediction';
import { calculateSolarEclipseOverlap } from '../../simulation/solar-eclipse-overlap';
import { createSolarEclipseOverlapPrediction, solarEclipseOverlapMetadata } from '../../simulation/solar-eclipse-overlap-prediction';
import {
  createSolarEclipseEventSearchPrediction,
  readSolarEclipseEventSearchSnapshot,
  solarEclipseEventSearchMetadata,
  type SolarEclipseEventSearchSnapshot
} from '../../simulation/solar-eclipse-event-search-prediction';
import {
  DEFAULT_SHADOW_OBSERVATION_SETTINGS,
"""
)

replace_once(
    'eclipse renderer imports',
    """import { LunarPositionPanel } from './LunarPositionPanel';
import { SolarScenarioSummary } from './SolarScenarioSummary';
""",
    """import { LunarPositionPanel } from './LunarPositionPanel';
import { EclipseScenarioSummary } from './EclipseScenarioSummary';
import { EclipseSimulationPanel } from './EclipseSimulationPanel';
import { SolarScenarioSummary } from './SolarScenarioSummary';
"""
)

replace_once(
    'enable eclipse menu',
    """  { ...STELLAR_SCENARIO, enabled: true },
  { label: 'Tutulma Simülasyonları', icon: '◐', enabled: false }
""",
    """  { ...STELLAR_SCENARIO, enabled: true },
  { ...ECLIPSE_SCENARIO, enabled: true }
"""
)

replace_once(
    'astronomy scenario helper',
    "return scenarioId === 'sun-moon-observation' || scenarioId === 'shadow-observation' || scenarioId === 'stellar-observation';",
    "return scenarioId === 'sun-moon-observation' || scenarioId === 'shadow-observation' || scenarioId === 'stellar-observation' || scenarioId === 'eclipse-simulation';"
)

replace_once(
    'sidebar model count',
    """          <span className="section-state">{activeScenarioId === 'sun-moon-observation' ? '3 astronomik referans' : activeScenarioId === 'shadow-observation' || activeScenarioId === 'stellar-observation' ? '1 astronomik referans' : '2 fiziksel'}</span>
""",
    """          <span className="section-state">{activeScenarioId === 'sun-moon-observation' ? '3 astronomik referans' : activeScenarioId === 'eclipse-simulation' ? '2 tutulma referansı' : activeScenarioId === 'shadow-observation' || activeScenarioId === 'stellar-observation' ? '1 astronomik referans' : '2 fiziksel'}</span>
"""
)

replace_once(
    'sidebar eclipse model cards',
    """          </>
        ) : activeScenarioId === 'shadow-observation' ? (
""",
    """          </>
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
"""
)

replace_once(
    'eclipse visual placeholder',
    """            {activeScenarioId === 'shadow-observation'
              ? 'Gölge yön diyagramı ana deney panelinde gösterilir. Dünya modellerine fiziksel Güneş davranışı atanmaz.'
              : activeScenarioId === 'stellar-observation'
                ? 'Katalog yıldızı, J2000→gözlem tarihi dönüşümü, geometrik yıldız izi ve isteğe bağlı yerel skyline ana deney alanında gösterilir.'
                : 'Güneş/Ay konumu ile günlük doğuş-batış zaman çizgisi ana deney alanında gösterilir; ek gökyüzü katmanları sonraki dilimlerde genişletilecektir.'}
""",
    """            {activeScenarioId === 'eclipse-simulation'
              ? 'Anlık Güneş–Ay disk geometrisi ve kullanıcı kontrollü yerel tutulma zaman penceresi ana deney alanında gösterilir.'
              : activeScenarioId === 'shadow-observation'
                ? 'Gölge yön diyagramı ana deney panelinde gösterilir. Dünya modellerine fiziksel Güneş davranışı atanmaz.'
                : activeScenarioId === 'stellar-observation'
                  ? 'Katalog yıldızı, J2000→gözlem tarihi dönüşümü, geometrik yıldız izi ve isteğe bağlı yerel skyline ana deney alanında gösterilir.'
                  : 'Güneş/Ay konumu ile günlük doğuş-batış zaman çizgisi ana deney alanında gösterilir; ek gökyüzü katmanları sonraki dilimlerde genişletilecektir.'}
"""
)

replace_once(
    'eclipse snapshot state',
    """  const [stellarMotionSource, setStellarMotionSource] = useState<SavedStellarMotionSource>();
  const [manualTerrainPoints, setManualTerrainPoints] = useState<ManualTerrainPoint[]>(
""",
    """  const [stellarMotionSource, setStellarMotionSource] = useState<SavedStellarMotionSource>();
  const [eclipseEventSearchSnapshot, setEclipseEventSearchSnapshot] = useState<SolarEclipseEventSearchSnapshot>();
  const [manualTerrainPoints, setManualTerrainPoints] = useState<ManualTerrainPoint[]>(
"""
)

replace_once(
    'celestial experiment scenario',
    """    if (activeScenarioId === 'sun-moon-observation' || activeScenarioId === 'stellar-observation') {
      return {
        id: activeExperimentId,
        title: activeExperimentName || (activeScenarioId === 'stellar-observation' ? 'Etkileşimli yıldız gözlemi' : 'Etkileşimli Güneş ve Ay gözlemi'),
""",
    """    if (activeScenarioId === 'sun-moon-observation' || activeScenarioId === 'stellar-observation' || activeScenarioId === 'eclipse-simulation') {
      return {
        id: activeExperimentId,
        title: activeExperimentName || (activeScenarioId === 'stellar-observation'
          ? 'Etkileşimli yıldız gözlemi'
          : activeScenarioId === 'eclipse-simulation'
            ? 'Etkileşimli tutulma simülasyonu'
            : 'Etkileşimli Güneş ve Ay gözlemi'),
"""
)

replace_once(
    'solar calculation scenario',
    "const solarPosition = useMemo(() => (activeScenarioId === 'sun-moon-observation' || activeScenarioId === 'shadow-observation')",
    "const solarPosition = useMemo(() => (activeScenarioId === 'sun-moon-observation' || activeScenarioId === 'shadow-observation' || activeScenarioId === 'eclipse-simulation')"
)

replace_once(
    'solar prediction scenario',
    "const solarPositionPrediction = useMemo(() => activeScenarioId === 'sun-moon-observation' && solarPosition",
    "const solarPositionPrediction = useMemo(() => (activeScenarioId === 'sun-moon-observation' || activeScenarioId === 'eclipse-simulation') && solarPosition"
)

replace_once(
    'lunar calculation scenario',
    "const lunarPosition = useMemo(() => activeScenarioId === 'sun-moon-observation' && solarPosition",
    "const lunarPosition = useMemo(() => (activeScenarioId === 'sun-moon-observation' || activeScenarioId === 'eclipse-simulation') && solarPosition"
)

replace_once(
    'eclipse derived predictions',
    """  const lunarPositionPrediction = useMemo(() => lunarPosition
    ? createLunarPositionPrediction(activeExperimentId, lunarPosition)
    : undefined, [activeExperimentId, lunarPosition]);
  const shadowObservationResult = useMemo(() => activeScenarioId === 'shadow-observation' && solarPosition
""",
    """  const lunarPositionPrediction = useMemo(() => lunarPosition
    ? createLunarPositionPrediction(activeExperimentId, lunarPosition)
    : undefined, [activeExperimentId, lunarPosition]);
  const eclipseOverlapResult = useMemo(() => activeScenarioId === 'eclipse-simulation' && solarPosition && lunarPosition
    ? calculateSolarEclipseOverlap({ solarPosition, lunarPosition })
    : undefined, [activeScenarioId, lunarPosition, solarPosition]);
  const eclipseOverlapPrediction = useMemo(() => eclipseOverlapResult
    ? createSolarEclipseOverlapPrediction(activeExperimentId, eclipseOverlapResult)
    : undefined, [activeExperimentId, eclipseOverlapResult]);
  const eclipseEventSearchSnapshotCurrent = useMemo(() => {
    if (activeScenarioId !== 'eclipse-simulation' || !eclipseEventSearchSnapshot) return false;
    const normalizedObservedAtIso = new Date(experimentObservedAtIso).toISOString();
    return eclipseEventSearchSnapshot.anchorObservedAtIso === normalizedObservedAtIso &&
      Math.abs(eclipseEventSearchSnapshot.latitudeDeg - inputs.observerLatitudeDeg) <= 1e-8 &&
      Math.abs(eclipseEventSearchSnapshot.longitudeDeg - inputs.observerLongitudeDeg) <= 1e-8;
  }, [activeScenarioId, eclipseEventSearchSnapshot, experimentObservedAtIso, inputs.observerLatitudeDeg, inputs.observerLongitudeDeg]);
  const eclipseEventSearchPrediction = useMemo(() => eclipseEventSearchSnapshotCurrent && eclipseEventSearchSnapshot
    ? createSolarEclipseEventSearchPrediction(activeExperimentId, eclipseEventSearchSnapshot)
    : undefined, [activeExperimentId, eclipseEventSearchSnapshot, eclipseEventSearchSnapshotCurrent]);
  const shadowObservationResult = useMemo(() => activeScenarioId === 'shadow-observation' && solarPosition
"""
)

# Reset the persisted event-search snapshot whenever a workflow itself is reset,
# switched or deleted. Do not clear it on time/coordinate edits: the UI intentionally
# keeps it visible as ESKİ SONUÇ until the user runs a new search.
text, clear_count = re.subn(
    r'(?m)^(?P<indent>[ \t]*)setStellarMotionSource\(undefined\);$',
    lambda match: f"{match.group('indent')}setStellarMotionSource(undefined);\n{match.group('indent')}setEclipseEventSearchSnapshot(undefined);",
    text
)
if clear_count < 3:
    raise SystemExit(f'eclipse reset hooks: expected at least 3 matches, found {clear_count}')

replace_once(
    'load event prediction',
    """    const stellarPrediction = saved.predictions.find(
      (prediction) => prediction.modelId === STELLAR_OBSERVATION_MODEL_ID
    );
    const storedStellarSettings = readStellarObservationSettings(stellarPrediction);
""",
    """    const stellarPrediction = saved.predictions.find(
      (prediction) => prediction.modelId === STELLAR_OBSERVATION_MODEL_ID
    );
    const eclipseEventPrediction = saved.predictions.find(
      (prediction) => prediction.modelId === solarEclipseEventSearchMetadata.id
    );
    const storedStellarSettings = readStellarObservationSettings(stellarPrediction);
"""
)

replace_once(
    'restore event snapshot',
    """    setStellarMotionSource(saved.stellarMotionSource
      ? { ...saved.stellarMotionSource, entries: saved.stellarMotionSource.entries.map((entry) => ({ ...entry })) }
      : undefined);
    setInputs(saved.inputs);
""",
    """    setStellarMotionSource(saved.stellarMotionSource
      ? { ...saved.stellarMotionSource, entries: saved.stellarMotionSource.entries.map((entry) => ({ ...entry })) }
      : undefined);
    setEclipseEventSearchSnapshot(readSolarEclipseEventSearchSnapshot(eclipseEventPrediction));
    setInputs(saved.inputs);
"""
)

replace_once(
    'save event model versions',
    """        ...(lunarPositionPrediction
          ? [[lunarPositionMetadata.id, lunarPositionMetadata.version] as const]
          : []),
        ...(shadowObservationPrediction
""",
    """        ...(lunarPositionPrediction
          ? [[lunarPositionMetadata.id, lunarPositionMetadata.version] as const]
          : []),
        ...(eclipseOverlapPrediction
          ? [[solarEclipseOverlapMetadata.id, solarEclipseOverlapMetadata.version] as const]
          : []),
        ...(eclipseEventSearchPrediction
          ? [[solarEclipseEventSearchMetadata.id, solarEclipseEventSearchMetadata.version] as const]
          : []),
        ...(shadowObservationPrediction
"""
)

replace_once(
    'save event predictions',
    """        ...(lunarPositionPrediction ? [lunarPositionPrediction] : []),
        ...(shadowObservationPrediction ? [shadowObservationPrediction] : []),
""",
    """        ...(lunarPositionPrediction ? [lunarPositionPrediction] : []),
        ...(eclipseOverlapPrediction ? [eclipseOverlapPrediction] : []),
        ...(eclipseEventSearchPrediction ? [eclipseEventSearchPrediction] : []),
        ...(shadowObservationPrediction ? [shadowObservationPrediction] : []),
"""
)

replace_once(
    'saved event prediction lookup',
    """      const savedStellarPrediction = saved.predictions.find(
        (prediction) => prediction.modelId === STELLAR_OBSERVATION_MODEL_ID
      );
      setSavedExperiments((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
""",
    """      const savedStellarPrediction = saved.predictions.find(
        (prediction) => prediction.modelId === STELLAR_OBSERVATION_MODEL_ID
      );
      const savedEclipseEventPrediction = saved.predictions.find(
        (prediction) => prediction.modelId === solarEclipseEventSearchMetadata.id
      );
      setSavedExperiments((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
"""
)

replace_once(
    'restore snapshot after save',
    """      }
      setExperimentObservedAtIso(saved.observedAtIso ?? saved.createdAtIso);
""",
    """      }
      setEclipseEventSearchSnapshot(readSolarEclipseEventSearchSnapshot(savedEclipseEventPrediction));
      setExperimentObservedAtIso(saved.observedAtIso ?? saved.createdAtIso);
"""
)

replace_once(
    'trace eclipse metadata',
    """  const selectedMetadata = traceModelId === stellarObservationMetadata.id
    ? stellarObservationMetadata
""",
    """  const selectedMetadata = traceModelId === solarEclipseOverlapMetadata.id
    ? solarEclipseOverlapMetadata
    : traceModelId === solarEclipseEventSearchMetadata.id
      ? solarEclipseEventSearchMetadata
      : traceModelId === stellarObservationMetadata.id
    ? stellarObservationMetadata
"""
)

replace_once(
    'trace eclipse prediction',
    """  const selectedPrediction = traceModelId === stellarObservationMetadata.id
    ? stellarObservationPrediction
""",
    """  const selectedPrediction = traceModelId === solarEclipseOverlapMetadata.id
    ? eclipseOverlapPrediction
    : traceModelId === solarEclipseEventSearchMetadata.id
      ? eclipseEventSearchPrediction
      : traceModelId === stellarObservationMetadata.id
    ? stellarObservationPrediction
"""
)

replace_once(
    'eclipse scenario summary',
    """            ) : activeScenarioId === 'stellar-observation' ? (
              <StellarScenarioSummary
""",
    """            ) : activeScenarioId === 'eclipse-simulation' ? (
              <EclipseScenarioSummary
                activeName={activeExperimentName}
                inputs={inputs}
                isDirty={isDirty}
                onCoordinateChange={(key, value) => handleNumberChange(key, value)}
                onReset={resetExperiment}
                onSave={() => setSaveDialogOpen(true)}
              />
            ) : activeScenarioId === 'stellar-observation' ? (
              <StellarScenarioSummary
"""
)

replace_once(
    'eclipse simulation panel',
    """              : activeScenarioId === 'stellar-observation' && stellarObservationResult && stellarObservationPrediction
              ? <StellarObservationPanel
""",
    """              : activeScenarioId === 'eclipse-simulation' && solarPosition && lunarPosition && eclipseOverlapPrediction
              ? <EclipseSimulationPanel
                  solarPosition={solarPosition}
                  lunarPosition={lunarPosition}
                  eventSearchSnapshot={eclipseEventSearchSnapshot}
                  onEventSearchSnapshotChange={(snapshot) => {
                    setEclipseEventSearchSnapshot(snapshot);
                    setIsDirty(true);
                  }}
                  onShowOverlapTrace={() => setTraceModelId(solarEclipseOverlapMetadata.id)}
                  onShowEventSearchTrace={() => setTraceModelId(solarEclipseEventSearchMetadata.id)}
                />
              : activeScenarioId === 'stellar-observation' && stellarObservationResult && stellarObservationPrediction
              ? <StellarObservationPanel
"""
)

PATH.write_text(text, encoding='utf-8')
print(f'Updated {PATH}; Stage 7.4 AppNext integration applied successfully.')
