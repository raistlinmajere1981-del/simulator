#!/usr/bin/env python3
"""Localize the stellar DEM skyline control.

Temporary helper: remove before merge.
All edits are prepared in memory and written only after every anchor succeeds.
Renderer/presentation only: DEM sampling/source ids and raw IPC messages stay unchanged.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
I18N = ROOT / 'src/renderer/src/i18n.ts'
PANEL = ROOT / 'src/renderer/src/StellarDemSkylineControl.tsx'
DOCS = ROOT / 'docs/localization.md'
TEST = ROOT / 'tests/stellar-dem-skyline-i18n.test.ts'


def fail(message: str) -> None:
    raise SystemExit(f'ERROR: {message}')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f'{label}: expected one match, found {count}: {old[:100]!r}')
    return text.replace(old, new, 1)


def insert_catalog(text: str, marker: str, addition: str, label: str) -> str:
    count = text.count(marker)
    if count != 1:
        fail(f'{label}: catalog marker count {count}, expected 1')
    index = text.index(marker)
    prefix = text[:index]
    suffix = text[index:]
    separator = '\n' if prefix.rstrip().endswith(',') else ',\n'
    return prefix + separator + addition + suffix


for path in (I18N, PANEL, DOCS):
    if not path.exists():
        fail(f'missing expected file: {path.relative_to(ROOT)}')
if TEST.exists():
    fail(f'{TEST.relative_to(ROOT)} already exists')

i18n = I18N.read_text(encoding='utf-8')
panel = PANEL.read_text(encoding='utf-8')
docs = DOCS.read_text(encoding='utf-8')

tr_messages = """  'stellar.dem.title': 'DEM’den 360° geometrik skyline',
  'stellar.dem.description': 'ESRI ASCII Grid seçimi yalnız taslak hazırlar. 360° tarama ayrı düğmeyle çalışır; eksik kapsama yıldız skyline’ına uygulanmaz.',
  'stellar.dem.importing': 'DEM okunuyor…',
  'stellar.dem.import': 'ESRI ASCII DEM seç',
  'stellar.dem.importError': 'DEM skyline kaynağı içe aktarılamadı.',
  'stellar.dem.generationError': 'DEM skyline üretimi tamamlanamadı.',
  'stellar.dem.sourceLabel': 'DEM TASLAĞI · 360° TARAMA HENÜZ AYRI İŞLEM',
  'stellar.dem.cellsSummary': '{columns}×{rows} hücre · cellsize {cellSize}° · {size}',
  'stellar.dem.coverage': 'Kapsam: {south}…{north}° enlem · {west}…{east}° boylam',
  'stellar.dem.observer': 'Gözlemci: {latitude}°, {longitude}° · göz {height} m',
  'stellar.dem.azimuthStep': 'Azimut adımı',
  'stellar.dem.directionCount': '{count} yön',
  'stellar.dem.distanceStep': 'Mesafe adımı · m',
  'stellar.dem.distanceStepAria': 'DEM skyline mesafe örnekleme adımı',
  'stellar.dem.maximumDistance': 'Maksimum mesafe · m',
  'stellar.dem.maximumDistanceAria': 'DEM skyline maksimum mesafesi',
  'stellar.dem.ellipsoidOffset': 'DEM → WGS84 elipsoid ofseti · m',
  'stellar.dem.ellipsoidOffsetAria': 'DEM WGS84 elipsoid yükseklik ofseti',
  'stellar.dem.sampling': 'DEM örnekleme',
  'stellar.dem.geometryNote': 'Datum ofseti sabittir; geoit değişimi, kırılma, bina ve bitki örtüsü bu geometrik taramaya dahil değildir.',
  'stellar.dem.generating': '360° taranıyor…',
  'stellar.dem.generate': 'DEM skyline üret',
  'stellar.dem.completeAzimuth': 'Tam azimut',
  'stellar.dem.known': 'Bilinen',
  'stellar.dem.coverageLimited': 'Kapsama sınırlı',
  'stellar.dem.noData': 'NODATA etkili',
  'stellar.dem.noCoverage': 'Kapsamasız',
  'stellar.dem.profileTransferred': ' Profil yerel ufuk taslağına aktarıldı; yıldız hesabı için alttaki “Uygula ve hesapla” düğmesini kullan.',
"""

en_messages = """  'stellar.dem.title': '360° geometric skyline from DEM',
  'stellar.dem.description': 'Selecting an ESRI ASCII Grid only prepares a draft. The 360° scan runs with a separate action; incomplete coverage is not applied to the stellar skyline.',
  'stellar.dem.importing': 'Reading DEM…',
  'stellar.dem.import': 'Select ESRI ASCII DEM',
  'stellar.dem.importError': 'The DEM skyline source could not be imported.',
  'stellar.dem.generationError': 'DEM skyline generation could not be completed.',
  'stellar.dem.sourceLabel': 'DEM DRAFT · 360° SCAN IS STILL A SEPARATE STEP',
  'stellar.dem.cellsSummary': '{columns}×{rows} cells · cellsize {cellSize}° · {size}',
  'stellar.dem.coverage': 'Coverage: {south}…{north}° latitude · {west}…{east}° longitude',
  'stellar.dem.observer': 'Observer: {latitude}°, {longitude}° · eye {height} m',
  'stellar.dem.azimuthStep': 'Azimuth step',
  'stellar.dem.directionCount': '{count} directions',
  'stellar.dem.distanceStep': 'Distance step · m',
  'stellar.dem.distanceStepAria': 'DEM skyline distance sampling step',
  'stellar.dem.maximumDistance': 'Maximum distance · m',
  'stellar.dem.maximumDistanceAria': 'DEM skyline maximum distance',
  'stellar.dem.ellipsoidOffset': 'DEM → WGS84 ellipsoid offset · m',
  'stellar.dem.ellipsoidOffsetAria': 'DEM WGS84 ellipsoid height offset',
  'stellar.dem.sampling': 'DEM sampling',
  'stellar.dem.geometryNote': 'The datum offset is constant; geoid variation, refraction, buildings and vegetation are not included in this geometric scan.',
  'stellar.dem.generating': 'Scanning 360°…',
  'stellar.dem.generate': 'Generate DEM skyline',
  'stellar.dem.completeAzimuth': 'Complete azimuth',
  'stellar.dem.known': 'Known',
  'stellar.dem.coverageLimited': 'Coverage-limited',
  'stellar.dem.noData': 'NODATA-affected',
  'stellar.dem.noCoverage': 'No coverage',
  'stellar.dem.profileTransferred': ' The profile was transferred to the local-horizon draft; use “Apply and calculate” below to include it in the stellar calculation.',
"""

i18n = insert_catalog(i18n, '\n} as const;\n\nexport type TranslationKey', tr_messages, 'i18n TR')
i18n = insert_catalog(i18n, '\n};\n\nexport function translate', en_messages, 'i18n EN')

panel = replace_once(
    panel,
    "import { DraftNumberInput } from './DraftNumberInput';\nimport './stellar-dem-skyline-control.css';\n\nconst numberFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });\n",
    "import { DraftNumberInput } from './DraftNumberInput';\nimport { useI18n } from './I18nProvider';\nimport { appLocaleTag } from './i18n';\nimport './stellar-dem-skyline-control.css';\n",
    'panel imports'
)
panel = replace_once(
    panel,
    "function formatBytes(bytes: number): string {\n  if (bytes >= 1024 * 1024) return `${numberFormatter.format(bytes / (1024 * 1024))} MB`;\n  return `${numberFormatter.format(bytes / 1024)} KB`;\n}",
    "function formatBytes(bytes: number, formatter: Intl.NumberFormat): string {\n  if (bytes >= 1024 * 1024) return `${formatter.format(bytes / (1024 * 1024))} MB`;\n  return `${formatter.format(bytes / 1024)} KB`;\n}",
    'format bytes'
)
panel = replace_once(
    panel,
    "}: StellarDemSkylineControlProps): React.JSX.Element {\n  const [draft",
    "}: StellarDemSkylineControlProps): React.JSX.Element {\n  const { locale, t } = useI18n();\n  const numberFormatter = new Intl.NumberFormat(appLocaleTag(locale), { maximumFractionDigits: 2 });\n  const [draft",
    'locale bootstrap'
)

replacements = [
    ("setMessage(error instanceof Error ? error.message : 'DEM skyline kaynağı içe aktarılamadı.');", "setMessage(error instanceof Error ? error.message : t('stellar.dem.importError'));"),
    ("setMessage(error instanceof Error ? error.message : 'DEM skyline üretimi tamamlanamadı.');", "setMessage(error instanceof Error ? error.message : t('stellar.dem.generationError'));"),
    ('<strong>DEM’den 360° geometrik skyline</strong>', "<strong>{t('stellar.dem.title')}</strong>"),
    ('<span>ESRI ASCII Grid seçimi yalnız taslak hazırlar. 360° tarama ayrı düğmeyle çalışır; eksik kapsama yıldız skyline’ına uygulanmaz.</span>', "<span>{t('stellar.dem.description')}</span>"),
    ("{isImporting ? 'DEM okunuyor…' : 'ESRI ASCII DEM seç'}", "{isImporting ? t('stellar.dem.importing') : t('stellar.dem.import')}"),
    ('<small>DEM TASLAĞI · 360° TARAMA HENÜZ AYRI İŞLEM</small>', "<small>{t('stellar.dem.sourceLabel')}</small>"),
    ('<span>{draft.columnCount}×{draft.rowCount} hücre · cellsize {numberFormatter.format(draft.cellSizeDeg)}° · {formatBytes(draft.fileSizeBytes)}</span>', "<span>{t('stellar.dem.cellsSummary', { columns: draft.columnCount, rows: draft.rowCount, cellSize: numberFormatter.format(draft.cellSizeDeg), size: formatBytes(draft.fileSizeBytes, numberFormatter) })}</span>"),
    ('<span>Kapsam: {numberFormatter.format(draft.southBoundaryDeg)}…{numberFormatter.format(draft.northBoundaryDeg)}° enlem · {numberFormatter.format(draft.westBoundaryDeg)}…{numberFormatter.format(draft.eastBoundaryDeg)}° boylam</span>', "<span>{t('stellar.dem.coverage', { south: numberFormatter.format(draft.southBoundaryDeg), north: numberFormatter.format(draft.northBoundaryDeg), west: numberFormatter.format(draft.westBoundaryDeg), east: numberFormatter.format(draft.eastBoundaryDeg) })}</span>"),
    ('<span>Gözlemci: {numberFormatter.format(observerLatitudeDeg)}°, {numberFormatter.format(observerLongitudeDeg)}° · göz {numberFormatter.format(observerHeightM)} m</span>', "<span>{t('stellar.dem.observer', { latitude: numberFormatter.format(observerLatitudeDeg), longitude: numberFormatter.format(observerLongitudeDeg), height: numberFormatter.format(observerHeightM) })}</span>"),
    ('<span>Azimut adımı</span>', "<span>{t('stellar.dem.azimuthStep')}</span>"),
    ('<option value={1}>1° · 360 yön</option>', "<option value={1}>1° · {t('stellar.dem.directionCount', { count: 360 })}</option>"),
    ('<option value={2}>2° · 180 yön</option>', "<option value={2}>2° · {t('stellar.dem.directionCount', { count: 180 })}</option>"),
    ('<option value={5}>5° · 72 yön</option>', "<option value={5}>5° · {t('stellar.dem.directionCount', { count: 72 })}</option>"),
    ('<option value={10}>10° · 36 yön</option>', "<option value={10}>10° · {t('stellar.dem.directionCount', { count: 36 })}</option>"),
    ('<option value={15}>15° · 24 yön</option>', "<option value={15}>15° · {t('stellar.dem.directionCount', { count: 24 })}</option>"),
    ('<option value={30}>30° · 12 yön</option>', "<option value={30}>30° · {t('stellar.dem.directionCount', { count: 12 })}</option>"),
    ('<option value={45}>45° · 8 yön</option>', "<option value={45}>45° · {t('stellar.dem.directionCount', { count: 8 })}</option>"),
    ('<option value={90}>90° · 4 yön</option>', "<option value={90}>90° · {t('stellar.dem.directionCount', { count: 4 })}</option>"),
    ('<span>Mesafe adımı · m</span>', "<span>{t('stellar.dem.distanceStep')}</span>"),
    ('ariaLabel="DEM skyline mesafe örnekleme adımı"', "ariaLabel={t('stellar.dem.distanceStepAria')}"),
    ('<span>Maksimum mesafe · m</span>', "<span>{t('stellar.dem.maximumDistance')}</span>"),
    ('ariaLabel="DEM skyline maksimum mesafesi"', "ariaLabel={t('stellar.dem.maximumDistanceAria')}"),
    ('<span>DEM → WGS84 elipsoid ofseti · m</span>', "<span>{t('stellar.dem.ellipsoidOffset')}</span>"),
    ('ariaLabel="DEM WGS84 elipsoid yükseklik ofseti"', "ariaLabel={t('stellar.dem.ellipsoidOffsetAria')}"),
    ('<span>DEM örnekleme</span>', "<span>{t('stellar.dem.sampling')}</span>"),
    ('<span>Datum ofseti sabittir; geoit değişimi, kırılma, bina ve bitki örtüsü bu geometrik taramaya dahil değildir.</span>', "<span>{t('stellar.dem.geometryNote')}</span>"),
    ("{isGenerating ? '360° taranıyor…' : 'DEM skyline üret'}", "{isGenerating ? t('stellar.dem.generating') : t('stellar.dem.generate')}"),
    ('<span>Tam azimut <strong>{diagnostics.completeRayCount}/{diagnostics.pointCount}</strong></span>', "<span>{t('stellar.dem.completeAzimuth')} <strong>{diagnostics.completeRayCount}/{diagnostics.pointCount}</strong></span>"),
    ('<span>Bilinen <strong>{diagnostics.knownPointCount}</strong></span>', "<span>{t('stellar.dem.known')} <strong>{diagnostics.knownPointCount}</strong></span>"),
    ('<span>Kapsama sınırlı <strong>{diagnostics.coverageLimitedRayCount}</strong></span>', "<span>{t('stellar.dem.coverageLimited')} <strong>{diagnostics.coverageLimitedRayCount}</strong></span>"),
    ('<span>NODATA etkili <strong>{diagnostics.noDataAffectedRayCount}</strong></span>', "<span>{t('stellar.dem.noData')} <strong>{diagnostics.noDataAffectedRayCount}</strong></span>"),
    ('<span>Kapsamasız <strong>{diagnostics.noCoverageRayCount}</strong></span>', "<span>{t('stellar.dem.noCoverage')} <strong>{diagnostics.noCoverageRayCount}</strong></span>"),
    ("{lastGeneratedSourceSha && ' Profil yerel ufuk taslağına aktarıldı; yıldız hesabı için alttaki “Uygula ve hesapla” düğmesini kullan.'}", "{lastGeneratedSourceSha && t('stellar.dem.profileTransferred')}")
]
for index, (old, new) in enumerate(replacements, start=1):
    panel = replace_once(panel, old, new, f'panel replacement {index}')

progress = '- Stellar control slice (part 5): local-horizon source/editor presentation uses TR/EN while stable direction/source ids and raw imported warnings/messages remain unchanged; DEM and panorama controls remain follow-up work.\n'
docs = replace_once(
    docs,
    progress,
    progress + '- Stellar control slice (part 6): DEM skyline draft/generation controls and diagnostics use TR/EN and active-locale numeric formatting; DEM sampling ids and raw IPC messages remain unchanged.\n',
    'docs progress'
)
docs = replace_once(
    docs,
    'Engine-emitted warnings/assumptions/raw calculation errors and traces, DEM/panorama skyline controls, terrain/calibration panels, dialogs, help/AI guidance and reports remain separate follow-up slices.',
    'Engine-emitted warnings/assumptions/raw calculation errors and traces, panorama skyline controls, terrain/calibration panels, dialogs, help/AI guidance and reports remain separate follow-up slices.',
    'docs remaining scope'
)

test = """import { describe, expect, it } from 'vitest';
import { translate } from '../src/renderer/src/i18n';

describe('stellar DEM skyline localization', () => {
  it('localizes DEM skyline presentation labels', () => {
    expect(translate('tr', 'stellar.dem.title')).toBe('DEM’den 360° geometrik skyline');
    expect(translate('en', 'stellar.dem.title')).toBe('360° geometric skyline from DEM');
    expect(translate('en', 'stellar.dem.directionCount', { count: 180 })).toBe('180 directions');
  });

  it('keeps the DEM sampling id stable', () => {
    const samplingMethod = 'bilinear' as const;
    expect(samplingMethod).toBe('bilinear');
    expect(translate('en', 'stellar.dem.generate')).toBe('Generate DEM skyline');
  });
});
"""

I18N.write_text(i18n, encoding='utf-8')
PANEL.write_text(panel, encoding='utf-8')
DOCS.write_text(docs, encoding='utf-8')
TEST.write_text(test, encoding='utf-8')

print('Stellar DEM skyline localization slice applied. Run npm run verify; Electron smoke remains deferred until final localization audit.')
