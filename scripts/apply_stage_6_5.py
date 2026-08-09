from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        if new in text:
            return
        raise RuntimeError(f'{label}: anchor not found in {path}')
    p.write_text(text.replace(old, new, 1))

# AppNext imports.
path = 'src/renderer/src/AppNext.tsx'
replace_once(
    path,
    """import { calculateSolarPosition } from '../../simulation/solar-position';\nimport { createSolarPositionPrediction, solarPositionMetadata } from '../../simulation/solar-position-prediction';\nimport { calculateLunarPosition } from '../../simulation/lunar-position';""",
    """import { calculateSolarPosition } from '../../simulation/solar-position';\nimport { createSolarPositionPrediction, solarPositionMetadata } from '../../simulation/solar-position-prediction';\nimport {\n  calculateSolarDayEvents,\n  createSolarDayEventsPrediction,\n  solarDayEventsMetadata\n} from '../../simulation/solar-day-events';\nimport { calculateLunarPosition } from '../../simulation/lunar-position';""",
    'solar day simulation imports'
)
replace_once(
    path,
    """import { SolarPositionPanel } from './SolarPositionPanel';\nimport { LunarPositionPanel } from './LunarPositionPanel';""",
    """import { SolarPositionPanel } from './SolarPositionPanel';\nimport { SolarDayEventsPanel } from './SolarDayEventsPanel';\nimport { LunarPositionPanel } from './LunarPositionPanel';""",
    'solar day panel import'
)

# Sidebar reference count/list and astronomy placeholder.
replace_once(
    path,
    """<span className=\"section-state\">{activeScenarioId === 'sun-moon-observation' ? '2 astronomik referans' : activeScenarioId === 'shadow-observation' ? '1 astronomik referans' : '2 fiziksel'}</span>""",
    """<span className=\"section-state\">{activeScenarioId === 'sun-moon-observation' ? '3 astronomik referans' : activeScenarioId === 'shadow-observation' ? '1 astronomik referans' : '2 fiziksel'}</span>""",
    'astronomy reference count'
)
replace_once(
    path,
    """            <div className=\"model-toggle reference-model\">\n              <span className=\"model-dot violet\" />\n              <span>Ay Konumu ve Fazı · Astronomik Referans</span>\n              <span className=\"reference-badge\">REFERANS</span>\n            </div>""",
    """            <div className=\"model-toggle reference-model\">\n              <span className=\"model-dot violet\" />\n              <span>Ay Konumu ve Fazı · Astronomik Referans</span>\n              <span className=\"reference-badge\">REFERANS</span>\n            </div>\n            <div className=\"model-toggle reference-model\">\n              <span className=\"model-dot green\" />\n              <span>Gün Doğumu / Batımı · Astronomik Referans</span>\n              <span className=\"reference-badge\">REFERANS</span>\n            </div>""",
    'solar day sidebar reference'
)
replace_once(
    path,
    """: 'Güneş ve Ay referansları sayısal/geometrik astronomi sonucudur; ek gökyüzü katmanları sonraki dilimlerde genişletilecektir.'}""",
    """: 'Güneş/Ay konumu ile günlük doğuş-batış zaman çizgisi ana deney alanında gösterilir; ek gökyüzü katmanları sonraki dilimlerde genişletilecektir.'}""",
    'astronomy visual placeholder text'
)

# Derived result/prediction.
replace_once(
    path,
    """  const solarPositionPrediction = useMemo(() => activeScenarioId === 'sun-moon-observation' && solarPosition\n    ? createSolarPositionPrediction(activeExperimentId, solarPosition)\n    : undefined, [activeExperimentId, activeScenarioId, solarPosition]);\n  const lunarPosition = useMemo""",
    """  const solarPositionPrediction = useMemo(() => activeScenarioId === 'sun-moon-observation' && solarPosition\n    ? createSolarPositionPrediction(activeExperimentId, solarPosition)\n    : undefined, [activeExperimentId, activeScenarioId, solarPosition]);\n  const solarDayEventsResult = useMemo(() => activeScenarioId === 'sun-moon-observation'\n    ? calculateSolarDayEvents({\n        experimentId: activeExperimentId,\n        observedAtIso: experimentObservedAtIso,\n        utcOffsetMinutes: observationUtcOffsetMinutes,\n        latitudeDeg: inputs.observerLatitudeDeg,\n        longitudeDeg: inputs.observerLongitudeDeg\n      })\n    : undefined, [activeExperimentId, activeScenarioId, experimentObservedAtIso, inputs.observerLatitudeDeg, inputs.observerLongitudeDeg, observationUtcOffsetMinutes]);\n  const solarDayEventsPrediction = useMemo(() => solarDayEventsResult\n    ? createSolarDayEventsPrediction(solarDayEventsResult)\n    : undefined, [solarDayEventsResult]);\n  const lunarPosition = useMemo""",
    'solar day derived result'
)

# Persist version/prediction.
replace_once(
    path,
    """        ...(solarPositionPrediction\n          ? [[solarPositionMetadata.id, solarPositionMetadata.version] as const]\n          : []),\n        ...(lunarPositionPrediction""",
    """        ...(solarPositionPrediction\n          ? [[solarPositionMetadata.id, solarPositionMetadata.version] as const]\n          : []),\n        ...(solarDayEventsPrediction\n          ? [[solarDayEventsMetadata.id, solarDayEventsMetadata.version] as const]\n          : []),\n        ...(lunarPositionPrediction""",
    'solar day model version save'
)
replace_once(
    path,
    """        ...(solarPositionPrediction ? [solarPositionPrediction] : []),\n        ...(lunarPositionPrediction ? [lunarPositionPrediction] : []),""",
    """        ...(solarPositionPrediction ? [solarPositionPrediction] : []),\n        ...(solarDayEventsPrediction ? [solarDayEventsPrediction] : []),\n        ...(lunarPositionPrediction ? [lunarPositionPrediction] : []),""",
    'solar day prediction save'
)

# Trace routing.
replace_once(
    path,
    """  const selectedMetadata = traceModelId === solarPositionMetadata.id\n    ? solarPositionMetadata\n    : traceModelId === lunarPositionMetadata.id""",
    """  const selectedMetadata = traceModelId === solarPositionMetadata.id\n    ? solarPositionMetadata\n    : traceModelId === solarDayEventsMetadata.id\n      ? solarDayEventsMetadata\n      : traceModelId === lunarPositionMetadata.id""",
    'solar day trace metadata'
)
replace_once(
    path,
    """  const selectedPrediction = traceModelId === solarPositionMetadata.id\n    ? solarPositionPrediction\n    : traceModelId === lunarPositionMetadata.id""",
    """  const selectedPrediction = traceModelId === solarPositionMetadata.id\n    ? solarPositionPrediction\n    : traceModelId === solarDayEventsMetadata.id\n      ? solarDayEventsPrediction\n      : traceModelId === lunarPositionMetadata.id""",
    'solar day trace prediction'
)

# Render full-width event panel after current Güneş/Ay stack.
replace_once(
    path,
    """            {activeScenarioId === 'sun-moon-observation' && solarPosition && lunarPosition\n              ? <div className=\"celestial-reference-stack\">\n                  <SolarPositionPanel result={solarPosition} onShowTrace={() => setTraceModelId(solarPositionMetadata.id)} />\n                  <LunarPositionPanel result={lunarPosition} onShowTrace={() => setTraceModelId(lunarPositionMetadata.id)} />\n                </div>""",
    """            {activeScenarioId === 'sun-moon-observation' && solarPosition && lunarPosition && solarDayEventsResult\n              ? <>\n                  <div className=\"celestial-reference-stack\">\n                    <SolarPositionPanel result={solarPosition} onShowTrace={() => setTraceModelId(solarPositionMetadata.id)} />\n                    <LunarPositionPanel result={lunarPosition} onShowTrace={() => setTraceModelId(lunarPositionMetadata.id)} />\n                  </div>\n                  <SolarDayEventsPanel result={solarDayEventsResult} onShowTrace={() => setTraceModelId(solarDayEventsMetadata.id)} />\n                </>""",
    'solar day panel render'
)

# Help id and content.
path = 'src/shared/help-content.ts'
replace_once(
    path,
    """  | 'solar-position'\n  | 'lunar-position'""",
    """  | 'solar-position'\n  | 'solar-day-events'\n  | 'lunar-position'""",
    'solar day help id'
)
replace_once(
    path,
    """    relatedTerms: ['solar-elevation', 'azimuth', 'declination', 'hour-angle', 'utc-offset']\n  },\n  {\n    id: 'lunar-position',""",
    """    relatedTerms: ['solar-elevation', 'azimuth', 'declination', 'hour-angle', 'utc-offset']\n  },\n  {\n    id: 'solar-day-events',\n    category: 'Astronomi',\n    title: 'Gün doğumu, gün batımı ve güneş öğlesi',\n    summary: 'Seçilen WGS84 konumu ve açık UTC ofsetli yerel sivil gün için Güneşin ufuk geçişlerini ve gün içindeki en yüksek geometrik konumunu hesaplar. Geometrik 0° ile standart -0,833° görünür referans birbirinden ayrılır.',\n    fields: [\n      { label: 'Geometrik doğuş/batış', unit: 'saat', description: 'Güneş merkezinin geometrik yerel ufukta 0° eşiğini geçtiği olaylar.' },\n      { label: 'Standart görünür doğuş/batış', unit: 'saat', description: 'Güneş merkezi için -0,833° sabit eşiği kullanan yaklaşık takvim referansı; gerçek atmosfer ölçümü değildir.' },\n      { label: 'Eşik üstü süre', unit: 'sa/dk', description: 'Seçilen yerel sivil günün ne kadarında ilgili Güneş merkezi eşiğinin üstünde kalındığı.' },\n      { label: 'Güneş öğlesi', unit: 'saat', description: 'Seçilen yerel gün penceresinde geometrik Güneş yüksekliğinin maksimum olduğu an.' },\n      { label: 'Doğuş/batış azimutu', unit: '°', description: 'İlgili eşik geçişindeki coğrafi kuzeyden saat yönlü Güneş azimutu.' }\n    ],\n    assumptions: ['Yerel gün kaydedilmiş sabit UTC ofsetiyle 00:00–24:00 olarak kurulmuştur.', '0° kanalı atmosferik kırılma ve topoğrafik ufuk içermez.', '-0,833° kanalı sabit üst-kenar + standart kırılma yaklaşımıdır; sahadaki gerçek atmosfer değildir.', 'Bu astronomik referans Dünya şekli modellerine otomatik Güneş/ışık fiziği atamaz.'],\n    commonMistakes: ['-0,833° sonucunu ölçülmüş gerçek atmosferik kırılma sanmak.', 'Yerel topoğrafik ufkun düz geometrik ufukla aynı olduğunu varsaymak.', 'Saat dilimi adı/DST kuralı yerine kaydedilen açık UTC ofsetinin kullanıldığını gözden kaçırmak.', 'Kutup günü/gecesinde doğuş veya batış saati uydurulmasını beklemek.'],\n    example: 'Aynı tarih ve koordinatta standart -0,833° doğuş geometrik 0° merkez doğuşundan biraz daha erken, batış ise biraz daha geç olur.',\n    relatedTerms: ['solar-elevation', 'azimuth', 'utc-offset']\n  },\n  {\n    id: 'lunar-position',""",
    'solar day help content'
)

# Report display name.
path = 'src/report/html-report.ts'
replace_once(
    path,
    """  'solar-position-noaa': 'Güneş Konumu · Astronomik Referans',\n  'lunar-position-low-precision': 'Ay Konumu ve Fazı · Astronomik Referans',""",
    """  'solar-position-noaa': 'Güneş Konumu · Astronomik Referans',\n  'solar-day-events': 'Gün Doğumu / Batımı · Astronomik Referans',\n  'lunar-position-low-precision': 'Ay Konumu ve Fazı · Astronomik Referans',""",
    'solar day report model name'
)

# Version bump.
path = 'package.json'
p = Path(path)
text = p.read_text().replace('"version": "1.11.0"', '"version": "1.12.0"', 1)
p.write_text(text)
path = 'src/preload/index.ts'
p = Path(path)
text = p.read_text().replace("version: '1.11.0'", "version: '1.12.0'", 1)
p.write_text(text)

# Stage doc.
Path('docs/roadmap-stage-6.5.md').write_text('''# Aşama 6.5 — Gün doğumu ve gün batımı olay geometrisi\n\nDurum: tamamlandı · `1.12.0`\n\n## Amaç\n\nMevcut geometrik Güneş konumu referansından seçilen WGS84 konumu ve açık UTC ofsetli yerel sivil gün için doğuş, batış, güneş öğlesi ve gün uzunluğu olaylarını izlenebilir biçimde üretmek.\n\n## Kapsam\n\n- yerel günü kaydedilmiş sabit UTC ofsetiyle `00:00–24:00` kurma\n- Güneş merkezi için geometrik `0°` ufuk geçişi\n- ayrı standart görünür referans olarak `-0,833°` merkez eşiği\n- 5 dakikalık günlük taramadan sonra geçişleri alt-saniye düzeyinde kök aramayla inceltme\n- doğuş ve batış azimutları\n- her eşik için yerel gün içindeki eşik-üstü süre\n- yerel gün içindeki maksimum geometrik Güneş yüksekliği / güneş öğlesi\n- kutup günü, kutup gecesi ve teğet/sınır durumunda sahte olay saati üretmeme\n- ayrı prediction snapshot ve hesap izi\n- Güneş/Ay senaryosunda tam genişlik günlük olay zaman çizgisi\n- `.ggl.json` ve HTML rapor korunumu\n\n## Bilimsel sınır\n\nGeometrik `0°` kanalı atmosferik kırılma, Güneş diski yarıçapı ve yerel topoğrafik ufuk içermez. `-0,833°` kanalı gerçek atmosfer ölçümü değildir; üst Güneş kenarı ve standart kırılma için yaygın sabit yaklaşık takvim eşiği olarak ayrıca gösterilir. İki kanal birbiriyle karıştırılmaz.\n\nYerel gün saat dilimi adı veya DST veritabanıyla değil, deneyde açıkça kaydedilen sabit UTC ofsetiyle kurulur. Bu nedenle geçmiş veya gelecekteki bir saha kaydında doğru ofsetin kullanıcı tarafından seçilmiş olması gerekir.\n\nBu olay geometrisi mevcut astronomik referanstır; İdeal Küre, Tanımlı Düzlem veya başka bir Dünya şekli modelinin Güneş/ışık davranışı olarak otomatik atanmaz.\n\n## Sonraki adım\n\n- yıldız görünürlüğü ve yıldız izleri\n''')

# Main roadmap.
path = 'docs/roadmap.md'
p = Path(path)
text = p.read_text()
anchor = """Ayrıntı: [`roadmap-stage-6.4.md`](roadmap-stage-6.4.md)\n\n### Sonraki astronomi dilimleri\n\n- gün doğumu ve gün batımı\n- yıldız görünürlüğü ve yıldız izleri"""
replacement = """Ayrıntı: [`roadmap-stage-6.4.md`](roadmap-stage-6.4.md)\n\n### Aşama 6.5 — Gün doğumu ve gün batımı olay geometrisi\n\nDurum: tamamlandı · `1.12.0`\n\n- açık UTC ofsetli yerel sivil gün penceresi\n- geometrik Güneş merkezi `0°` doğuş/batış geçişleri\n- ayrı standart görünür referans olarak `-0,833°` eşiği\n- doğuş/batış azimutları ve eşik-üstü süreler\n- güneş öğlesi / günlük maksimum geometrik yükseklik\n- kutup günü/gecesinde sahte olay saati üretmeme\n- prediction, hesap izi, portable ve HTML rapor korunumu\n- Dünya modellerine tanımsız Güneş/ışık davranışı uydurmama\n\nAyrıntı: [`roadmap-stage-6.5.md`](roadmap-stage-6.5.md)\n\n### Sonraki astronomi dilimleri\n\n- yıldız görünürlüğü ve yıldız izleri"""
if anchor not in text:
    raise RuntimeError('roadmap 6.5 anchor not found')
p.write_text(text.replace(anchor, replacement, 1))

# README status/docs/incomplete list.
path = 'README.md'
p = Path(path)
text = p.read_text()
text = text.replace('- Gün doğumu/gün batımı, yıldız ve tutulma deneyleri', '- Yıldız ve tutulma deneyleri', 1)
text = text.replace('- [`docs/roadmap-stage-6.4.md`](docs/roadmap-stage-6.4.md)', '- [`docs/roadmap-stage-6.4.md`](docs/roadmap-stage-6.4.md)\n- [`docs/roadmap-stage-6.5.md`](docs/roadmap-stage-6.5.md)', 1)
text = text.replace('Aktif geliştirme sürümü `1.11.0`dir.', 'Aktif geliştirme sürümü `1.12.0`dir. Güneş/Ay senaryosu artık geometrik 0° merkez geçişi ile ayrı -0,833° standart görünür referansı kullanarak günlük doğuş/batış, azimut, eşik-üstü süre ve güneş öğlesini de üretir; kutup günü/gecesinde sahte olay saati oluşturmaz.', 1)
p.write_text(text)

# Remove temporary machinery from the product commit.
Path('scripts/apply_stage_6_5.py').unlink(missing_ok=True)
Path('.github/workflows/apply-stage-6-5.yml').unlink(missing_ok=True)
