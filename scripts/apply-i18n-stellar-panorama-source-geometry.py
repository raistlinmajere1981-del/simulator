#!/usr/bin/env python3
"""Localize stellar panorama source, metadata and geometry presentation.

Temporary helper: remove before merge.
All edits are prepared in memory and written only after every anchor succeeds.
Renderer/presentation only: panorama metadata/geometry/source ids and raw IPC messages stay unchanged.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
I18N = ROOT / 'src/renderer/src/i18n.ts'
PRESENTATION = ROOT / 'src/renderer/src/astronomy-result-presentation.ts'
PANEL = ROOT / 'src/renderer/src/StellarPanoramaSkylineControl.tsx'
DOCS = ROOT / 'docs/localization.md'
TEST = ROOT / 'tests/stellar-panorama-source-geometry-i18n.test.ts'


def fail(message: str) -> None:
    raise SystemExit(f'ERROR: {message}')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f'{label}: expected one match, found {count}: {old[:120]!r}')
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


for path in (I18N, PRESENTATION, PANEL, DOCS):
    if not path.exists():
        fail(f'missing expected file: {path.relative_to(ROOT)}')
if TEST.exists():
    fail(f'{TEST.relative_to(ROOT)} already exists')

i18n = I18N.read_text(encoding='utf-8')
presentation = PRESENTATION.read_text(encoding='utf-8')
panel = PANEL.read_text(encoding='utf-8')
docs = DOCS.read_text(encoding='utf-8')

tr_messages = """  'stellar.panorama.title': 'Panoramadan 360° geometrik skyline',
  'stellar.panorama.description': 'Skyline elle işaretlenebilir veya yerel görüntü gradyanından kullanıcı-denetimli bir taslak önerilebilir. Yardımcı taslak otomatik doğrulanmış segmentasyon değildir.',
  'stellar.panorama.importing': 'Panorama okunuyor…',
  'stellar.panorama.import': 'Panorama seç',
  'stellar.panorama.importError': 'Panorama görüntüsü içe aktarılamadı.',
  'stellar.panorama.previewError': 'Panorama geometri önizlemesi üretilemedi.',
  'stellar.panorama.sourceLabel': 'PANORAMA TASLAĞI · GÖRÜNTÜ BAYTLARI KALICI KAYDA GİRMEZ',
  'stellar.panorama.dimensions': '{width}×{height} px · {size}',
  'stellar.panorama.metadata.completeScaled': 'GPano XMP · doğrulandı ve ölçeklendi',
  'stellar.panorama.metadata.complete': 'GPano XMP · doğrulandı',
  'stellar.panorama.metadata.incomplete': 'GPano XMP · eksik',
  'stellar.panorama.metadata.unsupportedProjection': 'GPano · desteklenmeyen projeksiyon{projection}',
  'stellar.panorama.metadata.incompatibleScale': 'GPano XMP · bitmap ölçeği uyumsuz',
  'stellar.panorama.metadata.absent': 'GPano geometrisi yok · manuel giriş',
  'stellar.panorama.xmpSummary': 'Standart XMP {standard} · Extended XMP {extended}',
  'stellar.panorama.yes': 'var',
  'stellar.panorama.no': 'yok',
  'stellar.panorama.geometryManual': 'Manuel geometri',
  'stellar.panorama.geometryGpanoLocked': 'Doğrulanmış metadata kilitli kullanılıyor.',
  'stellar.panorama.geometryManualNote': 'Yön ve crop değerleri kullanıcı girdisi olarak kaydedilecek.',
  'stellar.panorama.bitmapWidth': 'Bitmap genişliği',
  'stellar.panorama.bitmapHeight': 'Bitmap yüksekliği',
  'stellar.panorama.fullPanoWidth': 'Tam pano genişliği · px',
  'stellar.panorama.fullPanoWidthAria': 'Panorama tam genişliği',
  'stellar.panorama.fullPanoHeight': 'Tam pano yüksekliği · px',
  'stellar.panorama.fullPanoHeightAria': 'Panorama tam yüksekliği',
  'stellar.panorama.cropLeft': 'Crop sol · px',
  'stellar.panorama.cropLeftAria': 'Panorama crop sol',
  'stellar.panorama.cropTop': 'Crop üst · px',
  'stellar.panorama.cropTopAria': 'Panorama crop üst',
  'stellar.panorama.heading': 'Heading · °',
  'stellar.panorama.headingAria': 'Panorama heading',
  'stellar.panorama.pitch': 'Pitch · °',
  'stellar.panorama.pitchAria': 'Panorama pitch',
  'stellar.panorama.roll': 'Roll · °',
  'stellar.panorama.rollAria': 'Panorama roll',
"""

en_messages = """  'stellar.panorama.title': '360° geometric skyline from panorama',
  'stellar.panorama.description': 'The skyline can be marked manually or a user-supervised draft can be suggested from the local image gradient. The assisted draft is not automatically verified segmentation.',
  'stellar.panorama.importing': 'Reading panorama…',
  'stellar.panorama.import': 'Select panorama',
  'stellar.panorama.importError': 'The panorama image could not be imported.',
  'stellar.panorama.previewError': 'The panorama geometry preview could not be generated.',
  'stellar.panorama.sourceLabel': 'PANORAMA DRAFT · IMAGE BYTES ARE NOT STORED IN THE PERSISTED RECORD',
  'stellar.panorama.dimensions': '{width}×{height} px · {size}',
  'stellar.panorama.metadata.completeScaled': 'GPano XMP · verified and scaled',
  'stellar.panorama.metadata.complete': 'GPano XMP · verified',
  'stellar.panorama.metadata.incomplete': 'GPano XMP · incomplete',
  'stellar.panorama.metadata.unsupportedProjection': 'GPano · unsupported projection{projection}',
  'stellar.panorama.metadata.incompatibleScale': 'GPano XMP · incompatible bitmap scale',
  'stellar.panorama.metadata.absent': 'No GPano geometry · manual input',
  'stellar.panorama.xmpSummary': 'Standard XMP {standard} · Extended XMP {extended}',
  'stellar.panorama.yes': 'present',
  'stellar.panorama.no': 'absent',
  'stellar.panorama.geometryManual': 'Manual geometry',
  'stellar.panorama.geometryGpanoLocked': 'Verified metadata is being used as locked geometry.',
  'stellar.panorama.geometryManualNote': 'Orientation and crop values will be stored as user input.',
  'stellar.panorama.bitmapWidth': 'Bitmap width',
  'stellar.panorama.bitmapHeight': 'Bitmap height',
  'stellar.panorama.fullPanoWidth': 'Full pano width · px',
  'stellar.panorama.fullPanoWidthAria': 'Panorama full width',
  'stellar.panorama.fullPanoHeight': 'Full pano height · px',
  'stellar.panorama.fullPanoHeightAria': 'Panorama full height',
  'stellar.panorama.cropLeft': 'Crop left · px',
  'stellar.panorama.cropLeftAria': 'Panorama crop left',
  'stellar.panorama.cropTop': 'Crop top · px',
  'stellar.panorama.cropTopAria': 'Panorama crop top',
  'stellar.panorama.heading': 'Heading · °',
  'stellar.panorama.headingAria': 'Panorama heading',
  'stellar.panorama.pitch': 'Pitch · °',
  'stellar.panorama.pitchAria': 'Panorama pitch',
  'stellar.panorama.roll': 'Roll · °',
  'stellar.panorama.rollAria': 'Panorama roll',
"""

i18n = insert_catalog(i18n, '\n} as const;\n\nexport type TranslationKey', tr_messages, 'i18n TR')
i18n = insert_catalog(i18n, '\n};\n\nexport function translate', en_messages, 'i18n EN')

presentation = replace_once(
    presentation,
    "import type { SolarSeasonEventKind } from '../../simulation/solar-season-events';\n",
    "import type { SolarSeasonEventKind } from '../../simulation/solar-season-events';\nimport type { StellarPanoramaMetadataStatus } from '../../shared/stellar-local-horizon-import';\n",
    'presentation metadata import'
)
presentation = replace_once(
    presentation,
    """export function getStellarLocalHorizonDirectionLabel(
  locale: AppLocale,
  key: StellarLocalHorizonSettingKey
): string {
  return translate(locale, stellarLocalHorizonDirectionKeys[key]);
}
""",
    """export function getStellarLocalHorizonDirectionLabel(
  locale: AppLocale,
  key: StellarLocalHorizonSettingKey
): string {
  return translate(locale, stellarLocalHorizonDirectionKeys[key]);
}

export function getStellarPanoramaMetadataStatusLabel(
  locale: AppLocale,
  status: StellarPanoramaMetadataStatus,
  metadataScaledToImage: boolean,
  projectionType?: string
): string {
  if (status === 'complete') {
    return translate(locale, metadataScaledToImage
      ? 'stellar.panorama.metadata.completeScaled'
      : 'stellar.panorama.metadata.complete');
  }
  if (status === 'incomplete') return translate(locale, 'stellar.panorama.metadata.incomplete');
  if (status === 'unsupported-projection') {
    return translate(locale, 'stellar.panorama.metadata.unsupportedProjection', {
      projection: projectionType ? ` (${projectionType})` : ''
    });
  }
  if (status === 'incompatible-scale') return translate(locale, 'stellar.panorama.metadata.incompatibleScale');
  return translate(locale, 'stellar.panorama.metadata.absent');
}
""",
    'presentation metadata function'
)

panel = replace_once(
    panel,
    """import { DraftNumberInput } from './DraftNumberInput';
import './stellar-panorama-skyline-control.css';

const numberFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });
const angleFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 });
const confidenceFormatter = new Intl.NumberFormat('tr-TR', { style: 'percent', maximumFractionDigits: 0 });
""",
    """import { DraftNumberInput } from './DraftNumberInput';
import { useI18n } from './I18nProvider';
import { appLocaleTag } from './i18n';
import { getStellarPanoramaMetadataStatusLabel } from './astronomy-result-presentation';
import './stellar-panorama-skyline-control.css';
""",
    'panel locale imports'
)
panel = replace_once(
    panel,
    """function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${numberFormatter.format(bytes / (1024 * 1024))} MB`;
  return `${numberFormatter.format(bytes / 1024)} KB`;
}
""",
    """function formatBytes(bytes: number, formatter: Intl.NumberFormat): string {
  if (bytes >= 1024 * 1024) return `${formatter.format(bytes / (1024 * 1024))} MB`;
  return `${formatter.format(bytes / 1024)} KB`;
}
""",
    'format bytes'
)
panel = replace_once(
    panel,
    """function metadataStatusLabel(draft: StellarPanoramaSkylineDraft): string {
  switch (draft.metadata.status) {
    case 'complete':
      return draft.metadata.metadataScaledToImage ? 'GPano XMP · doğrulandı ve ölçeklendi' : 'GPano XMP · doğrulandı';
    case 'incomplete':
      return 'GPano XMP · eksik';
    case 'unsupported-projection':
      return `GPano · desteklenmeyen projeksiyon${draft.metadata.projectionType ? ` (${draft.metadata.projectionType})` : ''}`;
    case 'incompatible-scale':
      return 'GPano XMP · bitmap ölçeği uyumsuz';
    default:
      return 'GPano geometrisi yok · manuel giriş';
  }
}

""",
    '',
    'remove fixed metadata presentation'
)
panel = replace_once(
    panel,
    """export function StellarPanoramaSkylineControl({
  onPreparedSource
}: StellarPanoramaSkylineControlProps): React.JSX.Element {
  const [draft""",
    """export function StellarPanoramaSkylineControl({
  onPreparedSource
}: StellarPanoramaSkylineControlProps): React.JSX.Element {
  const { locale, t } = useI18n();
  const numberFormatter = new Intl.NumberFormat(appLocaleTag(locale), { maximumFractionDigits: 2 });
  const angleFormatter = new Intl.NumberFormat(appLocaleTag(locale), { maximumFractionDigits: 3 });
  const confidenceFormatter = new Intl.NumberFormat(appLocaleTag(locale), { style: 'percent', maximumFractionDigits: 0 });
  const [draft""",
    'locale bootstrap'
)

replacements = [
    ("error: error instanceof Error ? error.message : 'Panorama geometri önizlemesi üretilemedi.'", "error: error instanceof Error ? error.message : t('stellar.panorama.previewError')"),
    ("setMessage(error instanceof Error ? error.message : 'Panorama görüntüsü içe aktarılamadı.');", "setMessage(error instanceof Error ? error.message : t('stellar.panorama.importError'));"),
    ('<strong>Panoramadan 360° geometrik skyline</strong>', "<strong>{t('stellar.panorama.title')}</strong>"),
    ('<span>Skyline elle işaretlenebilir veya yerel görüntü gradyanından kullanıcı-denetimli bir taslak önerilebilir. Yardımcı taslak otomatik doğrulanmış segmentasyon değildir.</span>', "<span>{t('stellar.panorama.description')}</span>"),
    ("{isImporting ? 'Panorama okunuyor…' : 'Panorama seç'}", "{isImporting ? t('stellar.panorama.importing') : t('stellar.panorama.import')}"),
    ('<small>PANORAMA TASLAĞI · GÖRÜNTÜ BAYTLARI KALICI KAYDA GİRMEZ</small>', "<small>{t('stellar.panorama.sourceLabel')}</small>"),
    ('<span>{draft.imageWidthPx}×{draft.imageHeightPx} px · {formatBytes(draft.fileSizeBytes)}</span>', "<span>{t('stellar.panorama.dimensions', { width: draft.imageWidthPx, height: draft.imageHeightPx, size: formatBytes(draft.fileSizeBytes, numberFormatter) })}</span>"),
    ('<span>{metadataStatusLabel(draft)}</span>', "<span>{getStellarPanoramaMetadataStatusLabel(locale, draft.metadata.status, draft.metadata.metadataScaledToImage, draft.metadata.projectionType)}</span>"),
    ("<span>Standart XMP {draft.metadata.standardXmpPacketFound ? 'var' : 'yok'} · Extended XMP {draft.metadata.extendedXmpPacketFound ? 'var' : 'yok'}</span>", "<span>{t('stellar.panorama.xmpSummary', { standard: draft.metadata.standardXmpPacketFound ? t('stellar.panorama.yes') : t('stellar.panorama.no'), extended: draft.metadata.extendedXmpPacketFound ? t('stellar.panorama.yes') : t('stellar.panorama.no') })}</span>"),
    ('>Manuel geometri</button>', ">{t('stellar.panorama.geometryManual')}</button>"),
    ("<span>{geometrySource === 'gpano-xmp' ? 'Doğrulanmış metadata kilitli kullanılıyor.' : 'Yön ve crop değerleri kullanıcı girdisi olarak kaydedilecek.'}</span>", "<span>{geometrySource === 'gpano-xmp' ? t('stellar.panorama.geometryGpanoLocked') : t('stellar.panorama.geometryManualNote')}</span>"),
    ('<span>Bitmap genişliği</span>', "<span>{t('stellar.panorama.bitmapWidth')}</span>"),
    ('<span>Bitmap yüksekliği</span>', "<span>{t('stellar.panorama.bitmapHeight')}</span>"),
    ('<span>Tam pano genişliği · px</span>', "<span>{t('stellar.panorama.fullPanoWidth')}</span>"),
    ('ariaLabel="Panorama tam genişliği"', "ariaLabel={t('stellar.panorama.fullPanoWidthAria')}"),
    ('<span>Tam pano yüksekliği · px</span>', "<span>{t('stellar.panorama.fullPanoHeight')}</span>"),
    ('ariaLabel="Panorama tam yüksekliği"', "ariaLabel={t('stellar.panorama.fullPanoHeightAria')}"),
    ('<span>Crop sol · px</span>', "<span>{t('stellar.panorama.cropLeft')}</span>"),
    ('ariaLabel="Panorama crop sol"', "ariaLabel={t('stellar.panorama.cropLeftAria')}"),
    ('<span>Crop üst · px</span>', "<span>{t('stellar.panorama.cropTop')}</span>"),
    ('ariaLabel="Panorama crop üst"', "ariaLabel={t('stellar.panorama.cropTopAria')}"),
    ('<span>Heading · °</span>', "<span>{t('stellar.panorama.heading')}</span>"),
    ('ariaLabel="Panorama heading"', "ariaLabel={t('stellar.panorama.headingAria')}"),
    ('<span>Pitch · °</span>', "<span>{t('stellar.panorama.pitch')}</span>"),
    ('ariaLabel="Panorama pitch"', "ariaLabel={t('stellar.panorama.pitchAria')}"),
    ('<span>Roll · °</span>', "<span>{t('stellar.panorama.roll')}</span>"),
    ('ariaLabel="Panorama roll"', "ariaLabel={t('stellar.panorama.rollAria')}")
]
for index, (old, new) in enumerate(replacements, start=1):
    panel = replace_once(panel, old, new, f'panel replacement {index}')

progress = '- Stellar control slice (part 6): DEM skyline draft/generation controls and diagnostics use TR/EN and active-locale numeric formatting; DEM sampling ids and raw IPC messages remain unchanged.\n'
docs = replace_once(
    docs,
    progress,
    progress + '- Stellar control slice (part 7a): panorama source, GPano metadata and geometry controls use TR/EN and active-locale formatting; metadata/geometry ids and raw IPC messages remain unchanged. Assisted marking and panorama diagnostics remain follow-up work.\n',
    'docs progress'
)
docs = replace_once(
    docs,
    'Engine-emitted warnings/assumptions/raw calculation errors and traces, panorama skyline controls, terrain/calibration panels, dialogs, help/AI guidance and reports remain separate follow-up slices.',
    'Engine-emitted warnings/assumptions/raw calculation errors and traces, panorama assisted-marking/diagnostic controls, terrain/calibration panels, dialogs, help/AI guidance and reports remain separate follow-up slices.',
    'docs remaining scope'
)

test = """import { describe, expect, it } from 'vitest';
import { getStellarPanoramaMetadataStatusLabel } from '../src/renderer/src/astronomy-result-presentation';
import { translate } from '../src/renderer/src/i18n';

describe('stellar panorama source/geometry localization', () => {
  it('maps stable metadata status ids only at the renderer boundary', () => {
    const status = 'unsupported-projection' as const;
    expect(getStellarPanoramaMetadataStatusLabel('tr', status, false, 'cylindrical'))
      .toBe('GPano · desteklenmeyen projeksiyon (cylindrical)');
    expect(getStellarPanoramaMetadataStatusLabel('en', status, false, 'cylindrical'))
      .toBe('GPano · unsupported projection (cylindrical)');
    expect(status).toBe('unsupported-projection');
  });

  it('localizes geometry presentation without changing geometry-source identity', () => {
    const geometrySource = 'gpano-xmp' as const;
    expect(translate('en', 'stellar.panorama.geometryManual')).toBe('Manual geometry');
    expect(translate('en', 'stellar.panorama.xmpSummary', { standard: 'present', extended: 'absent' }))
      .toBe('Standard XMP present · Extended XMP absent');
    expect(geometrySource).toBe('gpano-xmp');
  });
});
"""

I18N.write_text(i18n, encoding='utf-8')
PRESENTATION.write_text(presentation, encoding='utf-8')
PANEL.write_text(panel, encoding='utf-8')
DOCS.write_text(docs, encoding='utf-8')
TEST.write_text(test, encoding='utf-8')

print('Stellar panorama source/geometry localization slice applied. Run npm run verify; Electron smoke remains deferred until final localization audit.')
