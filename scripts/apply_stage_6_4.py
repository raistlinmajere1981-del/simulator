from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        if new in text:
            return
        raise RuntimeError(f'{label}: anchor not found in {path}')
    p.write_text(text.replace(old, new, 1))

# App imports and state.
path = 'src/renderer/src/AppNext.tsx'
replace_once(
    path,
    """  type ShadowObservationSettings\n} from '../../simulation/shadow-observation';\nimport {\n  WATER_SURFACE_APPLICATION_MODEL_ID,""",
    """  type ShadowObservationSettings\n} from '../../simulation/shadow-observation';\nimport {\n  DUAL_SHADOW_COMPARISON_MODEL_ID,\n  calculateDualShadowComparison,\n  createDefaultDualShadowComparisonSettings,\n  createDualShadowComparisonPrediction,\n  dualShadowComparisonMetadata,\n  readDualShadowComparisonSettings,\n  type DualShadowComparisonSettings\n} from '../../simulation/dual-shadow-comparison';\nimport {\n  WATER_SURFACE_APPLICATION_MODEL_ID,""",
    'dual shadow imports'
)
replace_once(
    path,
    """import { ShadowObservationPanel } from './ShadowObservationPanel';\n\ntype ModelTone""",
    """import { ShadowObservationPanel } from './ShadowObservationPanel';\nimport { DualShadowComparisonPanel } from './DualShadowComparisonPanel';\n\ntype ModelTone""",
    'dual shadow panel import'
)
replace_once(
    path,
    """  const [shadowObservationSettings, setShadowObservationSettings] = useState<ShadowObservationSettings>(() => ({ ...DEFAULT_SHADOW_OBSERVATION_SETTINGS }));\n  const [manualTerrainPoints,""",
    """  const [shadowObservationSettings, setShadowObservationSettings] = useState<ShadowObservationSettings>(() => ({ ...DEFAULT_SHADOW_OBSERVATION_SETTINGS }));\n  const [dualShadowSettings, setDualShadowSettings] = useState<DualShadowComparisonSettings>();\n  const [manualTerrainPoints,""",
    'dual shadow state'
)

# Computed result/prediction.
replace_once(
    path,
    """  const shadowObservationPrediction = useMemo(() => shadowObservationResult\n    ? createShadowObservationPrediction(shadowObservationResult)\n    : undefined, [shadowObservationResult]);\n\n  const context = useMemo(() => ({""",
    """  const shadowObservationPrediction = useMemo(() => shadowObservationResult\n    ? createShadowObservationPrediction(shadowObservationResult)\n    : undefined, [shadowObservationResult]);\n  const dualShadowComparisonResult = useMemo(() => activeScenarioId === 'shadow-observation' && dualShadowSettings\n    ? calculateDualShadowComparison({\n        experimentId: activeExperimentId,\n        observedAtIso: experimentObservedAtIso,\n        stationA: {\n          latitudeDeg: inputs.observerLatitudeDeg,\n          longitudeDeg: inputs.observerLongitudeDeg,\n          ...shadowObservationSettings\n        },\n        stationB: dualShadowSettings.stationB\n      })\n    : undefined, [activeExperimentId, activeScenarioId, dualShadowSettings, experimentObservedAtIso, inputs.observerLatitudeDeg, inputs.observerLongitudeDeg, shadowObservationSettings]);\n  const dualShadowComparisonPrediction = useMemo(() => dualShadowComparisonResult\n    ? createDualShadowComparisonPrediction(dualShadowComparisonResult)\n    : undefined, [dualShadowComparisonResult]);\n\n  const context = useMemo(() => ({""",
    'dual shadow computation'
)

# Load/reopen.
replace_once(
    path,
    """    const shadowPrediction = saved.predictions.find(\n      (prediction) => prediction.modelId === SHADOW_OBSERVATION_MODEL_ID\n    );\n    setActiveScenarioId(normalizeSimulationScenarioId(saved.scenarioId));\n    setShadowObservationSettings(readShadowObservationSettings(shadowPrediction));""",
    """    const shadowPrediction = saved.predictions.find(\n      (prediction) => prediction.modelId === SHADOW_OBSERVATION_MODEL_ID\n    );\n    const dualShadowPrediction = saved.predictions.find(\n      (prediction) => prediction.modelId === DUAL_SHADOW_COMPARISON_MODEL_ID\n    );\n    setActiveScenarioId(normalizeSimulationScenarioId(saved.scenarioId));\n    setShadowObservationSettings(readShadowObservationSettings(shadowPrediction));\n    setDualShadowSettings(readDualShadowComparisonSettings(dualShadowPrediction));""",
    'load dual shadow'
)
replace_once(
    path,
    """      const savedShadowPrediction = saved.predictions.find(\n        (prediction) => prediction.modelId === SHADOW_OBSERVATION_MODEL_ID\n      );\n      setSavedExperiments((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);""",
    """      const savedShadowPrediction = saved.predictions.find(\n        (prediction) => prediction.modelId === SHADOW_OBSERVATION_MODEL_ID\n      );\n      const savedDualShadowPrediction = saved.predictions.find(\n        (prediction) => prediction.modelId === DUAL_SHADOW_COMPARISON_MODEL_ID\n      );\n      setSavedExperiments((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);""",
    'save result dual shadow lookup'
)
replace_once(
    path,
    """      setShadowObservationSettings(readShadowObservationSettings(savedShadowPrediction));\n      setExperimentObservedAtIso""",
    """      setShadowObservationSettings(readShadowObservationSettings(savedShadowPrediction));\n      setDualShadowSettings(readDualShadowComparisonSettings(savedDualShadowPrediction));\n      setExperimentObservedAtIso""",
    'save result dual shadow state'
)

# Model versions and predictions.
replace_once(
    path,
    """        ...(shadowObservationPrediction\n          ? [[shadowObservationMetadata.id, shadowObservationMetadata.version] as const]\n          : []),\n        ...(geoidConversionRecord""",
    """        ...(shadowObservationPrediction\n          ? [[shadowObservationMetadata.id, shadowObservationMetadata.version] as const]\n          : []),\n        ...(dualShadowComparisonPrediction\n          ? [[dualShadowComparisonMetadata.id, dualShadowComparisonMetadata.version] as const]\n          : []),\n        ...(geoidConversionRecord""",
    'dual shadow model version'
)
replace_once(
    path,
    """        ...(shadowObservationPrediction ? [shadowObservationPrediction] : []),\n        ...runs.map""",
    """        ...(shadowObservationPrediction ? [shadowObservationPrediction] : []),\n        ...(dualShadowComparisonPrediction ? [dualShadowComparisonPrediction] : []),\n        ...runs.map""",
    'dual shadow prediction save'
)

# Reset all shadow-scenario working state whenever the primary shadow state resets.
p = Path(path)
text = p.read_text()
text = text.replace(
    "setShadowObservationSettings({ ...DEFAULT_SHADOW_OBSERVATION_SETTINGS });",
    "setShadowObservationSettings({ ...DEFAULT_SHADOW_OBSERVATION_SETTINGS });\n      setDualShadowSettings(undefined);"
)
p.write_text(text)

# Trace metadata/prediction routing.
replace_once(
    path,
    """      : traceModelId === shadowObservationMetadata.id\n        ? shadowObservationMetadata\n        : traceModelId === geodesicMetadata.id""",
    """      : traceModelId === shadowObservationMetadata.id\n        ? shadowObservationMetadata\n        : traceModelId === dualShadowComparisonMetadata.id\n          ? dualShadowComparisonMetadata\n          : traceModelId === geodesicMetadata.id""",
    'dual shadow trace metadata'
)
replace_once(
    path,
    """      : traceModelId === shadowObservationMetadata.id\n        ? shadowObservationPrediction\n        : traceModelId === geodesicMetadata.id""",
    """      : traceModelId === shadowObservationMetadata.id\n        ? shadowObservationPrediction\n        : traceModelId === dualShadowComparisonMetadata.id\n          ? dualShadowComparisonPrediction\n          : traceModelId === geodesicMetadata.id""",
    'dual shadow trace prediction'
)

# Render the optional B-point comparison below the existing single-station panel.
replace_once(
    path,
    """              ? <ShadowObservationPanel\n                  result={shadowObservationResult}\n                  prediction={shadowObservationPrediction}\n                  settings={shadowObservationSettings}\n                  onChange={(settings) => { setShadowObservationSettings(settings); setIsDirty(true); }}\n                  onShowTrace={() => setTraceModelId(shadowObservationMetadata.id)}\n                />\n              : activeScenarioId === 'horizon'""",
    """              ? <>\n                  <ShadowObservationPanel\n                    result={shadowObservationResult}\n                    prediction={shadowObservationPrediction}\n                    settings={shadowObservationSettings}\n                    onChange={(settings) => { setShadowObservationSettings(settings); setIsDirty(true); }}\n                    onShowTrace={() => setTraceModelId(shadowObservationMetadata.id)}\n                  />\n                  <DualShadowComparisonPanel\n                    primaryResult={shadowObservationResult}\n                    settings={dualShadowSettings}\n                    result={dualShadowComparisonResult}\n                    prediction={dualShadowComparisonPrediction}\n                    onEnable={() => {\n                      setDualShadowSettings(createDefaultDualShadowComparisonSettings(inputs.observerLatitudeDeg, inputs.observerLongitudeDeg));\n                      setIsDirty(true);\n                    }}\n                    onDisable={() => { setDualShadowSettings(undefined); setIsDirty(true); }}\n                    onChange={(settings) => { setDualShadowSettings(settings); setIsDirty(true); }}\n                    onShowTrace={() => setTraceModelId(dualShadowComparisonMetadata.id)}\n                  />\n                </>\n              : activeScenarioId === 'horizon'""",
    'dual shadow panel render'
)

# Help content: register the new panel and explanatory entry.
path = 'src/shared/help-content.ts'
replace_once(
    path,
    """  | 'shadow-observation'\n  | 'text-experiment-setup'""",
    """  | 'shadow-observation'\n  | 'dual-shadow-comparison'\n  | 'text-experiment-setup'""",
    'dual shadow help id'
)
replace_once(
    path,
    """    relatedTerms: ['gnomon', 'solar-elevation', 'azimuth', 'uncertainty', 'utc-offset']\n  },\n  {""",
    """    relatedTerms: ['gnomon', 'solar-elevation', 'azimuth', 'uncertainty', 'utc-offset']\n  },\n  {\n    id: 'dual-shadow-comparison',\n    category: 'Astronomi',\n    title: 'İki konumlu eşzamanlı gölge karşılaştırması',\n    summary: 'A ve B noktalarındaki dikey gnomon gölgelerini aynı UTC fiziksel anında çözer; farklı gnomon yüksekliklerini açıya dönüştürerek ortak bir karşılaştırma kanalı üretir.',\n    fields: [\n      { label: 'B enlem / boylam', unit: '°', description: 'İkinci saha gözlem noktasının WGS84 koordinatları.' },\n      { label: 'B gnomon yüksekliği', unit: 'm', description: 'İkinci noktadaki dikey referansın fiziksel yüksekliği. A ile aynı olmak zorunda değildir.' },\n      { label: 'B gözlenen gölge', unit: 'm', description: 'İkinci noktada aynı UTC anında ölçülen gölge uzunluğu.' },\n      { label: 'WGS84 nokta ayrımı', unit: 'km', description: 'A ile B arasındaki jeodezik referans mesafesi; model tahmini değil ölçüm bağlamıdır.' },\n      { label: 'Güneş yükseklik farkı B−A', unit: '°', description: 'İki geometrik Güneş yüksekliği arasındaki eşzamanlı fark.' },\n      { label: 'Gözlenen gölgelerden fark', unit: '°', description: 'Her gölgede atan2(h,L) ile türetilen Güneş yüksekliklerinin farkı.' }\n    ],\n    assumptions: ['İki istasyon aynı UTC fiziksel anını temsil eder.', 'Her iki gnomon yerel düşeye paraleldir ve ölçüm yüzeyleri yerel yataydır.', 'Atmosferik kırılma ve topoğrafik ufuk uygulanmaz.', 'WGS84 baz çizgisi bir referanstır; Dünya şekli modellerine otomatik Güneş kuralı atanmaz.'],\n    commonMistakes: ['Yerel saatleri aynı yazarak farklı saat dilimlerindeki gözlemleri eşzamanlı sanmak.', 'Farklı gnomon yüksekliklerindeki ham gölge uzunluklarını doğrudan karşılaştırmak.', 'Belirsizlik girmeden fark uyumu hakkında kesin karar beklemek.', 'Bu referans hesabından doğrudan Dünya yarıçapı veya şekli sonucu çıkarmak.'],\n    example: 'A noktasında 1 m, B noktasında 2 m gnomon kullanılabilir; gölgeler ham metre değerleri yerine her noktadan türetilen Güneş yüksekliği üzerinden karşılaştırılır.',\n    relatedTerms: ['gnomon', 'solar-elevation', 'azimuth', 'geodesic', 'uncertainty', 'utc-offset']\n  },\n  {""",
    'dual shadow help content'
)

# Report display name.
path = 'src/report/html-report.ts'
replace_once(
    path,
    """  'solar-shadow-observation': 'Gölge Geometrisi · Astronomik Referans'\n};""",
    """  'solar-shadow-observation': 'Gölge Geometrisi · Astronomik Referans',\n  'dual-shadow-comparison': 'İki Konumlu Gölge Karşılaştırması · Astronomik Referans'\n};""",
    'dual shadow report name'
)

# Shadow scenario note.
path = 'src/renderer/src/ShadowScenarioSummary.tsx'
replace_once(
    path,
    """        Dikey bir gnomonun yerel yatay yüzeyde oluşturacağı gölge geometrisi hesaplanır. Tarih/saat sol alttaki Zaman ve tarih kartından yönetilir. Bu astronomik referans herhangi bir Dünya modeli için fiziksel Güneş kuralı uydurmaz.""",
    """        Dikey bir gnomonun yerel yatay yüzeyde oluşturacağı gölge geometrisi hesaplanır. İstersen ikinci WGS84 gözlem noktasını aynı UTC anında eşzamanlı karşılaştırmaya ekleyebilirsin. Tarih/saat sol alttaki Zaman ve tarih kartından yönetilir. Bu astronomik referans herhangi bir Dünya modeli için fiziksel Güneş kuralı uydurmaz.""",
    'shadow scenario 6.4 note'
)

# Version bump.
path = 'package.json'
p = Path(path)
text = p.read_text()
if '"version": "1.10.0"' in text:
    text = text.replace('"version": "1.10.0"', '"version": "1.11.0"', 1)
p.write_text(text)
path = 'src/preload/index.ts'
p = Path(path)
text = p.read_text()
if "version: '1.10.0'" in text:
    text = text.replace("version: '1.10.0'", "version: '1.11.0'", 1)
p.write_text(text)

# Roadmap and README status.
Path('docs/roadmap-stage-6.4.md').write_text('''# Aşama 6.4 — İki konumlu eşzamanlı gölge karşılaştırması\n\nDurum: tamamlandı · `1.11.0`\n\n## Amaç\n\nİki ayrı WGS84 gözlem noktasındaki dikey gnomon gölgelerini aynı UTC fiziksel anında izlenebilir biçimde karşılaştırmak; farklı gnomon yüksekliklerini ortak açısal gözlem kanalına dönüştürmek.\n\n## Kapsam\n\n- Gölge Deneyi içinde opsiyonel B gözlem noktası\n- A ve B için aynı UTC gözlem anı\n- B enlem/boylam ve gnomon yüksekliği\n- B için isteğe bağlı gölge uzunluğu/azimutu ve açık ± belirsizlikler\n- A ve B Güneş/gölge çözümlerinin bağımsız hesaplanması\n- WGS84 jeodezik baz çizgisi ve A→B başlangıç azimutu\n- gnomon yüksekliğinden bağımsız `L/h = cot(α)` gölge oranı\n- iki saha gölgesinden türetilen Güneş yükseklik farkı\n- iki uzunluk belirsizliğinin koruyucu açı farkı zarfına yayılması\n- gölge yönü farkı ve varsa açık azimut belirsizlikleriyle karşılaştırma\n- ayrı prediction snapshot, hesap izi, reopen, `.ggl.json` ve HTML rapor korunumu\n\n## Bilimsel sınır\n\nBu aşama WGS84 baz çizgisi ve mevcut geometrik Güneş referansını ölçüm bağlamı olarak kullanır. Bunlar İdeal Küre, Tanımlı Düzlem veya başka bir Dünya modelinin Güneş davranışı değildir. Bir Dünya şekli modeli eşzamanlı gölge deneyine fiziksel tahmin üretmek için kendi Güneş/ışık geometrisini açıkça tanımlamalıdır.\n\nAtmosferik kırılma, yerel topoğrafik ufuk, gnomon düşeylik hatası, eğimli ölçüm yüzeyi ve iki istasyondaki zaman senkronizasyon hatası bu aşamada otomatik düzeltme olarak uygulanmaz.\n\n## Sonraki adım\n\n- gün doğumu/gün batımı olay geometrisi\n- yıldız görünürlüğü ve yıldız izleri\n''')

path = 'README.md'
p = Path(path)
text = p.read_text()
if '- [`docs/roadmap-stage-6.3.md`](docs/roadmap-stage-6.3.md)' in text and 'roadmap-stage-6.4.md' not in text:
    text = text.replace('- [`docs/roadmap-stage-6.3.md`](docs/roadmap-stage-6.3.md)', '- [`docs/roadmap-stage-6.3.md`](docs/roadmap-stage-6.3.md)\n- [`docs/roadmap-stage-6.4.md`](docs/roadmap-stage-6.4.md)', 1)
text = text.replace('Aktif geliştirme sürümü `1.10.0`dir.', 'Aktif geliştirme sürümü `1.11.0`dir.', 1)
text = text.replace('- İki konumlu eşzamanlı gölge karşılaştırması\n', '', 1)
p.write_text(text)

path = 'docs/roadmap.md'
p = Path(path)
text = p.read_text()
anchor = """Ayrıntı: [`roadmap-stage-6.3.md`](roadmap-stage-6.3.md)\n\n### Sonraki astronomi dilimleri\n\n- iki konumlu eşzamanlı gölge karşılaştırması\n- gün doğumu ve gün batımı"""
replacement = """Ayrıntı: [`roadmap-stage-6.3.md`](roadmap-stage-6.3.md)\n\n### Aşama 6.4 — İki konumlu eşzamanlı gölge karşılaştırması\n\nDurum: tamamlandı · `1.11.0`\n\n- Gölge Deneyi içinde opsiyonel ikinci WGS84 gözlem noktası\n- iki noktanın aynı UTC fiziksel anında bağımsız Güneş/gölge çözümü\n- farklı gnomon yüksekliklerini ortak açısal gözlem kanalına dönüştürme\n- WGS84 baz çizgisi, Güneş yükseklik farkı ve gölge yönü farkı\n- açık saha belirsizlikleri varsa fark düzeyinde uyum değerlendirmesi\n- prediction snapshot üzerinden reopen, portable ve HTML rapor korunumu\n- Dünya modellerine tanımsız Güneş/ışık davranışı uydurmama\n\nAyrıntı: [`roadmap-stage-6.4.md`](roadmap-stage-6.4.md)\n\n### Sonraki astronomi dilimleri\n\n- gün doğumu ve gün batımı"""
if anchor in text:
    text = text.replace(anchor, replacement, 1)
p.write_text(text)

# Remove temporary patch machinery from the product commit.
Path('scripts/apply_stage_6_4.py').unlink(missing_ok=True)
Path('.github/workflows/apply-stage-6-4.yml').unlink(missing_ok=True)
