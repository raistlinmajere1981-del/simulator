#!/usr/bin/env python3
"""Localize stellar core controls, proper-motion source and refraction diagnostic.

Temporary helper. Remove before merge. This slice is renderer/presentation only.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
i18n = ROOT / 'src/renderer/src/i18n.ts'
panel = ROOT / 'src/renderer/src/StellarObservationPanel.tsx'
test = ROOT / 'tests/stellar-source-controls-i18n.test.ts'
docs = ROOT / 'docs/localization.md'


def fail(message: str) -> None:
    raise SystemExit(f'ERROR: {message}')


def replace_exact(path: Path, old: str, new: str, expected: int = 1) -> None:
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != expected:
        fail(f'{path.relative_to(ROOT)}: expected {expected} match(es), found {count}: {old[:100]!r}')
    path.write_text(text.replace(old, new), encoding='utf-8')


def insert_after_exact(path: Path, marker: str, addition: str) -> None:
    text = path.read_text(encoding='utf-8')
    count = text.count(marker)
    if count != 1:
        fail(f'{path.relative_to(ROOT)}: expected one insertion marker, found {count}')
    path.write_text(text.replace(marker, marker + addition, 1), encoding='utf-8')


for path in (i18n, panel, docs):
    if not path.exists():
        fail(f'missing expected file: {path.relative_to(ROOT)}')
if test.exists():
    fail(f'{test.relative_to(ROOT)} already exists')

tr_marker = "  'stellar.sky.note': 'Bu harita üst geometrik yarımküreyi gösterir. Nokta büyüklüğü katalog görsel kadrini yalnız ayırt edici ölçek olarak kullanır; atmosferik sönümleme, gökyüzü parlaklığı ve çıplak-göz eşiği uygulanmadığı için optik görünürlük haritası değildir. Standart apparent tanı bu haritaya uygulanmaz.',\n"
en_marker = "  'stellar.sky.note': 'This map shows the upper geometric hemisphere. Marker size uses catalog visual magnitude only as a distinguishing scale; because atmospheric extinction, sky brightness and naked-eye thresholds are not applied, it is not an optical visibility map. The standard-apparent diagnostic is not applied to this map.',\n"

tr_messages = """  'stellar.controls.stage': 'Astronomik referans · yıldız',
  'stellar.controls.aboveZero': '0° UFKUN ÜSTÜNDE',
  'stellar.controls.belowZero': '0° UFKUN ALTINDA',
  'stellar.controls.localUndefinedAzimuth': 'YEREL UFUK AZİMUTU TANIMSIZ',
  'stellar.controls.localBelow': 'YEREL UFKUN ALTINDA',
  'stellar.controls.localBoundary': 'YEREL UFUK SINIRINDA',
  'stellar.controls.localAbove': 'YEREL UFKUN ÜSTÜNDE',
  'stellar.controls.trace': 'Hesap izini aç',
  'stellar.controls.catalogStar': 'Katalog yıldızı',
  'stellar.controls.trailDuration': 'İz süresi',
  'stellar.controls.sampling': 'Örnekleme',
  'stellar.controls.hours': '{value} saat',
  'stellar.controls.minutes': '{value} dk',
  'stellar.motion.title': 'Doğrulanmış proper motion · BSC5P',
  'stellar.motion.description': 'Resmi V/50 catalog dosyası 19/19 HR + J2000 konum + V kadri üzerinden doğrulanır. Dosya seçimi hesap motorunu çalıştırmaz.',
  'stellar.motion.importing': 'Katalog okunuyor…',
  'stellar.motion.import': 'BSC5P catalog dosyasından al',
  'stellar.motion.sourceLabel': 'PROPER MOTION KAYNAĞI',
  'stellar.motion.records': '{count}/19 kayıt · FK5/J2000 · kaynak epok J{epoch}',
  'stellar.motion.selectedStar': 'Seçili yıldız: μ_α* {ra}″/yıl · μ_δ {dec}″/yıl',
  'stellar.motion.empty': 'Kaynak uygulanmadı; yıldız sonuçları proper motion olmadan mevcut J2000 → precession zincirini kullanır.',
  'stellar.motion.totalShift': 'Uygulanan toplam PM kayması',
  'stellar.motion.epochSpan': 'J{epoch} → gözlem epoch’u',
  'stellar.motion.julianYears': '{value} Jülyen yıl',
  'stellar.motion.dirty': 'Proper-motion kaynak değişikliği henüz hesaplanmadı.',
  'stellar.motion.applied': 'Doğrulanmış proper-motion kaynağı hesapta uygulanıyor.',
  'stellar.motion.off': 'Proper motion kapalı.',
  'stellar.motion.remove': 'Kaynağı kaldır',
  'stellar.motion.revert': 'Geri al',
  'stellar.motion.apply': 'Uygula ve hesapla',
  'stellar.motion.validated': '“{fileName}” doğrulandı. Uygula ve hesapla ile proper motion etkinleşecek.',
  'stellar.motion.importError': 'BSC5P proper-motion kaynağı içe aktarılamadı.',
  'stellar.refraction.title': 'Standart atmosferik kırılma tanısı',
  'stellar.refraction.description': 'NOAA standart yaklaşımı yalnız yıldız ışınına uygulanır. Geometrik yıldız/skyline sonuçlarını değiştirmez.',
  'stellar.refraction.geometricAltitude': 'Geometrik yükseklik',
  'stellar.refraction.apparentAltitude': 'Standart apparent yükseklik',
  'stellar.refraction.correction': 'Kırılma düzeltmesi',
  'stellar.refraction.apparentZero': 'Apparent astronomik 0°',
  'stellar.refraction.above': 'Üstünde',
  'stellar.refraction.below': 'Altında',
  'stellar.refraction.mixedReference': 'Apparent yıldız − geometrik skyline',
  'stellar.refraction.diagnosticOnly': 'Tanı · yerel görünürlük değildir',
  'stellar.refraction.warning': 'Apparent yıldız yüksekliği ile geometrik skyline farklı referanslardadır. Skyline/terrain ışını aynı atmosfer modeliyle çözülmediği için bu farktan yerel görünür/görünmez kararı üretilmez.',
"""

en_messages = """  'stellar.controls.stage': 'Astronomical reference · star',
  'stellar.controls.aboveZero': 'ABOVE 0° HORIZON',
  'stellar.controls.belowZero': 'BELOW 0° HORIZON',
  'stellar.controls.localUndefinedAzimuth': 'LOCAL-HORIZON AZIMUTH UNDEFINED',
  'stellar.controls.localBelow': 'BELOW LOCAL HORIZON',
  'stellar.controls.localBoundary': 'ON LOCAL-HORIZON BOUNDARY',
  'stellar.controls.localAbove': 'ABOVE LOCAL HORIZON',
  'stellar.controls.trace': 'Open calculation trace',
  'stellar.controls.catalogStar': 'Catalog star',
  'stellar.controls.trailDuration': 'Trail duration',
  'stellar.controls.sampling': 'Sampling',
  'stellar.controls.hours': '{value} hours',
  'stellar.controls.minutes': '{value} min',
  'stellar.motion.title': 'Verified proper motion · BSC5P',
  'stellar.motion.description': 'The official V/50 catalog file is verified against all 19 HR entries, J2000 positions and V magnitudes. Selecting a file does not run the calculation engine.',
  'stellar.motion.importing': 'Reading catalog…',
  'stellar.motion.import': 'Load from BSC5P catalog file',
  'stellar.motion.sourceLabel': 'PROPER MOTION SOURCE',
  'stellar.motion.records': '{count}/19 records · FK5/J2000 · source epoch J{epoch}',
  'stellar.motion.selectedStar': 'Selected star: μ_α* {ra}″/year · μ_δ {dec}″/year',
  'stellar.motion.empty': 'No source is applied; stellar results use the existing J2000 → precession chain without proper motion.',
  'stellar.motion.totalShift': 'Applied total PM shift',
  'stellar.motion.epochSpan': 'J{epoch} → observation epoch',
  'stellar.motion.julianYears': '{value} Julian years',
  'stellar.motion.dirty': 'The proper-motion source change has not been calculated yet.',
  'stellar.motion.applied': 'The verified proper-motion source is applied in the calculation.',
  'stellar.motion.off': 'Proper motion is off.',
  'stellar.motion.remove': 'Remove source',
  'stellar.motion.revert': 'Revert',
  'stellar.motion.apply': 'Apply and calculate',
  'stellar.motion.validated': '“{fileName}” was verified. Apply and calculate to enable proper motion.',
  'stellar.motion.importError': 'The BSC5P proper-motion source could not be imported.',
  'stellar.refraction.title': 'Standard atmospheric-refraction diagnostic',
  'stellar.refraction.description': 'The NOAA standard approximation is applied only to the stellar ray. It does not change the geometric star/skyline results.',
  'stellar.refraction.geometricAltitude': 'Geometric altitude',
  'stellar.refraction.apparentAltitude': 'Standard apparent altitude',
  'stellar.refraction.correction': 'Refraction correction',
  'stellar.refraction.apparentZero': 'Apparent astronomical 0°',
  'stellar.refraction.above': 'Above',
  'stellar.refraction.below': 'Below',
  'stellar.refraction.mixedReference': 'Apparent star − geometric skyline',
  'stellar.refraction.diagnosticOnly': 'Diagnostic · not local visibility',
  'stellar.refraction.warning': 'Apparent stellar altitude and the geometric skyline use different references. Because the skyline/terrain ray is not solved with the same atmospheric model, this difference is not used to produce a local visible/not-visible decision.',
"""

insert_after_exact(i18n, tr_marker, tr_messages)
insert_after_exact(i18n, en_marker, en_messages)

replace_exact(
    panel,
    "import { DraftNumberInput } from './DraftNumberInput';\n",
    "import { DraftNumberInput } from './DraftNumberInput';\nimport { useI18n } from './I18nProvider';\nimport { appLocaleTag, translate, type AppLocale } from './i18n';\n"
)
replace_exact(panel, "  angleFormatter,\n", '')
replace_exact(panel, "  currentLocalHorizonState,\n", '')
replace_exact(panel, "  formatAngle,\n", '')
replace_exact(panel, "  formatImportedAt,\n", '')

insert_marker = "import './stellar-observation-panel.css';\n\n"
helpers = """function localizedLocalHorizonState(result: StellarObservationResult, locale: AppLocale): { label: string; className: string } | null {
  const sample = result.localHorizonTrail?.samples[0];
  if (!sample) return null;
  if (sample.status === 'undefined-azimuth') return { label: translate(locale, 'stellar.controls.localUndefinedAzimuth'), className: 'stellar-state neutral' };
  if (sample.status === 'below') return { label: translate(locale, 'stellar.controls.localBelow'), className: 'stellar-state below' };
  if (sample.status === 'on-horizon') return { label: translate(locale, 'stellar.controls.localBoundary'), className: 'stellar-state neutral' };
  return { label: translate(locale, 'stellar.controls.localAbove'), className: 'stellar-state visible' };
}

"""
insert_after_exact(panel, insert_marker, helpers)
replace_exact(panel, "}): React.JSX.Element {\n  const [localHorizonDraft", "}): React.JSX.Element {\n  const { locale, t } = useI18n();\n  const angleFormatter = new Intl.NumberFormat(appLocaleTag(locale), { maximumFractionDigits: 2 });\n  const formatAngle = (value: number | null): string => value === null ? t('stellar.undefined') : `${angleFormatter.format(value)}°`;\n  const importedAtFormatter = new Intl.DateTimeFormat(appLocaleTag(locale), { dateStyle: 'short', timeStyle: 'medium', hourCycle: 'h23' });\n  const formatImportedAt = (iso: string): string => importedAtFormatter.format(new Date(iso));\n  const [localHorizonDraft")
replace_exact(panel, "  const localState = currentLocalHorizonState(result);", "  const localState = localizedLocalHorizonState(result, locale);")

replacements = [
    ("setMotionImportMessage(`“${imported.fileName}” doğrulandı. Uygula ve hesapla ile proper motion etkinleşecek.`);", "setMotionImportMessage(t('stellar.motion.validated', { fileName: imported.fileName }));"),
    ("setMotionImportMessage(error instanceof Error ? error.message : 'BSC5P proper-motion kaynağı içe aktarılamadı.');", "setMotionImportMessage(error instanceof Error ? error.message : t('stellar.motion.importError'));"),
    ('<span className="eyebrow">Astronomik referans · yıldız</span>', "<span className=\"eyebrow\">{t('stellar.controls.stage')}</span>"),
    ("{position.aboveGeometricHorizon ? '0° UFKUN ÜSTÜNDE' : '0° UFKUN ALTINDA'}", "{position.aboveGeometricHorizon ? t('stellar.controls.aboveZero') : t('stellar.controls.belowZero')}"),
    ('<button className="trace-button" type="button" onClick={onShowTrace}>Hesap izini aç</button>', "<button className=\"trace-button\" type=\"button\" onClick={onShowTrace}>{t('stellar.controls.trace')}</button>"),
    ('<span>Katalog yıldızı</span>', "<span>{t('stellar.controls.catalogStar')}</span>"),
    ('<span>İz süresi</span>', "<span>{t('stellar.controls.trailDuration')}</span>"),
    ('<span>Örnekleme</span>', "<span>{t('stellar.controls.sampling')}</span>"),
    ('<option value={180}>3 saat</option>', "<option value={180}>{t('stellar.controls.hours', { value: 3 })}</option>"),
    ('<option value={360}>6 saat</option>', "<option value={360}>{t('stellar.controls.hours', { value: 6 })}</option>"),
    ('<option value={720}>12 saat</option>', "<option value={720}>{t('stellar.controls.hours', { value: 12 })}</option>"),
    ('<option value={1440}>24 saat</option>', "<option value={1440}>{t('stellar.controls.hours', { value: 24 })}</option>"),
    ('<option value={2880}>48 saat</option>', "<option value={2880}>{t('stellar.controls.hours', { value: 48 })}</option>"),
    ('<option value={5}>5 dk</option>', "<option value={5}>{t('stellar.controls.minutes', { value: 5 })}</option>"),
    ('<option value={10}>10 dk</option>', "<option value={10}>{t('stellar.controls.minutes', { value: 10 })}</option>"),
    ('<option value={15}>15 dk</option>', "<option value={15}>{t('stellar.controls.minutes', { value: 15 })}</option>"),
    ('<option value={30}>30 dk</option>', "<option value={30}>{t('stellar.controls.minutes', { value: 30 })}</option>"),
    ('<option value={60}>60 dk</option>', "<option value={60}>{t('stellar.controls.minutes', { value: 60 })}</option>"),
    ('<strong>Doğrulanmış proper motion · BSC5P</strong>', "<strong>{t('stellar.motion.title')}</strong>"),
    ('<span>Resmi V/50 catalog dosyası 19/19 HR + J2000 konum + V kadri üzerinden doğrulanır. Dosya seçimi hesap motorunu çalıştırmaz.</span>', "<span>{t('stellar.motion.description')}</span>"),
    ("{isImportingMotion ? 'Katalog okunuyor…' : 'BSC5P catalog dosyasından al'}", "{isImportingMotion ? t('stellar.motion.importing') : t('stellar.motion.import')}"),
    ('<small>PROPER MOTION KAYNAĞI</small>', "<small>{t('stellar.motion.sourceLabel')}</small>"),
    ("<span>{draftMotionSource.entryCount}/19 kayıt · FK5/J2000 · kaynak epok J{angleFormatter.format(draftMotionSource.sourceEpochJulianYear)}</span>", "<span>{t('stellar.motion.records', { count: draftMotionSource.entryCount, epoch: angleFormatter.format(draftMotionSource.sourceEpochJulianYear) })}</span>"),
    ("<span>Seçili yıldız: μ_α* {angleFormatter.format(draftMotionEntry.properMotionRaStarArcsecPerYear)}″/yıl · μ_δ {angleFormatter.format(draftMotionEntry.properMotionDecArcsecPerYear)}″/yıl</span>", "<span>{t('stellar.motion.selectedStar', { ra: angleFormatter.format(draftMotionEntry.properMotionRaStarArcsecPerYear), dec: angleFormatter.format(draftMotionEntry.properMotionDecArcsecPerYear) })}</span>"),
    ('<p className="stellar-motion-empty">Kaynak uygulanmadı; yıldız sonuçları proper motion olmadan mevcut J2000 → precession zincirini kullanır.</p>', "<p className=\"stellar-motion-empty\">{t('stellar.motion.empty')}</p>"),
    ('<span>Uygulanan toplam PM kayması <strong>{angleFormatter.format(result.properMotion.angularShiftArcsec)}″</strong></span>', "<span>{t('stellar.motion.totalShift')} <strong>{angleFormatter.format(result.properMotion.angularShiftArcsec)}″</strong></span>"),
    ("<span>J{angleFormatter.format(result.properMotion.sourceEpochJulianYear)} → gözlem epoch'u <strong>{angleFormatter.format(result.properMotion.elapsedJulianYears)} Jülyen yıl</strong></span>", "<span>{t('stellar.motion.epochSpan', { epoch: angleFormatter.format(result.properMotion.sourceEpochJulianYear) })} <strong>{t('stellar.motion.julianYears', { value: angleFormatter.format(result.properMotion.elapsedJulianYears) })}</strong></span>"),
    ("{motionSourceDirty ? 'Proper-motion kaynak değişikliği henüz hesaplanmadı.' : stellarMotionSource ? 'Doğrulanmış proper-motion kaynağı hesapta uygulanıyor.' : 'Proper motion kapalı.'}", "{motionSourceDirty ? t('stellar.motion.dirty') : stellarMotionSource ? t('stellar.motion.applied') : t('stellar.motion.off')}"),
    ('>Kaynağı kaldır</button>', ">{t('stellar.motion.remove')}</button>"),
    ('>Geri al</button>', ">{t('stellar.motion.revert')}</button>"),
    ('onClick={applyMotionSource}>Uygula ve hesapla</button>', "onClick={applyMotionSource}>{t('stellar.motion.apply')}</button>"),
    ('<strong>Standart atmosferik kırılma tanısı</strong>', "<strong>{t('stellar.refraction.title')}</strong>"),
    ('<span>NOAA standart yaklaşımı yalnız yıldız ışınına uygulanır. Geometrik yıldız/skyline sonuçlarını değiştirmez.</span>', "<span>{t('stellar.refraction.description')}</span>"),
    ("{showRefractionDiagnostic ? 'Gösteriliyor' : 'Kapalı'}", "{showRefractionDiagnostic ? t('stellar.sky.shown') : t('stellar.sky.off')}"),
    ('<span>Geometrik yükseklik</span>', "<span>{t('stellar.refraction.geometricAltitude')}</span>"),
    ('<span>Standart apparent yükseklik</span>', "<span>{t('stellar.refraction.apparentAltitude')}</span>"),
    ('<span>Kırılma düzeltmesi</span>', "<span>{t('stellar.refraction.correction')}</span>"),
    ('<span>Apparent astronomik 0°</span>', "<span>{t('stellar.refraction.apparentZero')}</span>"),
    ("{apparent.refraction.aboveApparentAstronomicalHorizon ? 'Üstünde' : 'Altında'}", "{apparent.refraction.aboveApparentAstronomicalHorizon ? t('stellar.refraction.above') : t('stellar.refraction.below')}"),
    ('<span>Apparent yıldız − geometrik skyline</span>', "<span>{t('stellar.refraction.mixedReference')}</span>"),
    ('<b>Tanı · yerel görünürlük değildir</b>', "<b>{t('stellar.refraction.diagnosticOnly')}</b>"),
    ('Apparent yıldız yüksekliği ile geometrik skyline farklı referanslardadır. Skyline/terrain ışını aynı atmosfer modeliyle çözülmediği için bu farktan yerel görünür/görünmez kararı üretilmez.', "{t('stellar.refraction.warning')}")
]
for old, new in replacements:
    replace_exact(panel, old, new)

# Add a small characterization test around the renderer-only presentation catalog.
test.write_text("""import { describe, expect, it } from 'vitest';
import { translate } from '../src/renderer/src/i18n';

describe('stellar source controls localization', () => {
  it('localizes stable stellar control labels', () => {
    expect(translate('tr', 'stellar.controls.catalogStar')).toBe('Katalog yıldızı');
    expect(translate('en', 'stellar.controls.catalogStar')).toBe('Catalog star');
    expect(translate('en', 'stellar.motion.import')).toBe('Load from BSC5P catalog file');
    expect(translate('en', 'stellar.refraction.diagnosticOnly')).toBe('Diagnostic · not local visibility');
  });

  it('interpolates source presentation without changing source identity', () => {
    expect(translate('en', 'stellar.motion.validated', { fileName: 'catalog.dat' }))
      .toBe('“catalog.dat” was verified. Apply and calculate to enable proper motion.');
  });
});
""", encoding='utf-8')

progress = "- Astronomy result slice (part 3): single/dual shadow result surfaces plus core stellar result and geometric sky-snapshot presentation use TR/EN; raw engine warnings/traces and stellar source/editor controls remain follow-up work.\n"
addition = progress + "- Stellar control slice (part 4): catalog/trail controls, verified proper-motion source and standard-refraction diagnostic use TR/EN and active-locale formatting; local-horizon/DEM/panorama editors remain follow-up work.\n"
replace_exact(docs, progress, addition)

print('Stellar source-control localization slice applied. Run npm run verify; Electron smoke remains deferred until final localization audit.')
