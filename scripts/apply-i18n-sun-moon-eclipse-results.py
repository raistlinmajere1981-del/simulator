#!/usr/bin/env python3
"""Localize Sun/Moon position and eclipse result panels.

Temporary helper: remove before merge. This slice keeps simulation/domain values,
calculation traces, raw engine errors and machine-readable contracts unchanged.
"""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        fail(f"{path.relative_to(ROOT)}: expected one match, found {count}: {old[:80]!r}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def write_new(path: Path, content: str) -> None:
    if path.exists():
        fail(f"{path.relative_to(ROOT)} already exists")
    path.write_text(content, encoding="utf-8")


i18n = ROOT / "src/renderer/src/i18n.ts"
solar = ROOT / "src/renderer/src/SolarPositionPanel.tsx"
lunar = ROOT / "src/renderer/src/LunarPositionPanel.tsx"
overlap = ROOT / "src/renderer/src/EclipseOverlapPanel.tsx"
search = ROOT / "src/renderer/src/EclipseEventSearchPanel.tsx"
docs = ROOT / "docs/localization.md"
presentation = ROOT / "src/renderer/src/astronomy-result-presentation.ts"
test = ROOT / "tests/astronomy-results-i18n.test.ts"

for path in (i18n, solar, lunar, overlap, search, docs):
    if not path.exists():
        fail(f"missing expected file: {path.relative_to(ROOT)}")

tr_anchor = "  'astronomy.summary.stellarScope': 'Parlak yıldız kataloğu çevrimdışı tutulur. Katalogdaki J2000 yönü gözlem tarihine açık IAU 2006 precession adımıyla dönüştürülür; ardından geometrik yükseklik, azimut ve yıldız izi hesaplanır. Proper motion, atmosferik kırılma, gökyüzü parlaklığı ve topoğrafik ufuk bu aşamada uygulanmaz.'\n} as const;"
tr_block = """  'astronomy.summary.stellarScope': 'Parlak yıldız kataloğu çevrimdışı tutulur. Katalogdaki J2000 yönü gözlem tarihine açık IAU 2006 precession adımıyla dönüştürülür; ardından geometrik yükseklik, azimut ve yıldız izi hesaplanır. Proper motion, atmosferik kırılma, gökyüzü parlaklığı ve topoğrafik ufuk bu aşamada uygulanmaz.',
  'astronomy.reference.sun': 'Astronomik referans · Güneş',
  'astronomy.reference.moon': 'Astronomik referans · Ay',
  'astronomy.geometricLocalPosition': 'Geometrik yerel konum',
  'astronomy.topocentricPositionPhase': 'Topocentrik konum ve faz',
  'astronomy.aboveHorizon': 'UFUK ÜSTÜNDE',
  'astronomy.belowHorizon': 'UFUK ALTINDA',
  'compass.northShort': 'K',
  'compass.eastShort': 'D',
  'compass.southShort': 'G',
  'compass.westShort': 'B',
  'astronomy.metric.geometricElevation': 'Geometrik yükseklik',
  'astronomy.metric.azimuthNorth': 'Azimut · kuzeyden',
  'astronomy.metric.declination': 'Deklinasyon',
  'astronomy.metric.hourAngle': 'Saat açısı',
  'astronomy.metric.zenithAngle': 'Zenit açısı',
  'astronomy.metric.equationOfTime': 'Zaman denklemi',
  'astronomy.metric.illumination': 'Aydınlık oranı',
  'astronomy.metric.phaseAge': 'Faz / yaklaşık yaş',
  'astronomy.metric.elongation': 'Güneş-Ay uzanımı',
  'astronomy.metric.moonDistance': 'Ay uzaklığı',
  'astronomy.metric.horizontalParallax': 'Yatay paralaks',
  'unit.minutesShort': 'dk',
  'unit.days': 'gün',
  'solar.position.note': 'Bu sonuç geometrik astronomik referanstır. Atmosferik kırılma, yerel topoğrafik ufuk ve Güneş diskinin görünür kenarı bu 6.1 sonucuna eklenmez.',
  'lunar.position.note': '6.2 sonucu düşük hassasiyetli astronomik referanstır. Ay paralaksı topocentrik olarak uygulanır; atmosferik kırılma, yerel topoğrafik ufuk ve gözlemci rakımı bu sonuca dahil değildir. Güneş–Ay tutulma örtüşme geometrisi aşağıda ayrı Aşama 7.2 tanısı olarak gösterilir.',
  'lunar.phase.newMoon': 'Yeni Ay',
  'lunar.phase.waxingCrescent': 'Büyüyen Hilal',
  'lunar.phase.firstQuarter': 'İlk Dördün',
  'lunar.phase.waxingGibbous': 'Büyüyen Şişkin Ay',
  'lunar.phase.fullMoon': 'Dolunay',
  'lunar.phase.waningGibbous': 'Küçülen Şişkin Ay',
  'lunar.phase.lastQuarter': 'Son Dördün',
  'lunar.phase.waningCrescent': 'Küçülen Hilal',
  'eclipse.geometry.none': 'Örtüşme yok',
  'eclipse.geometry.partial': 'Kısmi örtüşme',
  'eclipse.geometry.totalContained': 'Tam-tip iç kapsama',
  'eclipse.geometry.annularContained': 'Halkalı-tip iç kapsama',
  'eclipse.geometryFull.none': 'Disk örtüşmesi yok',
  'eclipse.geometryFull.partial': 'Kısmi disk örtüşmesi',
  'eclipse.geometryFull.totalContained': 'Tam-tip anlık geometri',
  'eclipse.geometryFull.annularContained': 'Halkalı-tip anlık geometri',
  'eclipse.overlap.stage': 'Aşama 7.2 · anlık tutulma geometrisi',
  'eclipse.overlap.title': 'Güneş–Ay apparent disk örtüşmesi',
  'eclipse.overlap.intro': 'Seçili gözlemci ve zaman için iki disk birlikte çözülür. Bu panel temas zamanı veya resmi tutulma yolu üretmez.',
  'eclipse.overlap.aria': 'Güneş ve Ay apparent disk geometrisi',
  'eclipse.overlap.sun': 'Güneş',
  'eclipse.overlap.moon': 'Ay',
  'eclipse.overlap.compressedScale': 'Merkez ayrımı çok büyük olduğu için yalnız yerleşim sıkıştırılmıştır; disk çap oranları kendi aralarında ölçeklidir.',
  'eclipse.overlap.exactScale': 'Disk yarıçapları ve merkez ayrımı aynı açısal ölçekte çizilmiştir.',
  'eclipse.overlap.centerSeparation': 'Merkez ayrımı',
  'eclipse.overlap.solarRadius': 'Güneş açısal yarıçapı',
  'eclipse.overlap.lunarRadius': 'Ay açısal yarıçapı',
  'eclipse.overlap.solarAreaCovered': 'Güneş disk alanı örtüşmesi',
  'eclipse.overlap.diameterCoverage': 'Çap doğrultusu örtme oranı',
  'eclipse.overlap.outerLimbClearance': 'Dış limb açıklığı',
  'eclipse.overlap.sunElevation': 'Güneş merkez yüksekliği',
  'eclipse.overlap.moonElevation': 'Ay merkez yüksekliği',
  'eclipse.overlap.solarDistance': 'Güneş uzaklığı',
  'eclipse.overlap.lunarDistance': 'Ay uzaklığı',
  'eclipse.overlap.geometricHorizon': 'Geometrik ufuk',
  'eclipse.overlap.bothAbove': 'iki merkez üstte',
  'eclipse.overlap.oneBelow': 'en az bir merkez altta',
  'eclipse.overlap.limit': 'Düşük hassasiyetli astronomik tanıdır: Bessel elemanları, C1–C4 temasları, merkez hattı, Ay limb topografyası, atmosferik kırılma ve JPL DE efemerisi uygulanmaz. “Tam-tip / halkalı-tip” yalnız bu anın disk kapsanma geometrisini ifade eder.',
  'eclipse.search.outsideWindow': 'Pencere dışında',
  'eclipse.search.stage': 'Aşama 7.4 · kaydedilebilir zaman penceresi',
  'eclipse.search.title': 'Yerel disk örtüşme olayı ara',
  'eclipse.search.intro': 'Seçili gözlem anının çevresini tarar; varsa örtüşmenin yaklaşık başlangıcını, maksimumunu ve bitişini düşük hassasiyetli modelle bulur. Son tarama ayrı tutulma senaryosunda deney kaydına eklenebilir.',
  'eclipse.search.halfWindow': 'Yarım pencere',
  'eclipse.search.hours': '±{hours} saat',
  'eclipse.search.scan': 'Pencereyi tara',
  'eclipse.search.centerTime': 'Merkez zaman',
  'eclipse.search.location': 'Konum',
  'eclipse.search.coarseStep': 'Kaba adım',
  'eclipse.search.saveStatus': 'Kayıt durumu',
  'eclipse.search.stale': 'ESKİ SONUÇ',
  'eclipse.search.ready': 'KAYDA HAZIR',
  'eclipse.search.error': 'Tutulma zaman penceresi taranamadı.',
  'eclipse.search.empty': 'Bu tarama kullanıcı isteğiyle çalışır. Böylece her tarih veya koordinat değişiminde yüzlerce astronomik örnek otomatik hesaplanmaz.',
  'eclipse.search.staleNote': 'Tarih, konum veya pencere değişti. Aşağıdaki sonuç önceki taramaya aittir ve kayda güncel sonuç olarak eklenmez; yeniden tara.',
  'eclipse.search.overlapStart': 'Örtüşme başlangıcı',
  'eclipse.search.maximumOverlap': 'Maksimum örtüşme',
  'eclipse.search.overlapEnd': 'Örtüşme bitişi',
  'eclipse.search.mayStartBefore': 'Arama penceresinden önce başlamış olabilir',
  'eclipse.search.mayContinueAfter': 'Arama penceresinden sonra sürebilir',
  'eclipse.search.outerBoundaryApprox': 'Dış disk sınırı · yaklaşık',
  'eclipse.search.solarDiskArea': '{value} Güneş disk alanı',
  'eclipse.search.overlapDuration': 'Örtüşme süresi',
  'eclipse.search.windowLimited': 'Pencere ile sınırlı',
  'eclipse.search.maximumClass': 'Maksimum sınıf',
  'eclipse.search.maximumSeparation': 'Maksimum merkez ayrımı',
  'eclipse.search.maximumDiameterCoverage': 'Maksimum çap örtme oranı',
  'eclipse.search.maximumHorizon': 'Maksimumda geometrik ufuk',
  'eclipse.search.coarseSamples': 'Kaba tarama örneği',
  'eclipse.search.bothAbove': 'İki merkez üstte',
  'eclipse.search.oneBelow': 'En az bir merkez altta',
  'eclipse.search.containedFound': 'İç kapsama aralığı bulundu',
  'eclipse.search.approxMinutes': '≈ {value} dk',
  'eclipse.search.result': 'Sonuç',
  'eclipse.search.noOverlap': 'Seçilen pencerede disk örtüşmesi yok',
  'eclipse.search.closestApproach': 'En yakın yaklaşım',
  'eclipse.search.outerClearance': 'Dış limb açıklığı {value}°',
  'eclipse.search.limit': 'Bu zamanlar resmi C1–C4 temasları değildir. 5 dakikalık kaba tarama, ardından yaklaşık 1 saniyelik sayısal sınır inceltmesi kullanılır. Bessel elemanları, Ay limb topografyası, atmosferik kırılma ve yüksek hassasiyetli JPL efemerisi uygulanmaz.'
} as const;"""
replace_once(i18n, tr_anchor, tr_block)

en_anchor = "  'astronomy.summary.stellarScope': 'The bright-star catalog is kept offline. The catalog J2000 direction is transformed to the observation date with an explicit IAU 2006 precession step; geometric altitude, azimuth and star trail are then calculated. Proper motion, atmospheric refraction, sky brightness and topographic horizon are not applied in this stage.'\n};"
en_block = """  'astronomy.summary.stellarScope': 'The bright-star catalog is kept offline. The catalog J2000 direction is transformed to the observation date with an explicit IAU 2006 precession step; geometric altitude, azimuth and star trail are then calculated. Proper motion, atmospheric refraction, sky brightness and topographic horizon are not applied in this stage.',
  'astronomy.reference.sun': 'Astronomical reference · Sun',
  'astronomy.reference.moon': 'Astronomical reference · Moon',
  'astronomy.geometricLocalPosition': 'Geometric local position',
  'astronomy.topocentricPositionPhase': 'Topocentric position and phase',
  'astronomy.aboveHorizon': 'ABOVE HORIZON',
  'astronomy.belowHorizon': 'BELOW HORIZON',
  'compass.northShort': 'N',
  'compass.eastShort': 'E',
  'compass.southShort': 'S',
  'compass.westShort': 'W',
  'astronomy.metric.geometricElevation': 'Geometric elevation',
  'astronomy.metric.azimuthNorth': 'Azimuth · from north',
  'astronomy.metric.declination': 'Declination',
  'astronomy.metric.hourAngle': 'Hour angle',
  'astronomy.metric.zenithAngle': 'Zenith angle',
  'astronomy.metric.equationOfTime': 'Equation of time',
  'astronomy.metric.illumination': 'Illuminated fraction',
  'astronomy.metric.phaseAge': 'Phase / approximate age',
  'astronomy.metric.elongation': 'Sun–Moon elongation',
  'astronomy.metric.moonDistance': 'Moon distance',
  'astronomy.metric.horizontalParallax': 'Horizontal parallax',
  'unit.minutesShort': 'min',
  'unit.days': 'days',
  'solar.position.note': 'This result is a geometric astronomical reference. Atmospheric refraction, the local topographic horizon and the visible limb of the solar disk are not added to this Stage 6.1 result.',
  'lunar.position.note': 'The Stage 6.2 result is a low-precision astronomical reference. Lunar parallax is applied topocentrically; atmospheric refraction, the local topographic horizon and observer elevation are not included. Sun–Moon eclipse overlap geometry is shown below as a separate Stage 7.2 diagnostic.',
  'lunar.phase.newMoon': 'New Moon',
  'lunar.phase.waxingCrescent': 'Waxing Crescent',
  'lunar.phase.firstQuarter': 'First Quarter',
  'lunar.phase.waxingGibbous': 'Waxing Gibbous',
  'lunar.phase.fullMoon': 'Full Moon',
  'lunar.phase.waningGibbous': 'Waning Gibbous',
  'lunar.phase.lastQuarter': 'Last Quarter',
  'lunar.phase.waningCrescent': 'Waning Crescent',
  'eclipse.geometry.none': 'No overlap',
  'eclipse.geometry.partial': 'Partial overlap',
  'eclipse.geometry.totalContained': 'Total-type containment',
  'eclipse.geometry.annularContained': 'Annular-type containment',
  'eclipse.geometryFull.none': 'No disk overlap',
  'eclipse.geometryFull.partial': 'Partial disk overlap',
  'eclipse.geometryFull.totalContained': 'Total-type instantaneous geometry',
  'eclipse.geometryFull.annularContained': 'Annular-type instantaneous geometry',
  'eclipse.overlap.stage': 'Stage 7.2 · instantaneous eclipse geometry',
  'eclipse.overlap.title': 'Sun–Moon apparent disk overlap',
  'eclipse.overlap.intro': 'Both disks are solved together for the selected observer and time. This panel does not produce contact times or an official eclipse path.',
  'eclipse.overlap.aria': 'Sun and Moon apparent disk geometry',
  'eclipse.overlap.sun': 'Sun',
  'eclipse.overlap.moon': 'Moon',
  'eclipse.overlap.compressedScale': 'Only the placement is compressed because the center separation is very large; the disk diameter ratio remains to scale between the disks.',
  'eclipse.overlap.exactScale': 'Disk radii and center separation are drawn on the same angular scale.',
  'eclipse.overlap.centerSeparation': 'Center separation',
  'eclipse.overlap.solarRadius': 'Solar angular radius',
  'eclipse.overlap.lunarRadius': 'Lunar angular radius',
  'eclipse.overlap.solarAreaCovered': 'Solar disk area covered',
  'eclipse.overlap.diameterCoverage': 'Diameter-axis coverage ratio',
  'eclipse.overlap.outerLimbClearance': 'Outer-limb clearance',
  'eclipse.overlap.sunElevation': 'Sun-center elevation',
  'eclipse.overlap.moonElevation': 'Moon-center elevation',
  'eclipse.overlap.solarDistance': 'Sun distance',
  'eclipse.overlap.lunarDistance': 'Moon distance',
  'eclipse.overlap.geometricHorizon': 'Geometric horizon',
  'eclipse.overlap.bothAbove': 'both centers above',
  'eclipse.overlap.oneBelow': 'at least one center below',
  'eclipse.overlap.limit': 'This is a low-precision astronomical diagnostic: Besselian elements, C1–C4 contacts, center line, lunar-limb topography, atmospheric refraction and JPL DE ephemerides are not applied. “Total-type / annular-type” describes only the disk-containment geometry at this instant.',
  'eclipse.search.outsideWindow': 'Outside window',
  'eclipse.search.stage': 'Stage 7.4 · saveable time window',
  'eclipse.search.title': 'Search local disk-overlap event',
  'eclipse.search.intro': 'Scans around the selected observation instant and, when overlap exists, finds its approximate start, maximum and end with the low-precision model. The latest scan can be attached to the experiment record in the separate eclipse scenario.',
  'eclipse.search.halfWindow': 'Half window',
  'eclipse.search.hours': '±{hours} hours',
  'eclipse.search.scan': 'Scan window',
  'eclipse.search.centerTime': 'Center time',
  'eclipse.search.location': 'Location',
  'eclipse.search.coarseStep': 'Coarse step',
  'eclipse.search.saveStatus': 'Save status',
  'eclipse.search.stale': 'STALE RESULT',
  'eclipse.search.ready': 'READY TO SAVE',
  'eclipse.search.error': 'The eclipse time window could not be scanned.',
  'eclipse.search.empty': 'This scan runs only on user request, so hundreds of astronomical samples are not recalculated automatically after every date or coordinate change.',
  'eclipse.search.staleNote': 'Date, location or window changed. The result below belongs to the previous scan and will not be attached as the current result; scan again.',
  'eclipse.search.overlapStart': 'Overlap start',
  'eclipse.search.maximumOverlap': 'Maximum overlap',
  'eclipse.search.overlapEnd': 'Overlap end',
  'eclipse.search.mayStartBefore': 'May have started before the search window',
  'eclipse.search.mayContinueAfter': 'May continue after the search window',
  'eclipse.search.outerBoundaryApprox': 'Outer disk boundary · approximate',
  'eclipse.search.solarDiskArea': '{value} solar disk area',
  'eclipse.search.overlapDuration': 'Overlap duration',
  'eclipse.search.windowLimited': 'Limited by window',
  'eclipse.search.maximumClass': 'Maximum class',
  'eclipse.search.maximumSeparation': 'Maximum center separation',
  'eclipse.search.maximumDiameterCoverage': 'Maximum diameter coverage',
  'eclipse.search.maximumHorizon': 'Geometric horizon at maximum',
  'eclipse.search.coarseSamples': 'Coarse scan samples',
  'eclipse.search.bothAbove': 'Both centers above',
  'eclipse.search.oneBelow': 'At least one center below',
  'eclipse.search.containedFound': 'Containment interval found',
  'eclipse.search.approxMinutes': '≈ {value} min',
  'eclipse.search.result': 'Result',
  'eclipse.search.noOverlap': 'No disk overlap in the selected window',
  'eclipse.search.closestApproach': 'Closest approach',
  'eclipse.search.outerClearance': 'Outer-limb clearance {value}°',
  'eclipse.search.limit': 'These times are not official C1–C4 contacts. A 5-minute coarse scan is followed by numerical boundary refinement to about 1 second. Besselian elements, lunar-limb topography, atmospheric refraction and high-precision JPL ephemerides are not applied.'
};"""
replace_once(i18n, en_anchor, en_block)

presentation_content = """import type { LunarPhaseName } from '../../simulation/lunar-position';
import type { SolarEclipseInstantGeometryClass } from '../../simulation/solar-eclipse-overlap';
import { translate, type AppLocale, type TranslationKey } from './i18n';

const lunarPhaseKeys: Record<LunarPhaseName, TranslationKey> = {
  'Yeni Ay': 'lunar.phase.newMoon',
  'Büyüyen Hilal': 'lunar.phase.waxingCrescent',
  'İlk Dördün': 'lunar.phase.firstQuarter',
  'Büyüyen Şişkin Ay': 'lunar.phase.waxingGibbous',
  Dolunay: 'lunar.phase.fullMoon',
  'Küçülen Şişkin Ay': 'lunar.phase.waningGibbous',
  'Son Dördün': 'lunar.phase.lastQuarter',
  'Küçülen Hilal': 'lunar.phase.waningCrescent'
};

const eclipseGeometryKeys: Record<SolarEclipseInstantGeometryClass, TranslationKey> = {
  'no-overlap': 'eclipse.geometry.none',
  'partial-overlap': 'eclipse.geometry.partial',
  'total-type-contained': 'eclipse.geometry.totalContained',
  'annular-type-contained': 'eclipse.geometry.annularContained'
};

const eclipseGeometryFullKeys: Record<SolarEclipseInstantGeometryClass, TranslationKey> = {
  'no-overlap': 'eclipse.geometryFull.none',
  'partial-overlap': 'eclipse.geometryFull.partial',
  'total-type-contained': 'eclipse.geometryFull.totalContained',
  'annular-type-contained': 'eclipse.geometryFull.annularContained'
};

export function getLunarPhaseLabel(locale: AppLocale, phase: LunarPhaseName): string {
  return translate(locale, lunarPhaseKeys[phase]);
}

export function getEclipseGeometryLabel(
  locale: AppLocale,
  geometryClass: SolarEclipseInstantGeometryClass
): string {
  return translate(locale, eclipseGeometryKeys[geometryClass]);
}

export function getEclipseGeometryFullLabel(
  locale: AppLocale,
  geometryClass: SolarEclipseInstantGeometryClass
): string {
  return translate(locale, eclipseGeometryFullKeys[geometryClass]);
}
"""
write_new(presentation, presentation_content)

# Solar position panel.
replace_once(solar,
"import { PanelHelpButton } from './HelpSystem';\nimport './solar-position-panel.css';\n\nconst angleFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 });\nconst minuteFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });\n\nfunction angle(value: number): string {\n  return `${angleFormatter.format(value)}°`;\n}",
"import { PanelHelpButton } from './HelpSystem';\nimport { useI18n } from './I18nProvider';\nimport { appLocaleTag, type AppLocale } from './i18n';\nimport './solar-position-panel.css';\n\nconst angleFormatters: Record<AppLocale, Intl.NumberFormat> = {\n  tr: new Intl.NumberFormat(appLocaleTag('tr'), { maximumFractionDigits: 3 }),\n  en: new Intl.NumberFormat(appLocaleTag('en'), { maximumFractionDigits: 3 })\n};\nconst minuteFormatters: Record<AppLocale, Intl.NumberFormat> = {\n  tr: new Intl.NumberFormat(appLocaleTag('tr'), { maximumFractionDigits: 2 }),\n  en: new Intl.NumberFormat(appLocaleTag('en'), { maximumFractionDigits: 2 })\n};\n\nfunction angle(value: number, locale: AppLocale): string {\n  return `${angleFormatters[locale].format(value)}°`;\n}\n")
replace_once(solar,
"}): React.JSX.Element {\n  const aboveHorizon = result.elevationDeg >= 0;",
"}): React.JSX.Element {\n  const { locale, t } = useI18n();\n  const aboveHorizon = result.elevationDeg >= 0;")
for old, new in [
("<span className=\"eyebrow\">Astronomik referans · Güneş</span>", "<span className=\"eyebrow\">{t('astronomy.reference.sun')}</span>"),
("<h2>Geometrik yerel konum</h2>", "<h2>{t('astronomy.geometricLocalPosition')}</h2>"),
("{aboveHorizon ? 'UFUK ÜSTÜNDE' : 'UFUK ALTINDA'}", "{aboveHorizon ? t('astronomy.aboveHorizon') : t('astronomy.belowHorizon')}"),
(">Hesap izi</button>", ">{t('model.trace')}</button>"),
("<span className=\"solar-sky-label north\">K</span>", "<span className=\"solar-sky-label north\">{t('compass.northShort')}</span>"),
("<span className=\"solar-sky-label east\">D</span>", "<span className=\"solar-sky-label east\">{t('compass.eastShort')}</span>"),
("<span className=\"solar-sky-label south\">G</span>", "<span className=\"solar-sky-label south\">{t('compass.southShort')}</span>"),
("<span className=\"solar-sky-label west\">B</span>", "<span className=\"solar-sky-label west\">{t('compass.westShort')}</span>"),
("<div><small>Geometrik yükseklik</small><strong>{angle(result.elevationDeg)}</strong></div>", "<div><small>{t('astronomy.metric.geometricElevation')}</small><strong>{angle(result.elevationDeg, locale)}</strong></div>"),
("<div><small>Azimut · kuzeyden</small><strong>{angle(result.azimuthDeg)}</strong></div>", "<div><small>{t('astronomy.metric.azimuthNorth')}</small><strong>{angle(result.azimuthDeg, locale)}</strong></div>"),
("<div><small>Deklinasyon</small><strong>{angle(result.declinationDeg)}</strong></div>", "<div><small>{t('astronomy.metric.declination')}</small><strong>{angle(result.declinationDeg, locale)}</strong></div>"),
("<div><small>Saat açısı</small><strong>{angle(result.hourAngleDeg)}</strong></div>", "<div><small>{t('astronomy.metric.hourAngle')}</small><strong>{angle(result.hourAngleDeg, locale)}</strong></div>"),
("<div><small>Zenit açısı</small><strong>{angle(result.zenithDeg)}</strong></div>", "<div><small>{t('astronomy.metric.zenithAngle')}</small><strong>{angle(result.zenithDeg, locale)}</strong></div>"),
("<div><small>Zaman denklemi</small><strong>{minuteFormatter.format(result.equationOfTimeMinutes)} dk</strong></div>", "<div><small>{t('astronomy.metric.equationOfTime')}</small><strong>{minuteFormatters[locale].format(result.equationOfTimeMinutes)} {t('unit.minutesShort')}</strong></div>"),
("<p className=\"solar-position-note\">\n        Bu sonuç geometrik astronomik referanstır. Atmosferik kırılma, yerel topoğrafik ufuk ve Güneş diskinin görünür kenarı bu 6.1 sonucuna eklenmez.\n      </p>", "<p className=\"solar-position-note\">{t('solar.position.note')}</p>")
]:
    replace_once(solar, old, new)

# Lunar position panel.
replace_once(lunar,
"import { EclipseOverlapPanel } from './EclipseOverlapPanel';\nimport { PanelHelpButton } from './HelpSystem';\nimport './lunar-position-panel.css';\n\nconst angleFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 });\nconst percentFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });\nconst distanceFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });\nconst ageFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });\n\nfunction angle(value: number): string {\n  return `${angleFormatter.format(value)}°`;\n}\n",
"import { EclipseOverlapPanel } from './EclipseOverlapPanel';\nimport { PanelHelpButton } from './HelpSystem';\nimport { useI18n } from './I18nProvider';\nimport { getLunarPhaseLabel } from './astronomy-result-presentation';\nimport { appLocaleTag, type AppLocale } from './i18n';\nimport { formatPercentValue } from './app/app-formatters';\nimport './lunar-position-panel.css';\n\nconst angleFormatters: Record<AppLocale, Intl.NumberFormat> = {\n  tr: new Intl.NumberFormat(appLocaleTag('tr'), { maximumFractionDigits: 3 }),\n  en: new Intl.NumberFormat(appLocaleTag('en'), { maximumFractionDigits: 3 })\n};\nconst distanceFormatters: Record<AppLocale, Intl.NumberFormat> = {\n  tr: new Intl.NumberFormat(appLocaleTag('tr'), { maximumFractionDigits: 0 }),\n  en: new Intl.NumberFormat(appLocaleTag('en'), { maximumFractionDigits: 0 })\n};\nconst ageFormatters: Record<AppLocale, Intl.NumberFormat> = {\n  tr: new Intl.NumberFormat(appLocaleTag('tr'), { maximumFractionDigits: 2 }),\n  en: new Intl.NumberFormat(appLocaleTag('en'), { maximumFractionDigits: 2 })\n};\n\nfunction angle(value: number, locale: AppLocale): string {\n  return `${angleFormatters[locale].format(value)}°`;\n}\n")
replace_once(lunar,
"}): React.JSX.Element {\n  const aboveHorizon = result.elevationDeg >= 0;",
"}): React.JSX.Element {\n  const { locale, t } = useI18n();\n  const aboveHorizon = result.elevationDeg >= 0;")
replace_once(lunar,
"  const illuminationPercent = result.illuminatedFraction * 100;\n  const [halfWindowHours, setHalfWindowHours] = useState(12);",
"  const illuminationPercent = result.illuminatedFraction * 100;\n  const phaseLabel = getLunarPhaseLabel(locale, result.phaseName);\n  const [halfWindowHours, setHalfWindowHours] = useState(12);")
for old, new in [
("<span className=\"eyebrow\">Astronomik referans · Ay</span>", "<span className=\"eyebrow\">{t('astronomy.reference.moon')}</span>"),
("<h2>Topocentrik konum ve faz</h2>", "<h2>{t('astronomy.topocentricPositionPhase')}</h2>"),
("{aboveHorizon ? 'UFUK ÜSTÜNDE' : 'UFUK ALTINDA'}", "{aboveHorizon ? t('astronomy.aboveHorizon') : t('astronomy.belowHorizon')}"),
(">Hesap izi</button>", ">{t('model.trace')}</button>"),
("<span className=\"lunar-sky-label north\">K</span>", "<span className=\"lunar-sky-label north\">{t('compass.northShort')}</span>"),
("<span className=\"lunar-sky-label east\">D</span>", "<span className=\"lunar-sky-label east\">{t('compass.eastShort')}</span>"),
("<span className=\"lunar-sky-label south\">G</span>", "<span className=\"lunar-sky-label south\">{t('compass.southShort')}</span>"),
("<span className=\"lunar-sky-label west\">B</span>", "<span className=\"lunar-sky-label west\">{t('compass.westShort')}</span>"),
("<strong className=\"lunar-phase-label\">{result.phaseName} · %{percentFormatter.format(illuminationPercent)}</strong>", "<strong className=\"lunar-phase-label\">{phaseLabel} · {formatPercentValue(illuminationPercent, locale)}</strong>"),
("<div><small>Geometrik yükseklik</small><strong>{angle(result.elevationDeg)}</strong></div>", "<div><small>{t('astronomy.metric.geometricElevation')}</small><strong>{angle(result.elevationDeg, locale)}</strong></div>"),
("<div><small>Azimut · kuzeyden</small><strong>{angle(result.azimuthDeg)}</strong></div>", "<div><small>{t('astronomy.metric.azimuthNorth')}</small><strong>{angle(result.azimuthDeg, locale)}</strong></div>"),
("<div><small>Aydınlık oranı</small><strong>%{percentFormatter.format(illuminationPercent)}</strong></div>", "<div><small>{t('astronomy.metric.illumination')}</small><strong>{formatPercentValue(illuminationPercent, locale)}</strong></div>"),
("<div><small>Faz / yaklaşık yaş</small><strong>{result.phaseName}</strong><em>{ageFormatter.format(result.phaseAgeDays)} gün</em></div>", "<div><small>{t('astronomy.metric.phaseAge')}</small><strong>{phaseLabel}</strong><em>{ageFormatters[locale].format(result.phaseAgeDays)} {t('unit.days')}</em></div>"),
("<div><small>Güneş-Ay uzanımı</small><strong>{angle(result.elongationDeg)}</strong></div>", "<div><small>{t('astronomy.metric.elongation')}</small><strong>{angle(result.elongationDeg, locale)}</strong></div>"),
("<div><small>Ay uzaklığı</small><strong>{distanceFormatter.format(result.distanceKm)} km</strong></div>", "<div><small>{t('astronomy.metric.moonDistance')}</small><strong>{distanceFormatters[locale].format(result.distanceKm)} km</strong></div>"),
("<div><small>Deklinasyon</small><strong>{angle(result.declinationDeg)}</strong></div>", "<div><small>{t('astronomy.metric.declination')}</small><strong>{angle(result.declinationDeg, locale)}</strong></div>"),
("<div><small>Yatay paralaks</small><strong>{angle(result.horizontalParallaxDeg)}</strong></div>", "<div><small>{t('astronomy.metric.horizontalParallax')}</small><strong>{angle(result.horizontalParallaxDeg, locale)}</strong></div>"),
("<p className=\"lunar-position-note\">\n          6.2 sonucu düşük hassasiyetli astronomik referanstır. Ay paralaksı topocentrik olarak uygulanır; atmosferik kırılma, yerel topoğrafik ufuk ve gözlemci rakımı bu sonuca dahil değildir. Güneş–Ay tutulma örtüşme geometrisi aşağıda ayrı Aşama 7.2 tanısı olarak gösterilir.\n        </p>", "<p className=\"lunar-position-note\">{t('lunar.position.note')}</p>")
]:
    replace_once(lunar, old, new)

# Eclipse overlap panel.
replace_once(overlap,
"import type { SolarEclipseOverlapResult } from '../../simulation/solar-eclipse-overlap';\nimport './eclipse-overlap-panel.css';\n\nconst angleFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 5 });\nconst percentFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 });\nconst distanceFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });\n\nfunction classLabel(result: SolarEclipseOverlapResult): string {\n  switch (result.geometryClass) {\n    case 'partial-overlap': return 'Kısmi disk örtüşmesi';\n    case 'total-type-contained': return 'Tam-tip anlık geometri';\n    case 'annular-type-contained': return 'Halkalı-tip anlık geometri';\n    default: return 'Disk örtüşmesi yok';\n  }\n}\n",
"import type { SolarEclipseOverlapResult } from '../../simulation/solar-eclipse-overlap';\nimport { useI18n } from './I18nProvider';\nimport { getEclipseGeometryFullLabel } from './astronomy-result-presentation';\nimport { appLocaleTag, type AppLocale } from './i18n';\nimport { formatPercentValue } from './app/app-formatters';\nimport './eclipse-overlap-panel.css';\n\nconst angleFormatters: Record<AppLocale, Intl.NumberFormat> = {\n  tr: new Intl.NumberFormat(appLocaleTag('tr'), { maximumFractionDigits: 5 }),\n  en: new Intl.NumberFormat(appLocaleTag('en'), { maximumFractionDigits: 5 })\n};\nconst distanceFormatters: Record<AppLocale, Intl.NumberFormat> = {\n  tr: new Intl.NumberFormat(appLocaleTag('tr'), { maximumFractionDigits: 1 }),\n  en: new Intl.NumberFormat(appLocaleTag('en'), { maximumFractionDigits: 1 })\n};\n")
replace_once(overlap,
"}): React.JSX.Element {\n  const sunRadius = 78;",
"}): React.JSX.Element {\n  const { locale, t } = useI18n();\n  const angleFormatter = angleFormatters[locale];\n  const distanceFormatter = distanceFormatters[locale];\n  const sunRadius = 78;")
for old, new in [
("<span className=\"eyebrow\">Aşama 7.2 · anlık tutulma geometrisi</span>", "<span className=\"eyebrow\">{t('eclipse.overlap.stage')}</span>"),
("<h2>Güneş–Ay apparent disk örtüşmesi</h2>", "<h2>{t('eclipse.overlap.title')}</h2>"),
("<p>Seçili gözlemci ve zaman için iki disk birlikte çözülür. Bu panel temas zamanı veya resmi tutulma yolu üretmez.</p>", "<p>{t('eclipse.overlap.intro')}</p>"),
(">Hesap izi</button>", ">{t('model.trace')}</button>"),
("{classLabel(result)}", "{getEclipseGeometryFullLabel(locale, result.geometryClass)}"),
("aria-label=\"Güneş ve Ay apparent disk geometrisi\"", "aria-label={t('eclipse.overlap.aria')}"),
(">Güneş</text>", ">{t('eclipse.overlap.sun')}</text>"),
(">Ay</text>", ">{t('eclipse.overlap.moon')}</text>"),
("? 'Merkez ayrımı çok büyük olduğu için yalnız yerleşim sıkıştırılmıştır; disk çap oranları kendi aralarında ölçeklidir.'\n              : 'Disk yarıçapları ve merkez ayrımı aynı açısal ölçekte çizilmiştir.'", "? t('eclipse.overlap.compressedScale')\n              : t('eclipse.overlap.exactScale')"),
("<div><small>Merkez ayrımı</small><strong>{angleFormatter.format(result.centerSeparationDeg)}°</strong></div>", "<div><small>{t('eclipse.overlap.centerSeparation')}</small><strong>{angleFormatter.format(result.centerSeparationDeg)}°</strong></div>"),
("<div><small>Güneş açısal yarıçapı</small><strong>{angleFormatter.format(result.solarAngularRadiusDeg)}°</strong></div>", "<div><small>{t('eclipse.overlap.solarRadius')}</small><strong>{angleFormatter.format(result.solarAngularRadiusDeg)}°</strong></div>"),
("<div><small>Ay açısal yarıçapı</small><strong>{angleFormatter.format(result.lunarAngularRadiusDeg)}°</strong></div>", "<div><small>{t('eclipse.overlap.lunarRadius')}</small><strong>{angleFormatter.format(result.lunarAngularRadiusDeg)}°</strong></div>"),
("<div><small>Güneş disk alanı örtüşmesi</small><strong>%{percentFormatter.format(result.solarDiskCoveredFraction * 100)}</strong></div>", "<div><small>{t('eclipse.overlap.solarAreaCovered')}</small><strong>{formatPercentValue(result.solarDiskCoveredFraction * 100, locale)}</strong></div>"),
("<div><small>Çap doğrultusu örtme oranı</small><strong>%{percentFormatter.format(result.solarDiameterCoverageRatio * 100)}</strong></div>", "<div><small>{t('eclipse.overlap.diameterCoverage')}</small><strong>{formatPercentValue(result.solarDiameterCoverageRatio * 100, locale)}</strong></div>"),
("<div><small>Dış limb açıklığı</small><strong>{angleFormatter.format(result.outerLimbClearanceDeg)}°</strong></div>", "<div><small>{t('eclipse.overlap.outerLimbClearance')}</small><strong>{angleFormatter.format(result.outerLimbClearanceDeg)}°</strong></div>"),
("<div><small>Güneş merkez yüksekliği</small><strong>{angleFormatter.format(result.sunCenterElevationDeg)}°</strong></div>", "<div><small>{t('eclipse.overlap.sunElevation')}</small><strong>{angleFormatter.format(result.sunCenterElevationDeg)}°</strong></div>"),
("<div><small>Ay merkez yüksekliği</small><strong>{angleFormatter.format(result.moonCenterElevationDeg)}°</strong></div>", "<div><small>{t('eclipse.overlap.moonElevation')}</small><strong>{angleFormatter.format(result.moonCenterElevationDeg)}°</strong></div>"),
("<span>Güneş uzaklığı <strong>{result.solarDistanceAu.toFixed(6)} AU</strong></span>", "<span>{t('eclipse.overlap.solarDistance')} <strong>{result.solarDistanceAu.toFixed(6)} AU</strong></span>"),
("<span>Ay uzaklığı <strong>{distanceFormatter.format(result.lunarDistanceKm)} km</strong></span>", "<span>{t('eclipse.overlap.lunarDistance')} <strong>{distanceFormatter.format(result.lunarDistanceKm)} km</strong></span>"),
("<span>Geometrik ufuk <strong>{result.bothCentersAboveGeometricHorizon ? 'iki merkez üstte' : 'en az bir merkez altta'}</strong></span>", "<span>{t('eclipse.overlap.geometricHorizon')} <strong>{result.bothCentersAboveGeometricHorizon ? t('eclipse.overlap.bothAbove') : t('eclipse.overlap.oneBelow')}</strong></span>"),
("<p className=\"eclipse-overlap-limit\">\n        Düşük hassasiyetli astronomik tanıdır: Bessel elemanları, C1–C4 temasları, merkez hattı, Ay limb topografyası, atmosferik kırılma ve JPL DE efemerisi uygulanmaz. “Tam-tip / halkalı-tip” yalnız bu anın disk kapsanma geometrisini ifade eder.\n      </p>", "<p className=\"eclipse-overlap-limit\">{t('eclipse.overlap.limit')}</p>")
]:
    replace_once(overlap, old, new)

# Eclipse event search panel.
replace_once(search,
"import type { SolarEclipseInstantGeometryClass } from '../../simulation/solar-eclipse-overlap';\nimport './eclipse-event-search-panel.css';\n\nconst percentFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 });\nconst angleFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 5 });\nconst durationFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });\nconst utcFormatter = new Intl.DateTimeFormat('tr-TR', {\n  timeZone: 'UTC',\n  year: 'numeric',\n  month: '2-digit',\n  day: '2-digit',\n  hour: '2-digit',\n  minute: '2-digit',\n  second: '2-digit',\n  hour12: false\n});\n\nfunction utcTime(value: string | null): string {\n  return value ? `${utcFormatter.format(new Date(value))} UTC` : 'Pencere dışında';\n}\n\nfunction geometryLabel(value: SolarEclipseInstantGeometryClass | null): string {\n  switch (value) {\n    case 'partial-overlap': return 'Kısmi örtüşme';\n    case 'total-type-contained': return 'Tam-tip iç kapsama';\n    case 'annular-type-contained': return 'Halkalı-tip iç kapsama';\n    case 'no-overlap': return 'Örtüşme yok';\n    default: return '—';\n  }\n}\n",
"import { useI18n } from './I18nProvider';\nimport { getEclipseGeometryLabel } from './astronomy-result-presentation';\nimport { appLocaleTag, type AppLocale } from './i18n';\nimport { formatPercentValue } from './app/app-formatters';\nimport './eclipse-event-search-panel.css';\n\nconst angleFormatters: Record<AppLocale, Intl.NumberFormat> = {\n  tr: new Intl.NumberFormat(appLocaleTag('tr'), { maximumFractionDigits: 5 }),\n  en: new Intl.NumberFormat(appLocaleTag('en'), { maximumFractionDigits: 5 })\n};\nconst durationFormatters: Record<AppLocale, Intl.NumberFormat> = {\n  tr: new Intl.NumberFormat(appLocaleTag('tr'), { maximumFractionDigits: 1 }),\n  en: new Intl.NumberFormat(appLocaleTag('en'), { maximumFractionDigits: 1 })\n};\nconst coordinateFormatters: Record<AppLocale, Intl.NumberFormat> = {\n  tr: new Intl.NumberFormat(appLocaleTag('tr'), { minimumFractionDigits: 5, maximumFractionDigits: 5 }),\n  en: new Intl.NumberFormat(appLocaleTag('en'), { minimumFractionDigits: 5, maximumFractionDigits: 5 })\n};\nconst utcFormatters: Record<AppLocale, Intl.DateTimeFormat> = {\n  tr: new Intl.DateTimeFormat(appLocaleTag('tr'), { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),\n  en: new Intl.DateTimeFormat(appLocaleTag('en'), { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })\n};\n")
replace_once(search,
"}): React.JSX.Element {\n  const [snapshot, setSnapshot] = useState<SolarEclipseEventSearchSnapshot | undefined>(initialSnapshot);",
"}): React.JSX.Element {\n  const { locale, t } = useI18n();\n  const angleFormatter = angleFormatters[locale];\n  const durationFormatter = durationFormatters[locale];\n  const coordinateFormatter = coordinateFormatters[locale];\n  const utcTime = (value: string | null): string => value\n    ? `${utcFormatters[locale].format(new Date(value))} UTC`\n    : t('eclipse.search.outsideWindow');\n  const geometryLabel = (value: SolarEclipseEventSearchSnapshot['maximumGeometryClass']): string =>\n    value ? getEclipseGeometryLabel(locale, value) : '—';\n  const [snapshot, setSnapshot] = useState<SolarEclipseEventSearchSnapshot | undefined>(initialSnapshot);")
replace_once(search, "setError(caught instanceof Error ? caught.message : 'Tutulma zaman penceresi taranamadı.');", "setError(caught instanceof Error ? caught.message : t('eclipse.search.error'));" )
for old, new in [
("<span className=\"eyebrow\">Aşama 7.4 · kaydedilebilir zaman penceresi</span>", "<span className=\"eyebrow\">{t('eclipse.search.stage')}</span>"),
("<h2>Yerel disk örtüşme olayı ara</h2>", "<h2>{t('eclipse.search.title')}</h2>"),
("<p>Seçili gözlem anının çevresini tarar; varsa örtüşmenin yaklaşık başlangıcını, maksimumunu ve bitişini düşük hassasiyetli modelle bulur. Son tarama ayrı tutulma senaryosunda deney kaydına eklenebilir.</p>", "<p>{t('eclipse.search.intro')}</p>"),
("<span>Yarım pencere</span>", "<span>{t('eclipse.search.halfWindow')}</span>"),
("<option value={6}>±6 saat</option>", "<option value={6}>{t('eclipse.search.hours', { hours: 6 })}</option>"),
("<option value={12}>±12 saat</option>", "<option value={12}>{t('eclipse.search.hours', { hours: 12 })}</option>"),
("<option value={24}>±24 saat</option>", "<option value={24}>{t('eclipse.search.hours', { hours: 24 })}</option>"),
("<option value={48}>±48 saat</option>", "<option value={48}>{t('eclipse.search.hours', { hours: 48 })}</option>"),
(">Hesap izi</button>", ">{t('model.trace')}</button>"),
(">Pencereyi tara</button>", ">{t('eclipse.search.scan')}</button>"),
("<span>Merkez zaman <strong>{utcTime(anchorObservedAtIso)}</strong></span>", "<span>{t('eclipse.search.centerTime')} <strong>{utcTime(anchorObservedAtIso)}</strong></span>"),
("<span>Konum <strong>{latitudeDeg.toFixed(5)}°, {longitudeDeg.toFixed(5)}°</strong></span>", "<span>{t('eclipse.search.location')} <strong>{coordinateFormatter.format(latitudeDeg)}°, {coordinateFormatter.format(longitudeDeg)}°</strong></span>"),
("<span>Kaba adım <strong>5 dk</strong></span>", "<span>{t('eclipse.search.coarseStep')} <strong>5 {t('unit.minutesShort')}</strong></span>"),
("{snapshot && <span>Kayıt durumu <strong>{stale ? 'ESKİ SONUÇ' : 'KAYDA HAZIR'}</strong></span>}", "{snapshot && <span>{t('eclipse.search.saveStatus')} <strong>{stale ? t('eclipse.search.stale') : t('eclipse.search.ready')}</strong></span>}"),
("Bu tarama kullanıcı isteğiyle çalışır. Böylece her tarih veya koordinat değişiminde yüzlerce astronomik örnek otomatik hesaplanmaz.", "{t('eclipse.search.empty')}"),
("Tarih, konum veya pencere değişti. Aşağıdaki sonuç önceki taramaya aittir ve kayda güncel sonuç olarak eklenmez; yeniden tara.", "{t('eclipse.search.staleNote')}"),
("<small>Örtüşme başlangıcı</small>", "<small>{t('eclipse.search.overlapStart')}</small>"),
("{snapshot.windowClipsEventStart ? 'Arama penceresinden önce başlamış olabilir' : 'Dış disk sınırı · yaklaşık'}", "{snapshot.windowClipsEventStart ? t('eclipse.search.mayStartBefore') : t('eclipse.search.outerBoundaryApprox')}"),
("<small>Maksimum örtüşme</small>", "<small>{t('eclipse.search.maximumOverlap')}</small>"),
("<span>%{percentFormatter.format(snapshot.maximumSolarDiskCoveredFraction * 100)} Güneş disk alanı</span>", "<span>{t('eclipse.search.solarDiskArea', { value: formatPercentValue(snapshot.maximumSolarDiskCoveredFraction * 100, locale) })}</span>"),
("<small>Örtüşme bitişi</small>", "<small>{t('eclipse.search.overlapEnd')}</small>"),
("{snapshot.windowClipsEventEnd ? 'Arama penceresinden sonra sürebilir' : 'Dış disk sınırı · yaklaşık'}", "{snapshot.windowClipsEventEnd ? t('eclipse.search.mayContinueAfter') : t('eclipse.search.outerBoundaryApprox')}"),
("<div><small>Örtüşme süresi</small><strong>{snapshot.overlapDurationMinutes === null ? 'Pencere ile sınırlı' : `${durationFormatter.format(snapshot.overlapDurationMinutes)} dk`}</strong></div>", "<div><small>{t('eclipse.search.overlapDuration')}</small><strong>{snapshot.overlapDurationMinutes === null ? t('eclipse.search.windowLimited') : `${durationFormatter.format(snapshot.overlapDurationMinutes)} ${t('unit.minutesShort')}`}</strong></div>"),
("<div><small>Maksimum sınıf</small><strong>{geometryLabel(snapshot.maximumGeometryClass)}</strong></div>", "<div><small>{t('eclipse.search.maximumClass')}</small><strong>{geometryLabel(snapshot.maximumGeometryClass)}</strong></div>"),
("<div><small>Maksimum merkez ayrımı</small><strong>{snapshot.maximumCenterSeparationDeg === null ? '—' : `${angleFormatter.format(snapshot.maximumCenterSeparationDeg)}°`}</strong></div>", "<div><small>{t('eclipse.search.maximumSeparation')}</small><strong>{snapshot.maximumCenterSeparationDeg === null ? '—' : `${angleFormatter.format(snapshot.maximumCenterSeparationDeg)}°`}</strong></div>"),
("<div><small>Maksimum çap örtme oranı</small><strong>{snapshot.maximumSolarDiameterCoverageRatio === null ? '—' : `%${percentFormatter.format(snapshot.maximumSolarDiameterCoverageRatio * 100)}`}</strong></div>", "<div><small>{t('eclipse.search.maximumDiameterCoverage')}</small><strong>{snapshot.maximumSolarDiameterCoverageRatio === null ? '—' : formatPercentValue(snapshot.maximumSolarDiameterCoverageRatio * 100, locale)}</strong></div>"),
("<div><small>Maksimumda geometrik ufuk</small><strong>{snapshot.maximumBothCentersAboveGeometricHorizon === null ? '—' : snapshot.maximumBothCentersAboveGeometricHorizon ? 'İki merkez üstte' : 'En az bir merkez altta'}</strong></div>", "<div><small>{t('eclipse.search.maximumHorizon')}</small><strong>{snapshot.maximumBothCentersAboveGeometricHorizon === null ? '—' : snapshot.maximumBothCentersAboveGeometricHorizon ? t('eclipse.search.bothAbove') : t('eclipse.search.oneBelow')}</strong></div>"),
("<div><small>Kaba tarama örneği</small><strong>{snapshot.coarseSampleCount}</strong></div>", "<div><small>{t('eclipse.search.coarseSamples')}</small><strong>{snapshot.coarseSampleCount}</strong></div>"),
("<strong>İç kapsama aralığı bulundu</strong>", "<strong>{t('eclipse.search.containedFound')}</strong>"),
("<span>{snapshot.containedDurationMinutes === null ? '' : `≈ ${durationFormatter.format(snapshot.containedDurationMinutes)} dk`}</span>", "<span>{snapshot.containedDurationMinutes === null ? '' : t('eclipse.search.approxMinutes', { value: durationFormatter.format(snapshot.containedDurationMinutes) })}</span>"),
("<small>Sonuç</small>", "<small>{t('eclipse.search.result')}</small>"),
("<strong>Seçilen pencerede disk örtüşmesi yok</strong>", "<strong>{t('eclipse.search.noOverlap')}</strong>"),
("<small>En yakın yaklaşım</small>", "<small>{t('eclipse.search.closestApproach')}</small>"),
("<span>Dış limb açıklığı {angleFormatter.format(snapshot.closestApproachOuterLimbClearanceDeg)}°</span>", "<span>{t('eclipse.search.outerClearance', { value: angleFormatter.format(snapshot.closestApproachOuterLimbClearanceDeg) })}</span>"),
("<p className=\"eclipse-event-search-limit\">\n            Bu zamanlar resmi C1–C4 temasları değildir. 5 dakikalık kaba tarama, ardından yaklaşık 1 saniyelik sayısal sınır inceltmesi kullanılır. Bessel elemanları, Ay limb topografyası, atmosferik kırılma ve yüksek hassasiyetli JPL efemerisi uygulanmaz.\n          </p>", "<p className=\"eclipse-event-search-limit\">{t('eclipse.search.limit')}</p>")
]:
    replace_once(search, old, new)

# Pure presentation characterization tests.
test_content = """import { describe, expect, it } from 'vitest';
import type { LunarPhaseName } from '../src/simulation/lunar-position';
import {
  getEclipseGeometryFullLabel,
  getEclipseGeometryLabel,
  getLunarPhaseLabel
} from '../src/renderer/src/astronomy-result-presentation';
import { translate } from '../src/renderer/src/i18n';

describe('astronomy result localization', () => {
  it('localizes lunar phase presentation without changing the domain phase value', () => {
    const phase: LunarPhaseName = 'Dolunay';
    expect(getLunarPhaseLabel('tr', phase)).toBe('Dolunay');
    expect(getLunarPhaseLabel('en', phase)).toBe('Full Moon');
    expect(phase).toBe('Dolunay');
  });

  it('localizes eclipse geometry classes without changing their machine ids', () => {
    const geometryClass = 'total-type-contained' as const;
    expect(getEclipseGeometryLabel('tr', geometryClass)).toBe('Tam-tip iç kapsama');
    expect(getEclipseGeometryLabel('en', geometryClass)).toBe('Total-type containment');
    expect(getEclipseGeometryFullLabel('en', geometryClass)).toBe('Total-type instantaneous geometry');
    expect(geometryClass).toBe('total-type-contained');
  });

  it('localizes compass and eclipse search shell labels', () => {
    expect(translate('tr', 'compass.northShort')).toBe('K');
    expect(translate('en', 'compass.northShort')).toBe('N');
    expect(translate('en', 'eclipse.search.hours', { hours: 12 })).toBe('±12 hours');
    expect(translate('en', 'eclipse.search.scan')).toBe('Scan window');
  });
});
"""
write_new(test, test_content)

replace_once(
    docs,
    "- Model-results slice: physical/reference model labels, result status presentation, visibility/horizon model cards and comparison tables, all using active-locale human numeric formatting.\n- Astronomy shell slice: shared Time and date card plus Sun/Moon, eclipse, shadow and stellar scenario-summary shells.\n\nEngine-emitted warnings/assumptions, specialized astronomy result panels, dialogs, help/AI guidance and reports remain separate follow-up slices.",
    "- Model-results slice: physical/reference model labels, result status presentation, visibility/horizon model cards and comparison tables, all using active-locale human numeric formatting.\n- Astronomy shell slice: shared Time and date card plus Sun/Moon, eclipse, shadow and stellar scenario-summary shells.\n- Astronomy result slice (part 1): Sun/Moon position panels plus eclipse overlap/event-search result surfaces, with renderer-only phase/geometry presentation mapping and active-locale numeric formatting.\n\nEngine-emitted warnings/assumptions/raw calculation errors, daily/seasonal solar result panels, shadow/stellar specialized panels, dialogs, help/AI guidance and reports remain separate follow-up slices."
)

print("Applied Sun/Moon + eclipse result localization slice.")
print("Run: npm run verify")
print("Then: npm run dev and smoke Sun/Moon + Eclipse in TR/EN.")
