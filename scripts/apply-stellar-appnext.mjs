import fs from 'node:fs';

const path = 'src/renderer/src/AppNext.tsx';
let source = fs.readFileSync(path, 'utf8');

function replaceOnce(label, before, after) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`[${label}] beklenen kaynak parçası bulunamadı`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`[${label}] kaynak parçası birden fazla kez bulundu`);
  }
  source = source.slice(0, first) + after + source.slice(first + before.length);
}

function replaceAll(label, before, after, minimumCount = 1) {
  const count = source.split(before).length - 1;
  if (count < minimumCount) throw new Error(`[${label}] beklenen en az ${minimumCount} eşleşme yerine ${count} bulundu`);
  source = source.split(before).join(after);
}

replaceOnce(
  'scenario import',
  "  SUN_MOON_SCENARIO,\n  SHADOW_SCENARIO,\n  getSimulationScenario,",
  "  SUN_MOON_SCENARIO,\n  SHADOW_SCENARIO,\n  STELLAR_SCENARIO,\n  getSimulationScenario,"
);

replaceOnce(
  'stellar simulation import',
  "import {\n  WATER_SURFACE_APPLICATION_MODEL_ID,",
  "import {\n  DEFAULT_STELLAR_OBSERVATION_SETTINGS,\n  STELLAR_OBSERVATION_MODEL_ID,\n  calculateStellarObservation,\n  createStellarObservationPrediction,\n  readStellarObservationSettings,\n  stellarObservationMetadata,\n  type StellarObservationSettings\n} from '../../simulation/stellar-observation';\nimport {\n  WATER_SURFACE_APPLICATION_MODEL_ID,"
);

replaceOnce(
  'stellar renderer imports',
  "import { DualShadowComparisonPanel } from './DualShadowComparisonPanel';",
  "import { DualShadowComparisonPanel } from './DualShadowComparisonPanel';\nimport { StellarScenarioSummary } from './StellarScenarioSummary';\nimport { StellarObservationPanel } from './StellarObservationPanel';"
);

replaceOnce(
  'scenario menu',
  "  { ...SHADOW_SCENARIO, enabled: true },\n  { label: 'Yıldız Gözlemleri', icon: '✦', enabled: false },",
  "  { ...SHADOW_SCENARIO, enabled: true },\n  { ...STELLAR_SCENARIO, enabled: true },"
);

replaceOnce(
  'astronomy scenario helper',
  "  return scenarioId === 'sun-moon-observation' || scenarioId === 'shadow-observation';",
  "  return scenarioId === 'sun-moon-observation' || scenarioId === 'shadow-observation' || scenarioId === 'stellar-observation';"
);

replaceOnce(
  'stellar state',
  "  const [dualShadowSettings, setDualShadowSettings] = useState<DualShadowComparisonSettings>();",
  "  const [dualShadowSettings, setDualShadowSettings] = useState<DualShadowComparisonSettings>();\n  const [stellarObservationSettings, setStellarObservationSettings] = useState<StellarObservationSettings>(() => ({ ...DEFAULT_STELLAR_OBSERVATION_SETTINGS }));"
);

replaceOnce(
  'celestial experiment branch',
  "    if (activeScenarioId === 'sun-moon-observation') {\n      return {\n        id: activeExperimentId,\n        title: activeExperimentName || 'Etkileşimli Güneş ve Ay gözlemi',\n        type: 'celestial',\n        observer,\n        observedAtIso: experimentObservedAtIso,\n        measurements: {}\n      };\n    }",
  "    if (activeScenarioId === 'sun-moon-observation' || activeScenarioId === 'stellar-observation') {\n      return {\n        id: activeExperimentId,\n        title: activeExperimentName || (activeScenarioId === 'stellar-observation' ? 'Etkileşimli yıldız gözlemi' : 'Etkileşimli Güneş ve Ay gözlemi'),\n        type: 'celestial',\n        observer,\n        observedAtIso: experimentObservedAtIso,\n        measurements: {}\n      };\n    }"
);

replaceOnce(
  'solar calculation scope',
  "  const solarPosition = useMemo(() => isAstronomyScenario(activeScenarioId)\n    ? calculateSolarPosition({",
  "  const solarPosition = useMemo(() => (activeScenarioId === 'sun-moon-observation' || activeScenarioId === 'shadow-observation')\n    ? calculateSolarPosition({"
);

replaceOnce(
  'stellar memo',
  "  const dualShadowComparisonPrediction = useMemo(() => dualShadowComparisonResult\n    ? createDualShadowComparisonPrediction(dualShadowComparisonResult)\n    : undefined, [dualShadowComparisonResult]);\n\n  const context = useMemo(() => ({",
  "  const dualShadowComparisonPrediction = useMemo(() => dualShadowComparisonResult\n    ? createDualShadowComparisonPrediction(dualShadowComparisonResult)\n    : undefined, [dualShadowComparisonResult]);\n  const stellarObservationResult = useMemo(() => activeScenarioId === 'stellar-observation'\n    ? calculateStellarObservation({\n        experimentId: activeExperimentId,\n        observedAtIso: experimentObservedAtIso,\n        latitudeDeg: inputs.observerLatitudeDeg,\n        longitudeDeg: inputs.observerLongitudeDeg,\n        settings: stellarObservationSettings\n      })\n    : undefined, [activeExperimentId, activeScenarioId, experimentObservedAtIso, inputs.observerLatitudeDeg, inputs.observerLongitudeDeg, stellarObservationSettings]);\n  const stellarObservationPrediction = useMemo(() => stellarObservationResult\n    ? createStellarObservationPrediction(stellarObservationResult)\n    : undefined, [stellarObservationResult]);\n\n  const context = useMemo(() => ({"
);

replaceOnce(
  'sidebar model count',
  "<span className=\"section-state\">{activeScenarioId === 'sun-moon-observation' ? '3 astronomik referans' : activeScenarioId === 'shadow-observation' ? '1 astronomik referans' : '2 fiziksel'}</span>",
  "<span className=\"section-state\">{activeScenarioId === 'sun-moon-observation' ? '3 astronomik referans' : activeScenarioId === 'shadow-observation' || activeScenarioId === 'stellar-observation' ? '1 astronomik referans' : '2 fiziksel'}</span>"
);

replaceOnce(
  'sidebar stellar model',
  "        ) : activeScenarioId === 'shadow-observation' ? (\n          <div className=\"model-toggle reference-model\">\n            <span className=\"model-dot amber\" />\n            <span>Gölge Geometrisi · Astronomik Referans</span>\n            <span className=\"reference-badge\">REFERANS</span>\n          </div>\n        ) : (<>",
  "        ) : activeScenarioId === 'shadow-observation' ? (\n          <div className=\"model-toggle reference-model\">\n            <span className=\"model-dot amber\" />\n            <span>Gölge Geometrisi · Astronomik Referans</span>\n            <span className=\"reference-badge\">REFERANS</span>\n          </div>\n        ) : activeScenarioId === 'stellar-observation' ? (\n          <div className=\"model-toggle reference-model\">\n            <span className=\"model-dot violet\" />\n            <span>Yıldız Gözlemi · Astronomik Referans</span>\n            <span className=\"reference-badge\">REFERANS</span>\n          </div>\n        ) : (< >".replace('< >', '<>')
);

replaceOnce(
  'sidebar astronomy note',
  "            {activeScenarioId === 'shadow-observation'\n              ? 'Gölge yön diyagramı ana deney panelinde gösterilir. Dünya modellerine fiziksel Güneş davranışı atanmaz.'\n              : 'Güneş/Ay konumu ile günlük doğuş-batış zaman çizgisi ana deney alanında gösterilir; ek gökyüzü katmanları sonraki dilimlerde genişletilecektir.'}",
  "            {activeScenarioId === 'shadow-observation'\n              ? 'Gölge yön diyagramı ana deney panelinde gösterilir. Dünya modellerine fiziksel Güneş davranışı atanmaz.'\n              : activeScenarioId === 'stellar-observation'\n                ? 'Katalog yıldızı, J2000→gözlem tarihi dönüşümü ve geometrik yıldız izi ana deney alanında gösterilir.'\n                : 'Güneş/Ay konumu ile günlük doğuş-batış zaman çizgisi ana deney alanında gösterilir; ek gökyüzü katmanları sonraki dilimlerde genişletilecektir.'}"
);

replaceAll(
  'stellar reset state',
  "      setDualShadowSettings(undefined);",
  "      setDualShadowSettings(undefined);\n      setStellarObservationSettings({ ...DEFAULT_STELLAR_OBSERVATION_SETTINGS });",
  4
);

replaceOnce(
  'load stellar prediction lookup',
  "    const dualShadowPrediction = saved.predictions.find(\n      (prediction) => prediction.modelId === DUAL_SHADOW_COMPARISON_MODEL_ID\n    );\n    setActiveScenarioId(normalizeSimulationScenarioId(saved.scenarioId));",
  "    const dualShadowPrediction = saved.predictions.find(\n      (prediction) => prediction.modelId === DUAL_SHADOW_COMPARISON_MODEL_ID\n    );\n    const stellarPrediction = saved.predictions.find(\n      (prediction) => prediction.modelId === STELLAR_OBSERVATION_MODEL_ID\n    );\n    setActiveScenarioId(normalizeSimulationScenarioId(saved.scenarioId));"
);

replaceOnce(
  'load stellar settings',
  "    setDualShadowSettings(readDualShadowComparisonSettings(dualShadowPrediction));\n    setInputs(saved.inputs);",
  "    setDualShadowSettings(readDualShadowComparisonSettings(dualShadowPrediction));\n    setStellarObservationSettings(readStellarObservationSettings(stellarPrediction));\n    setInputs(saved.inputs);"
);

replaceOnce(
  'save stellar version',
  "        ...(dualShadowComparisonPrediction\n          ? [[dualShadowComparisonMetadata.id, dualShadowComparisonMetadata.version] as const]\n          : []),\n        ...(geoidConversionRecord",
  "        ...(dualShadowComparisonPrediction\n          ? [[dualShadowComparisonMetadata.id, dualShadowComparisonMetadata.version] as const]\n          : []),\n        ...(stellarObservationPrediction\n          ? [[stellarObservationMetadata.id, stellarObservationMetadata.version] as const]\n          : []),\n        ...(geoidConversionRecord"
);

replaceOnce(
  'save stellar prediction',
  "        ...(dualShadowComparisonPrediction ? [dualShadowComparisonPrediction] : []),\n        ...runs.map((run) => run.prediction),",
  "        ...(dualShadowComparisonPrediction ? [dualShadowComparisonPrediction] : []),\n        ...(stellarObservationPrediction ? [stellarObservationPrediction] : []),\n        ...runs.map((run) => run.prediction),"
);

replaceOnce(
  'saved stellar lookup',
  "      const savedDualShadowPrediction = saved.predictions.find(\n        (prediction) => prediction.modelId === DUAL_SHADOW_COMPARISON_MODEL_ID\n      );\n      setSavedExperiments",
  "      const savedDualShadowPrediction = saved.predictions.find(\n        (prediction) => prediction.modelId === DUAL_SHADOW_COMPARISON_MODEL_ID\n      );\n      const savedStellarPrediction = saved.predictions.find(\n        (prediction) => prediction.modelId === STELLAR_OBSERVATION_MODEL_ID\n      );\n      setSavedExperiments"
);

replaceOnce(
  'saved stellar settings',
  "      setDualShadowSettings(readDualShadowComparisonSettings(savedDualShadowPrediction));\n      setExperimentObservedAtIso",
  "      setDualShadowSettings(readDualShadowComparisonSettings(savedDualShadowPrediction));\n      setStellarObservationSettings(readStellarObservationSettings(savedStellarPrediction));\n      setExperimentObservedAtIso"
);

replaceOnce(
  'stellar selected metadata',
  "  const selectedMetadata = traceModelId === solarPositionMetadata.id\n    ? solarPositionMetadata",
  "  const selectedMetadata = traceModelId === stellarObservationMetadata.id\n    ? stellarObservationMetadata\n    : traceModelId === solarPositionMetadata.id\n    ? solarPositionMetadata"
);

replaceOnce(
  'stellar selected prediction',
  "  const selectedPrediction = traceModelId === solarPositionMetadata.id\n    ? solarPositionPrediction",
  "  const selectedPrediction = traceModelId === stellarObservationMetadata.id\n    ? stellarObservationPrediction\n    : traceModelId === solarPositionMetadata.id\n    ? solarPositionPrediction"
);

replaceOnce(
  'stellar summary render',
  "            ) : activeScenarioId === 'shadow-observation' ? (\n              <ShadowScenarioSummary",
  "            ) : activeScenarioId === 'stellar-observation' ? (\n              <StellarScenarioSummary\n                activeName={activeExperimentName}\n                inputs={inputs}\n                isDirty={isDirty}\n                onCoordinateChange={(key, value) => handleNumberChange(key, value)}\n                onReset={resetExperiment}\n                onSave={() => setSaveDialogOpen(true)}\n              />\n            ) : activeScenarioId === 'shadow-observation' ? (\n              <ShadowScenarioSummary"
);

replaceOnce(
  'stellar panel render',
  "              : activeScenarioId === 'shadow-observation' && shadowObservationResult && shadowObservationPrediction\n              ? <>",
  "              : activeScenarioId === 'stellar-observation' && stellarObservationResult && stellarObservationPrediction\n              ? <StellarObservationPanel\n                  result={stellarObservationResult}\n                  prediction={stellarObservationPrediction}\n                  settings={stellarObservationSettings}\n                  onChange={(settings) => { setStellarObservationSettings(settings); setIsDirty(true); }}\n                  onShowTrace={() => setTraceModelId(stellarObservationMetadata.id)}\n                />\n              : activeScenarioId === 'shadow-observation' && shadowObservationResult && shadowObservationPrediction\n              ? <>"
);

fs.writeFileSync(path, source);
console.log('AppNext stellar observation integration applied successfully.');
