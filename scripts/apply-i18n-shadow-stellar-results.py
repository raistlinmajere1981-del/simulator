#!/usr/bin/env python3
"""Localize shadow and core stellar result surfaces.

Temporary helper: remove before merge. This slice changes renderer presentation only;
raw engine warnings/traces, imported source warnings and machine-readable contracts stay invariant.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}")


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        fail(f"{path.relative_to(ROOT)}: expected one match, found {count}: {old[:90]!r}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def insert_before_once(path: Path, marker: str, addition: str) -> None:
    text = path.read_text(encoding="utf-8")
    count = text.count(marker)
    if count != 1:
        fail(f"{path.relative_to(ROOT)}: structural marker count {count}, expected 1")
    path.write_text(text.replace(marker, addition + marker, 1), encoding="utf-8")


def write_new(path: Path, content: str) -> None:
    if path.exists():
        fail(f"{path.relative_to(ROOT)} already exists")
    path.write_text(content, encoding="utf-8")


i18n = ROOT / "src/renderer/src/i18n.ts"
presentation = ROOT / "src/renderer/src/astronomy-result-presentation.ts"
shadow = ROOT / "src/renderer/src/ShadowObservationPanel.tsx"
dual = ROOT / "src/renderer/src/DualShadowComparisonPanel.tsx"
stellar_results = ROOT / "src/renderer/src/StellarObservationResults.tsx"
sky = ROOT / "src/renderer/src/StellarSkySnapshotPanel.tsx"
docs = ROOT / "docs/localization.md"
test = ROOT / "tests/shadow-stellar-i18n.test.ts"

for path in (i18n, presentation, shadow, dual, stellar_results, sky, docs):
    if not path.exists():
        fail(f"missing expected file: {path.relative_to(ROOT)}")

tr_messages = """  'shadow.stage': 'Astronomik referans · gölge',
  'shadow.title': 'Dikey gnomon gölge geometrisi',
  'shadow.status.compatible': 'ÖLÇÜMLE UYUMLU',
  'shadow.status.incompatible': 'ÖLÇÜMLE UYUMSUZ',
  'shadow.status.indeterminate': 'GÖZLEM KARARI YOK',
  'shadow.gnomonHeight': 'Gnomon yüksekliği',
  'shadow.observedLength': 'Gözlenen gölge uzunluğu',
  'shadow.optional': 'opsiyonel',
  'shadow.lengthUncertainty': 'Uzunluk belirsizliği ±',
  'shadow.observedAzimuth': 'Gözlenen gölge azimutu',
  'shadow.azimuthUncertainty': 'Azimut belirsizliği ±',
  'shadow.noDirectSun': 'Güneş geometrik ufkun altında',
  'shadow.solarElevation': 'Güneş yüksekliği',
  'shadow.solarAzimuth': 'Güneş azimutu',
  'shadow.predictedLength': 'Beklenen gölge',
  'shadow.predictedDirection': 'Beklenen yön',
  'shadow.impliedSolarElevation': 'Gölgeden türetilen Güneş açısı',
  'shadow.lengthDifference': 'Uzunluk farkı',
  'shadow.directionDifference': 'Yön farkı',
  'shadow.note': 'Ölçüm yüzeyi yerel yatay, gnomon yerel düşey kabul edilir. Güneş hesabı geometriktir; atmosferik kırılma ve topoğrafik ufuk bu aşamada gölge sonucuna eklenmez. Bu panel Dünya şekli modellerine Güneş davranışı uydurmaz.',
  'dualShadow.stage': 'Astronomik referans · eşzamanlı iki nokta',
  'dualShadow.title': 'İki konumlu gölge karşılaştırması',
  'dualShadow.status.off': 'KARŞILAŞTIRMA KAPALI',
  'dualShadow.status.compatible': 'FARK ÖLÇÜMLE UYUMLU',
  'dualShadow.status.incompatible': 'FARK ÖLÇÜMLE UYUMSUZ',
  'dualShadow.status.indeterminate': 'FARK İÇİN KARAR YOK',
  'dualShadow.disable': 'İkinci noktayı kapat',
  'dualShadow.enable': 'İkinci nokta ekle',
  'dualShadow.emptyTitle': 'Tek-konum gölge deneyi etkin.',
  'dualShadow.emptyNote': 'Aynı UTC anında ikinci bir WGS84 konumundaki gnomonu karşılaştırmak için B noktasını ekle.',
  'dualShadow.primary': 'Birincil gözlem noktası',
  'dualShadow.secondary': 'İkinci gözlem noktası',
  'dualShadow.sameUtc': 'Aynı UTC anı kullanılır',
  'dualShadow.gnomon': 'Gnomon',
  'dualShadow.sun': 'Güneş',
  'dualShadow.predictedShadow': 'Beklenen gölge',
  'dualShadow.bLatitude': 'B enlemi',
  'dualShadow.bLongitude': 'B boylamı',
  'dualShadow.bGnomon': 'B gnomon yüksekliği',
  'dualShadow.bObservedShadow': 'B gözlenen gölge',
  'dualShadow.bLengthUncertainty': 'B uzunluk belirsizliği ±',
  'dualShadow.bObservedAzimuth': 'B gözlenen gölge azimutu',
  'dualShadow.bAzimuthUncertainty': 'B azimut belirsizliği ±',
  'dualShadow.separation': 'WGS84 nokta ayrımı',
  'dualShadow.initialBearing': 'A→B başlangıç azimutu',
  'dualShadow.predictedElevationDifference': 'Beklenen Güneş yükseklik farkı B−A',
  'dualShadow.observedElevationDifference': 'Gözlenen gölgelerden fark',
  'dualShadow.elevationResidual': 'Açı farkı artığı',
  'dualShadow.predictedDirectionDifference': 'Beklenen gölge yönü farkı',
  'dualShadow.observedDirectionDifference': 'Gözlenen yön farkı',
  'dualShadow.directionResidual': 'Yön farkı artığı',
  'dualShadow.note': 'A ve B aynı UTC fiziksel anında çözülür. Gnomon yükseklikleri farklı olabilir; saha gölgeleri önce Güneş yüksekliğine dönüştürülerek karşılaştırılır. WGS84 baz çizgisi ve geometrik Güneş referansı burada ölçüm bağlamıdır; Dünya modellerine tanımsız Güneş davranışı eklenmez.',
  'stellar.horizon.circumpolarAbove': 'Çevresel · ufkun üstünde',
  'stellar.horizon.risesSets': 'Doğar ve batar',
  'stellar.horizon.neverRises': 'Bu enlemde doğmaz',
  'stellar.horizon.grazes': 'Ufka teğet / sınır',
  'stellar.undefined': 'Tanımsız',
  'stellar.results.catalogJ2000': 'Katalog · J2000',
  'stellar.results.meanDate': 'Gözlem tarihi · ortalama',
  'stellar.results.precessionShift': 'Precession kayması',
  'stellar.results.lmst': 'Yerel yıldız zamanı',
  'stellar.results.elevation': 'Yükseklik',
  'stellar.results.azimuth': 'Azimut',
  'stellar.results.hourAngle': 'Saat açısı',
  'stellar.results.dailyClass': 'Günlük sınıf',
  'stellar.results.localHorizonAtAzimuth': 'Bu azimutta yerel ufuk',
  'stellar.results.localHorizonClearance': 'Yerel ufuk açıklığı',
  'stellar.results.trailTitle': 'Geometrik yıldız izi',
  'stellar.results.windowSamples': '{duration} pencere · {count} örnek',
  'stellar.results.zeroHorizonAbove': '0° ufuk üstü',
  'stellar.results.localHorizonAbove': 'Yerel ufuk üstü',
  'stellar.results.trailAria': 'Geometrik yıldız yüksekliği, isteğe bağlı standart apparent yıldız yüksekliği ve yerel skyline zaman izi',
  'stellar.results.axisHorizon': '0° astronomik ufuk',
  'stellar.results.geometricStar': 'Geometrik yıldız',
  'stellar.results.standardApparent': 'Standart apparent',
  'stellar.results.localSkyline': 'Yerel skyline',
  'stellar.results.astronomicalCrossings': '0° astronomik ufuk geçişleri',
  'stellar.results.noAstronomicalCrossing': 'Bu zaman penceresinde 0° doğuş/batış geçişi yok.',
  'stellar.results.rise': 'Doğuş',
  'stellar.results.set': 'Batış',
  'stellar.results.localCrossings': 'Yerel skyline geçişleri',
  'stellar.results.noLocalCrossing': 'Bu zaman penceresinde yerel ufuk geçişi yok.',
  'stellar.results.localRise': 'Yerel doğuş',
  'stellar.results.localSet': 'Yerel batış',
  'stellar.results.horizonWord': 'ufuk',
  'stellar.results.sourceNote': '{source}. Geometrik yıldız izi ve yerel skyline ana sonuçlardır. Standart kırılma tanısı yalnız yıldız ışını için yaklaşık apparent yüksekliği ayrı gösterir; geometrik skyline ile karma fark yerel optik görünürlük değildir. Sönümleme, gökyüzü parlaklığı, gerçek hava profili, bulut, seeing ve çıplak-göz algı eşiği uygulanmaz.',
  'stellar.sky.title': 'Çoklu yıldız gökyüzü · geometrik',
  'stellar.sky.intro': 'Zenit merkezde, 0° astronomik ufuk dış çemberde. Katalogdaki 19 yıldız aynı gözlem anında çözülür.',
  'stellar.sky.shown': 'Gösteriliyor',
  'stellar.sky.off': 'Kapalı',
  'stellar.sky.plotted': 'Haritada çizilen',
  'stellar.sky.geometricSummary': 'Geometrik 0°',
  'stellar.sky.aboveBelow': 'üstünde {above} · altında ve çizilmeyen {below}',
  'stellar.sky.localSummary': 'Çizilenlerde yerel skyline',
  'stellar.sky.localCounts': 'üstünde {above} · sınır {boundary} · altında {below}',
  'stellar.sky.selectedStar': 'Seçili yıldız',
  'stellar.sky.selectedBelow': '0° geometrik ufkun altında · haritada çizilmez',
  'stellar.sky.aria': 'Katalog yıldızlarının zenit merkezli geometrik polar gökyüzü görünümü',
  'stellar.sky.catalogStar': 'Geometrik 0° üstü katalog yıldızı',
  'stellar.sky.selectedLegend': 'Seçili yıldız',
  'stellar.sky.blockedLegend': 'Geometrik olarak yerel skyline altında',
  'stellar.sky.note': 'Bu harita üst geometrik yarımküreyi gösterir. Nokta büyüklüğü katalog görsel kadrini yalnız ayırt edici ölçek olarak kullanır; atmosferik sönümleme, gökyüzü parlaklığı ve çıplak-göz eşiği uygulanmadığı için optik görünürlük haritası değildir. Standart apparent tanı bu haritaya uygulanmaz.',
"""

en_messages = """  'shadow.stage': 'Astronomical reference · shadow',
  'shadow.title': 'Vertical-gnomon shadow geometry',
  'shadow.status.compatible': 'MATCHES MEASUREMENT',
  'shadow.status.incompatible': 'DOES NOT MATCH MEASUREMENT',
  'shadow.status.indeterminate': 'NO OBSERVATION DECISION',
  'shadow.gnomonHeight': 'Gnomon height',
  'shadow.observedLength': 'Observed shadow length',
  'shadow.optional': 'optional',
  'shadow.lengthUncertainty': 'Length uncertainty ±',
  'shadow.observedAzimuth': 'Observed shadow azimuth',
  'shadow.azimuthUncertainty': 'Azimuth uncertainty ±',
  'shadow.noDirectSun': 'Sun is below the geometric horizon',
  'shadow.solarElevation': 'Solar elevation',
  'shadow.solarAzimuth': 'Solar azimuth',
  'shadow.predictedLength': 'Expected shadow',
  'shadow.predictedDirection': 'Expected direction',
  'shadow.impliedSolarElevation': 'Solar angle inferred from shadow',
  'shadow.lengthDifference': 'Length difference',
  'shadow.directionDifference': 'Direction difference',
  'shadow.note': 'The measurement surface is assumed locally horizontal and the gnomon locally vertical. The solar calculation is geometric; atmospheric refraction and the topographic horizon are not added to the shadow result at this stage. This panel does not invent solar behavior for Earth-shape models.',
  'dualShadow.stage': 'Astronomical reference · simultaneous two-point comparison',
  'dualShadow.title': 'Two-location shadow comparison',
  'dualShadow.status.off': 'COMPARISON OFF',
  'dualShadow.status.compatible': 'DIFFERENCE MATCHES MEASUREMENT',
  'dualShadow.status.incompatible': 'DIFFERENCE DOES NOT MATCH MEASUREMENT',
  'dualShadow.status.indeterminate': 'NO DECISION FOR DIFFERENCE',
  'dualShadow.disable': 'Remove second point',
  'dualShadow.enable': 'Add second point',
  'dualShadow.emptyTitle': 'Single-location shadow experiment is active.',
  'dualShadow.emptyNote': 'Add point B to compare a gnomon at a second WGS84 location at the same UTC instant.',
  'dualShadow.primary': 'Primary observation point',
  'dualShadow.secondary': 'Second observation point',
  'dualShadow.sameUtc': 'Uses the same UTC instant',
  'dualShadow.gnomon': 'Gnomon',
  'dualShadow.sun': 'Sun',
  'dualShadow.predictedShadow': 'Expected shadow',
  'dualShadow.bLatitude': 'B latitude',
  'dualShadow.bLongitude': 'B longitude',
  'dualShadow.bGnomon': 'B gnomon height',
  'dualShadow.bObservedShadow': 'B observed shadow',
  'dualShadow.bLengthUncertainty': 'B length uncertainty ±',
  'dualShadow.bObservedAzimuth': 'B observed shadow azimuth',
  'dualShadow.bAzimuthUncertainty': 'B azimuth uncertainty ±',
  'dualShadow.separation': 'WGS84 point separation',
  'dualShadow.initialBearing': 'A→B initial bearing',
  'dualShadow.predictedElevationDifference': 'Expected solar-elevation difference B−A',
  'dualShadow.observedElevationDifference': 'Difference inferred from observed shadows',
  'dualShadow.elevationResidual': 'Angular-difference residual',
  'dualShadow.predictedDirectionDifference': 'Expected shadow-direction difference',
  'dualShadow.observedDirectionDifference': 'Observed direction difference',
  'dualShadow.directionResidual': 'Direction-difference residual',
  'dualShadow.note': 'A and B are solved at the same physical UTC instant. Gnomon heights may differ; field shadows are first converted to solar elevation before comparison. The WGS84 baseline and geometric solar reference are measurement context here; undefined solar behavior is not added to Earth models.',
  'stellar.horizon.circumpolarAbove': 'Circumpolar · above horizon',
  'stellar.horizon.risesSets': 'Rises and sets',
  'stellar.horizon.neverRises': 'Never rises at this latitude',
  'stellar.horizon.grazes': 'Grazes horizon / boundary',
  'stellar.undefined': 'Undefined',
  'stellar.results.catalogJ2000': 'Catalog · J2000',
  'stellar.results.meanDate': 'Observation date · mean',
  'stellar.results.precessionShift': 'Precession shift',
  'stellar.results.lmst': 'Local sidereal time',
  'stellar.results.elevation': 'Elevation',
  'stellar.results.azimuth': 'Azimuth',
  'stellar.results.hourAngle': 'Hour angle',
  'stellar.results.dailyClass': 'Daily class',
  'stellar.results.localHorizonAtAzimuth': 'Local horizon at this azimuth',
  'stellar.results.localHorizonClearance': 'Local-horizon clearance',
  'stellar.results.trailTitle': 'Geometric star trail',
  'stellar.results.windowSamples': '{duration} window · {count} samples',
  'stellar.results.zeroHorizonAbove': 'Above 0° horizon',
  'stellar.results.localHorizonAbove': 'Above local horizon',
  'stellar.results.trailAria': 'Geometric star altitude, optional standard apparent star altitude and local-skyline time trail',
  'stellar.results.axisHorizon': '0° astronomical horizon',
  'stellar.results.geometricStar': 'Geometric star',
  'stellar.results.standardApparent': 'Standard apparent',
  'stellar.results.localSkyline': 'Local skyline',
  'stellar.results.astronomicalCrossings': '0° astronomical-horizon crossings',
  'stellar.results.noAstronomicalCrossing': 'No 0° rise/set crossing in this time window.',
  'stellar.results.rise': 'Rise',
  'stellar.results.set': 'Set',
  'stellar.results.localCrossings': 'Local-skyline crossings',
  'stellar.results.noLocalCrossing': 'No local-horizon crossing in this time window.',
  'stellar.results.localRise': 'Local rise',
  'stellar.results.localSet': 'Local set',
  'stellar.results.horizonWord': 'horizon',
  'stellar.results.sourceNote': '{source}. The geometric star trail and local skyline are the primary results. The standard-refraction diagnostic separately shows an approximate apparent altitude for the stellar ray only; its mixed difference from the geometric skyline is not local optical visibility. Extinction, sky brightness, the real atmospheric profile, clouds, seeing and naked-eye detection thresholds are not applied.',
  'stellar.sky.title': 'Multi-star sky · geometric',
  'stellar.sky.intro': 'Zenith is at the center and the 0° astronomical horizon is the outer circle. All 19 catalog stars are solved at the same observation instant.',
  'stellar.sky.shown': 'Shown',
  'stellar.sky.off': 'Off',
  'stellar.sky.plotted': 'Plotted on map',
  'stellar.sky.geometricSummary': 'Geometric 0°',
  'stellar.sky.aboveBelow': 'above {above} · below and not plotted {below}',
  'stellar.sky.localSummary': 'Local skyline among plotted stars',
  'stellar.sky.localCounts': 'above {above} · boundary {boundary} · below {below}',
  'stellar.sky.selectedStar': 'Selected star',
  'stellar.sky.selectedBelow': 'below the 0° geometric horizon · not plotted',
  'stellar.sky.aria': 'Zenith-centered geometric polar sky view of catalog stars',
  'stellar.sky.catalogStar': 'Catalog star above geometric 0°',
  'stellar.sky.selectedLegend': 'Selected star',
  'stellar.sky.blockedLegend': 'Geometrically below local skyline',
  'stellar.sky.note': 'This map shows the upper geometric hemisphere. Marker size uses catalog visual magnitude only as a distinguishing scale; because atmospheric extinction, sky brightness and naked-eye thresholds are not applied, it is not an optical visibility map. The standard-apparent diagnostic is not applied to this map.',
"""

tr_marker = "\n} as const;\n\nexport type TranslationKey"
en_marker = "\n};\n\nexport function translate"
insert_before_once(i18n, tr_marker, tr_messages)
insert_before_once(i18n, en_marker, en_messages)

replace_once(
    presentation,
    "import type { SolarSeasonEventKind } from '../../simulation/solar-season-events';\n",
    "import type { SolarSeasonEventKind } from '../../simulation/solar-season-events';\nimport type { StellarObservationResult } from '../../simulation/stellar-observation';\n"
)
insert_before_once(
    presentation,
    "\nexport function getSolarThresholdStateLabel",
    """
const stellarHorizonClassKeys: Record<StellarObservationResult['position']['horizonClass'], TranslationKey> = {
  'circumpolar-above': 'stellar.horizon.circumpolarAbove',
  'rises-and-sets': 'stellar.horizon.risesSets',
  'never-rises': 'stellar.horizon.neverRises',
  'grazes-horizon': 'stellar.horizon.grazes'
};

export function getStellarHorizonClassLabel(
  locale: AppLocale,
  horizonClass: StellarObservationResult['position']['horizonClass']
): string {
  return translate(locale, stellarHorizonClassKeys[horizonClass]);
}
"""
)

replace_once(
    shadow,
    "import { PanelHelpButton } from './HelpSystem';\nimport './shadow-observation-panel.css';\n\nconst numberFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 });\n\nfunction valueOrDash(value: number | null, unit: string): string {\n  return value === null ? '—' : `${numberFormatter.format(value)}${unit}`;\n}\n\nfunction statusLabel(prediction: ModelPrediction): string {\n  if (prediction.status === 'compatible') return 'ÖLÇÜMLE UYUMLU';\n  if (prediction.status === 'incompatible') return 'ÖLÇÜMLE UYUMSUZ';\n  return 'GÖZLEM KARARI YOK';\n}\n",
    "import { PanelHelpButton } from './HelpSystem';\nimport { useI18n } from './I18nProvider';\nimport { numberFormatterFor } from './app/app-formatters';\nimport { translate, type AppLocale } from './i18n';\nimport './shadow-observation-panel.css';\n\nfunction valueOrDash(value: number | null, unit: string, locale: AppLocale): string {\n  return value === null ? '—' : `${numberFormatterFor(locale).format(value)}${unit}`;\n}\n\nfunction statusLabel(prediction: ModelPrediction, locale: AppLocale): string {\n  if (prediction.status === 'compatible') return translate(locale, 'shadow.status.compatible');\n  if (prediction.status === 'incompatible') return translate(locale, 'shadow.status.incompatible');\n  return translate(locale, 'shadow.status.indeterminate');\n}\n"
)
replace_once(shadow, "}): React.JSX.Element {\n  const directSun", "}): React.JSX.Element {\n  const { locale, t } = useI18n();\n  const directSun")
for old, new in [
    ('<span className="eyebrow">Astronomik referans · gölge</span>', '<span className="eyebrow">{t(\'shadow.stage\')}</span>'),
    ('<h2>Dikey gnomon gölge geometrisi</h2>', '<h2>{t(\'shadow.title\')}</h2>'),
    ('{statusLabel(prediction)}', '{statusLabel(prediction, locale)}'),
    ('>Hesap izi</button>', '>{t(\'model.trace\')}</button>'),
    ('<span>Gnomon yüksekliği</span>', '<span>{t(\'shadow.gnomonHeight\')}</span>'),
    ('<span>Gözlenen gölge uzunluğu</span>', '<span>{t(\'shadow.observedLength\')}</span>'),
    ('placeholder="opsiyonel"', 'placeholder={t(\'shadow.optional\')}'),
    ('<span>Uzunluk belirsizliği ±</span>', '<span>{t(\'shadow.lengthUncertainty\')}</span>'),
    ('<span>Gözlenen gölge azimutu</span>', '<span>{t(\'shadow.observedAzimuth\')}</span>'),
    ('<span>Azimut belirsizliği ±</span>', '<span>{t(\'shadow.azimuthUncertainty\')}</span>'),
    ('<span className="shadow-compass north">K</span>', '<span className="shadow-compass north">{t(\'compass.northShort\')}</span>'),
    ('<span className="shadow-compass east">D</span>', '<span className="shadow-compass east">{t(\'compass.eastShort\')}</span>'),
    ('<span className="shadow-compass south">G</span>', '<span className="shadow-compass south">{t(\'compass.southShort\')}</span>'),
    ('<span className="shadow-compass west">B</span>', '<span className="shadow-compass west">{t(\'compass.westShort\')}</span>'),
    ('<strong className="shadow-no-direct-sun">Güneş geometrik ufkun altında</strong>', '<strong className="shadow-no-direct-sun">{t(\'shadow.noDirectSun\')}</strong>'),
    ('<small>Güneş yüksekliği</small>', '<small>{t(\'shadow.solarElevation\')}</small>'),
    ('<small>Güneş azimutu</small>', '<small>{t(\'shadow.solarAzimuth\')}</small>'),
    ('<small>Beklenen gölge</small>', '<small>{t(\'shadow.predictedLength\')}</small>'),
    ('<small>Beklenen yön</small>', '<small>{t(\'shadow.predictedDirection\')}</small>'),
    ('<small>Gölgeden türetilen Güneş açısı</small>', '<small>{t(\'shadow.impliedSolarElevation\')}</small>'),
    ('<small>Uzunluk farkı</small>', '<small>{t(\'shadow.lengthDifference\')}</small>'),
    ('<small>Yön farkı</small>', '<small>{t(\'shadow.directionDifference\')}</small>'),
    ("{valueOrDash(result.solarElevationDeg, '°')}", "{valueOrDash(result.solarElevationDeg, '°', locale)}"),
    ("{valueOrDash(result.solarAzimuthDeg, '°')}", "{valueOrDash(result.solarAzimuthDeg, '°', locale)}"),
    ("{valueOrDash(result.predictedShadowLengthM, ' m')}", "{valueOrDash(result.predictedShadowLengthM, ' m', locale)}"),
    ("{valueOrDash(result.predictedShadowAzimuthDeg, '°')}", "{valueOrDash(result.predictedShadowAzimuthDeg, '°', locale)}"),
    ("{valueOrDash(result.impliedObservedSolarElevationDeg, '°')}", "{valueOrDash(result.impliedObservedSolarElevationDeg, '°', locale)}"),
    ("{valueOrDash(result.shadowLengthDifferenceM, ' m')}", "{valueOrDash(result.shadowLengthDifferenceM, ' m', locale)}"),
    ("{valueOrDash(result.shadowAzimuthDifferenceDeg, '°')}", "{valueOrDash(result.shadowAzimuthDifferenceDeg, '°', locale)}"),
    ('<p className="shadow-observation-note">\n        Ölçüm yüzeyi yerel yatay, gnomon yerel düşey kabul edilir. Güneş hesabı geometriktir; atmosferik kırılma ve topoğrafik ufuk bu aşamada gölge sonucuna eklenmez. Bu panel Dünya şekli modellerine Güneş davranışı uydurmaz.\n      </p>', '<p className="shadow-observation-note">{t(\'shadow.note\')}</p>')
]:
    replace_once(shadow, old, new)

replace_once(
    dual,
    "import { PanelHelpButton } from './HelpSystem';\nimport './dual-shadow-comparison-panel.css';\n\nconst numberFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 });\nconst coordinateFormatter = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 6 });\n\nfunction valueOrDash(value: number | null, unit: string): string {\n  return value === null ? '—' : `${numberFormatter.format(value)}${unit}`;\n}\n",
    "import { PanelHelpButton } from './HelpSystem';\nimport { useI18n } from './I18nProvider';\nimport { numberFormatterFor } from './app/app-formatters';\nimport { appLocaleTag, translate, type AppLocale } from './i18n';\nimport './dual-shadow-comparison-panel.css';\n\nfunction valueOrDash(value: number | null, unit: string, locale: AppLocale): string {\n  return value === null ? '—' : `${numberFormatterFor(locale).format(value)}${unit}`;\n}\n"
)
replace_once(
    dual,
    "function statusLabel(prediction: ModelPrediction | undefined): string {\n  if (!prediction) return 'KARŞILAŞTIRMA KAPALI';\n  if (prediction.status === 'compatible') return 'FARK ÖLÇÜMLE UYUMLU';\n  if (prediction.status === 'incompatible') return 'FARK ÖLÇÜMLE UYUMSUZ';\n  return 'FARK İÇİN KARAR YOK';\n}\n",
    "function statusLabel(prediction: ModelPrediction | undefined, locale: AppLocale): string {\n  if (!prediction) return translate(locale, 'dualShadow.status.off');\n  if (prediction.status === 'compatible') return translate(locale, 'dualShadow.status.compatible');\n  if (prediction.status === 'incompatible') return translate(locale, 'dualShadow.status.incompatible');\n  return translate(locale, 'dualShadow.status.indeterminate');\n}\n"
)
replace_once(dual, "}): React.JSX.Element {\n  const enabled", "}): React.JSX.Element {\n  const { locale, t } = useI18n();\n  const numberFormatter = numberFormatterFor(locale);\n  const coordinateFormatter = new Intl.NumberFormat(appLocaleTag(locale), { minimumFractionDigits: 4, maximumFractionDigits: 6 });\n  const enabled")
for old, new in [
    ('<span className="eyebrow">Astronomik referans · eşzamanlı iki nokta</span>', '<span className="eyebrow">{t(\'dualShadow.stage\')}</span>'),
    ('<h2>İki konumlu gölge karşılaştırması</h2>', '<h2>{t(\'dualShadow.title\')}</h2>'),
    ('{statusLabel(prediction)}', '{statusLabel(prediction, locale)}'),
    ('>Hesap izi</button>', '>{t(\'model.trace\')}</button>'),
    ("{enabled ? 'İkinci noktayı kapat' : 'İkinci nokta ekle'}", "{enabled ? t('dualShadow.disable') : t('dualShadow.enable')}"),
    ('<strong>Tek-konum gölge deneyi etkin.</strong>', '<strong>{t(\'dualShadow.emptyTitle\')}</strong>'),
    ('<span>Aynı UTC anında ikinci bir WGS84 konumundaki gnomonu karşılaştırmak için B noktasını ekle.</span>', '<span>{t(\'dualShadow.emptyNote\')}</span>'),
    ('<strong>Birincil gözlem noktası</strong>', '<strong>{t(\'dualShadow.primary\')}</strong>'),
    ('<strong>İkinci gözlem noktası</strong>', '<strong>{t(\'dualShadow.secondary\')}</strong>'),
    ('<small>Aynı UTC anı kullanılır</small>', '<small>{t(\'dualShadow.sameUtc\')}</small>'),
    ('<dt>Gnomon</dt>', '<dt>{t(\'dualShadow.gnomon\')}</dt>'),
    ('<dt>Güneş</dt>', '<dt>{t(\'dualShadow.sun\')}</dt>'),
    ('<dt>Beklenen gölge</dt>', '<dt>{t(\'dualShadow.predictedShadow\')}</dt>'),
    ('<span>B enlemi</span>', '<span>{t(\'dualShadow.bLatitude\')}</span>'),
    ('<span>B boylamı</span>', '<span>{t(\'dualShadow.bLongitude\')}</span>'),
    ('<span>B gnomon yüksekliği</span>', '<span>{t(\'dualShadow.bGnomon\')}</span>'),
    ('<span>B gözlenen gölge</span>', '<span>{t(\'dualShadow.bObservedShadow\')}</span>'),
    ('<span>B uzunluk belirsizliği ±</span>', '<span>{t(\'dualShadow.bLengthUncertainty\')}</span>'),
    ('<span>B gözlenen gölge azimutu</span>', '<span>{t(\'dualShadow.bObservedAzimuth\')}</span>'),
    ('<span>B azimut belirsizliği ±</span>', '<span>{t(\'dualShadow.bAzimuthUncertainty\')}</span>'),
    ('placeholder="opsiyonel"', 'placeholder={t(\'shadow.optional\')}'),
    ('<small>WGS84 nokta ayrımı</small>', '<small>{t(\'dualShadow.separation\')}</small>'),
    ('<small>A→B başlangıç azimutu</small>', '<small>{t(\'dualShadow.initialBearing\')}</small>'),
    ('<small>Beklenen Güneş yükseklik farkı B−A</small>', '<small>{t(\'dualShadow.predictedElevationDifference\')}</small>'),
    ('<small>Gözlenen gölgelerden fark</small>', '<small>{t(\'dualShadow.observedElevationDifference\')}</small>'),
    ('<small>Açı farkı artığı</small>', '<small>{t(\'dualShadow.elevationResidual\')}</small>'),
    ('<small>Beklenen gölge yönü farkı</small>', '<small>{t(\'dualShadow.predictedDirectionDifference\')}</small>'),
    ('<small>Gözlenen yön farkı</small>', '<small>{t(\'dualShadow.observedDirectionDifference\')}</small>'),
    ('<small>Yön farkı artığı</small>', '<small>{t(\'dualShadow.directionResidual\')}</small>'),
    ('<p className="dual-shadow-note">\n            A ve B aynı UTC fiziksel anında çözülür. Gnomon yükseklikleri farklı olabilir; saha gölgeleri önce Güneş yüksekliğine dönüştürülerek karşılaştırılır. WGS84 baz çizgisi ve geometrik Güneş referansı burada ölçüm bağlamıdır; Dünya modellerine tanımsız Güneş davranışı eklenmez.\n          </p>', '<p className="dual-shadow-note">{t(\'dualShadow.note\')}</p>')
]:
    replace_once(dual, old, new)
for expr in [
    "primaryResult.solarElevationDeg, '°'",
    "primaryResult.predictedShadowLengthM, ' m'",
    "result?.stationB.solarElevationDeg ?? null, '°'",
    "result?.stationB.predictedShadowLengthM ?? null, ' m'",
    "result.solarElevationDifferenceResidualDeg, '°'",
    "result.predictedShadowAzimuthDifferenceDeg, '°'",
    "result.shadowAzimuthDifferenceResidualDeg, '°'"
]:
    replace_once(dual, f"valueOrDash({expr})", f"valueOrDash({expr}, locale)")

stellar_results.write_text("""import { BRIGHT_STAR_CATALOG_SOURCE } from '../../simulation/bright-star-catalog';
import type {
  StellarObservationResult,
  StellarObservationSettings
} from '../../simulation/stellar-observation';
import type { ModelPrediction } from '../../shared/domain';
import { useI18n } from './I18nProvider';
import { getStellarHorizonClassLabel } from './astronomy-result-presentation';
import { appLocaleTag } from './i18n';
import {
  apparentTrailPolyline,
  localHorizonPolyline,
  trailPolyline
} from './stellar-observation-view-model';

export function StellarObservationResults({
  result,
  prediction,
  settings,
  showRefractionDiagnostic
}: {
  result: StellarObservationResult;
  prediction: ModelPrediction;
  settings: StellarObservationSettings;
  showRefractionDiagnostic: boolean;
}): React.JSX.Element {
  const { locale, t } = useI18n();
  const angleFormatter = new Intl.NumberFormat(appLocaleTag(locale), { maximumFractionDigits: 2 });
  const preciseFormatter = new Intl.NumberFormat(appLocaleTag(locale), { maximumFractionDigits: 5 });
  const formatAngle = (value: number | null): string => value === null ? t('stellar.undefined') : `${angleFormatter.format(value)}°`;
  const formatDuration = (minutes: number | null): string => {
    if (minutes === null) return t('stellar.undefined');
    return minutes < 60
      ? `${angleFormatter.format(minutes)} ${t('unit.minutesShort')}`
      : `${angleFormatter.format(minutes / 60)} ${t('unit.hoursShort')}`;
  };
  const clockFormatter = new Intl.DateTimeFormat(appLocaleTag(locale), {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZone: 'UTC'
  });
  const formatClock = (iso: string): string => clockFormatter.format(new Date(iso));
  const position = result.position;
  const firstLocalSample = result.localHorizonTrail?.samples[0];
  const crossings = result.trail.horizonCrossings;
  const localCrossings = result.localHorizonTrail?.localHorizonCrossings ?? [];
  const polyline = trailPolyline(result);
  const apparentPolyline = apparentTrailPolyline(result);
  const skylinePolyline = localHorizonPolyline(result);

  return (
    <>
      <div className="stellar-coordinate-grid">
        <article><span>{t('stellar.results.catalogJ2000')}</span><strong>α {preciseFormatter.format(result.sourceRightAscensionJ2000Deg)}°</strong><b>δ {preciseFormatter.format(result.sourceDeclinationJ2000Deg)}°</b></article>
        <article><span>{t('stellar.results.meanDate')}</span><strong>α {preciseFormatter.format(result.meanOfDateRightAscensionDeg)}°</strong><b>δ {preciseFormatter.format(result.meanOfDateDeclinationDeg)}°</b></article>
        <article><span>{t('stellar.results.precessionShift')}</span><strong>{angleFormatter.format(result.precessionAngularShiftArcsec)}″</strong><b>IAU 2006</b></article>
        <article><span>{t('stellar.results.lmst')}</span><strong>{angleFormatter.format(position.localMeanSiderealTimeDeg)}°</strong><b>LMST</b></article>
      </div>

      <div className="stellar-position-grid">
        <article><span>{t('stellar.results.elevation')}</span><strong>{formatAngle(position.elevationDeg)}</strong></article>
        <article><span>{t('stellar.results.azimuth')}</span><strong>{formatAngle(position.azimuthDeg)}</strong></article>
        <article><span>{t('stellar.results.hourAngle')}</span><strong>{formatAngle(position.hourAngleDeg)}</strong></article>
        <article><span>{t('stellar.results.dailyClass')}</span><strong>{getStellarHorizonClassLabel(locale, position.horizonClass)}</strong></article>
        {settings.localHorizonEnabled && <>
          <article><span>{t('stellar.results.localHorizonAtAzimuth')}</span><strong>{formatAngle(firstLocalSample?.localHorizonAltitudeDeg ?? null)}</strong></article>
          <article><span>{t('stellar.results.localHorizonClearance')}</span><strong>{formatAngle(firstLocalSample?.geometricClearanceDeg ?? null)}</strong></article>
        </>}
      </div>

      <div className="stellar-trail-card">
        <div className="stellar-trail-title">
          <div><span>{t('stellar.results.trailTitle')}</span><strong>{t('stellar.results.windowSamples', { duration: formatDuration(result.trail.durationMinutes), count: result.trail.samples.length })}</strong></div>
          <div><span>{t('stellar.results.zeroHorizonAbove')}</span><strong>{formatDuration(result.trail.visibleDurationMinutes)}</strong></div>
          {result.localHorizonTrail && <div><span>{t('stellar.results.localHorizonAbove')}</span><strong>{formatDuration(result.localHorizonTrail.visibleDurationMinutes)}</strong></div>}
        </div>
        <svg aria-label={t('stellar.results.trailAria')} role="img" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line className="stellar-horizon-line" x1="4" x2="96" y1="50" y2="50" />
          <line className="stellar-guide-line" x1="4" x2="96" y1="6" y2="6" />
          <line className="stellar-guide-line" x1="4" x2="96" y1="94" y2="94" />
          {skylinePolyline && <polyline className="stellar-local-horizon-line" points={skylinePolyline} fill="none" />}
          <polyline className="stellar-trail-line" points={polyline} fill="none" />
          {showRefractionDiagnostic && apparentPolyline && <polyline className="stellar-apparent-trail-line" points={apparentPolyline} fill="none" />}
        </svg>
        <div className="stellar-trail-axis"><span>+90°</span><span>{t('stellar.results.axisHorizon')}</span><span>−90°</span></div>
        {(result.localHorizonTrail || showRefractionDiagnostic) && <div className="stellar-trail-legend">
          <span className="star-line-key">{t('stellar.results.geometricStar')}</span>
          {showRefractionDiagnostic && <span className="apparent-line-key">{t('stellar.results.standardApparent')}</span>}
          {result.localHorizonTrail && <span className="skyline-line-key">{t('stellar.results.localSkyline')}</span>}
        </div>}
      </div>

      <div className="stellar-crossings">
        <span>{t('stellar.results.astronomicalCrossings')}</span>
        {crossings.length === 0 ? <strong>{t('stellar.results.noAstronomicalCrossing')}</strong> : crossings.map((crossing) => (
          <strong key={`${crossing.kind}-${crossing.observedAtIso}`}>{crossing.kind === 'rise' ? t('stellar.results.rise') : t('stellar.results.set')} · UTC {formatClock(crossing.observedAtIso)} · A {formatAngle(crossing.azimuthDeg)}</strong>
        ))}
      </div>

      {result.localHorizonTrail && <div className="stellar-crossings local">
        <span>{t('stellar.results.localCrossings')}</span>
        {localCrossings.length === 0 ? <strong>{t('stellar.results.noLocalCrossing')}</strong> : localCrossings.map((crossing) => (
          <strong key={`${crossing.kind}-${crossing.observedAtIso}`}>{crossing.kind === 'rise' ? t('stellar.results.localRise') : t('stellar.results.localSet')} · UTC {formatClock(crossing.observedAtIso)} · A {formatAngle(crossing.azimuthDeg)} · {t('stellar.results.horizonWord')} {formatAngle(crossing.localHorizonAltitudeDeg)}</strong>
        ))}
      </div>}

      <p className="stellar-source-note">{t('stellar.results.sourceNote', { source: BRIGHT_STAR_CATALOG_SOURCE })}</p>
      {prediction.warnings.length > 0 && <p className="stellar-warning">{prediction.warnings[2]}</p>}
    </>
  );
}
""", encoding="utf-8")

sky.write_text("""import type {
  StellarObservationResult,
  StellarObservationSettings
} from '../../simulation/stellar-observation';
import { useI18n } from './I18nProvider';
import { appLocaleTag } from './i18n';
import { projectStellarSkyPoint, stellarSkyMarkerRadius } from './stellar-sky-visualization';

export function StellarSkySnapshotPanel({
  result,
  settings,
  show,
  onShowChange
}: {
  result: StellarObservationResult;
  settings: StellarObservationSettings;
  show: boolean;
  onShowChange(show: boolean): void;
}): React.JSX.Element {
  const { locale, t } = useI18n();
  const angleFormatter = new Intl.NumberFormat(appLocaleTag(locale), { maximumFractionDigits: 2 });
  const showSkySnapshot = show;
  const skyStars = result.skySnapshot.stars.filter((star) => star.aboveGeometricHorizon && star.azimuthDeg !== null);
  const brightestSkyStarIds = new Set([...skyStars].sort((left, right) => left.visualMagnitude - right.visualMagnitude).slice(0, 5).map((star) => star.starId));
  brightestSkyStarIds.add(settings.starId);
  const selectedSkyStar = result.skySnapshot.stars.find((star) => star.starId === settings.starId);
  const plottedLocalCounts = {
    above: skyStars.filter((star) => star.localHorizonStatus === 'above').length,
    onHorizon: skyStars.filter((star) => star.localHorizonStatus === 'on-horizon').length,
    below: skyStars.filter((star) => star.localHorizonStatus === 'below').length
  };

  return (
    <div className={showSkySnapshot ? 'stellar-sky-panel active' : 'stellar-sky-panel'}>
      <div className="stellar-sky-heading">
        <div><strong>{t('stellar.sky.title')}</strong><span>{t('stellar.sky.intro')}</span></div>
        <label className="stellar-sky-toggle"><input type="checkbox" checked={showSkySnapshot} onChange={(event) => onShowChange(event.currentTarget.checked)} /><span>{showSkySnapshot ? t('stellar.sky.shown') : t('stellar.sky.off')}</span></label>
      </div>
      {showSkySnapshot && <>
        <div className="stellar-sky-summary">
          <span>{t('stellar.sky.plotted')} <strong>{skyStars.length}/{result.skySnapshot.starCount}</strong></span>
          <span>{t('stellar.sky.geometricSummary')} <strong>{t('stellar.sky.aboveBelow', { above: result.skySnapshot.aboveGeometricHorizonCount, below: result.skySnapshot.belowGeometricHorizonCount })}</strong></span>
          {result.skySnapshot.localHorizonCounts && <span>{t('stellar.sky.localSummary')} <strong>{t('stellar.sky.localCounts', { above: plottedLocalCounts.above, boundary: plottedLocalCounts.onHorizon, below: plottedLocalCounts.below })}</strong></span>}
          {selectedSkyStar && !selectedSkyStar.aboveGeometricHorizon && <span>{t('stellar.sky.selectedStar')} <strong>{t('stellar.sky.selectedBelow')}</strong></span>}
        </div>
        <div className="stellar-sky-chart-wrap">
          <svg aria-label={t('stellar.sky.aria')} role="img" viewBox="0 0 100 100">
            <circle className="stellar-sky-horizon" cx="50" cy="50" r="43" />
            <circle className="stellar-sky-altitude-ring" cx="50" cy="50" r="28.67" />
            <circle className="stellar-sky-altitude-ring" cx="50" cy="50" r="14.33" />
            <line className="stellar-sky-axis" x1="50" y1="7" x2="50" y2="93" />
            <line className="stellar-sky-axis" x1="7" y1="50" x2="93" y2="50" />
            <text className="stellar-sky-cardinal north" x="50" y="4.5">{t('compass.northShort')}</text>
            <text className="stellar-sky-cardinal east" x="96" y="51.5">{t('compass.eastShort')}</text>
            <text className="stellar-sky-cardinal south" x="50" y="98.5">{t('compass.southShort')}</text>
            <text className="stellar-sky-cardinal west" x="4" y="51.5">{t('compass.westShort')}</text>
            <text className="stellar-sky-altitude-label" x="50" y="20.5">60°</text>
            <text className="stellar-sky-altitude-label" x="50" y="35">30°</text>
            {skyStars.map((star) => {
              const point = projectStellarSkyPoint({ elevationDeg: star.elevationDeg, azimuthDeg: star.azimuthDeg! });
              const selected = star.starId === settings.starId;
              const locallyBlocked = star.localHorizonStatus === 'below';
              const onLocalHorizon = star.localHorizonStatus === 'on-horizon';
              const className = selected ? 'stellar-sky-star selected' : locallyBlocked ? 'stellar-sky-star locally-blocked' : onLocalHorizon ? 'stellar-sky-star local-boundary' : 'stellar-sky-star';
              return <g key={star.starId} className={className}>
                <title>{star.commonName} · h {angleFormatter.format(star.elevationDeg)}° · A {angleFormatter.format(star.azimuthDeg!)}° · V {angleFormatter.format(star.visualMagnitude)}</title>
                <circle cx={point.x} cy={point.y} r={stellarSkyMarkerRadius(star.visualMagnitude) + (selected ? 0.5 : 0)} />
                {brightestSkyStarIds.has(star.starId) && <text x={point.x + 2.2} y={point.y - 1.8}>{star.commonName}</text>}
              </g>;
            })}
          </svg>
          <div className="stellar-sky-legend">
            <span className="catalog-star">{t('stellar.sky.catalogStar')}</span>
            <span className="selected-star">{t('stellar.sky.selectedLegend')}</span>
            {result.skySnapshot.localHorizonApplied && <span className="blocked-star">{t('stellar.sky.blockedLegend')}</span>}
          </div>
        </div>
        <p className="stellar-sky-note">{t('stellar.sky.note')}</p>
      </>}
    </div>
  );
}
""", encoding="utf-8")

write_new(test, """import { describe, expect, it } from 'vitest';
import { getStellarHorizonClassLabel } from '../src/renderer/src/astronomy-result-presentation';
import { translate } from '../src/renderer/src/i18n';

describe('shadow and stellar localization', () => {
  it('localizes shadow and dual-shadow presentation labels', () => {
    expect(translate('tr', 'shadow.title')).toBe('Dikey gnomon gölge geometrisi');
    expect(translate('en', 'shadow.title')).toBe('Vertical-gnomon shadow geometry');
    expect(translate('en', 'dualShadow.enable')).toBe('Add second point');
  });

  it('localizes stellar horizon classes without changing their stable id', () => {
    const horizonClass = 'rises-and-sets' as const;
    expect(getStellarHorizonClassLabel('tr', horizonClass)).toBe('Doğar ve batar');
    expect(getStellarHorizonClassLabel('en', horizonClass)).toBe('Rises and sets');
    expect(horizonClass).toBe('rises-and-sets');
  });

  it('localizes stellar sky/result shell labels while keeping machine terminology intact', () => {
    expect(translate('en', 'stellar.results.catalogJ2000')).toBe('Catalog · J2000');
    expect(translate('en', 'stellar.sky.title')).toBe('Multi-star sky · geometric');
    expect(translate('en', 'stellar.results.standardApparent')).toBe('Standard apparent');
  });
});
""")

text = docs.read_text(encoding="utf-8")
anchor = "- Astronomy result slice (part 2): daily solar events, civil↔solar time, annual season reference and same-instant WGS84 route comparison use the active locale while simulation/domain ids stay invariant.\n"
if anchor not in text:
    anchor = "- Astronomy result slice (part 1): Sun/Moon position panels plus eclipse overlap/event-search result surfaces, with renderer-only phase/geometry presentation mapping and active-locale numeric formatting.\n"
if anchor not in text:
    fail("docs/localization.md progress anchor not found")
addition = anchor + "- Astronomy result slice (part 3): single/dual shadow result surfaces plus core stellar result and geometric sky-snapshot presentation use TR/EN; raw engine warnings/traces and stellar source/editor controls remain follow-up work.\n"
docs.write_text(text.replace(anchor, addition, 1), encoding="utf-8")

print('Shadow + core stellar localization slice applied. Run npm run verify; defer Electron smoke until final localization audit.')
