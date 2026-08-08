from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding='utf-8')


def write(path: str, text: str) -> None:
    Path(path).write_text(text, encoding='utf-8')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly 1 match, found {count}')
    return text.replace(old, new, 1)


# App integration
path = 'src/renderer/src/AppNext.tsx'
text = read(path)
text = replace_once(text,
"  VISIBILITY_SCENARIOS,\n  SUN_MOON_SCENARIO,\n",
"  VISIBILITY_SCENARIOS,\n  SUN_MOON_SCENARIO,\n  SHADOW_SCENARIO,\n",
'app scenario import')
text = replace_once(text,
"import { calculateLunarPosition } from '../../simulation/lunar-position';\nimport { createLunarPositionPrediction, lunarPositionMetadata } from '../../simulation/lunar-position-prediction';\n",
"import { calculateLunarPosition } from '../../simulation/lunar-position';\nimport { createLunarPositionPrediction, lunarPositionMetadata } from '../../simulation/lunar-position-prediction';\nimport {\n  DEFAULT_SHADOW_OBSERVATION_SETTINGS,\n  SHADOW_OBSERVATION_MODEL_ID,\n  calculateShadowObservation,\n  createShadowObservationPrediction,\n  readShadowObservationSettings,\n  shadowObservationMetadata,\n  type ShadowObservationSettings\n} from '../../simulation/shadow-observation';\n",
'app shadow import')
text = replace_once(text,
"import { LunarPositionPanel } from './LunarPositionPanel';\nimport { SolarScenarioSummary } from './SolarScenarioSummary';\n",
"import { LunarPositionPanel } from './LunarPositionPanel';\nimport { SolarScenarioSummary } from './SolarScenarioSummary';\nimport { ShadowScenarioSummary } from './ShadowScenarioSummary';\nimport { ShadowObservationPanel } from './ShadowObservationPanel';\n",
'app component imports')
text = replace_once(text,
"  { ...SUN_MOON_SCENARIO, enabled: true },\n  { label: 'Yıldız Gözlemleri', icon: '✦', enabled: false },\n",
"  { ...SUN_MOON_SCENARIO, enabled: true },\n  { ...SHADOW_SCENARIO, enabled: true },\n  { label: 'Yıldız Gözlemleri', icon: '✦', enabled: false },\n",
'app scenarios list')
text = replace_once(text,
"function getPresentation(modelId: string): ModelPresentation {\n  return presentationByModelId[modelId] ?? { tone: 'violet', shape: 'gleason' };\n}\n",
"function getPresentation(modelId: string): ModelPresentation {\n  return presentationByModelId[modelId] ?? { tone: 'violet', shape: 'gleason' };\n}\n\nfunction isAstronomyScenario(scenarioId: SimulationScenarioId): boolean {\n  return scenarioId === 'sun-moon-observation' || scenarioId === 'shadow-observation';\n}\n",
'app astronomy helper')
text = replace_once(text,
"          <span className=\"section-state\">{activeScenarioId === 'sun-moon-observation' ? '2 astronomik referans' : '2 fiziksel'}</span>\n",
"          <span className=\"section-state\">{activeScenarioId === 'sun-moon-observation' ? '2 astronomik referans' : activeScenarioId === 'shadow-observation' ? '1 astronomik referans' : '2 fiziksel'}</span>\n",
'app model count')
text = replace_once(text,
"        {activeScenarioId === 'sun-moon-observation' ? (\n          <>\n            <div className=\"model-toggle reference-model\">\n              <span className=\"model-dot amber\" />\n              <span>Güneş Konumu · Astronomik Referans</span>\n              <span className=\"reference-badge\">REFERANS</span>\n            </div>\n            <div className=\"model-toggle reference-model\">\n              <span className=\"model-dot violet\" />\n              <span>Ay Konumu ve Fazı · Astronomik Referans</span>\n              <span className=\"reference-badge\">REFERANS</span>\n            </div>\n          </>\n        ) : (<>\n",
"        {activeScenarioId === 'sun-moon-observation' ? (\n          <>\n            <div className=\"model-toggle reference-model\">\n              <span className=\"model-dot amber\" />\n              <span>Güneş Konumu · Astronomik Referans</span>\n              <span className=\"reference-badge\">REFERANS</span>\n            </div>\n            <div className=\"model-toggle reference-model\">\n              <span className=\"model-dot violet\" />\n              <span>Ay Konumu ve Fazı · Astronomik Referans</span>\n              <span className=\"reference-badge\">REFERANS</span>\n            </div>\n          </>\n        ) : activeScenarioId === 'shadow-observation' ? (\n          <div className=\"model-toggle reference-model\">\n            <span className=\"model-dot amber\" />\n            <span>Gölge Geometrisi · Astronomik Referans</span>\n            <span className=\"reference-badge\">REFERANS</span>\n          </div>\n        ) : (<>\n",
'app model reference branch')
text = replace_once(text,
"      {activeScenarioId === 'sun-moon-observation' ? (\n        <section className=\"side-section compact grow celestial-visual-placeholder\">\n",
"      {isAstronomyScenario(activeScenarioId) ? (\n        <section className=\"side-section compact grow celestial-visual-placeholder\">\n",
'app visual placeholder condition')
text = replace_once(text,
"          <div className=\"saved-empty\">\n            Güneş gökyüzü/ufuk görselleştirme katmanları daha sonraki astronomi aşamasında etkinleşecek. 6.1 sonucu şu anda sayısal geometrik referanstır.\n          </div>\n",
"          <div className=\"saved-empty\">\n            {activeScenarioId === 'shadow-observation'\n              ? 'Gölge yön diyagramı ana deney panelinde gösterilir. Dünya modellerine fiziksel Güneş davranışı atanmaz.'\n              : 'Güneş ve Ay referansları sayısal/geometrik astronomi sonucudur; ek gökyüzü katmanları sonraki dilimlerde genişletilecektir.'}\n          </div>\n",
'app visual placeholder text')
text = replace_once(text,
"        active={activeScenarioId === 'sun-moon-observation'}\n",
"        active={isAstronomyScenario(activeScenarioId)}\n",
'app celestial time active')
text = replace_once(text,
"  const [activeScenarioId, setActiveScenarioId] = useState<SimulationScenarioId>('target-visibility');\n",
"  const [activeScenarioId, setActiveScenarioId] = useState<SimulationScenarioId>('target-visibility');\n  const [shadowObservationSettings, setShadowObservationSettings] = useState<ShadowObservationSettings>(() => ({ ...DEFAULT_SHADOW_OBSERVATION_SETTINGS }));\n",
'app shadow state')
text = replace_once(text,
"    if (activeScenarioId === 'sun-moon-observation' || inputs.distanceSource !== 'coordinates') return undefined;\n",
"    if (isAstronomyScenario(activeScenarioId) || inputs.distanceSource !== 'coordinates') return undefined;\n",
'app geodesic astronomy')
text = replace_once(text,
"    if (activeScenarioId === 'sun-moon-observation') {\n      return {\n        id: activeExperimentId,\n        title: activeExperimentName || 'Etkileşimli güneş gözlemi',\n        type: 'celestial',\n        observer,\n        observedAtIso: experimentObservedAtIso,\n        measurements: {}\n      };\n    }\n\n    if (activeScenarioId === 'horizon') {\n",
"    if (activeScenarioId === 'sun-moon-observation') {\n      return {\n        id: activeExperimentId,\n        title: activeExperimentName || 'Etkileşimli Güneş ve Ay gözlemi',\n        type: 'celestial',\n        observer,\n        observedAtIso: experimentObservedAtIso,\n        measurements: {}\n      };\n    }\n\n    if (activeScenarioId === 'shadow-observation') {\n      return {\n        id: activeExperimentId,\n        title: activeExperimentName || 'Etkileşimli gölge deneyi',\n        type: 'shadow',\n        observer,\n        observedAtIso: experimentObservedAtIso,\n        measurements: {}\n      };\n    }\n\n    if (activeScenarioId === 'horizon') {\n",
'app shadow experiment')
text = replace_once(text,
"  const solarPosition = useMemo(() => activeScenarioId === 'sun-moon-observation'\n    ? calculateSolarPosition({\n        observedAtIso: experimentObservedAtIso,\n        latitudeDeg: inputs.observerLatitudeDeg,\n        longitudeDeg: inputs.observerLongitudeDeg\n      })\n    : undefined, [activeScenarioId, experimentObservedAtIso, inputs.observerLatitudeDeg, inputs.observerLongitudeDeg]);\n  const solarPositionPrediction = useMemo(() => solarPosition\n    ? createSolarPositionPrediction(activeExperimentId, solarPosition)\n    : undefined, [activeExperimentId, solarPosition]);\n  const lunarPosition = useMemo(() => activeScenarioId === 'sun-moon-observation' && solarPosition\n    ? calculateLunarPosition({\n        observedAtIso: experimentObservedAtIso,\n        latitudeDeg: inputs.observerLatitudeDeg,\n        longitudeDeg: inputs.observerLongitudeDeg,\n        solarPosition\n      })\n    : undefined, [activeScenarioId, experimentObservedAtIso, inputs.observerLatitudeDeg, inputs.observerLongitudeDeg, solarPosition]);\n  const lunarPositionPrediction = useMemo(() => lunarPosition\n    ? createLunarPositionPrediction(activeExperimentId, lunarPosition)\n    : undefined, [activeExperimentId, lunarPosition]);\n",
"  const solarPosition = useMemo(() => isAstronomyScenario(activeScenarioId)\n    ? calculateSolarPosition({\n        observedAtIso: experimentObservedAtIso,\n        latitudeDeg: inputs.observerLatitudeDeg,\n        longitudeDeg: inputs.observerLongitudeDeg\n      })\n    : undefined, [activeScenarioId, experimentObservedAtIso, inputs.observerLatitudeDeg, inputs.observerLongitudeDeg]);\n  const solarPositionPrediction = useMemo(() => activeScenarioId === 'sun-moon-observation' && solarPosition\n    ? createSolarPositionPrediction(activeExperimentId, solarPosition)\n    : undefined, [activeExperimentId, activeScenarioId, solarPosition]);\n  const lunarPosition = useMemo(() => activeScenarioId === 'sun-moon-observation' && solarPosition\n    ? calculateLunarPosition({\n        observedAtIso: experimentObservedAtIso,\n        latitudeDeg: inputs.observerLatitudeDeg,\n        longitudeDeg: inputs.observerLongitudeDeg,\n        solarPosition\n      })\n    : undefined, [activeScenarioId, experimentObservedAtIso, inputs.observerLatitudeDeg, inputs.observerLongitudeDeg, solarPosition]);\n  const lunarPositionPrediction = useMemo(() => lunarPosition\n    ? createLunarPositionPrediction(activeExperimentId, lunarPosition)\n    : undefined, [activeExperimentId, lunarPosition]);\n  const shadowObservationResult = useMemo(() => activeScenarioId === 'shadow-observation' && solarPosition\n    ? calculateShadowObservation({\n        experimentId: activeExperimentId,\n        observedAtIso: experimentObservedAtIso,\n        latitudeDeg: inputs.observerLatitudeDeg,\n        longitudeDeg: inputs.observerLongitudeDeg,\n        solarPosition,\n        settings: shadowObservationSettings\n      })\n    : undefined, [activeExperimentId, activeScenarioId, experimentObservedAtIso, inputs.observerLatitudeDeg, inputs.observerLongitudeDeg, shadowObservationSettings, solarPosition]);\n  const shadowObservationPrediction = useMemo(() => shadowObservationResult\n    ? createShadowObservationPrediction(shadowObservationResult)\n    : undefined, [shadowObservationResult]);\n",
'app shadow calculations')
text = replace_once(text,
"  useEffect(() => {\n    if (activeScenarioId === 'sun-moon-observation') {\n",
"  useEffect(() => {\n    if (isAstronomyScenario(activeScenarioId)) {\n",
'app runner skip astronomy')
# reset shadow inputs when text setup switches scenario
text = replace_once(text,
"      setActiveScenarioId(nextScenario);\n      setActiveExperimentId(crypto.randomUUID());\n      setActiveExperimentName('');\n",
"      setActiveScenarioId(nextScenario);\n      setActiveExperimentId(crypto.randomUUID());\n      setActiveExperimentName('');\n      setShadowObservationSettings({ ...DEFAULT_SHADOW_OBSERVATION_SETTINGS });\n",
'app text setup shadow reset')
# load shadow snapshot
text = replace_once(text,
"    const photoPrediction = saved.predictions.find(\n      (prediction) => prediction.modelId === PHOTO_CALIBRATION_MODEL_ID\n    );\n",
"    const photoPrediction = saved.predictions.find(\n      (prediction) => prediction.modelId === PHOTO_CALIBRATION_MODEL_ID\n    );\n    const shadowPrediction = saved.predictions.find(\n      (prediction) => prediction.modelId === SHADOW_OBSERVATION_MODEL_ID\n    );\n",
'app load shadow find')
text = replace_once(text,
"    setActiveScenarioId(normalizeSimulationScenarioId(saved.scenarioId));\n    setInputs(saved.inputs);\n",
"    setActiveScenarioId(normalizeSimulationScenarioId(saved.scenarioId));\n    setShadowObservationSettings(readShadowObservationSettings(shadowPrediction));\n    setInputs(saved.inputs);\n",
'app load shadow state')
# save model version and prediction
text = replace_once(text,
"        ...(lunarPositionPrediction\n          ? [[lunarPositionMetadata.id, lunarPositionMetadata.version] as const]\n          : []),\n",
"        ...(lunarPositionPrediction\n          ? [[lunarPositionMetadata.id, lunarPositionMetadata.version] as const]\n          : []),\n        ...(shadowObservationPrediction\n          ? [[shadowObservationMetadata.id, shadowObservationMetadata.version] as const]\n          : []),\n",
'app shadow model version')
text = replace_once(text,
"        ...(lunarPositionPrediction ? [lunarPositionPrediction] : []),\n        ...runs.map((run) => run.prediction),\n",
"        ...(lunarPositionPrediction ? [lunarPositionPrediction] : []),\n        ...(shadowObservationPrediction ? [shadowObservationPrediction] : []),\n        ...runs.map((run) => run.prediction),\n",
'app shadow prediction save')
# restore after save
text = replace_once(text,
"      const savedPhotoPrediction = saved.predictions.find(\n        (prediction) => prediction.modelId === PHOTO_CALIBRATION_MODEL_ID\n      );\n",
"      const savedPhotoPrediction = saved.predictions.find(\n        (prediction) => prediction.modelId === PHOTO_CALIBRATION_MODEL_ID\n      );\n      const savedShadowPrediction = saved.predictions.find(\n        (prediction) => prediction.modelId === SHADOW_OBSERVATION_MODEL_ID\n      );\n",
'app saved shadow find')
text = replace_once(text,
"      setActiveExperimentId(saved.id);\n      setActiveExperimentName(saved.name);\n",
"      setActiveExperimentId(saved.id);\n      setActiveExperimentName(saved.name);\n      setShadowObservationSettings(readShadowObservationSettings(savedShadowPrediction));\n",
'app saved shadow restore')
# delete/reset
text = replace_once(text,
"        setActiveExperimentId(crypto.randomUUID());\n        setActiveExperimentName('');\n        setExperimentObservedAtIso(new Date().toISOString());\n",
"        setActiveExperimentId(crypto.randomUUID());\n        setActiveExperimentName('');\n        setShadowObservationSettings({ ...DEFAULT_SHADOW_OBSERVATION_SETTINGS });\n        setExperimentObservedAtIso(new Date().toISOString());\n",
'app delete shadow reset')
# trace selection
text = replace_once(text,
"  const selectedMetadata = traceModelId === solarPositionMetadata.id\n    ? solarPositionMetadata\n    : traceModelId === lunarPositionMetadata.id\n      ? lunarPositionMetadata\n      : traceModelId === geodesicMetadata.id\n",
"  const selectedMetadata = traceModelId === solarPositionMetadata.id\n    ? solarPositionMetadata\n    : traceModelId === lunarPositionMetadata.id\n      ? lunarPositionMetadata\n      : traceModelId === shadowObservationMetadata.id\n        ? shadowObservationMetadata\n        : traceModelId === geodesicMetadata.id\n",
'app shadow trace metadata')
text = replace_once(text,
"  const selectedPrediction = traceModelId === solarPositionMetadata.id\n    ? solarPositionPrediction\n    : traceModelId === lunarPositionMetadata.id\n      ? lunarPositionPrediction\n      : traceModelId === geodesicMetadata.id\n",
"  const selectedPrediction = traceModelId === solarPositionMetadata.id\n    ? solarPositionPrediction\n    : traceModelId === lunarPositionMetadata.id\n      ? lunarPositionPrediction\n      : traceModelId === shadowObservationMetadata.id\n        ? shadowObservationPrediction\n        : traceModelId === geodesicMetadata.id\n",
'app shadow trace prediction')
text = replace_once(text,
"    setActiveExperimentId(crypto.randomUUID());\n    setActiveExperimentName('');\n    setExperimentObservedAtIso(new Date().toISOString());\n",
"    setActiveExperimentId(crypto.randomUUID());\n    setActiveExperimentName('');\n    setShadowObservationSettings({ ...DEFAULT_SHADOW_OBSERVATION_SETTINGS });\n    setExperimentObservedAtIso(new Date().toISOString());\n",
'app reset shadow state')
# scenario switch reset (the remaining identical sequence in JSX)
text = replace_once(text,
"            setActiveScenarioId(scenarioId);\n            setActiveExperimentId(crypto.randomUUID());\n            setActiveExperimentName('');\n            setExperimentObservedAtIso(new Date().toISOString());\n",
"            setActiveScenarioId(scenarioId);\n            setActiveExperimentId(crypto.randomUUID());\n            setActiveExperimentName('');\n            setShadowObservationSettings({ ...DEFAULT_SHADOW_OBSERVATION_SETTINGS });\n            setExperimentObservedAtIso(new Date().toISOString());\n",
'app scenario switch shadow reset')
# top summary branch
text = replace_once(text,
"            {activeScenarioId === 'sun-moon-observation' ? (\n              <SolarScenarioSummary\n                activeName={activeExperimentName}\n                inputs={inputs}\n                isDirty={isDirty}\n                onCoordinateChange={(key, value) => handleNumberChange(key, value)}\n                onReset={resetExperiment}\n                onSave={() => setSaveDialogOpen(true)}\n              />\n            ) : (\n            <ScenarioSummary\n",
"            {activeScenarioId === 'sun-moon-observation' ? (\n              <SolarScenarioSummary\n                activeName={activeExperimentName}\n                inputs={inputs}\n                isDirty={isDirty}\n                onCoordinateChange={(key, value) => handleNumberChange(key, value)}\n                onReset={resetExperiment}\n                onSave={() => setSaveDialogOpen(true)}\n              />\n            ) : activeScenarioId === 'shadow-observation' ? (\n              <ShadowScenarioSummary\n                activeName={activeExperimentName}\n                inputs={inputs}\n                isDirty={isDirty}\n                onCoordinateChange={(key, value) => handleNumberChange(key, value)}\n                onReset={resetExperiment}\n                onSave={() => setSaveDialogOpen(true)}\n              />\n            ) : (\n            <ScenarioSummary\n",
'app shadow summary render')
# right panel branch
text = replace_once(text,
"            {activeScenarioId === 'sun-moon-observation' && solarPosition && lunarPosition\n              ? <div className=\"celestial-reference-stack\">\n                  <SolarPositionPanel result={solarPosition} onShowTrace={() => setTraceModelId(solarPositionMetadata.id)} />\n                  <LunarPositionPanel result={lunarPosition} onShowTrace={() => setTraceModelId(lunarPositionMetadata.id)} />\n                </div>\n              : activeScenarioId === 'horizon'\n",
"            {activeScenarioId === 'sun-moon-observation' && solarPosition && lunarPosition\n              ? <div className=\"celestial-reference-stack\">\n                  <SolarPositionPanel result={solarPosition} onShowTrace={() => setTraceModelId(solarPositionMetadata.id)} />\n                  <LunarPositionPanel result={lunarPosition} onShowTrace={() => setTraceModelId(lunarPositionMetadata.id)} />\n                </div>\n              : activeScenarioId === 'shadow-observation' && shadowObservationResult && shadowObservationPrediction\n              ? <ShadowObservationPanel\n                  result={shadowObservationResult}\n                  prediction={shadowObservationPrediction}\n                  settings={shadowObservationSettings}\n                  onChange={(settings) => { setShadowObservationSettings(settings); setIsDirty(true); }}\n                  onShowTrace={() => setTraceModelId(shadowObservationMetadata.id)}\n                />\n              : activeScenarioId === 'horizon'\n",
'app shadow panel render')
# hide visibility-only sections for both astronomy scenarios
text = text.replace("activeScenarioId !== 'horizon' && activeScenarioId !== 'sun-moon-observation'", "activeScenarioId !== 'horizon' && !isAstronomyScenario(activeScenarioId)")
text = text.replace("activeScenarioId !== 'sun-moon-observation' && <AtmosphereProfileControl", "!isAstronomyScenario(activeScenarioId) && <AtmosphereProfileControl")
text = text.replace("activeScenarioId !== 'sun-moon-observation' && <div className=\"model-grid\">", "!isAstronomyScenario(activeScenarioId) && <div className=\"model-grid\">")
text = text.replace("activeScenarioId !== 'sun-moon-observation' && <div className=\"bottom-grid\">", "!isAstronomyScenario(activeScenarioId) && <div className=\"bottom-grid\">")
write(path, text)

# Help catalog
path = 'src/shared/help-content.ts'
text = read(path)
text = replace_once(text,
"  | 'lunar-position'\n  | 'text-experiment-setup'\n",
"  | 'lunar-position'\n  | 'shadow-observation'\n  | 'text-experiment-setup'\n",
'help panel id')
text = replace_once(text,
"  {\n    id: 'datum',\n",
"  {\n    id: 'gnomon',\n    label: 'Gnomon',\n    definition: 'Gölge deneyinde yüksekliği bilinen ve yerel düşeye paralel yerleştirilen dik çubuk/referanstır.',\n    caution: 'Gnomon düşey değilse veya ölçüm yüzeyi yatay değilse basit L = h / tan(α) geometrisi sistematik hata taşır.'\n  },\n  {\n    id: 'datum',\n",
'help gnomon term')
shadow_panel = """  {\n    id: 'shadow-observation',\n    category: 'Astronomi',\n    title: 'Gölge deneyi ve dikey gnomon',\n    summary: 'Aynı UTC/WGS84 Güneş referansından dikey gnomonun beklenen gölge uzunluğu ve yönünü üretir; isteğe bağlı saha ölçümünü yalnız kullanıcı tarafından verilen ± belirsizliklerle karşılaştırır.',\n    fields: [\n      { label: 'Gnomon yüksekliği', unit: 'm', description: 'Yerel düşeye paralel referans çubuğunun fiziksel yüksekliği.', calculationEffect: 'Beklenen gölge uzunluğunu doğrusal olarak ölçekler.' },\n      { label: 'Gözlenen gölge uzunluğu', unit: 'm', description: 'Gnomon tabanından gölge ucuna yerel yatay yüzey üzerinde ölçülen mesafe.' },\n      { label: 'Uzunluk belirsizliği', unit: 'm', description: 'Saha uzunluk ölçümünün açık ± aralığı. Girilmezse uzunluk kanalı uyum kararı üretmez.' },\n      { label: 'Gözlenen gölge azimutu', unit: '°', description: 'Gnomon tabanından gölge ucuna yön; coğrafi kuzeyden saat yönünde.' },\n      { label: 'Azimut belirsizliği', unit: '°', description: 'Gölge yönü ölçümünün açık ± açısal aralığı.' },\n      { label: 'Gölgeden türetilen Güneş yüksekliği', unit: '°', description: 'Ölçülen uzunluk ve gnomon yüksekliğinden atan2(h, L) ile bağımsız türetilen açı.' }\n    ],\n    assumptions: ['Gnomon yerel düşeye paraleldir.', 'Ölçüm yüzeyi yerel yataydır.', 'Güneş yüksekliği geometriktir; atmosferik kırılma ve topoğrafik ufuk uygulanmaz.', 'Bu astronomik referans Dünya modellerine fiziksel Güneş davranışı atamaz.'],\n    commonMistakes: ['Gölge yönünü Güneş azimutuyla aynı sanmak; gölge yaklaşık 180° ters yöndedir.', 'Gnomon yüksekliği yerine gözlemci boyunu kullanmak.', 'Belirsizlik girmeden kesin uyum/uyumsuzluk kararı beklemek.', 'Eğimli zemindeki gölgeyi yatay düzlem ölçümü gibi kullanmak.'],\n    example: '1 m dikey gnomon ve 1 m gölge, ideal yatay geometride yaklaşık 45° Güneş yüksekliğine karşılık gelir.',\n    relatedTerms: ['gnomon', 'solar-elevation', 'azimuth', 'uncertainty', 'utc-offset']\n  },\n"""
text = replace_once(text,
"  {\n    id: 'text-experiment-setup',\n",
shadow_panel + "  {\n    id: 'text-experiment-setup',\n",
'help shadow panel')
write(path, text)

# HTML report astronomy card and name
path = 'src/report/html-report.ts'
text = read(path)
text = replace_once(text,
"  'solar-position-noaa': 'Güneş Konumu · Astronomik Referans',\n  'lunar-position-low-precision': 'Ay Konumu ve Fazı · Astronomik Referans'\n",
"  'solar-position-noaa': 'Güneş Konumu · Astronomik Referans',\n  'lunar-position-low-precision': 'Ay Konumu ve Fazı · Astronomik Referans',\n  'solar-shadow-observation': 'Gölge Geometrisi · Astronomik Referans'\n",
'report shadow model name')
text = replace_once(text,
"  const isCelestial = experiment.scenarioId === 'sun-moon-observation';\n",
"  const isCelestial = experiment.scenarioId === 'sun-moon-observation';\n  const isShadowObservation = experiment.scenarioId === 'shadow-observation';\n  const isAstronomyObservation = isCelestial || isShadowObservation;\n",
'report astronomy flags')
text = replace_once(text,
"  const reportInputCards = isCelestial ? `\n    <div class=\"input-card\"><small>Gözlem zamanı · UTC</small><strong>${formatDate(experiment.observedAtIso ?? experiment.createdAtIso)}</strong></div>\n    <div class=\"input-card\"><small>UTC ofset provenansı</small><strong>${experiment.observationUtcOffsetMinutes === undefined ? 'Tanımlanmadı' : `${experiment.observationUtcOffsetMinutes >= 0 ? '+' : ''}${inputNumberFormatter.format(experiment.observationUtcOffsetMinutes / 60)} saat`}</strong></div>\n    <div class=\"input-card\"><small>Gözlemci koordinatı</small><strong>${coordinateFormatter.format(inputs.observerLatitudeDeg)}°, ${coordinateFormatter.format(inputs.observerLongitudeDeg)}°</strong></div>\n    <div class=\"input-card\"><small>6.1 hesap türü</small><strong>Geometrik Güneş konumu</strong></div>` : `\n",
"  const reportInputCards = isAstronomyObservation ? `\n    <div class=\"input-card\"><small>Gözlem zamanı · UTC</small><strong>${formatDate(experiment.observedAtIso ?? experiment.createdAtIso)}</strong></div>\n    <div class=\"input-card\"><small>UTC ofset provenansı</small><strong>${experiment.observationUtcOffsetMinutes === undefined ? 'Tanımlanmadı' : `${experiment.observationUtcOffsetMinutes >= 0 ? '+' : ''}${inputNumberFormatter.format(experiment.observationUtcOffsetMinutes / 60)} saat`}</strong></div>\n    <div class=\"input-card\"><small>Gözlemci koordinatı</small><strong>${coordinateFormatter.format(inputs.observerLatitudeDeg)}°, ${coordinateFormatter.format(inputs.observerLongitudeDeg)}°</strong></div>\n    <div class=\"input-card\"><small>${isShadowObservation ? '6.3 hesap türü' : '6.1–6.2 hesap türü'}</small><strong>${isShadowObservation ? 'Dikey gnomon gölge geometrisi' : 'Geometrik Güneş ve topocentrik Ay referansı'}</strong></div>` : `\n",
'report astronomy cards')
write(path, text)

# Version bump
path = 'package.json'
text = read(path)
text = replace_once(text, '"version": "1.9.0"', '"version": "1.10.0"', 'package version')
write(path, text)

path = 'src/preload/index.ts'
text = read(path)
text = replace_once(text, "  version: '1.9.0',", "  version: '1.10.0',", 'preload version')
write(path, text)

# Roadmap
path = 'docs/roadmap.md'
text = read(path)
anchor = "Ayrıntı: [`roadmap-stage-6.2.md`](roadmap-stage-6.2.md)\n\n### Sonraki astronomi dilimleri\n\n- Ay konumu ve evreleri\n- gölge deneyleri\n- gün doğumu ve gün batımı\n- yıldız görünürlüğü ve yıldız izleri\n"
replacement = "Ayrıntı: [`roadmap-stage-6.2.md`](roadmap-stage-6.2.md)\n\n### Aşama 6.3 — Gölge deneyi ve gnomon gözlemi\n\nDurum: tamamlandı · `1.10.0`\n\n- dikey gnomon ve yerel yatay yüzey gölge geometrisi\n- beklenen gölge uzunluğu ve kuzey referanslı yön\n- isteğe bağlı saha uzunluk/azimut ölçümü ve açık ± belirsizlikler\n- gölgeden bağımsız Güneş yüksekliği türetimi\n- Güneş ufuk altındaysa sahte doğrudan gölge üretmeme\n- Dünya modellerine tanımsız Güneş davranışı uydurmama\n- ayrı snapshot, hesap izi, reopen, `.ggl.json` ve HTML rapor korunumu\n\nAyrıntı: [`roadmap-stage-6.3.md`](roadmap-stage-6.3.md)\n\n### Sonraki astronomi dilimleri\n\n- iki konumlu eşzamanlı gölge karşılaştırması\n- gün doğumu ve gün batımı\n- yıldız görünürlüğü ve yıldız izleri\n"
text = replace_once(text, anchor, replacement, 'roadmap stage 6.3')
write(path, text)

# README status/docs
path = 'README.md'
text = read(path)
text = replace_once(text,
"- Güneş, Ay, yıldız ve tutulma deneyleri\n",
"- Gün doğumu/gün batımı, yıldız ve tutulma deneyleri\n- İki konumlu eşzamanlı gölge karşılaştırması\n",
'readme remaining astronomy')
text = replace_once(text,
"- [`docs/roadmap-stage-5.5.md`](docs/roadmap-stage-5.5.md)\n",
"- [`docs/roadmap-stage-5.5.md`](docs/roadmap-stage-5.5.md)\n- [`docs/roadmap-stage-5.6.md`](docs/roadmap-stage-5.6.md)\n- [`docs/roadmap-stage-6.1.md`](docs/roadmap-stage-6.1.md)\n- [`docs/roadmap-stage-6.2.md`](docs/roadmap-stage-6.2.md)\n- [`docs/roadmap-stage-6.3.md`](docs/roadmap-stage-6.3.md)\n",
'readme stage docs')
text = replace_once(text,
"Aktif geliştirme sürümü `1.9.0`dir.",
"Aktif geliştirme sürümü `1.10.0`dir. Güneş/Ay astronomik referanslarına ek olarak dikey gnomon gölge deneyi; beklenen gölge uzunluğu/yönü, isteğe bağlı saha ölçümü, açık ± belirsizlikler ve yeniden üretilebilir hesap iziyle çalışır. Gölge referansı Dünya modellerine tanımsız bir Güneş geometrisi uydurmaz.",
'readme version status')
write(path, text)

print('stage 6.3 integration patch applied')
