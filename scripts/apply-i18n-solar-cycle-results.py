#!/usr/bin/env python3
"""Localize daily/seasonal solar result panels without touching simulation semantics.

Temporary helper: remove before merge. Raw engine errors and calculation trace text
remain unchanged in this slice; the final TR/EN smoke is intentionally deferred until
all localization slices are complete.
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
        fail(f"{path.relative_to(ROOT)}: expected one match, found {count}: {old[:90]!r}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def rewrite(path: Path, sentinel: str, content: str) -> None:
    current = path.read_text(encoding="utf-8")
    if sentinel not in current:
        fail(f"{path.relative_to(ROOT)}: expected sentinel not found: {sentinel!r}")
    path.write_text(content, encoding="utf-8")


def write_new(path: Path, content: str) -> None:
    if path.exists():
        fail(f"{path.relative_to(ROOT)} already exists")
    path.write_text(content, encoding="utf-8")


i18n = ROOT / "src/renderer/src/i18n.ts"
presentation = ROOT / "src/renderer/src/astronomy-result-presentation.ts"
day_panel = ROOT / "src/renderer/src/SolarDayEventsPanel.tsx"
time_panel = ROOT / "src/renderer/src/SolarTimeOffsetPanel.tsx"
season_panel = ROOT / "src/renderer/src/SolarSeasonEventsPanel.tsx"
route_panel = ROOT / "src/renderer/src/SolarRouteComparisonPanel.tsx"
docs = ROOT / "docs/localization.md"
test = ROOT / "tests/solar-cycle-i18n.test.ts"

for path in (i18n, presentation, day_panel, time_panel, season_panel, route_panel, docs):
    if not path.exists():
        fail(f"missing expected file: {path.relative_to(ROOT)}")

tr_anchor = "  'eclipse.search.limit': 'Bu zamanlar resmi C1–C4 temasları değildir. 5 dakikalık kaba tarama, ardından yaklaşık 1 saniyelik sayısal sınır inceltmesi kullanılır. Bessel elemanları, Ay limb topografyası, atmosferik kırılma ve yüksek hassasiyetli JPL efemerisi uygulanmaz.'\n} as const;"
tr_block = """  'eclipse.search.limit': 'Bu zamanlar resmi C1–C4 temasları değildir. 5 dakikalık kaba tarama, ardından yaklaşık 1 saniyelik sayısal sınır inceltmesi kullanılır. Bessel elemanları, Ay limb topografyası, atmosferik kırılma ve yüksek hassasiyetli JPL efemerisi uygulanmaz.',
  'unit.hoursShort': 'sa',
  'solar.day.stage': 'Astronomik referans · günlük Güneş olayları',
  'solar.day.title': 'Gün doğumu, gün batımı ve güneş öğlesi',
  'solar.day.standardRise': 'Standart doğuş',
  'solar.day.standardSet': 'Standart batış',
  'solar.day.geometricRise': 'Geometrik doğuş',
  'solar.day.geometricSet': 'Geometrik batış',
  'solar.day.solarNoon': 'Güneş öğlesi',
  'solar.day.geometricCenter': 'GEOMETRİK MERKEZ',
  'solar.day.geometricThreshold': 'Ufuk eşiği 0°',
  'solar.day.standardVisibleReference': 'STANDART GÖRÜNÜR REFERANS',
  'solar.day.standardThreshold': 'Merkez eşiği -0,833°',
  'solar.day.state.normal': 'DOĞUŞ + BATIŞ VAR',
  'solar.day.state.continuousAbove': '24 SAAT EŞİK ÜSTÜ',
  'solar.day.state.continuousBelow': '24 SAAT EŞİK ALTI',
  'solar.day.state.grazing': 'TEĞET / SINIR DURUMU',
  'solar.day.noTransitionAbove': 'geçiş yok · sürekli üstte',
  'solar.day.noTransitionBelow': 'geçiş yok · sürekli altta',
  'solar.day.noReliableTransition': 'güvenilir geçiş yok',
  'solar.day.rise': 'Doğuş',
  'solar.day.set': 'Batış',
  'solar.day.aboveDuration': 'Eşik üstü süre',
  'solar.day.azimuthValue': 'azimut {value}',
  'solar.day.selectedLocalDay': 'seçilen yerel gün içinde',
  'solar.day.approxCalendarReference': 'yaklaşık takvim referansı',
  'solar.day.localMaximumElevation': 'Yerel gün içi maksimum yükseklik',
  'solar.day.time': 'Saat',
  'solar.day.maximumElevation': 'Maks. yükseklik',
  'solar.day.geometricCenterSmall': 'geometrik merkez',
  'solar.day.azimuth': 'Azimut',
  'solar.day.fromGeographicNorth': 'coğrafi kuzeyden',
  'solar.day.extraDuration': 'Standart referansın geometrik 0° kanalına göre ek eşik-üstü süresi',
  'solar.day.note': '0° kanalı Güneş merkezinin geometrik ufuk geçişidir. -0,833° kanalı gerçek atmosfer ölçümü değildir; Güneşin görünür üst kenarı ve standart kırılma için kullanılan sabit yaklaşık takvim eşiğidir. Yerel gün, kaydedilmiş açık UTC ofsetiyle kurulmuştur; saat dilimi adı veya DST kuralı otomatik uygulanmaz.',
  'solar.season.stage': 'Aşama 7.5 · yıllık Güneş döngüsü',
  'solar.season.title': 'Ekinokslar, gündönümleri ve yerel gün uzunluğu',
  'solar.season.intro': '{year} yılı için görünür Güneş boylamının dört ana çeyrek geçişi çözülür; aynı anların seçili gözlemci konumundaki yerel Güneş günü karşılaştırılır.',
  'solar.season.event.marchEquinox': 'Mart ekinoksu',
  'solar.season.event.juneSolstice': 'Haziran gündönümü',
  'solar.season.event.septemberEquinox': 'Eylül ekinoksu',
  'solar.season.event.decemberSolstice': 'Aralık gündönümü',
  'solar.season.springStart': 'İlkbahar başlangıcı',
  'solar.season.summerStart': 'Yaz başlangıcı',
  'solar.season.autumnStart': 'Sonbahar başlangıcı',
  'solar.season.winterStart': 'Kış başlangıcı',
  'solar.season.localDate': 'Yerel tarih {date}',
  'solar.season.solarDeclination': 'Güneş deklinasyonu',
  'solar.season.standardDayLength': 'Standart gün uzunluğu',
  'solar.season.geometricDuration': 'Geometrik 0° süre',
  'solar.season.solarNoon': 'Güneş öğlesi',
  'solar.season.standardRiseAzimuth': 'Standart doğuş azimutu',
  'solar.season.standardSetAzimuth': 'Standart batış azimutu',
  'solar.season.note': 'Dönüm noktaları mevcut düşük hassasiyetli NOAA tabanlı Güneş çekirdeğinin görünür ekliptik boylamından sayısal olarak bulunur. Bu panel resmi almanak/efemeris değildir. Yerel gün uzunluğu sabit UTC ofsetiyle ve standart -0,833° görünür doğuş/batış eşiğiyle hesaplanır; gerçek atmosfer, topoğrafik ufuk ve otomatik DST uygulanmaz.',
  'solar.season.unsupportedTitle': 'Yıllık mevsim referansı bu yıl için kapalı',
  'solar.season.unsupportedNote': 'İlk doğrulama aralığı {min}–{max}. Günlük Güneş hesabı çalışmaya devam eder; bu aralığın dışındaki yıllarda ekinoks/gündönümü kartları güvenli biçimde üretilmez.',
  'solar.time.stage': 'Aşama 7.6 · Sivil saat ↔ Güneş zamanı',
  'solar.time.title': 'UTC ofseti, standart meridyen ve Güneş saati',
  'solar.time.intro': 'Kaydedilmiş sabit UTC ofsetinin temsil ettiği meridyeni gözlem boylamıyla karşılaştırır; boylam farkı ve zaman denkleminin sivil saate etkisini ayrı gösterir.',
  'solar.time.standardMeridian': 'Standart meridyen {value}',
  'solar.time.observationLongitude': 'Gözlem {value}',
  'solar.time.civilClock': 'SİVİL SAAT',
  'solar.time.fixedUtcOffset': 'sabit UTC ofseti',
  'solar.time.meanSolarTime': 'ORTALAMA GÜNEŞ ZAMANI',
  'solar.time.longitudeOnly': 'yalnız boylam düzeltmesi',
  'solar.time.apparentSolarTime': 'GÖRÜNÜR GÜNEŞ ZAMANI',
  'solar.time.longitudeAndEot': 'boylam + zaman denklemi',
  'solar.time.day.same': 'aynı sivil gün',
  'solar.time.day.previous': 'önceki güne taşar',
  'solar.time.day.next': 'sonraki güne taşar',
  'solar.time.day.before': '{count} gün önce',
  'solar.time.day.after': '{count} gün sonra',
  'solar.time.longitudeDifference': 'BOYLAM FARKI',
  'solar.time.observationMinusMeridian': 'gözlem − standart meridyen',
  'solar.time.longitudeCorrection': 'BOYLAM DÜZELTMESİ',
  'solar.time.fourMinutesPerDegree': '4 dakika / derece',
  'solar.time.equationOfTime': 'ZAMAN DENKLEMİ · EoT',
  'solar.time.selectedInstant': 'seçili astronomik an',
  'solar.time.totalApparentDifference': 'TOPLAM GÖRÜNÜR FARK',
  'solar.time.apparentAhead': 'Görünür Güneş saati sivil saatten ileride.',
  'solar.time.apparentBehind': 'Görünür Güneş saati sivil saatten geride.',
  'solar.time.apparentMatches': 'Görünür Güneş saati sivil saatle çakışıyor.',
  'solar.time.civilTime': 'Sivil saat',
  'solar.time.longitude': 'boylam',
  'solar.time.solarNoonThisDay': 'Bu yerel gündeki geometrik Güneş öğlesi',
  'solar.time.differenceFromCivilNoon': "Sivil 12:00'dan fark",
  'solar.time.noonNote': 'Güneş öğlesi günlük konum çözümündeki maksimum geometrik Güneş yüksekliğidir; saat 12:00 olmak zorunda değildir.',
  'solar.time.note': 'Standart meridyen yalnız sabit UTC ofsetinden 15°/saat ile türetilen geometrik bir referanstır; yasal saat dilimi sınırı değildir. DST/saat dilimi veritabanı otomatik uygulanmaz. Görünür Güneş zamanı mevcut düşük hassasiyetli astronomik Güneş çekirdeğinin zaman denklemini kullanır.',
  'solar.route.stage': 'Aşama 7.7 · aynı an / WGS84 rota karşılaştırması',
  'solar.route.title': 'Rota boyunca Güneş geometrisi',
  'solar.route.intro': 'A ve B arasındaki jeodezik rota beş eşit mesafe kesrinde örneklenir. Her nokta aynı fiziksel UTC anında çözülür; bu bir seyahat süresi simülasyonu değildir.',
  'solar.route.moveEndEast': "B'yi 30° doğuya al",
  'solar.route.endpointA': 'A · aktif gözlemci',
  'solar.route.endpointB': 'B · karşılaştırma noktası · kayda dahil',
  'solar.route.aboveHorizon': 'GEOMETRİK UFKUN ÜSTÜ',
  'solar.route.belowHorizon': 'GEOMETRİK UFKUN ALTI',
  'solar.route.latitude': 'Enlem',
  'solar.route.longitude': 'Boylam',
  'solar.route.sunElevation': 'Güneş yüksekliği',
  'solar.route.sunAzimuth': 'Güneş azimutu',
  'solar.route.apparentSolarClock': 'Görünür Güneş saati',
  'solar.route.dayOffset': ' · {value} gün',
  'solar.route.geodesicRoute': 'WGS84 JEODEZİK ROTA',
  'solar.route.initialBearing': 'Başlangıç azimutu',
  'solar.route.solution': 'Çözüm',
  'solar.route.deltaElevation': 'B − A yükseklik',
  'solar.route.deltaSolarTime': 'B − A Güneş saati',
  'solar.route.minimumElevation': 'Örnek min. yükseklik',
  'solar.route.maximumElevation': 'Örnek maks. yükseklik',
  'solar.route.horizonSideChanges': 'Ufuk tarafı değişimi',
  'solar.route.neighborChangesOnly': 'yalnız komşu örnek işaret değişimleri',
  'solar.route.sampleCount': 'Örnek sayısı',
  'solar.route.chartTitle': 'AYNI ANDA GÜNEŞ YÜKSEKLİĞİ · ROTA KESRİ',
  'solar.route.zeroLine': '0° çizgisi geometrik ufuktur',
  'solar.route.chartAria': 'Rota boyunca geometrik Güneş yüksekliği profili',
  'solar.route.azimuthValue': 'Azimut {value}°',
  'solar.route.solarClockValue': 'Güneş saati {value}',
  'solar.route.showTrace': 'Rota hesap izini göster',
  'solar.route.note': 'B koordinatı artık deney girdisinin hedef koordinat alanlarında saklanır; kaydetme, yeniden açma ve .ggl.json aktarımı bu karşılaştırma noktasını korur. Aynı sabit UTC ofseti bütün rota noktalarında yalnız karşılaştırma amacıyla kullanılır; IANA saat dilimi/DST sınırları, atmosferik kırılma, topoğrafik ufuk ve seyahat süresi uygulanmaz.'
} as const;"""
replace_once(i18n, tr_anchor, tr_block)

en_anchor = "  'eclipse.search.limit': 'These times are not official C1–C4 contacts. A 5-minute coarse scan is followed by approximately 1-second numerical boundary refinement. Besselian elements, lunar-limb topography, atmospheric refraction and high-precision JPL ephemerides are not applied.'\n};"
en_block = """  'eclipse.search.limit': 'These times are not official C1–C4 contacts. A 5-minute coarse scan is followed by approximately 1-second numerical boundary refinement. Besselian elements, lunar-limb topography, atmospheric refraction and high-precision JPL ephemerides are not applied.',
  'unit.hoursShort': 'h',
  'solar.day.stage': 'Astronomical reference · daily solar events',
  'solar.day.title': 'Sunrise, sunset and solar noon',
  'solar.day.standardRise': 'Standard sunrise',
  'solar.day.standardSet': 'Standard sunset',
  'solar.day.geometricRise': 'Geometric sunrise',
  'solar.day.geometricSet': 'Geometric sunset',
  'solar.day.solarNoon': 'Solar noon',
  'solar.day.geometricCenter': 'GEOMETRIC CENTER',
  'solar.day.geometricThreshold': 'Horizon threshold 0°',
  'solar.day.standardVisibleReference': 'STANDARD VISIBLE REFERENCE',
  'solar.day.standardThreshold': 'Center threshold -0.833°',
  'solar.day.state.normal': 'RISE + SET AVAILABLE',
  'solar.day.state.continuousAbove': '24 HOURS ABOVE THRESHOLD',
  'solar.day.state.continuousBelow': '24 HOURS BELOW THRESHOLD',
  'solar.day.state.grazing': 'GRAZING / BOUNDARY CASE',
  'solar.day.noTransitionAbove': 'no transition · continuously above',
  'solar.day.noTransitionBelow': 'no transition · continuously below',
  'solar.day.noReliableTransition': 'no reliable transition',
  'solar.day.rise': 'Rise',
  'solar.day.set': 'Set',
  'solar.day.aboveDuration': 'Time above threshold',
  'solar.day.azimuthValue': 'azimuth {value}',
  'solar.day.selectedLocalDay': 'within the selected local day',
  'solar.day.approxCalendarReference': 'approximate calendar reference',
  'solar.day.localMaximumElevation': 'Maximum elevation within the local day',
  'solar.day.time': 'Time',
  'solar.day.maximumElevation': 'Max. elevation',
  'solar.day.geometricCenterSmall': 'geometric center',
  'solar.day.azimuth': 'Azimuth',
  'solar.day.fromGeographicNorth': 'from geographic north',
  'solar.day.extraDuration': 'Additional time above threshold for the standard reference relative to the geometric 0° channel',
  'solar.day.note': 'The 0° channel is the geometric horizon crossing of the Sun center. The -0.833° channel is not an atmospheric measurement; it is a fixed approximate calendar threshold representing the visible upper limb and standard refraction. The local day is constructed from the saved explicit UTC offset; no time-zone name or DST rule is applied automatically.',
  'solar.season.stage': 'Stage 7.5 · annual solar cycle',
  'solar.season.title': 'Equinoxes, solstices and local day length',
  'solar.season.intro': 'For {year}, the four principal quarter crossings of apparent solar longitude are solved; the local solar day at the selected observer location is compared at those same instants.',
  'solar.season.event.marchEquinox': 'March equinox',
  'solar.season.event.juneSolstice': 'June solstice',
  'solar.season.event.septemberEquinox': 'September equinox',
  'solar.season.event.decemberSolstice': 'December solstice',
  'solar.season.springStart': 'Start of spring',
  'solar.season.summerStart': 'Start of summer',
  'solar.season.autumnStart': 'Start of autumn',
  'solar.season.winterStart': 'Start of winter',
  'solar.season.localDate': 'Local date {date}',
  'solar.season.solarDeclination': 'Solar declination',
  'solar.season.standardDayLength': 'Standard day length',
  'solar.season.geometricDuration': 'Geometric 0° duration',
  'solar.season.solarNoon': 'Solar noon',
  'solar.season.standardRiseAzimuth': 'Standard sunrise azimuth',
  'solar.season.standardSetAzimuth': 'Standard sunset azimuth',
  'solar.season.note': 'Turning points are solved numerically from the apparent ecliptic longitude of the existing low-precision NOAA-based solar core. This panel is not an official almanac or ephemeris. Local day length uses the fixed UTC offset and the standard -0.833° visible rise/set threshold; real atmosphere, topographic horizon and automatic DST are not applied.',
  'solar.season.unsupportedTitle': 'Annual seasonal reference is disabled for this year',
  'solar.season.unsupportedNote': 'The initial validation range is {min}–{max}. Daily solar calculations continue to work; equinox/solstice cards are not generated outside this range.',
  'solar.time.stage': 'Stage 7.6 · civil clock ↔ solar time',
  'solar.time.title': 'UTC offset, standard meridian and solar clock',
  'solar.time.intro': 'Compares the meridian represented by the saved fixed UTC offset with the observer longitude and shows the effects of longitude difference and the equation of time on civil time separately.',
  'solar.time.standardMeridian': 'Standard meridian {value}',
  'solar.time.observationLongitude': 'Observation {value}',
  'solar.time.civilClock': 'CIVIL CLOCK',
  'solar.time.fixedUtcOffset': 'fixed UTC offset',
  'solar.time.meanSolarTime': 'MEAN SOLAR TIME',
  'solar.time.longitudeOnly': 'longitude correction only',
  'solar.time.apparentSolarTime': 'APPARENT SOLAR TIME',
  'solar.time.longitudeAndEot': 'longitude + equation of time',
  'solar.time.day.same': 'same civil day',
  'solar.time.day.previous': 'rolls into previous day',
  'solar.time.day.next': 'rolls into next day',
  'solar.time.day.before': '{count} days earlier',
  'solar.time.day.after': '{count} days later',
  'solar.time.longitudeDifference': 'LONGITUDE DIFFERENCE',
  'solar.time.observationMinusMeridian': 'observation − standard meridian',
  'solar.time.longitudeCorrection': 'LONGITUDE CORRECTION',
  'solar.time.fourMinutesPerDegree': '4 minutes / degree',
  'solar.time.equationOfTime': 'EQUATION OF TIME · EoT',
  'solar.time.selectedInstant': 'selected astronomical instant',
  'solar.time.totalApparentDifference': 'TOTAL APPARENT DIFFERENCE',
  'solar.time.apparentAhead': 'Apparent solar time is ahead of civil time.',
  'solar.time.apparentBehind': 'Apparent solar time is behind civil time.',
  'solar.time.apparentMatches': 'Apparent solar time coincides with civil time.',
  'solar.time.civilTime': 'Civil time',
  'solar.time.longitude': 'longitude',
  'solar.time.solarNoonThisDay': 'Geometric solar noon on this local day',
  'solar.time.differenceFromCivilNoon': 'Difference from civil 12:00',
  'solar.time.noonNote': 'Solar noon is the maximum geometric solar elevation from the daily position solution; it does not have to occur at 12:00.',
  'solar.time.note': 'The standard meridian is only a geometric reference derived from the fixed UTC offset at 15° per hour; it is not a legal time-zone boundary. DST/time-zone databases are not applied automatically. Apparent solar time uses the equation of time from the existing low-precision astronomical solar core.',
  'solar.route.stage': 'Stage 7.7 · same instant / WGS84 route comparison',
  'solar.route.title': 'Solar geometry along the route',
  'solar.route.intro': 'The geodesic route between A and B is sampled at five equal distance fractions. Every point is solved at the same physical UTC instant; this is not a travel-time simulation.',
  'solar.route.moveEndEast': 'Move B 30° east',
  'solar.route.endpointA': 'A · active observer',
  'solar.route.endpointB': 'B · comparison point · included in save',
  'solar.route.aboveHorizon': 'ABOVE GEOMETRIC HORIZON',
  'solar.route.belowHorizon': 'BELOW GEOMETRIC HORIZON',
  'solar.route.latitude': 'Latitude',
  'solar.route.longitude': 'Longitude',
  'solar.route.sunElevation': 'Solar elevation',
  'solar.route.sunAzimuth': 'Solar azimuth',
  'solar.route.apparentSolarClock': 'Apparent solar time',
  'solar.route.dayOffset': ' · {value} day(s)',
  'solar.route.geodesicRoute': 'WGS84 GEODESIC ROUTE',
  'solar.route.initialBearing': 'Initial bearing',
  'solar.route.solution': 'Solution',
  'solar.route.deltaElevation': 'B − A elevation',
  'solar.route.deltaSolarTime': 'B − A solar time',
  'solar.route.minimumElevation': 'Sample min. elevation',
  'solar.route.maximumElevation': 'Sample max. elevation',
  'solar.route.horizonSideChanges': 'Horizon-side changes',
  'solar.route.neighborChangesOnly': 'adjacent sample sign changes only',
  'solar.route.sampleCount': 'Sample count',
  'solar.route.chartTitle': 'SOLAR ELEVATION AT THE SAME INSTANT · ROUTE FRACTION',
  'solar.route.zeroLine': '0° line is the geometric horizon',
  'solar.route.chartAria': 'Geometric solar-elevation profile along the route',
  'solar.route.azimuthValue': 'Azimuth {value}°',
  'solar.route.solarClockValue': 'Solar time {value}',
  'solar.route.showTrace': 'Show route calculation trace',
  'solar.route.note': 'Coordinate B is stored in the target-coordinate fields of the experiment inputs; save, reopen and .ggl.json transfer preserve this comparison point. The same fixed UTC offset is used at every route point only for comparison; IANA time-zone/DST boundaries, atmospheric refraction, topographic horizon and travel time are not applied.'
};"""
replace_once(i18n, en_anchor, en_block)

presentation_anchor = "import type { SolarEclipseInstantGeometryClass } from '../../simulation/solar-eclipse-overlap';\n"
presentation_imports = "import type { SolarEclipseInstantGeometryClass } from '../../simulation/solar-eclipse-overlap';\nimport type { SolarThresholdState } from '../../simulation/solar-day-events';\nimport type { SolarSeasonEventKind } from '../../simulation/solar-season-events';\n"
replace_once(presentation, presentation_anchor, presentation_imports)

presentation_append = r'''

const solarThresholdStateKeys: Record<SolarThresholdState, TranslationKey> = {
  normal: 'solar.day.state.normal',
  'continuous-above': 'solar.day.state.continuousAbove',
  'continuous-below': 'solar.day.state.continuousBelow',
  grazing: 'solar.day.state.grazing'
};

const solarSeasonEventKeys: Record<SolarSeasonEventKind, TranslationKey> = {
  'march-equinox': 'solar.season.event.marchEquinox',
  'june-solstice': 'solar.season.event.juneSolstice',
  'september-equinox': 'solar.season.event.septemberEquinox',
  'december-solstice': 'solar.season.event.decemberSolstice'
};

const northernSeasonKeys: Record<SolarSeasonEventKind, TranslationKey> = {
  'march-equinox': 'solar.season.springStart',
  'june-solstice': 'solar.season.summerStart',
  'september-equinox': 'solar.season.autumnStart',
  'december-solstice': 'solar.season.winterStart'
};

const southernSeasonKeys: Record<SolarSeasonEventKind, TranslationKey> = {
  'march-equinox': 'solar.season.autumnStart',
  'june-solstice': 'solar.season.winterStart',
  'september-equinox': 'solar.season.springStart',
  'december-solstice': 'solar.season.summerStart'
};

export function getSolarThresholdStateLabel(locale: AppLocale, state: SolarThresholdState): string {
  return translate(locale, solarThresholdStateKeys[state]);
}

export function getSolarSeasonEventLabel(locale: AppLocale, kind: SolarSeasonEventKind): string {
  return translate(locale, solarSeasonEventKeys[kind]);
}

export function getSolarSeasonObserverLabel(
  locale: AppLocale,
  kind: SolarSeasonEventKind,
  latitudeDeg: number
): string {
  const north = translate(locale, northernSeasonKeys[kind]);
  const south = translate(locale, southernSeasonKeys[kind]);
  if (Math.abs(latitudeDeg) < 1e-9) return `${north} / ${south}`;
  return latitudeDeg > 0 ? north : south;
}
'''
current_presentation = presentation.read_text(encoding="utf-8")
if 'getSolarThresholdStateLabel' in current_presentation:
    fail('astronomy-result-presentation.ts already contains solar-cycle helpers')
presentation.write_text(current_presentation.rstrip() + presentation_append, encoding="utf-8")

day_content = r'''import { formatUtcOffset, localDateTimeValueFromInstant } from '../../shared/celestial-time';
import type {
  SolarDayEventsResult,
  SolarThresholdEvents
} from '../../simulation/solar-day-events';
import type { SolarSeasonEventsResult } from '../../simulation/solar-season-events';
import type { SolarTimeOffsetResult } from '../../simulation/solar-time-offset';
import type { SolarRouteComparisonResult } from '../../simulation/solar-route-comparison';
import { PanelHelpButton } from './HelpSystem';
import { useI18n } from './I18nProvider';
import { getSolarThresholdStateLabel } from './astronomy-result-presentation';
import { numberFormatterFor } from './app/app-formatters';
import type { AppLocale, TranslationFunction } from './i18n';
import { SolarSeasonEventsPanel } from './SolarSeasonEventsPanel';
import { SolarTimeOffsetPanel } from './SolarTimeOffsetPanel';
import { SolarRouteComparisonPanel } from './SolarRouteComparisonPanel';
import './solar-day-events-panel.css';

const MIN_SEASON_YEAR = 1900;
const MAX_SEASON_YEAR = 2100;

function localClock(iso: string | null, offsetMinutes: number): string {
  if (!iso) return '—';
  const local = localDateTimeValueFromInstant(iso, offsetMinutes);
  return local.slice(11, 16);
}

function localMinuteOfDay(iso: string | null, offsetMinutes: number): number | null {
  if (!iso) return null;
  const local = localDateTimeValueFromInstant(iso, offsetMinutes);
  const hour = Number(local.slice(11, 13));
  const minute = Number(local.slice(14, 16));
  const second = Number(local.slice(17, 19));
  return hour * 60 + minute + second / 60;
}

function duration(minutes: number, locale: AppLocale, t: TranslationFunction): string {
  const hours = Math.floor(minutes / 60);
  const remainder = Math.round(minutes - hours * 60);
  return `${numberFormatterFor(locale).format(hours)} ${t('unit.hoursShort')} ${String(remainder).padStart(2, '0')} ${t('unit.minutesShort')}`;
}

function eventClock(
  events: SolarThresholdEvents,
  kind: 'rise' | 'set',
  offsetMinutes: number,
  t: TranslationFunction
): string {
  if (events.state === 'continuous-above') return t('solar.day.noTransitionAbove');
  if (events.state === 'continuous-below') return t('solar.day.noTransitionBelow');
  if (events.state === 'grazing') return t('solar.day.noReliableTransition');
  return localClock(kind === 'rise' ? events.riseIso : events.setIso, offsetMinutes);
}

function markerStyle(minute: number | null): React.CSSProperties | undefined {
  if (minute === null) return undefined;
  return { left: `${Math.max(0, Math.min(100, minute / 1440 * 100))}%` };
}

export function SolarDayEventsPanel({
  result,
  solarTimeResult,
  seasonResult,
  routeResult,
  routeError,
  routeEndLatitudeDeg,
  routeEndLongitudeDeg,
  onRouteEndCoordinateChange,
  onShowTrace
}: {
  result: SolarDayEventsResult;
  solarTimeResult: SolarTimeOffsetResult;
  seasonResult?: SolarSeasonEventsResult;
  routeResult?: SolarRouteComparisonResult;
  routeError?: string;
  routeEndLatitudeDeg: number;
  routeEndLongitudeDeg: number;
  onRouteEndCoordinateChange(key: 'latitude' | 'longitude', value: number): void;
  onShowTrace(): void;
}): React.JSX.Element {
  const { locale, t } = useI18n();
  const numberFormatter = numberFormatterFor(locale);
  const geometricRiseMinute = localMinuteOfDay(result.geometric.riseIso, result.utcOffsetMinutes);
  const geometricSetMinute = localMinuteOfDay(result.geometric.setIso, result.utcOffsetMinutes);
  const standardRiseMinute = localMinuteOfDay(result.standardApparent.riseIso, result.utcOffsetMinutes);
  const standardSetMinute = localMinuteOfDay(result.standardApparent.setIso, result.utcOffsetMinutes);
  const noonMinute = localMinuteOfDay(result.solarNoonIso, result.utcOffsetMinutes);
  const seasonalYear = Number(result.localDate.slice(0, 4));
  const seasonalYearSupported = Number.isInteger(seasonalYear) && seasonalYear >= MIN_SEASON_YEAR && seasonalYear <= MAX_SEASON_YEAR;
  const angle = (value: number | null): string => value === null ? '—' : `${numberFormatter.format(value)}°`;

  return (
    <>
      <section className="solar-day-events-panel panel">
        <div className="panel-title-row">
          <div>
            <span className="eyebrow">{t('solar.day.stage')}</span>
            <h2>{t('solar.day.title')}</h2>
          </div>
          <div className="title-actions">
            <PanelHelpButton panelId="solar-day-events" />
            <span className="solar-day-date-badge">{result.localDate} · {formatUtcOffset(result.utcOffsetMinutes)}</span>
            <button type="button" onClick={onShowTrace}>{t('model.trace')}</button>
          </div>
        </div>

        <div className="solar-day-timeline" aria-hidden="true">
          <span className="solar-dayline" />
          <span className="solar-time-label start">00</span>
          <span className="solar-time-label q1">06</span>
          <span className="solar-time-label q2">12</span>
          <span className="solar-time-label q3">18</span>
          <span className="solar-time-label end">24</span>
          {standardRiseMinute !== null && <span className="solar-event-marker standard rise" style={markerStyle(standardRiseMinute)} title={t('solar.day.standardRise')} />}
          {standardSetMinute !== null && <span className="solar-event-marker standard set" style={markerStyle(standardSetMinute)} title={t('solar.day.standardSet')} />}
          {geometricRiseMinute !== null && <span className="solar-event-marker geometric rise" style={markerStyle(geometricRiseMinute)} title={t('solar.day.geometricRise')} />}
          {geometricSetMinute !== null && <span className="solar-event-marker geometric set" style={markerStyle(geometricSetMinute)} title={t('solar.day.geometricSet')} />}
          {noonMinute !== null && <span className="solar-event-marker noon" style={markerStyle(noonMinute)} title={t('solar.day.solarNoon')} />}
        </div>

        <div className="solar-event-card-grid">
          <article className="solar-event-card geometric">
            <header>
              <div><span>{t('solar.day.geometricCenter')}</span><strong>{t('solar.day.geometricThreshold')}</strong></div>
              <b>{getSolarThresholdStateLabel(locale, result.geometric.state)}</b>
            </header>
            <dl>
              <div><dt>{t('solar.day.rise')}</dt><dd>{eventClock(result.geometric, 'rise', result.utcOffsetMinutes, t)}</dd><small>{t('solar.day.azimuthValue', { value: angle(result.geometric.riseAzimuthDeg) })}</small></div>
              <div><dt>{t('solar.day.set')}</dt><dd>{eventClock(result.geometric, 'set', result.utcOffsetMinutes, t)}</dd><small>{t('solar.day.azimuthValue', { value: angle(result.geometric.setAzimuthDeg) })}</small></div>
              <div><dt>{t('solar.day.aboveDuration')}</dt><dd>{duration(result.geometric.aboveThresholdDurationMinutes, locale, t)}</dd><small>{t('solar.day.selectedLocalDay')}</small></div>
            </dl>
          </article>

          <article className="solar-event-card standard">
            <header>
              <div><span>{t('solar.day.standardVisibleReference')}</span><strong>{t('solar.day.standardThreshold')}</strong></div>
              <b>{getSolarThresholdStateLabel(locale, result.standardApparent.state)}</b>
            </header>
            <dl>
              <div><dt>{t('solar.day.rise')}</dt><dd>{eventClock(result.standardApparent, 'rise', result.utcOffsetMinutes, t)}</dd><small>{t('solar.day.azimuthValue', { value: angle(result.standardApparent.riseAzimuthDeg) })}</small></div>
              <div><dt>{t('solar.day.set')}</dt><dd>{eventClock(result.standardApparent, 'set', result.utcOffsetMinutes, t)}</dd><small>{t('solar.day.azimuthValue', { value: angle(result.standardApparent.setAzimuthDeg) })}</small></div>
              <div><dt>{t('solar.day.aboveDuration')}</dt><dd>{duration(result.standardApparent.aboveThresholdDurationMinutes, locale, t)}</dd><small>{t('solar.day.approxCalendarReference')}</small></div>
            </dl>
          </article>

          <article className="solar-event-card noon">
            <header><div><span>{t('solar.day.solarNoon').toUpperCase()}</span><strong>{t('solar.day.localMaximumElevation')}</strong></div></header>
            <dl>
              <div><dt>{t('solar.day.time')}</dt><dd>{localClock(result.solarNoonIso, result.utcOffsetMinutes)}</dd><small>{formatUtcOffset(result.utcOffsetMinutes)}</small></div>
              <div><dt>{t('solar.day.maximumElevation')}</dt><dd>{numberFormatter.format(result.solarNoonElevationDeg)}°</dd><small>{t('solar.day.geometricCenterSmall')}</small></div>
              <div><dt>{t('solar.day.azimuth')}</dt><dd>{numberFormatter.format(result.solarNoonAzimuthDeg)}°</dd><small>{t('solar.day.fromGeographicNorth')}</small></div>
            </dl>
          </article>
        </div>

        <div className="solar-day-comparison-strip">
          <span>{t('solar.day.extraDuration')}</span>
          <strong>{numberFormatter.format(result.standardApparent.aboveThresholdDurationMinutes - result.geometric.aboveThresholdDurationMinutes)} {t('unit.minutesShort')}</strong>
        </div>
        <p className="solar-day-events-note">{t('solar.day.note')}</p>
      </section>

      <SolarTimeOffsetPanel result={solarTimeResult} solarNoonIso={result.solarNoonIso} />

      {seasonResult ? (
        <SolarSeasonEventsPanel result={seasonResult} />
      ) : seasonalYearSupported ? null : (
        <section className="solar-season-panel panel">
          <span className="eyebrow">{t('solar.season.stage')}</span>
          <h2>{t('solar.season.unsupportedTitle')}</h2>
          <p className="solar-season-note">{t('solar.season.unsupportedNote', { min: MIN_SEASON_YEAR, max: MAX_SEASON_YEAR })}</p>
        </section>
      )}

      <SolarRouteComparisonPanel
        result={routeResult}
        error={routeError}
        utcOffsetMinutes={result.utcOffsetMinutes}
        startLatitudeDeg={result.latitudeDeg}
        startLongitudeDeg={result.longitudeDeg}
        endLatitudeDeg={routeEndLatitudeDeg}
        endLongitudeDeg={routeEndLongitudeDeg}
        onEndLatitudeChange={(value) => onRouteEndCoordinateChange('latitude', value)}
        onEndLongitudeChange={(value) => onRouteEndCoordinateChange('longitude', value)}
      />
    </>
  );
}
'''
rewrite(day_panel, 'Astronomik referans · günlük Güneş olayları', day_content)

time_content = r'''import { formatUtcOffset, localDateTimeValueFromInstant } from '../../shared/celestial-time';
import type { SolarTimeOffsetResult, SolarClockReading } from '../../simulation/solar-time-offset';
import { useI18n } from './I18nProvider';
import { numberFormatterFor } from './app/app-formatters';
import type { AppLocale, TranslationFunction } from './i18n';
import './solar-time-offset-panel.css';

function formatClock(reading: SolarClockReading): string {
  let totalSeconds = Math.round(reading.minuteOfDay * 60);
  totalSeconds = ((totalSeconds % 86_400) + 86_400) % 86_400;
  const hour = Math.floor(totalSeconds / 3_600);
  const minute = Math.floor((totalSeconds % 3_600) / 60);
  const second = totalSeconds % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
}

function dayLabel(dayOffset: number, t: TranslationFunction): string {
  if (dayOffset === 0) return t('solar.time.day.same');
  if (dayOffset === -1) return t('solar.time.day.previous');
  if (dayOffset === 1) return t('solar.time.day.next');
  return dayOffset < 0
    ? t('solar.time.day.before', { count: Math.abs(dayOffset) })
    : t('solar.time.day.after', { count: dayOffset });
}

function signedMinutes(value: number, locale: AppLocale, t: TranslationFunction): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '±';
  return `${sign}${numberFormatterFor(locale).format(Math.abs(value))} ${t('unit.minutesShort')}`;
}

function cardinalLongitude(value: number, locale: AppLocale, t: TranslationFunction): string {
  const absolute = numberFormatterFor(locale).format(Math.abs(value));
  if (Math.abs(value) < 0.000001) return '0°';
  return `${absolute}° ${value > 0 ? t('compass.eastShort') : t('compass.westShort')}`;
}

function localClockFromIso(iso: string, offsetMinutes: number): string {
  return localDateTimeValueFromInstant(iso, offsetMinutes).slice(11, 19);
}

function localMinuteFromIso(iso: string, offsetMinutes: number): number {
  const local = localDateTimeValueFromInstant(iso, offsetMinutes);
  return Number(local.slice(11, 13)) * 60 + Number(local.slice(14, 16)) + Number(local.slice(17, 19)) / 60;
}

export function SolarTimeOffsetPanel({ result, solarNoonIso }: { result: SolarTimeOffsetResult; solarNoonIso: string }): React.JSX.Element {
  const { locale, t } = useI18n();
  const numberFormatter = numberFormatterFor(locale);
  const noonMinute = localMinuteFromIso(solarNoonIso, result.utcOffsetMinutes);
  const noonDelta = noonMinute - 720;
  const correctionDirection = result.apparentSolarCorrectionMinutes > 0
    ? t('solar.time.apparentAhead')
    : result.apparentSolarCorrectionMinutes < 0
      ? t('solar.time.apparentBehind')
      : t('solar.time.apparentMatches');

  return (
    <section className="solar-time-offset-panel panel">
      <div className="solar-time-offset-heading">
        <div>
          <span className="eyebrow">{t('solar.time.stage')}</span>
          <h2>{t('solar.time.title')}</h2>
          <p>{t('solar.time.intro')}</p>
        </div>
        <div className="solar-time-offset-context">
          <span>{formatUtcOffset(result.utcOffsetMinutes)}</span>
          <strong>{t('solar.time.standardMeridian', { value: cardinalLongitude(result.standardMeridianDeg, locale, t) })}</strong>
          <small>{t('solar.time.observationLongitude', { value: cardinalLongitude(result.longitudeDeg, locale, t) })}</small>
        </div>
      </div>

      <div className="solar-clock-grid">
        <article className="solar-clock-card civil">
          <span>{t('solar.time.civilClock')}</span>
          <strong>{formatClock(result.civilClock)}</strong>
          <small>{result.localCivilDateTime.slice(0, 10)} · {t('solar.time.fixedUtcOffset')}</small>
        </article>
        <article className="solar-clock-card mean">
          <span>{t('solar.time.meanSolarTime')}</span>
          <strong>{formatClock(result.meanSolarClock)}</strong>
          <small>{dayLabel(result.meanSolarClock.dayOffset, t)} · {t('solar.time.longitudeOnly')}</small>
        </article>
        <article className="solar-clock-card apparent">
          <span>{t('solar.time.apparentSolarTime')}</span>
          <strong>{formatClock(result.apparentSolarClock)}</strong>
          <small>{dayLabel(result.apparentSolarClock.dayOffset, t)} · {t('solar.time.longitudeAndEot')}</small>
        </article>
      </div>

      <div className="solar-time-correction-grid">
        <article><span>{t('solar.time.longitudeDifference')}</span><strong>{numberFormatter.format(result.longitudeDeltaDeg)}°</strong><small>{t('solar.time.observationMinusMeridian')}</small></article>
        <article><span>{t('solar.time.longitudeCorrection')}</span><strong>{signedMinutes(result.longitudeCorrectionMinutes, locale, t)}</strong><small>{t('solar.time.fourMinutesPerDegree')}</small></article>
        <article><span>{t('solar.time.equationOfTime')}</span><strong>{signedMinutes(result.equationOfTimeMinutes, locale, t)}</strong><small>{t('solar.time.selectedInstant')}</small></article>
        <article className="total"><span>{t('solar.time.totalApparentDifference')}</span><strong>{signedMinutes(result.apparentSolarCorrectionMinutes, locale, t)}</strong><small>{correctionDirection}</small></article>
      </div>

      <div className="solar-time-equation-strip">
        <span>{t('solar.time.civilTime')}</span>
        <b>{signedMinutes(result.longitudeCorrectionMinutes, locale, t)}</b>
        <span>{t('solar.time.longitude')}</span>
        <b>{signedMinutes(result.equationOfTimeMinutes, locale, t)}</b>
        <span>EoT</span>
        <strong>= {formatClock(result.apparentSolarClock)}</strong>
      </div>

      <div className="solar-time-noon-strip">
        <div><span>{t('solar.time.solarNoonThisDay')}</span><strong>{localClockFromIso(solarNoonIso, result.utcOffsetMinutes)}</strong></div>
        <div><span>{t('solar.time.differenceFromCivilNoon')}</span><strong>{signedMinutes(noonDelta, locale, t)}</strong></div>
        <p>{t('solar.time.noonNote')}</p>
      </div>
      <p className="solar-time-offset-note">{t('solar.time.note')}</p>
    </section>
  );
}
'''
rewrite(time_panel, 'Aşama 7.6 · Sivil saat ↔ Güneş zamanı', time_content)

season_content = r'''import type { SolarSeasonEventsResult } from '../../simulation/solar-season-events';
import { useI18n } from './I18nProvider';
import { getSolarSeasonEventLabel, getSolarSeasonObserverLabel } from './astronomy-result-presentation';
import { appLocaleTag } from './i18n';
import './solar-season-events-panel.css';

function eventClass(kind: SolarSeasonEventsResult['events'][number]['kind']): string {
  return kind.includes('equinox') ? 'equinox' : 'solstice';
}

export function SolarSeasonEventsPanel({ result }: { result: SolarSeasonEventsResult }): React.JSX.Element {
  const { locale, t } = useI18n();
  const angleFormatter = new Intl.NumberFormat(appLocaleTag(locale), { maximumFractionDigits: 2 });
  const coordinateFormatter = new Intl.NumberFormat(appLocaleTag(locale), { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  const timeFormatter = new Intl.DateTimeFormat(appLocaleTag(locale), { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  const duration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const remainder = Math.round(minutes - hours * 60);
    return `${hours} ${t('unit.hoursShort')} ${String(remainder).padStart(2, '0')} ${t('unit.minutesShort')}`;
  };
  const azimuth = (value: number | null): string => value === null ? '—' : `${angleFormatter.format(value)}°`;

  return (
    <section className="solar-season-panel panel">
      <div className="solar-season-heading">
        <div>
          <span className="eyebrow">{t('solar.season.stage')}</span>
          <h2>{t('solar.season.title')}</h2>
          <p>{t('solar.season.intro', { year: result.year })}</p>
        </div>
        <div className="solar-season-context">
          <span>{result.year}</span>
          <strong>{coordinateFormatter.format(result.latitudeDeg)}°, {coordinateFormatter.format(result.longitudeDeg)}°</strong>
        </div>
      </div>

      <div className="solar-season-track" aria-hidden="true">
        <span className="solar-season-track-line" />
        {result.events.map((event, index) => <span className={`solar-season-track-marker ${eventClass(event.kind)}`} style={{ left: `${(index / 3) * 100}%` }} key={event.kind} />)}
      </div>

      <div className="solar-season-grid">
        {result.events.map((event) => (
          <article className={`solar-season-card ${eventClass(event.kind)}`} key={event.kind}>
            <header>
              <div>
                <small>{getSolarSeasonObserverLabel(locale, event.kind, result.latitudeDeg)}</small>
                <strong>{getSolarSeasonEventLabel(locale, event.kind)}</strong>
              </div>
              <b>λ {angleFormatter.format(event.targetApparentSolarLongitudeDeg)}°</b>
            </header>
            <div className="solar-season-event-time">
              <strong>{timeFormatter.format(new Date(event.eventIso))} UTC</strong>
              <span>{t('solar.season.localDate', { date: event.observerLocalDate })}</span>
            </div>
            <dl>
              <div><dt>{t('solar.season.solarDeclination')}</dt><dd>{angleFormatter.format(event.declinationDeg)}°</dd></div>
              <div><dt>{t('solar.season.standardDayLength')}</dt><dd>{duration(event.observerStandardDaylightMinutes)}</dd></div>
              <div><dt>{t('solar.season.geometricDuration')}</dt><dd>{duration(event.observerGeometricDaylightMinutes)}</dd></div>
              <div><dt>{t('solar.season.solarNoon')}</dt><dd>{angleFormatter.format(event.observerSolarNoonElevationDeg)}°</dd></div>
              <div><dt>{t('solar.season.standardRiseAzimuth')}</dt><dd>{azimuth(event.observerStandardRiseAzimuthDeg)}</dd></div>
              <div><dt>{t('solar.season.standardSetAzimuth')}</dt><dd>{azimuth(event.observerStandardSetAzimuthDeg)}</dd></div>
            </dl>
          </article>
        ))}
      </div>
      <p className="solar-season-note">{t('solar.season.note')}</p>
    </section>
  );
}
'''
rewrite(season_panel, 'Ekinokslar, gündönümleri ve yerel gün uzunluğu', season_content)

route_content = r'''import type { SolarRouteComparisonResult, SolarRouteSample } from '../../simulation/solar-route-comparison';
import { formatUtcOffset } from '../../shared/celestial-time';
import { DraftNumberInput } from './DraftNumberInput';
import { useI18n } from './I18nProvider';
import { appLocaleTag } from './i18n';
import './solar-route-comparison-panel.css';

function normalizeLongitude(value: number): number {
  return ((value + 540) % 360) - 180;
}

function chartY(elevationDeg: number): number {
  const clamped = Math.max(-90, Math.min(90, elevationDeg));
  return 18 + (90 - clamped) / 180 * 144;
}

function chartX(fraction: number): number {
  return 42 + fraction * 916;
}

function EndpointCard({ label, latitudeDeg, longitudeDeg, sample, editable, onLatitudeChange, onLongitudeChange }: {
  label: string;
  latitudeDeg: number;
  longitudeDeg: number;
  sample?: SolarRouteSample;
  editable?: boolean;
  onLatitudeChange?(value: number): void;
  onLongitudeChange?(value: number): void;
}): React.JSX.Element {
  const { locale, t } = useI18n();
  const numberFormatter = new Intl.NumberFormat(appLocaleTag(locale), { maximumFractionDigits: 2 });
  const coordinateFormatter = new Intl.NumberFormat(appLocaleTag(locale), { maximumFractionDigits: 4 });
  const clockText = (value: SolarRouteSample): string => {
    const rounded = Math.round(value.apparentSolarClock.minuteOfDay * 60);
    const hour = Math.floor(rounded / 3_600) % 24;
    const minute = Math.floor((rounded % 3_600) / 60);
    const second = rounded % 60;
    const dayOffset = value.apparentSolarClock.dayOffset;
    const suffix = dayOffset === 0 ? '' : t('solar.route.dayOffset', { value: dayOffset > 0 ? `+${dayOffset}` : dayOffset });
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}${suffix}`;
  };

  return (
    <article className="solar-route-endpoint-card">
      <header>
        <span>{label}</span>
        <b className={sample && sample.solarElevationDeg >= 0 ? 'above' : 'below'}>{sample ? (sample.solarElevationDeg >= 0 ? t('solar.route.aboveHorizon') : t('solar.route.belowHorizon')) : '—'}</b>
      </header>
      {editable ? (
        <div className="solar-route-coordinate-inputs">
          <label><span>{t('solar.route.latitude')}</span><DraftNumberInput value={latitudeDeg} min={-90} max={90} step={0.1} onCommit={(value) => onLatitudeChange?.(value)} /><b>°</b></label>
          <label><span>{t('solar.route.longitude')}</span><DraftNumberInput value={longitudeDeg} min={-180} max={180} step={0.1} onCommit={(value) => onLongitudeChange?.(value)} /><b>°</b></label>
        </div>
      ) : <p className="solar-route-coordinate-readout">{coordinateFormatter.format(latitudeDeg)}°, {coordinateFormatter.format(longitudeDeg)}°</p>}
      <dl>
        <div><dt>{t('solar.route.sunElevation')}</dt><dd>{sample ? `${numberFormatter.format(sample.solarElevationDeg)}°` : '—'}</dd></div>
        <div><dt>{t('solar.route.sunAzimuth')}</dt><dd>{sample ? `${numberFormatter.format(sample.solarAzimuthDeg)}°` : '—'}</dd></div>
        <div><dt>{t('solar.route.apparentSolarClock')}</dt><dd>{sample ? clockText(sample) : '—'}</dd></div>
      </dl>
    </article>
  );
}

export function SolarRouteComparisonPanel({ result, error, utcOffsetMinutes, startLatitudeDeg, startLongitudeDeg, endLatitudeDeg, endLongitudeDeg, onEndLatitudeChange, onEndLongitudeChange }: {
  result?: SolarRouteComparisonResult;
  error?: string;
  utcOffsetMinutes: number;
  startLatitudeDeg: number;
  startLongitudeDeg: number;
  endLatitudeDeg: number;
  endLongitudeDeg: number;
  onEndLatitudeChange(value: number): void;
  onEndLongitudeChange(value: number): void;
}): React.JSX.Element {
  const { locale, t } = useI18n();
  const numberFormatter = new Intl.NumberFormat(appLocaleTag(locale), { maximumFractionDigits: 2 });
  const coordinateFormatter = new Intl.NumberFormat(appLocaleTag(locale), { maximumFractionDigits: 4 });
  const signed = (value: number): string => {
    const formatted = numberFormatter.format(value);
    return value > 0 ? `+${formatted}` : formatted;
  };
  const clockText = (sample: SolarRouteSample): string => {
    const rounded = Math.round(sample.apparentSolarClock.minuteOfDay * 60);
    const hour = Math.floor(rounded / 3_600) % 24;
    const minute = Math.floor((rounded % 3_600) / 60);
    const second = rounded % 60;
    const dayOffset = sample.apparentSolarClock.dayOffset;
    const suffix = dayOffset === 0 ? '' : t('solar.route.dayOffset', { value: dayOffset > 0 ? `+${dayOffset}` : dayOffset });
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}${suffix}`;
  };
  const startSample = result?.samples[0];
  const endSample = result?.samples.at(-1);
  const polyline = result?.samples.map((sample) => `${chartX(sample.fraction)},${chartY(sample.solarElevationDeg)}`).join(' ') ?? '';

  return (
    <section className="solar-route-panel panel">
      <div className="solar-route-heading">
        <div><span className="eyebrow">{t('solar.route.stage')}</span><h2>{t('solar.route.title')}</h2><p>{t('solar.route.intro')}</p></div>
        <div className="solar-route-heading-actions">
          <span>{formatUtcOffset(utcOffsetMinutes)}</span>
          <button type="button" onClick={() => { onEndLatitudeChange(startLatitudeDeg); onEndLongitudeChange(normalizeLongitude(startLongitudeDeg + 30)); }}>{t('solar.route.moveEndEast')}</button>
        </div>
      </div>

      <div className="solar-route-endpoint-grid">
        <EndpointCard label={t('solar.route.endpointA')} latitudeDeg={startLatitudeDeg} longitudeDeg={startLongitudeDeg} sample={startSample} />
        <div className="solar-route-summary-card">
          <span>{t('solar.route.geodesicRoute')}</span>
          <strong>{result ? `${numberFormatter.format(result.routeDistanceM / 1_000)} km` : '—'}</strong>
          <dl>
            <div><dt>{t('solar.route.initialBearing')}</dt><dd>{result ? `${numberFormatter.format(result.initialBearingDeg)}°` : '—'}</dd></div>
            <div><dt>{t('solar.route.solution')}</dt><dd>{result?.routeMethod === 'vincenty' ? 'Vincenty' : result ? t('geodesic.sphericalFallback') : '—'}</dd></div>
            <div><dt>{t('solar.route.deltaElevation')}</dt><dd>{result ? `${signed(result.endMinusStartElevationDeg)}°` : '—'}</dd></div>
            <div><dt>{t('solar.route.deltaSolarTime')}</dt><dd>{result ? `${signed(result.apparentSolarClockDifferenceMinutes)} ${t('unit.minutesShort')}` : '—'}</dd></div>
          </dl>
        </div>
        <EndpointCard label={t('solar.route.endpointB')} latitudeDeg={endLatitudeDeg} longitudeDeg={endLongitudeDeg} sample={endSample} editable onLatitudeChange={onEndLatitudeChange} onLongitudeChange={onEndLongitudeChange} />
      </div>

      {error ? <div className="solar-route-error">{error}</div> : result ? (
        <>
          <div className="solar-route-diagnostics">
            <div><span>{t('solar.route.minimumElevation')}</span><strong>{numberFormatter.format(result.minimumSolarElevationDeg)}°</strong></div>
            <div><span>{t('solar.route.maximumElevation')}</span><strong>{numberFormatter.format(result.maximumSolarElevationDeg)}°</strong></div>
            <div><span>{t('solar.route.horizonSideChanges')}</span><strong>{result.horizonSideChangeCount}</strong><small>{t('solar.route.neighborChangesOnly')}</small></div>
            <div><span>{t('solar.route.sampleCount')}</span><strong>{result.samples.length}</strong><small>0 / 25 / 50 / 75 / 100%</small></div>
          </div>
          <div className="solar-route-chart-wrap">
            <div className="solar-route-chart-title"><span>{t('solar.route.chartTitle')}</span><b>{t('solar.route.zeroLine')}</b></div>
            <svg className="solar-route-chart" viewBox="0 0 1000 180" role="img" aria-label={t('solar.route.chartAria')}>
              <line className="solar-route-chart-grid top" x1="42" x2="958" y1="18" y2="18" />
              <line className="solar-route-chart-horizon" x1="42" x2="958" y1="90" y2="90" />
              <line className="solar-route-chart-grid bottom" x1="42" x2="958" y1="162" y2="162" />
              <text x="4" y="22">+90°</text><text x="14" y="94">0°</text><text x="4" y="166">−90°</text>
              <polyline className="solar-route-chart-line" points={polyline} />
              {result.samples.map((sample) => (
                <g key={sample.fraction}>
                  <circle className={sample.solarElevationDeg >= 0 ? 'above' : 'below'} cx={chartX(sample.fraction)} cy={chartY(sample.solarElevationDeg)} r="5"><title>{`${Math.round(sample.fraction * 100)}% · ${numberFormatter.format(sample.solarElevationDeg)}°`}</title></circle>
                  <text className="fraction-label" x={chartX(sample.fraction)} y="177" textAnchor="middle">{Math.round(sample.fraction * 100)}%</text>
                </g>
              ))}
            </svg>
          </div>
          <div className="solar-route-sample-grid">
            {result.samples.map((sample) => (
              <article key={sample.fraction} className={sample.solarElevationDeg >= 0 ? 'above' : 'below'}>
                <header><span>{Math.round(sample.fraction * 100)}%</span><b>{numberFormatter.format(sample.distanceM / 1_000)} km</b></header>
                <strong>{numberFormatter.format(sample.solarElevationDeg)}°</strong><small>{t('solar.route.sunElevation')}</small>
                <p>{coordinateFormatter.format(sample.latitudeDeg)}°, {coordinateFormatter.format(sample.longitudeDeg)}°</p>
                <p>{t('solar.route.azimuthValue', { value: numberFormatter.format(sample.solarAzimuthDeg) })}</p>
                <p>{t('solar.route.solarClockValue', { value: clockText(sample) })}</p>
              </article>
            ))}
          </div>
          <details className="solar-route-trace">
            <summary>{t('solar.route.showTrace')}</summary>
            <p>{result.trace.summary}</p>
            <ol>{result.trace.steps.map((step) => <li key={step.id}><strong>{step.title}</strong><code>{step.formula}</code><span>{step.substitution}</span><b>{step.result}</b></li>)}</ol>
          </details>
        </>
      ) : null}
      <p className="solar-route-note">{t('solar.route.note')}</p>
    </section>
  );
}
'''
rewrite(route_panel, 'Aşama 7.7 · aynı an / WGS84 rota karşılaştırması', route_content)

write_new(test, r'''import { describe, expect, it } from 'vitest';
import {
  getSolarSeasonEventLabel,
  getSolarSeasonObserverLabel,
  getSolarThresholdStateLabel
} from '../src/renderer/src/astronomy-result-presentation';
import { translate } from '../src/renderer/src/i18n';

describe('solar-cycle localization', () => {
  it('localizes solar threshold state without changing the state id', () => {
    const state = 'continuous-above' as const;
    expect(getSolarThresholdStateLabel('tr', state)).toBe('24 SAAT EŞİK ÜSTÜ');
    expect(getSolarThresholdStateLabel('en', state)).toBe('24 HOURS ABOVE THRESHOLD');
    expect(state).toBe('continuous-above');
  });

  it('localizes season event and observer-season presentation from stable event kind', () => {
    const kind = 'march-equinox' as const;
    expect(getSolarSeasonEventLabel('en', kind)).toBe('March equinox');
    expect(getSolarSeasonObserverLabel('en', kind, 41)).toBe('Start of spring');
    expect(getSolarSeasonObserverLabel('en', kind, -33)).toBe('Start of autumn');
    expect(kind).toBe('march-equinox');
  });

  it('localizes daily, solar-time and route shell labels', () => {
    expect(translate('en', 'solar.day.title')).toBe('Sunrise, sunset and solar noon');
    expect(translate('en', 'solar.time.civilClock')).toBe('CIVIL CLOCK');
    expect(translate('en', 'solar.route.moveEndEast')).toBe('Move B 30° east');
  });
});
''')

old_docs = "- Astronomy result slice (part 1): Sun/Moon position panels plus eclipse overlap/event-search result surfaces, with renderer-only phase/geometry presentation mapping and active-locale numeric formatting.\n\nEngine-emitted warnings/assumptions/raw calculation errors, daily/seasonal solar result panels, shadow/stellar specialized panels, dialogs, help/AI guidance and reports remain separate follow-up slices."
new_docs = "- Astronomy result slice (part 1): Sun/Moon position panels plus eclipse overlap/event-search result surfaces, with renderer-only phase/geometry presentation mapping and active-locale numeric formatting.\n- Astronomy result slice (part 2): daily solar events, civil↔solar time, annual season events and same-instant WGS84 route comparison surfaces; threshold/season domain ids remain unchanged.\n\nEngine-emitted warnings/assumptions/raw calculation errors, shadow/stellar specialized panels, terrain/calibration panels, dialogs, help/AI guidance and reports remain separate follow-up slices."
replace_once(docs, old_docs, new_docs)

print('Solar-cycle localization slice applied. Run npm run verify; defer Electron TR/EN smoke until the localization stage is complete.')
