from pathlib import Path


def repl(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise RuntimeError(f'anchor missing in {path}: {old[:100]!r}')
    p.write_text(text.replace(old, new, 1))

# App integration
path = 'src/renderer/src/AppNext.tsx'
repl(path,
"import { createSolarPositionPrediction, solarPositionMetadata } from '../../simulation/solar-position-prediction';",
"import { createSolarPositionPrediction, solarPositionMetadata } from '../../simulation/solar-position-prediction';\nimport { calculateLunarPosition } from '../../simulation/lunar-position';\nimport { createLunarPositionPrediction, lunarPositionMetadata } from '../../simulation/lunar-position-prediction';")
repl(path,
"import { SolarPositionPanel } from './SolarPositionPanel';\nimport { SolarScenarioSummary } from './SolarScenarioSummary';",
"import { SolarPositionPanel } from './SolarPositionPanel';\nimport { LunarPositionPanel } from './LunarPositionPanel';\nimport { SolarScenarioSummary } from './SolarScenarioSummary';")
repl(path,
"  const solarPositionPrediction = useMemo(() => solarPosition\n    ? createSolarPositionPrediction(activeExperimentId, solarPosition)\n    : undefined, [activeExperimentId, solarPosition]);",
"  const solarPositionPrediction = useMemo(() => solarPosition\n    ? createSolarPositionPrediction(activeExperimentId, solarPosition)\n    : undefined, [activeExperimentId, solarPosition]);\n  const lunarPosition = useMemo(() => activeScenarioId === 'sun-moon-observation' && solarPosition\n    ? calculateLunarPosition({\n        observedAtIso: experimentObservedAtIso,\n        latitudeDeg: inputs.observerLatitudeDeg,\n        longitudeDeg: inputs.observerLongitudeDeg,\n        solarPosition\n      })\n    : undefined, [activeScenarioId, experimentObservedAtIso, inputs.observerLatitudeDeg, inputs.observerLongitudeDeg, solarPosition]);\n  const lunarPositionPrediction = useMemo(() => lunarPosition\n    ? createLunarPositionPrediction(activeExperimentId, lunarPosition)\n    : undefined, [activeExperimentId, lunarPosition]);")
repl(path,
"        ...(solarPositionPrediction\n          ? [[solarPositionMetadata.id, solarPositionMetadata.version] as const]\n          : []),",
"        ...(solarPositionPrediction\n          ? [[solarPositionMetadata.id, solarPositionMetadata.version] as const]\n          : []),\n        ...(lunarPositionPrediction\n          ? [[lunarPositionMetadata.id, lunarPositionMetadata.version] as const]\n          : []),")
repl(path,
"        ...(solarPositionPrediction ? [solarPositionPrediction] : []),\n        ...runs.map((run) => run.prediction),",
"        ...(solarPositionPrediction ? [solarPositionPrediction] : []),\n        ...(lunarPositionPrediction ? [lunarPositionPrediction] : []),\n        ...runs.map((run) => run.prediction),")
repl(path,
"  const selectedMetadata = traceModelId === solarPositionMetadata.id\n    ? solarPositionMetadata\n    : traceModelId === geodesicMetadata.id",
"  const selectedMetadata = traceModelId === solarPositionMetadata.id\n    ? solarPositionMetadata\n    : traceModelId === lunarPositionMetadata.id\n      ? lunarPositionMetadata\n      : traceModelId === geodesicMetadata.id")
repl(path,
"  const selectedPrediction = traceModelId === solarPositionMetadata.id\n    ? solarPositionPrediction\n    : traceModelId === geodesicMetadata.id",
"  const selectedPrediction = traceModelId === solarPositionMetadata.id\n    ? solarPositionPrediction\n    : traceModelId === lunarPositionMetadata.id\n      ? lunarPositionPrediction\n      : traceModelId === geodesicMetadata.id")
repl(path,
"          <span className=\"section-state\">{activeScenarioId === 'sun-moon-observation' ? '1 astronomik referans' : '2 fiziksel'}</span>",
"          <span className=\"section-state\">{activeScenarioId === 'sun-moon-observation' ? '2 astronomik referans' : '2 fiziksel'}</span>")
repl(path,
"          <div className=\"model-toggle reference-model\">\n            <span className=\"model-dot amber\" />\n            <span>Güneş Konumu · Astronomik Referans</span>\n            <span className=\"reference-badge\">REFERANS</span>\n          </div>",
"          <>\n            <div className=\"model-toggle reference-model\">\n              <span className=\"model-dot amber\" />\n              <span>Güneş Konumu · Astronomik Referans</span>\n              <span className=\"reference-badge\">REFERANS</span>\n            </div>\n            <div className=\"model-toggle reference-model\">\n              <span className=\"model-dot violet\" />\n              <span>Ay Konumu ve Fazı · Astronomik Referans</span>\n              <span className=\"reference-badge\">REFERANS</span>\n            </div>\n          </>")
repl(path,
"            {activeScenarioId === 'sun-moon-observation' && solarPosition\n              ? <SolarPositionPanel result={solarPosition} onShowTrace={() => setTraceModelId(solarPositionMetadata.id)} />",
"            {activeScenarioId === 'sun-moon-observation' && solarPosition && lunarPosition\n              ? <div className=\"celestial-reference-stack\">\n                  <SolarPositionPanel result={solarPosition} onShowTrace={() => setTraceModelId(solarPositionMetadata.id)} />\n                  <LunarPositionPanel result={lunarPosition} onShowTrace={() => setTraceModelId(lunarPositionMetadata.id)} />\n                </div>")

# Help ids/content
path = 'src/shared/help-content.ts'
repl(path, "  | 'solar-position'\n  | 'text-experiment-setup'", "  | 'solar-position'\n  | 'lunar-position'\n  | 'text-experiment-setup'")
anchor = """  {\n    id: 'text-experiment-setup',"""
lunar_help = """  {\n    id: 'lunar-position',\n    category: 'Astronomi',\n    title: 'Ayın topocentrik konumu ve fazı',\n    summary: 'Aynı UTC gözlem anı ve WGS84 konumunda Ayın düşük hassasiyetli topocentrik yüksekliği/azimutu, uzaklığı ve faz geometrisini üretir.',\n    fields: [\n      { label: 'Geometrik yükseklik', unit: '°', description: 'Ay merkezinin yerel geometrik ufka göre topocentrik açısı.' },\n      { label: 'Azimut', unit: '°', description: 'Coğrafi kuzeyden saat yönünde Ay yönü.' },\n      { label: 'Aydınlık oranı', unit: '%', description: 'Güneş-Ay uzanımından yaklaşık hesaplanan aydınlık disk oranı.' },\n      { label: 'Faz / Ay yaşı', description: 'Yeni Ay çevriminden itibaren yaklaşık faz sınıfı ve sinodik yaş.' },\n      { label: 'Yatay paralaks', unit: '°', description: 'Ayın yakınlığı nedeniyle gözlemci konumunun göksel yöne yaptığı büyük topocentrik düzeltmenin ölçeği.' }\n    ],\n    assumptions: ['Düşük hassasiyetli analitik Ay yörüngesi ve başlıca periyodik düzeltmeler kullanılır.', 'Gözlemci deniz seviyesinde kabul edilir.', 'Atmosferik kırılma ve yerel topoğrafik ufuk uygulanmaz.', 'Tutulma geometrisi bu panelin kapsamı değildir.'],\n    commonMistakes: ['Bu düşük hassasiyetli referansı JPL/Horizons hassasiyetinde efemeris saymak.', 'Aydınlık oranını Ayın ufuk üstünde görünürlüğüyle karıştırmak.', 'Faz bilgisinden otomatik tutulma sonucu çıkarmak.'],\n    example: 'Tarih/saat değiştirildiğinde Güneş ve Ay aynı gözlem anında birlikte yeniden hesaplanır.',\n    relatedTerms: ['azimuth', 'declination', 'utc-offset', 'lunar-parallax', 'lunar-phase']\n  },\n"""
repl(path, anchor, lunar_help + anchor)
terms_anchor = """  {\n    id: 'datum',"""
lunar_terms = """  {\n    id: 'lunar-parallax',\n    label: 'Ay paralaksı',\n    definition: 'Ayın Dünya’ya yakınlığı nedeniyle gözlemcinin Dünya üzerindeki konumunun Ayın görünen yönünü geocentrik yöne göre değiştirmesidir.',\n    caution: 'Ay için yaklaşık derece ölçeğine ulaşabildiğinden yerel yükseklik/azimut hesabında ihmal edilmemelidir.'\n  },\n  {\n    id: 'lunar-phase',\n    label: 'Ay fazı',\n    definition: 'Ayın Güneş tarafından aydınlatılan yarısının Dünya’dan görülen oranı ve Güneş-Ay-Dünya geometrisiyle ilişkili çevrim durumudur.',\n    caution: 'Yeni Ay veya Dolunay olmak tek başına tutulma anlamına gelmez; yörünge düğümü geometrisi ayrıca gerekir.'\n  },\n"""
repl(path, terms_anchor, lunar_terms + terms_anchor)

# Report name
repl('src/report/html-report.ts',
"  'solar-position-noaa': 'Güneş Konumu · Astronomik Referans'",
"  'solar-position-noaa': 'Güneş Konumu · Astronomik Referans',\n  'lunar-position-low-precision': 'Ay Konumu ve Fazı · Astronomik Referans'")

# Celestial time / scenario copy
repl('src/renderer/src/CelestialTimeCard.tsx', "GÜNEŞ · 6.1", "GÜNEŞ + AY · 6.2")
repl('src/renderer/src/SolarScenarioSummary.tsx',
"Aşama 6.1 yalnız Güneşin geometrik yerel konumunu hesaplar. Tarih/saat sol alttaki Zaman ve tarih kartından yönetilir. Hedef, rota, arazi, su yüzeyi, fotoğraf görünürlük hesabı ve atmosferik kırılma bu referans hesabına katılmaz. Ay hesabı 6.2’de eklenecektir.",
"Aşama 6.2 Güneşin geometrik yerel konumunu ve Ayın düşük hassasiyetli topocentrik konum/faz referansını aynı gözlem anında hesaplar. Tarih/saat sol alttaki Zaman ve tarih kartından yönetilir. Hedef, rota, arazi, su yüzeyi, fotoğraf görünürlük hesabı ve atmosferik kırılma bu astronomik referanslara katılmaz.")

# Stack layout
p = Path('src/renderer/src/lunar-position-panel.css')
p.write_text(p.read_text() + "\n.celestial-reference-stack { display: grid; gap: 10px; min-width: 0; }\n")

# Versions
for path in ['package.json', 'src/preload/index.ts']:
    p = Path(path)
    text = p.read_text().replace('1.8.0', '1.9.0', 1)
    p.write_text(text)

# Roadmap stage document
Path('docs/roadmap-stage-6.2.md').write_text('''# Aşama 6.2 — Ay Konumu ve Evre Geometrisi\n\nSürüm: `1.9.0`\n\n## Kapsam\n\n- 6.1 ile aynı açık UTC gözlem anı ve WGS84 gözlem konumu\n- düşük hassasiyetli analitik Ay yörüngesi ve başlıca periyodik düzeltmeler\n- Ay uzaklığı ve yatay paralaks\n- topocentrik geometrik yükseklik ve kuzeyden saat yönünde azimut\n- Güneş-Ay uzanımı, yaklaşık faz açısı, aydınlık oranı, faz sınıfı ve yaklaşık sinodik yaş\n- ayrı ModelPrediction, model sürümü ve hesap izi\n- deney kaydı, taşınabilir JSON ve HTML raporunda Ay snapshot'ı\n\n## Bilimsel sınırlar\n\nBu sürüm JPL DE/Horizons efemerisinin yerine geçen yüksek hassasiyetli bir Ay efemerisi değildir. Gözlemci deniz seviyesinde kabul edilir. Atmosferik kırılma ve yerel topoğrafik ufuk uygulanmaz. Faz bilgisi tutulma sonucu üretmez; tutulma için Ay yörünge düğümü ve gölge geometrisi ayrı aşamada hesaplanacaktır.\n''')

# Main roadmap append/update in a safe location
p = Path('docs/roadmap.md')
text = p.read_text()
needle = "### Aşama 6.1 — Güneş konumu, gözlem zamanı ve konumu"
pos = text.find(needle)
if pos >= 0 and '### Aşama 6.2 — Ay konumu ve evre geometrisi' not in text:
    next_heading = text.find('\n### ', pos + len(needle))
    if next_heading < 0:
        next_heading = len(text)
    block = "\n### Aşama 6.2 — Ay konumu ve evre geometrisi\n\nDurum: tamamlandı · `1.9.0`\n\n- düşük hassasiyetli Ay yörünge ve başlıca periyodik düzeltmeleri\n- topocentrik paralaks, geometrik yükseklik ve azimut\n- uzaklık, Güneş-Ay uzanımı, aydınlık oranı, faz sınıfı ve yaklaşık Ay yaşı\n- Güneş ile ortak gözlem zamanı/konumu\n- ayrı snapshot, sürüm ve hesap izi\n- tutulma geometrisini bu aşamaya karıştırmama\n\nAyrıntı: [`roadmap-stage-6.2.md`](roadmap-stage-6.2.md)\n"
    text = text[:next_heading] + block + text[next_heading:]
p.write_text(text)

# README version and roadmap link, if anchors exist
p = Path('README.md')
text = p.read_text().replace('Aktif geliştirme sürümü `1.8.0`dir.', 'Aktif geliştirme sürümü `1.9.0`dir.', 1)
if 'roadmap-stage-6.2.md' not in text and 'roadmap-stage-6.1.md' in text:
    text = text.replace('- [`docs/roadmap-stage-6.1.md`](docs/roadmap-stage-6.1.md)', '- [`docs/roadmap-stage-6.1.md`](docs/roadmap-stage-6.1.md)\n- [`docs/roadmap-stage-6.2.md`](docs/roadmap-stage-6.2.md)', 1)
p.write_text(text)

# Self-clean patch machinery.
Path('scripts/apply_stage_6_2.py').unlink(missing_ok=True)
Path('.github/workflows/apply-stage-6-2.yml').unlink(missing_ok=True)
