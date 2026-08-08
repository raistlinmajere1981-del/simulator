from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise RuntimeError(f'{label}: anchor missing in {path}: {old[:140]!r}')
    p.write_text(text.replace(old, new, 1))

# ---------------------------------------------------------------------------
# Saved experiment: observation instant and display offset are distinct from
# record creation/update timestamps.
# ---------------------------------------------------------------------------
replace_once(
    'src/shared/simulator.ts',
    """  createdAtIso: string;\n  updatedAtIso: string;\n  /** Scenario identity; older records default to target visibility. */""",
    """  createdAtIso: string;\n  updatedAtIso: string;\n  /** Physical observation instant. Kept separate from record creation/update time. */\n  observedAtIso?: string;\n  /** Display/provenance offset used when editing the observation local clock. */\n  observationUtcOffsetMinutes?: number;\n  /** Scenario identity; older records default to target visibility. */""",
    'saved experiment observation time'
)

# Portable parser accepts the optional additive fields without inventing them
# for legacy records.
replace_once(
    'src/shared/portable.ts',
    """    !isIsoDate(value.createdAtIso) || !isIsoDate(value.updatedAtIso) ||\n    !isRecord(value.modelVersions) ||""",
    """    !isIsoDate(value.createdAtIso) || !isIsoDate(value.updatedAtIso) ||\n    (value.observedAtIso !== undefined && !isIsoDate(value.observedAtIso)) ||\n    (value.observationUtcOffsetMinutes !== undefined &&\n      (!Number.isInteger(value.observationUtcOffsetMinutes) ||\n        value.observationUtcOffsetMinutes < -720 || value.observationUtcOffsetMinutes > 840)) ||\n    !isRecord(value.modelVersions) ||""",
    'portable observation time validation'
)
replace_once(
    'src/shared/portable.ts',
    """    createdAtIso: value.createdAtIso,\n    updatedAtIso: value.updatedAtIso,\n    ...(value.scenarioId === undefined""",
    """    createdAtIso: value.createdAtIso,\n    updatedAtIso: value.updatedAtIso,\n    ...(value.observedAtIso === undefined ? {} : { observedAtIso: value.observedAtIso }),\n    ...(value.observationUtcOffsetMinutes === undefined\n      ? {}\n      : { observationUtcOffsetMinutes: value.observationUtcOffsetMinutes }),\n    ...(value.scenarioId === undefined""",
    'portable observation time normalization'
)

# ---------------------------------------------------------------------------
# Help catalog: astronomy-specific panels and terms.
# ---------------------------------------------------------------------------
replace_once(
    'src/shared/help-content.ts',
    """  | 'scenario-summary'\n  | 'text-experiment-setup'""",
    """  | 'scenario-summary'\n  | 'celestial-time'\n  | 'solar-position'\n  | 'text-experiment-setup'""",
    'help astronomy panel ids'
)
replace_once(
    'src/shared/help-content.ts',
    """  | 'Deney'\n  | 'Fotoğraf'""",
    """  | 'Deney'\n  | 'Astronomi'\n  | 'Fotoğraf'""",
    'help astronomy category'
)
replace_once(
    'src/shared/help-content.ts',
    """  {\n    id: 'datum',""",
    """  {\n    id: 'utc-offset',\n    label: 'UTC ofseti',\n    definition: 'Yerel saat ile UTC arasındaki farktır. Aynı yerel saat farklı UTC ofsetleriyle farklı fiziksel anları temsil eder.',\n    caution: 'Astronomi hesabında saat dilimi/ofset açık olmalıdır; yalnız yerel saat metni yeniden üretilebilir bir an değildir.'\n  },\n  {\n    id: 'solar-elevation',\n    label: 'Güneş yüksekliği',\n    definition: 'Güneş merkezinin yerel geometrik ufka göre açısal yüksekliğidir. 0° geometrik ufuk, pozitif değerler ufuk üstü, negatif değerler ufuk altıdır.',\n    caution: 'Aşama 6.1 değeri atmosferik kırılma ve yerel topoğrafik ufuk düzeltmesi içermez.'\n  },\n  {\n    id: 'declination',\n    label: 'Deklinasyon',\n    definition: 'Gök cisminin gök ekvatoruna göre kuzey/güney açısal konumudur.'\n  },\n  {\n    id: 'hour-angle',\n    label: 'Saat açısı',\n    definition: 'Yerel meridyen ile gök cisminin saat dairesi arasındaki açıdır ve zaman/konumla değişir.'\n  },\n  {\n    id: 'datum',""",
    'help astronomy terms'
)
replace_once(
    'src/shared/help-content.ts',
    """  {\n    id: 'text-experiment-setup',""",
    """  {\n    id: 'celestial-time',\n    category: 'Astronomi',\n    title: 'Astronomi gözlem zamanı',\n    summary: 'Güneş/Ay/yıldız hesaplarının yeniden üretilebilir fiziksel anını yönetir. Yerel tarih-saat, açık UTC ofsetiyle UTC anına dönüştürülür.',\n    fields: [\n      { label: 'Yerel tarih / saat', description: 'Saha kaydındaki yerel takvim ve saat değeri.' },\n      { label: 'UTC ofseti', description: 'Yerel saatin UTC’den dakika/saat farkı. Hesaplanan fiziksel anı doğrudan belirler.' },\n      { label: 'UTC', description: 'Yerel saat + ofsetten türetilen ve deney kaydında kullanılan tekil fiziksel an.' }\n    ],\n    assumptions: ['UTC ofseti kullanıcı tarafından doğru seçilmiştir.', 'Bu aşamada saat dilimi adı/DST kuralı yerine açık ofset provenansı kullanılır.'],\n    commonMistakes: ['Türkiye yerel saatini UTC sanmak.', 'Eski bir gözlem için bugünkü saat dilimi ofsetini otomatik doğru kabul etmek.'],\n    example: '2026-08-08 21:30 ve UTC+03:00, 2026-08-08T18:30:00Z fiziksel anına karşılık gelir.',\n    relatedTerms: ['utc-offset', 'solar-elevation', 'hour-angle']\n  },\n  {\n    id: 'solar-position',\n    category: 'Astronomi',\n    title: 'Güneşin geometrik yerel konumu',\n    summary: 'UTC gözlem anı ve WGS84 gözlemci koordinatından Güneş merkezinin geometrik yükseklik ve azimutunu hesaplayan astronomik referanstır.',\n    fields: [\n      { label: 'Geometrik yükseklik', unit: '°', description: 'Güneş merkezinin geometrik yerel ufka göre açısı.' },\n      { label: 'Azimut', unit: '°', description: 'Coğrafi kuzeyden saat yönünde 0°–360° yön açısı.' },\n      { label: 'Deklinasyon', unit: '°', description: 'Güneşin gök ekvatoruna göre açısal konumu.' },\n      { label: 'Saat açısı', unit: '°', description: 'Güneşin yerel meridyene göre zaman açısı.' },\n      { label: 'Zaman denklemi', unit: 'dk', description: 'Ortalama güneş zamanı ile görünür güneş zamanı arasındaki astronomik fark.' }\n    ],\n    assumptions: ['NOAA Solar Calculator denklem setinin düşük maliyetli astronomik yaklaşımı kullanılır.', 'Atmosferik kırılma uygulanmaz.', 'Azimut coğrafi kuzeyden saat yönündedir.'],\n    commonMistakes: ['Geometrik 0° yüksekliği fotoğraftaki deniz ufkuyla aynı kabul etmek.', 'Negatif yüksekliği hesap hatası sanmak; bu değer Güneşin geometrik ufkun altında olduğunu gösterebilir.'],\n    example: 'Aynı koordinatta tarih veya saati değiştirince Güneş yüksekliği ve azimutu canlı olarak yeniden hesaplanır.',\n    relatedTerms: ['solar-elevation', 'azimuth', 'declination', 'hour-angle', 'utc-offset']\n  },\n  {\n    id: 'text-experiment-setup',""",
    'help astronomy panels'
)

# ---------------------------------------------------------------------------
# App integration.
# ---------------------------------------------------------------------------
path = 'src/renderer/src/AppNext.tsx'
replace_once(
    path,
    """import type { SavedPhotoCalibration } from '../../shared/photo-calibration';\n""",
    """import type { SavedPhotoCalibration } from '../../shared/photo-calibration';\nimport { systemUtcOffsetMinutes } from '../../shared/celestial-time';\n""",
    'app celestial time import'
)
replace_once(
    path,
    """  VISIBILITY_SCENARIOS,\n  getSimulationScenario,""",
    """  VISIBILITY_SCENARIOS,\n  SUN_MOON_SCENARIO,\n  getSimulationScenario,""",
    'app solar scenario import'
)
replace_once(
    path,
    """import {\n  WATER_SURFACE_APPLICATION_MODEL_ID,""",
    """import { calculateSolarPosition } from '../../simulation/solar-position';\nimport { createSolarPositionPrediction, solarPositionMetadata } from '../../simulation/solar-position-prediction';\nimport {\n  WATER_SURFACE_APPLICATION_MODEL_ID,""",
    'app solar calculation imports'
)
replace_once(
    path,
    """import { TextExperimentSetupDialog } from './TextExperimentSetupDialog';\n""",
    """import { TextExperimentSetupDialog } from './TextExperimentSetupDialog';\nimport { CelestialTimeCard } from './CelestialTimeCard';\nimport { SolarPositionPanel } from './SolarPositionPanel';\nimport { SolarScenarioSummary } from './SolarScenarioSummary';\n""",
    'app solar UI imports'
)
replace_once(
    path,
    """  { label: 'Güneş ve Ay Gözlemleri', icon: '☀', enabled: false },""",
    """  { ...SUN_MOON_SCENARIO, enabled: true },""",
    'enable sun moon scenario'
)

# Sidebar props and dynamic count.
replace_once(
    path,
    """  atmosphereMode,\n  visualLayers,\n  onScenarioChange,""",
    """  atmosphereMode,\n  visualLayers,\n  observedAtIso,\n  observationUtcOffsetMinutes,\n  onScenarioChange,""",
    'sidebar destructure celestial props'
)
replace_once(
    path,
    """  visualLayers: VisualLayerState;\n  onScenarioChange(scenarioId: SimulationScenarioId): void;""",
    """  visualLayers: VisualLayerState;\n  observedAtIso: string;\n  observationUtcOffsetMinutes: number;\n  onScenarioChange(scenarioId: SimulationScenarioId): void;\n  onObservationTimeChange(observedAtIso: string, utcOffsetMinutes: number): void;""",
    'sidebar celestial prop types'
)
replace_once(
    path,
    """  onLoadExperiment,\n  onVisualLayerChange\n}: {""",
    """  onLoadExperiment,\n  onVisualLayerChange,\n  onObservationTimeChange\n}: {""",
    'sidebar celestial callback destructure'
)
replace_once(path, '<span className="section-state">3 / 6 hazır</span>', '<span className="section-state">{scenarios.filter((scenario) => scenario.enabled).length} / {scenarios.length} hazır</span>', 'sidebar ready count')

old_models = """        {simulationModels.map((model) => {\n          const presentation = getPresentation(model.metadata.id);\n          const isProjection = model.metadata.id === 'azimuthal-projection';\n          return (\n            <div\n              className={`model-toggle ${isProjection ? 'reference-model' : ''}`}\n              key={model.metadata.id}\n            >\n              <span className={`model-dot ${presentation.tone}`} />\n              <span>{model.metadata.name}</span>\n              {isProjection ? (\n                <span className=\"reference-badge\">REFERANS</span>\n              ) : (\n                <span className=\"enabled-dot\" title=\"Hesaplamaya dahil\" />\n              )}\n            </div>\n          );\n        })}\n        <div className=\"model-toggle future-model\">\n          <span className=\"model-dot coral\" /><span>Toroidal Model</span>\n          <span className=\"future-badge\">YAKINDA</span>\n        </div>\n        <div className=\"model-toggle future-model\">\n          <span className=\"model-dot blue\" /><span>İçbükey Dünya</span>\n          <span className=\"future-badge\">YAKINDA</span>\n        </div>"""
new_models = """        {activeScenarioId === 'sun-moon-observation' ? (\n          <div className=\"model-toggle reference-model\">\n            <span className=\"model-dot amber\" />\n            <span>Güneş Konumu · Astronomik Referans</span>\n            <span className=\"reference-badge\">REFERANS</span>\n          </div>\n        ) : (<>\n          {simulationModels.map((model) => {\n            const presentation = getPresentation(model.metadata.id);\n            const isProjection = model.metadata.id === 'azimuthal-projection';\n            return (\n              <div className={`model-toggle ${isProjection ? 'reference-model' : ''}`} key={model.metadata.id}>\n                <span className={`model-dot ${presentation.tone}`} />\n                <span>{model.metadata.name}</span>\n                {isProjection ? <span className=\"reference-badge\">REFERANS</span> : <span className=\"enabled-dot\" title=\"Hesaplamaya dahil\" />}\n              </div>\n            );\n          })}\n          <div className=\"model-toggle future-model\"><span className=\"model-dot coral\" /><span>Toroidal Model</span><span className=\"future-badge\">YAKINDA</span></div>\n          <div className=\"model-toggle future-model\"><span className=\"model-dot blue\" /><span>İçbükey Dünya</span><span className=\"future-badge\">YAKINDA</span></div>\n        </>)}"""
replace_once(path, old_models, new_models, 'sidebar solar model mode')
replace_once(
    path,
    """      <section className=\"time-card disabled-section\">\n        <div className=\"section-heading\">\n          <span>Zaman ve tarih</span>\n          <span className=\"section-state\">astronomi modülü</span>\n        </div>\n        <div className=\"time-placeholder\">\n          Güneş, Ay ve yıldız deneyleri eklendiğinde etkinleşecek.\n        </div>\n      </section>""",
    """      <CelestialTimeCard\n        active={activeScenarioId === 'sun-moon-observation'}\n        observedAtIso={observedAtIso}\n        utcOffsetMinutes={observationUtcOffsetMinutes}\n        onChange={onObservationTimeChange}\n      />""",
    'active celestial time card'
)

# State and derived experiment.
replace_once(
    path,
    """  const [experimentObservedAtIso, setExperimentObservedAtIso] = useState(() => new Date().toISOString());\n""",
    """  const [experimentObservedAtIso, setExperimentObservedAtIso] = useState(() => new Date().toISOString());\n  const [observationUtcOffsetMinutes, setObservationUtcOffsetMinutes] = useState(() => systemUtcOffsetMinutes());\n""",
    'celestial offset state'
)
replace_once(
    path,
    """  const geodesic = useMemo(() => {\n    if (inputs.distanceSource !== 'coordinates') return undefined;""",
    """  const geodesic = useMemo(() => {\n    if (activeScenarioId === 'sun-moon-observation' || inputs.distanceSource !== 'coordinates') return undefined;""",
    'disable route geodesic in celestial scenario'
)
replace_once(
    path,
    """    inputs.targetLongitudeDeg\n  ]);""",
    """    inputs.targetLongitudeDeg,\n    activeScenarioId\n  ]);""",
    'geodesic scenario dependency'
)
replace_once(
    path,
    """    if (activeScenarioId === 'horizon') {""",
    """    if (activeScenarioId === 'sun-moon-observation') {\n      return {\n        id: activeExperimentId,\n        title: activeExperimentName || 'Etkileşimli güneş gözlemi',\n        type: 'celestial',\n        observer,\n        observedAtIso: experimentObservedAtIso,\n        measurements: {}\n      };\n    }\n\n    if (activeScenarioId === 'horizon') {""",
    'celestial experiment definition'
)
replace_once(
    path,
    """  const context = useMemo(() => ({""",
    """  const solarPosition = useMemo(() => activeScenarioId === 'sun-moon-observation'\n    ? calculateSolarPosition({\n        observedAtIso: experimentObservedAtIso,\n        latitudeDeg: inputs.observerLatitudeDeg,\n        longitudeDeg: inputs.observerLongitudeDeg\n      })\n    : undefined, [activeScenarioId, experimentObservedAtIso, inputs.observerLatitudeDeg, inputs.observerLongitudeDeg]);\n  const solarPositionPrediction = useMemo(() => solarPosition\n    ? createSolarPositionPrediction(activeExperimentId, solarPosition)\n    : undefined, [activeExperimentId, solarPosition]);\n\n  const context = useMemo(() => ({""",
    'solar derived result'
)
replace_once(
    path,
    """  useEffect(() => {\n    let cancelled = false;\n    setIsCalculating(true);\n    void runSimulationModels(simulationModels, experiment, context).then((nextRuns) => {""",
    """  useEffect(() => {\n    if (activeScenarioId === 'sun-moon-observation') {\n      setRuns([]);\n      setIsCalculating(false);\n      return;\n    }\n    let cancelled = false;\n    setIsCalculating(true);\n    void runSimulationModels(simulationModels, experiment, context).then((nextRuns) => {""",
    'skip surface models in celestial scenario'
)
replace_once(path, """  }, [context, experiment]);""", """  }, [activeScenarioId, context, experiment]);""", 'simulation effect scenario dependency')

# All new experiment transitions get a current display offset too.
p = Path(path)
text = p.read_text()
text = text.replace(
    "setExperimentObservedAtIso(new Date().toISOString());",
    "setExperimentObservedAtIso(new Date().toISOString());\n      setObservationUtcOffsetMinutes(systemUtcOffsetMinutes());"
)
p.write_text(text)

# Load/reopen must use observation time, not record creation time.
p = Path(path)
text = p.read_text().replace(
    "setExperimentObservedAtIso(saved.createdAtIso);",
    "setExperimentObservedAtIso(saved.observedAtIso ?? saved.createdAtIso);\n    setObservationUtcOffsetMinutes(saved.observationUtcOffsetMinutes ?? systemUtcOffsetMinutes(new Date(saved.observedAtIso ?? saved.createdAtIso)));"
)
p.write_text(text)

# Save fields and solar snapshot/version.
replace_once(
    path,
    """      createdAtIso: existing?.createdAtIso ?? experimentObservedAtIso,\n      updatedAtIso: now,\n      scenarioId: activeScenarioId,""",
    """      createdAtIso: existing?.createdAtIso ?? now,\n      updatedAtIso: now,\n      observedAtIso: experimentObservedAtIso,\n      observationUtcOffsetMinutes,\n      scenarioId: activeScenarioId,""",
    'save observation instant'
)
replace_once(
    path,
    """        [geodesicMetadata.id, geodesicMetadata.version],\n        ...(geoidConversionRecord""",
    """        [geodesicMetadata.id, geodesicMetadata.version],\n        ...(solarPositionPrediction\n          ? [[solarPositionMetadata.id, solarPositionMetadata.version] as const]\n          : []),\n        ...(geoidConversionRecord""",
    'save solar version'
)
replace_once(
    path,
    """      predictions: [\n        ...runs.map((run) => run.prediction),""",
    """      predictions: [\n        ...(solarPositionPrediction ? [solarPositionPrediction] : []),\n        ...runs.map((run) => run.prediction),""",
    'save solar prediction'
)

# Trace dialog understands solar reference.
replace_once(
    path,
    """  const selectedMetadata = traceModelId === geodesicMetadata.id\n    ? geodesicMetadata""",
    """  const selectedMetadata = traceModelId === solarPositionMetadata.id\n    ? solarPositionMetadata\n    : traceModelId === geodesicMetadata.id\n    ? geodesicMetadata""",
    'solar trace metadata'
)
replace_once(
    path,
    """  const selectedPrediction = traceModelId === geodesicMetadata.id\n    ? geoPrediction""",
    """  const selectedPrediction = traceModelId === solarPositionMetadata.id\n    ? solarPositionPrediction\n    : traceModelId === geodesicMetadata.id\n    ? geoPrediction""",
    'solar trace prediction'
)

# Shared reset function used by both visibility and celestial summaries.
replace_once(
    path,
    """  return (\n    <HelpProvider""",
    """  const resetExperiment = (): void => {\n    setInputs(DEFAULT_SIMULATOR_INPUTS);\n    setAtmosphereState(createDefaultAtmosphereExperimentState('standard'));\n    setManualTerrainPoints(defaultTerrainPoints());\n    setTerrainProfileSource(undefined);\n    setGeoidConversionRecord(undefined);\n    setWaterObservationRecord(undefined);\n    setWaterApplicationRecord(undefined);\n    setPhotoCalibration(undefined);\n    setPhotoCalibrationRecord(undefined);\n    setPhotoModelUncertainty({ ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS });\n    setTextSetupHistory([]);\n    setModelAngularUncertaintyById({});\n    setModelUncertaintyError(undefined);\n    setActiveExperimentId(crypto.randomUUID());\n    setActiveExperimentName('');\n    setExperimentObservedAtIso(new Date().toISOString());\n    setObservationUtcOffsetMinutes(systemUtcOffsetMinutes());\n    setIsDirty(false);\n    setStorageMessage('Yeni deney hazırlandı.');\n  };\n\n  return (\n    <HelpProvider""",
    'shared reset function'
)

# Sidebar props.
replace_once(
    path,
    """          atmosphereMode={atmosphereState.mode}\n          visualLayers={visualLayers}\n          onScenarioChange""",
    """          atmosphereMode={atmosphereState.mode}\n          visualLayers={visualLayers}\n          observedAtIso={experimentObservedAtIso}\n          observationUtcOffsetMinutes={observationUtcOffsetMinutes}\n          onObservationTimeChange={(observedAtIso, utcOffsetMinutes) => {\n            setExperimentObservedAtIso(observedAtIso);\n            setObservationUtcOffsetMinutes(utcOffsetMinutes);\n            setIsDirty(true);\n          }}\n          onScenarioChange""",
    'sidebar observation props'
)

# Replace existing inline reset with shared function. The prior global time reset
# insertion may have added an offset line; match both versions defensively.
p = Path(path)
text = p.read_text()
start = """              onReset={() => {\n                setInputs(DEFAULT_SIMULATOR_INPUTS);"""
end = """                setStorageMessage('Yeni deney hazırlandı.');\n              }}\n              onSave={() => setSaveDialogOpen(true)}"""
if start not in text or end not in text:
    raise RuntimeError('scenario reset block anchors missing')
before, rest = text.split(start, 1)
_, after = rest.split(end, 1)
text = before + """              onReset={resetExperiment}\n              onSave={() => setSaveDialogOpen(true)}""" + after
p.write_text(text)

# Celestial summary replaces the visibility summary only for this scenario.
replace_once(
    path,
    """            <ScenarioSummary\n              scenarioId={activeScenarioId}""",
    """            {activeScenarioId === 'sun-moon-observation' ? (\n              <SolarScenarioSummary\n                activeName={activeExperimentName}\n                inputs={inputs}\n                isDirty={isDirty}\n                onCoordinateChange={(key, value) => handleNumberChange(key, value)}\n                onReset={resetExperiment}\n                onSave={() => setSaveDialogOpen(true)}\n              />\n            ) : (\n            <ScenarioSummary\n              scenarioId={activeScenarioId}""",
    'open celestial summary conditional'
)
replace_once(
    path,
    """              onShowGeodesicTrace={() => setTraceModelId(geodesicMetadata.id)}\n            />\n            {activeScenarioId === 'horizon'""",
    """              onShowGeodesicTrace={() => setTraceModelId(geodesicMetadata.id)}\n            />\n            )}\n            {activeScenarioId === 'sun-moon-observation' && solarPosition\n              ? <SolarPositionPanel result={solarPosition} onShowTrace={() => setTraceModelId(solarPositionMetadata.id)} />\n              : activeScenarioId === 'horizon'""",
    'close celestial summary and add solar result'
)

# Visibility-only panels stay out of the celestial workflow.
p = Path(path)
text = p.read_text().replace(
    "activeScenarioId !== 'horizon' && (",
    "activeScenarioId !== 'horizon' && activeScenarioId !== 'sun-moon-observation' && ("
).replace(
    "activeScenarioId !== 'horizon' && <TerrainPanel",
    "activeScenarioId !== 'horizon' && activeScenarioId !== 'sun-moon-observation' && <TerrainPanel"
).replace(
    "activeScenarioId !== 'horizon' && <WaterSurfaceControl",
    "activeScenarioId !== 'horizon' && activeScenarioId !== 'sun-moon-observation' && <WaterSurfaceControl"
)
p.write_text(text)

# Atmosphere editor is not part of the geometric solar reference.
replace_once(
    path,
    """          <AtmosphereProfileControl\n            state={atmosphereState}""",
    """          {activeScenarioId !== 'sun-moon-observation' && <AtmosphereProfileControl\n            state={atmosphereState}""",
    'wrap atmosphere panel for celestial'
)
replace_once(
    path,
    """              setIsDirty(true);\n            }}\n          />\n\n          {activeScenarioId !== 'horizon'""",
    """              setIsDirty(true);\n            }}\n          />}\n\n          {activeScenarioId !== 'horizon'""",
    'close atmosphere celestial wrapper'
)

# Hide surface-model cards and result table in the astronomy-reference-only 6.1 workflow.
replace_once(path, '          <div className="model-grid">', "          {activeScenarioId !== 'sun-moon-observation' && <div className=\"model-grid\">", 'wrap model grid')
replace_once(
    path,
    """          </div>\n\n          {photoCalibrationRecord && (""",
    """          </div>}\n\n          {photoCalibrationRecord && (""",
    'close model grid wrapper'
)
replace_once(path, '          <div className="bottom-grid">', "          {activeScenarioId !== 'sun-moon-observation' && <div className=\"bottom-grid\">", 'wrap bottom grid')
replace_once(
    path,
    """          </div>\n        </main>\n      </div>\n\n      <TextExperimentSetupDialog""",
    """          </div>}\n        </main>\n      </div>\n\n      <TextExperimentSetupDialog""",
    'close bottom grid wrapper'
)

# ---------------------------------------------------------------------------
# Report: solar model name and scenario-specific header inputs.
# ---------------------------------------------------------------------------
replace_once(
    'src/report/html-report.ts',
    """  'photo-calibration': 'Fotoğraf / Kamera Kalibrasyonu'""",
    """  'photo-calibration': 'Fotoğraf / Kamera Kalibrasyonu',\n  'solar-position-noaa': 'Güneş Konumu · Astronomik Referans'""",
    'report solar model name'
)
replace_once(
    'src/report/html-report.ts',
    """  const coordinateCards = inputs.distanceSource === 'coordinates' ? `""",
    """  const isCelestial = experiment.scenarioId === 'sun-moon-observation';\n  const coordinateCards = inputs.distanceSource === 'coordinates' ? `""",
    'report celestial flag'
)
replace_once(
    'src/report/html-report.ts',
    """    <div class=\"input-card\"><small>Mesafe kaynağı</small><strong>Manuel giriş</strong></div>`;\n\n  return `<!doctype html>""",
    """    <div class=\"input-card\"><small>Mesafe kaynağı</small><strong>Manuel giriş</strong></div>`;\n  const reportInputCards = isCelestial ? `\n    <div class=\"input-card\"><small>Gözlem zamanı · UTC</small><strong>${formatDate(experiment.observedAtIso ?? experiment.createdAtIso)}</strong></div>\n    <div class=\"input-card\"><small>UTC ofset provenansı</small><strong>${experiment.observationUtcOffsetMinutes === undefined ? 'Tanımlanmadı' : `${experiment.observationUtcOffsetMinutes >= 0 ? '+' : ''}${inputNumberFormatter.format(experiment.observationUtcOffsetMinutes / 60)} saat`}</strong></div>\n    <div class=\"input-card\"><small>Gözlemci koordinatı</small><strong>${coordinateFormatter.format(inputs.observerLatitudeDeg)}°, ${coordinateFormatter.format(inputs.observerLongitudeDeg)}°</strong></div>\n    <div class=\"input-card\"><small>6.1 hesap türü</small><strong>Geometrik Güneş konumu</strong></div>` : `\n    <div class=\"input-card\"><small>Göz yüksekliği</small><strong>${inputNumberFormatter.format(inputs.observerHeightM)} m</strong></div>\n    <div class=\"input-card\"><small>Hedef yüksekliği</small><strong>${inputNumberFormatter.format(inputs.targetHeightM)} m</strong></div>\n    <div class=\"input-card\"><small>Yüzey mesafesi</small><strong>${inputNumberFormatter.format(effectiveDistanceKm)} km</strong></div>\n    <div class=\"input-card\"><small>Gözlenen görünürlük</small><strong>%${inputNumberFormatter.format(inputs.observedVisiblePercent)}</strong></div>\n    <div class=\"input-card\"><small>Gözlem belirsizliği</small><strong>±%${inputNumberFormatter.format(inputs.observationUncertaintyPercent)}</strong></div>\n    <div class=\"input-card\"><small>Atmosfer</small><strong>${inputs.useStandardRefraction ? `Standart kırılma (k=${inputNumberFormatter.format(inputs.refractionCoefficient)})` : 'Kapalı'}</strong></div>\n    ${coordinateCards}`;\n\n  return `<!doctype html>""",
    'report scenario input cards'
)
old_cards = """        <div class=\"input-card\"><small>Göz yüksekliği</small><strong>${inputNumberFormatter.format(inputs.observerHeightM)} m</strong></div>\n        <div class=\"input-card\"><small>Hedef yüksekliği</small><strong>${inputNumberFormatter.format(inputs.targetHeightM)} m</strong></div>\n        <div class=\"input-card\"><small>Yüzey mesafesi</small><strong>${inputNumberFormatter.format(effectiveDistanceKm)} km</strong></div>\n        <div class=\"input-card\"><small>Gözlenen görünürlük</small><strong>%${inputNumberFormatter.format(inputs.observedVisiblePercent)}</strong></div>\n        <div class=\"input-card\"><small>Gözlem belirsizliği</small><strong>±%${inputNumberFormatter.format(inputs.observationUncertaintyPercent)}</strong></div>\n        <div class=\"input-card\"><small>Atmosfer</small><strong>${inputs.useStandardRefraction ? `Standart kırılma (k=${inputNumberFormatter.format(inputs.refractionCoefficient)})` : 'Kapalı'}</strong></div>\n        ${coordinateCards}"""
replace_once('src/report/html-report.ts', old_cards, '        ${reportInputCards}', 'report header cards')

# ---------------------------------------------------------------------------
# Version/docs.
# ---------------------------------------------------------------------------
p = Path('package.json')
p.write_text(p.read_text().replace('"version": "1.7.0"', '"version": "1.8.0"', 1))
p = Path('src/preload/index.ts')
p.write_text(p.read_text().replace("version: '1.7.0'", "version: '1.8.0'", 1))
Path('docs/roadmap-stage-6.1.md').write_text('''# Aşama 6.1 — Güneş konumu, gözlem zamanı ve konumu\n\nSürüm: `1.8.0`\n\nBu aşamada Güneş ve Ay Gözlemleri senaryosunun ilk fiziksel referans hesabı etkinleştirildi.\n\n## Kapsam\n\n- ayrı `sun-moon-observation` senaryo kimliği ve `celestial` deney türü\n- yerel tarih/saat + açık UTC ofsetinden yeniden üretilebilir UTC gözlem anı\n- WGS84 gözlemci enlem/boylamı\n- NOAA Solar Calculator denklem setiyle Güneşin geometrik yerel yüksekliği ve azimutu\n- deklinasyon, saat açısı, zenit açısı ve zaman denklemi tanıları\n- ayrı hesap izi ve model sürüm/provenans snapshot'ı\n- gözlem zamanını kayıt oluşturma/güncelleme zamanından ayıran `observedAtIso` alanı\n- tarih/saat ve gösterim ofsetinin yerel/portable deney kaydında korunması\n- senaryoya özel HTML rapor özeti\n- bağlamsal yardım panelleri\n\n## Bilimsel sınır\n\n6.1 sonucu geometrik astronomik referanstır. Atmosferik kırılma, topoğrafik ufuk, Güneş diskinin görünür kenarı, gölge geometrisi ve Dünya şekli modellerinin ayrı Güneş tahminleri bu aşamada sonuca karıştırılmaz. Bu ayrım daha sonraki karşılaştırmalı astronomi aşamalarının aynı girdiler üzerinde izlenebilir kurulmasını sağlar.\n\nAy konumu 6.2 kapsamındadır.\n''')

# Roadmap Stage 6 becomes explicit.
p = Path('docs/roadmap.md')
text = p.read_text()
old = """## Aşama 6 — Güneş, Ay ve gökyüzü deneyleri\n\n- Güneş yüksekliği ve azimutu\n- gölge deneyleri\n- gün doğumu ve gün batımı\n- Ay konumu ve evreleri\n- yıldız görünürlüğü ve yıldız izleri"""
new = """## Aşama 6 — Güneş, Ay ve gökyüzü deneyleri\n\n### Aşama 6.1 — Güneş konumu, gözlem zamanı ve konumu\n\nDurum: tamamlandı · `1.8.0`\n\n- açık UTC ofsetli gözlem zamanı ve WGS84 gözlem konumu\n- geometrik Güneş yüksekliği ve azimutu\n- deklinasyon, saat açısı, zaman denklemi ve hesap izi\n- gözlem zamanı/provenansının kayıt ve raporda korunması\n\nAyrıntı: [`roadmap-stage-6.1.md`](roadmap-stage-6.1.md)\n\n### Sonraki astronomi dilimleri\n\n- Ay konumu ve evreleri\n- gölge deneyleri\n- gün doğumu ve gün batımı\n- yıldız görünürlüğü ve yıldız izleri"""
if old not in text:
    raise RuntimeError('roadmap stage 6 anchor missing')
p.write_text(text.replace(old, new, 1))

p = Path('README.md')
text = p.read_text()
text = text.replace('Aktif geliştirme sürümü `1.7.0`dir.', 'Aktif geliştirme sürümü `1.8.0`dir.', 1)
if 'roadmap-stage-6.1.md' not in text:
    marker = '- [`docs/roadmap-stage-5.6.md`](docs/roadmap-stage-5.6.md)'
    if marker in text:
        text = text.replace(marker, marker + '\n- [`docs/roadmap-stage-6.1.md`](docs/roadmap-stage-6.1.md)', 1)
p.write_text(text)

# Remove one-off patch machinery from product history after applying.
Path('scripts/apply_stage_6_1_ui.py').unlink(missing_ok=True)
Path('.github/workflows/apply-stage-6-1-ui.yml').unlink(missing_ok=True)
