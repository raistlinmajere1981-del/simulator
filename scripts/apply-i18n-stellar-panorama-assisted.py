#!/usr/bin/env python3
"""Localize panorama assisted-marking and diagnostic presentation.

Temporary helper: remove before merge.
All edits are prepared in memory and written only after every anchor succeeds.
Renderer/presentation only: marking-method ids, panorama geometry/source ids and raw warnings stay unchanged.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
I18N = ROOT / 'src/renderer/src/i18n.ts'
PRESENTATION = ROOT / 'src/renderer/src/astronomy-result-presentation.ts'
PANEL = ROOT / 'src/renderer/src/StellarPanoramaSkylineControl.tsx'
DOCS = ROOT / 'docs/localization.md'
TEST = ROOT / 'tests/stellar-panorama-assisted-i18n.test.ts'


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

tr_messages = """  'stellar.panorama.marking.manual': 'Manuel işaretleme',
  'stellar.panorama.marking.assisted': 'Yardımcı gradyan taslağı · kullanıcı kabul etti',
  'stellar.panorama.marking.assistedEdited': 'Yardımcı gradyan taslağı · elle düzenlendi',
  'stellar.panorama.assist.bitmapOpenError': 'Panorama yardımcı taslak için bitmap olarak açılamadı.',
  'stellar.panorama.assist.canvasError': 'Panorama yardımcı taslak için Canvas 2D bağlamı açılamadı.',
  'stellar.panorama.assist.generated': 'Yardımcı skyline taslağı üretildi ({count} nokta · güven {confidence}). Hesaba girmeden önce çizgiyi kontrol edip açıkça kabul et.',
  'stellar.panorama.assist.generationError': 'Panorama yardımcı skyline taslağı üretilemedi.',
  'stellar.panorama.assist.accepted': 'Yardımcı skyline taslağı işaretlere aktarıldı. Noktaları silebilir veya elle yeni noktalar ekleyebilirsin; böyle bir değişiklik provenansta ayrıca işaretlenir.',
  'stellar.panorama.assist.help': 'Elle noktalayabilir veya “Skyline taslağı öner” ile yalnız editör içinde çalışan gradyan yardımcısını kullanabilirsin. Öneri kendiliğinden kaynak veya hesap sonucu olmaz.',
  'stellar.panorama.assist.suggesting': 'Taslak aranıyor…',
  'stellar.panorama.assist.suggest': 'Skyline taslağı öner',
  'stellar.panorama.assist.accept': 'Taslağı işaretlere aktar',
  'stellar.panorama.assist.discard': 'Taslağı at',
  'stellar.panorama.assist.discarded': 'Yardımcı skyline taslağı atıldı; mevcut işaretler değiştirilmedi.',
  'stellar.panorama.assist.undoLast': 'Son noktayı geri al',
  'stellar.panorama.assist.clear': 'Temizle',
  'stellar.panorama.assist.pending': 'Yardımcı taslak · henüz uygulanmadı',
  'stellar.panorama.assist.summary': '{count} nokta · güven göstergesi {confidence} · gradient-dp v{version}',
  'stellar.panorama.assist.reviewWarning': 'Çizgiyi özellikle ağaç, bina, bulut ve 0°/360° seam çevresinde kontrol et. Güven göstergesi bilimsel doğruluk olasılığı değildir.',
  'stellar.panorama.imageAlt': 'Skyline noktaları işaretlenecek panorama',
  'stellar.panorama.markAria': 'Skyline noktası {index}',
  'stellar.panorama.markTitleInvalid': 'Nokta {index}',
  'stellar.panorama.markTitle': 'Nokta {index} · A {azimuth}° · h {altitude}°',
  'stellar.panorama.diagnostics.points': 'Nokta',
  'stellar.panorama.diagnostics.markSource': 'İşaret kaynağı',
  'stellar.panorama.diagnostics.horizontalCoverage': 'Yatay kapsam',
  'stellar.panorama.diagnostics.verticalCoverage': 'Düşey kapsam',
  'stellar.panorama.diagnostics.maximumGap': 'En büyük azimut boşluğu',
  'stellar.panorama.invalidGeometry': 'geometri geçersiz',
  'stellar.panorama.needCoverage': '360° yatay panorama kapsamı gerekir.',
  'stellar.panorama.needMarks': 'En az 8 skyline noktası gerekir.',
  'stellar.panorama.needGap': 'Azimut işaretleri arasındaki boşluk 90°’yi aşamaz.',
  'stellar.panorama.ready': 'Kaynak taslağı hazırlanabilir; yıldız hesabı ayrıca uygulanacaktır.',
  'stellar.panorama.prepare': 'Panorama skyline hazırla',
  'stellar.panorama.prepared': '“{fileName}” panorama skyline taslağı hazırlandı.',
  'stellar.panorama.prepareError': 'Panorama skyline kaynağı hazırlanamadı.',
  'stellar.panorama.profileTransferred': ' Profil yerel ufuk taslağına aktarıldı; yıldız hesabı için alttaki “Uygula ve hesapla” düğmesini kullan.',
"""

en_messages = """  'stellar.panorama.marking.manual': 'Manual marking',
  'stellar.panorama.marking.assisted': 'Assisted gradient draft · accepted by user',
  'stellar.panorama.marking.assistedEdited': 'Assisted gradient draft · manually edited',
  'stellar.panorama.assist.bitmapOpenError': 'The panorama could not be opened as a bitmap for the assisted draft.',
  'stellar.panorama.assist.canvasError': 'A Canvas 2D context could not be opened for the panorama assisted draft.',
  'stellar.panorama.assist.generated': 'Assisted skyline draft generated ({count} points · confidence {confidence}). Inspect the line and explicitly accept it before it can enter the calculation.',
  'stellar.panorama.assist.generationError': 'The panorama assisted skyline draft could not be generated.',
  'stellar.panorama.assist.accepted': 'The assisted skyline draft was transferred to the marks. You can delete points or add new ones manually; such edits are recorded separately in provenance.',
  'stellar.panorama.assist.help': 'You can mark points manually or use “Suggest skyline draft” to run the gradient helper only inside the editor. A suggestion does not become a source or calculation result on its own.',
  'stellar.panorama.assist.suggesting': 'Searching for draft…',
  'stellar.panorama.assist.suggest': 'Suggest skyline draft',
  'stellar.panorama.assist.accept': 'Transfer draft to marks',
  'stellar.panorama.assist.discard': 'Discard draft',
  'stellar.panorama.assist.discarded': 'The assisted skyline draft was discarded; existing marks were not changed.',
  'stellar.panorama.assist.undoLast': 'Undo last point',
  'stellar.panorama.assist.clear': 'Clear',
  'stellar.panorama.assist.pending': 'Assisted draft · not applied yet',
  'stellar.panorama.assist.summary': '{count} points · confidence indicator {confidence} · gradient-dp v{version}',
  'stellar.panorama.assist.reviewWarning': 'Inspect the line especially around trees, buildings, clouds and the 0°/360° seam. The confidence indicator is not a probability of scientific correctness.',
  'stellar.panorama.imageAlt': 'Panorama for marking skyline points',
  'stellar.panorama.markAria': 'Skyline point {index}',
  'stellar.panorama.markTitleInvalid': 'Point {index}',
  'stellar.panorama.markTitle': 'Point {index} · A {azimuth}° · h {altitude}°',
  'stellar.panorama.diagnostics.points': 'Points',
  'stellar.panorama.diagnostics.markSource': 'Mark source',
  'stellar.panorama.diagnostics.horizontalCoverage': 'Horizontal coverage',
  'stellar.panorama.diagnostics.verticalCoverage': 'Vertical coverage',
  'stellar.panorama.diagnostics.maximumGap': 'Maximum azimuth gap',
  'stellar.panorama.invalidGeometry': 'invalid geometry',
  'stellar.panorama.needCoverage': '360° horizontal panorama coverage is required.',
  'stellar.panorama.needMarks': 'At least 8 skyline points are required.',
  'stellar.panorama.needGap': 'The gap between azimuth marks cannot exceed 90°.',
  'stellar.panorama.ready': 'The source draft can be prepared; the stellar calculation is applied separately.',
  'stellar.panorama.prepare': 'Prepare panorama skyline',
  'stellar.panorama.prepared': 'The panorama skyline draft “{fileName}” is ready.',
  'stellar.panorama.prepareError': 'The panorama skyline source could not be prepared.',
  'stellar.panorama.profileTransferred': ' The profile was transferred to the local-horizon draft; use “Apply and calculate” below for the stellar calculation.',
"""

i18n = insert_catalog(i18n, '\n} as const;\n\nexport type TranslationKey', tr_messages, 'i18n TR')
i18n = insert_catalog(i18n, '\n};\n\nexport function translate', en_messages, 'i18n EN')

presentation = replace_once(
    presentation,
    "import type { StellarPanoramaMetadataStatus } from '../../shared/stellar-local-horizon-import';",
    "import type { StellarPanoramaMarkingMethod, StellarPanoramaMetadataStatus } from '../../shared/stellar-local-horizon-import';",
    'presentation panorama import'
)
presentation = replace_once(
    presentation,
    """export function getStellarPanoramaMetadataStatusLabel(
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
    """export function getStellarPanoramaMetadataStatusLabel(
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

const stellarPanoramaMarkingMethodKeys: Record<StellarPanoramaMarkingMethod, TranslationKey> = {
  manual: 'stellar.panorama.marking.manual',
  'assisted-gradient-v1': 'stellar.panorama.marking.assisted',
  'assisted-gradient-v1-edited': 'stellar.panorama.marking.assistedEdited'
};

export function getStellarPanoramaMarkingMethodLabel(
  locale: AppLocale,
  method: StellarPanoramaMarkingMethod
): string {
  return translate(locale, stellarPanoramaMarkingMethodKeys[method]);
}
""",
    'presentation marking map'
)

panel = replace_once(
    panel,
    "import { appLocaleTag } from './i18n';",
    "import { appLocaleTag, translate, type AppLocale } from './i18n';",
    'panel i18n import'
)
panel = replace_once(
    panel,
    "import { getStellarPanoramaMetadataStatusLabel } from './astronomy-result-presentation';",
    "import { getStellarPanoramaMarkingMethodLabel, getStellarPanoramaMetadataStatusLabel } from './astronomy-result-presentation';",
    'panel presentation import'
)
panel = replace_once(
    panel,
    """function markingMethodLabel(method: StellarPanoramaMarkingMethod): string {
  if (method === 'assisted-gradient-v1') return 'Yardımcı gradyan taslağı · kullanıcı kabul etti';
  if (method === 'assisted-gradient-v1-edited') return 'Yardımcı gradyan taslağı · elle düzenlendi';
  return 'Manuel işaretleme';
}

""",
    '',
    'remove fixed marking presentation'
)
panel = replace_once(
    panel,
    "async function createAssistedDraft(draft: StellarPanoramaSkylineDraft): Promise<AssistedSkylineDraft> {",
    "async function createAssistedDraft(draft: StellarPanoramaSkylineDraft, locale: AppLocale): Promise<AssistedSkylineDraft> {",
    'assist locale argument'
)
panel = replace_once(
    panel,
    "image.onerror = () => reject(new Error('Panorama yardımcı taslak için bitmap olarak açılamadı.'));",
    "image.onerror = () => reject(new Error(translate(locale, 'stellar.panorama.assist.bitmapOpenError')));",
    'assist bitmap error'
)
panel = replace_once(
    panel,
    "if (!context) throw new Error('Panorama yardımcı taslak için Canvas 2D bağlamı açılamadı.');",
    "if (!context) throw new Error(translate(locale, 'stellar.panorama.assist.canvasError'));",
    'assist canvas error'
)
panel = replace_once(
    panel,
    "}, [draft, geometry, marks]);",
    "}, [draft, geometry, marks, t]);",
    'preview locale dependency'
)

replacements = [
    ("const suggestion = await createAssistedDraft(draft);", "const suggestion = await createAssistedDraft(draft, locale);"),
    ("setMessage(`Yardımcı skyline taslağı üretildi (${suggestion.marks.length} nokta · güven ${confidenceFormatter.format(suggestion.confidence)}). Hesaba girmeden önce çizgiyi kontrol edip açıkça kabul et.`);", "setMessage(t('stellar.panorama.assist.generated', { count: suggestion.marks.length, confidence: confidenceFormatter.format(suggestion.confidence) }));"),
    ("setMessage(error instanceof Error ? error.message : 'Panorama yardımcı skyline taslağı üretilemedi.');", "setMessage(error instanceof Error ? error.message : t('stellar.panorama.assist.generationError'));"),
    ("setMessage('Yardımcı skyline taslağı işaretlere aktarıldı. Noktaları silebilir veya elle yeni noktalar ekleyebilirsin; böyle bir değişiklik provenansta ayrıca işaretlenir.');", "setMessage(t('stellar.panorama.assist.accepted'));"),
    ("setMessage(`“${source.fileName}” panorama skyline taslağı hazırlandı.`);", "setMessage(t('stellar.panorama.prepared', { fileName: source.fileName }));"),
    ("setMessage(error instanceof Error ? error.message : 'Panorama skyline kaynağı hazırlanamadı.');", "setMessage(error instanceof Error ? error.message : t('stellar.panorama.prepareError'));"),
    ('<span>Elle noktalayabilir veya “Skyline taslağı öner” ile yalnız editör içinde çalışan gradyan yardımcısını kullanabilirsin. Öneri kendiliğinden kaynak veya hesap sonucu olmaz.</span>', "<span>{t('stellar.panorama.assist.help')}</span>"),
    ("<button type=\"button\" disabled={isSuggesting} onClick={() => void suggestDraft()}>{isSuggesting ? 'Taslak aranıyor…' : 'Skyline taslağı öner'}</button>", "<button type=\"button\" disabled={isSuggesting} onClick={() => void suggestDraft()}>{isSuggesting ? t('stellar.panorama.assist.suggesting') : t('stellar.panorama.assist.suggest')}</button>"),
    ('{assistedDraft && <button type="button" className="assist-accept" onClick={acceptAssistedDraft}>Taslağı işaretlere aktar</button>}', "{assistedDraft && <button type=\"button\" className=\"assist-accept\" onClick={acceptAssistedDraft}>{t('stellar.panorama.assist.accept')}</button>}"),
    ("{assistedDraft && <button type=\"button\" onClick={() => { setAssistedDraft(undefined); setMessage('Yardımcı skyline taslağı atıldı; mevcut işaretler değiştirilmedi.'); }}>Taslağı at</button>}", "{assistedDraft && <button type=\"button\" onClick={() => { setAssistedDraft(undefined); setMessage(t('stellar.panorama.assist.discarded')); }}>{t('stellar.panorama.assist.discard')}</button>}"),
    ('<button type="button" disabled={marks.length === 0} onClick={() => { setMarks((current) => current.slice(0, -1)); markEdited(); }}>Son noktayı geri al</button>', "<button type=\"button\" disabled={marks.length === 0} onClick={() => { setMarks((current) => current.slice(0, -1)); markEdited(); }}>{t('stellar.panorama.assist.undoLast')}</button>"),
    ('<button type="button" disabled={marks.length === 0} onClick={() => { setMarks([]); markEdited(); }}>Temizle</button>', "<button type=\"button\" disabled={marks.length === 0} onClick={() => { setMarks([]); markEdited(); }}>{t('stellar.panorama.assist.clear')}</button>"),
    ('<strong>Yardımcı taslak · henüz uygulanmadı</strong>', "<strong>{t('stellar.panorama.assist.pending')}</strong>"),
    ('<span>{assistedDraft.marks.length} nokta · güven göstergesi {confidenceFormatter.format(assistedDraft.confidence)} · gradient-dp v{assistedDraft.algorithmVersion}</span>', "<span>{t('stellar.panorama.assist.summary', { count: assistedDraft.marks.length, confidence: confidenceFormatter.format(assistedDraft.confidence), version: assistedDraft.algorithmVersion })}</span>"),
    ('<span>Çizgiyi özellikle ağaç, bina, bulut ve 0°/360° seam çevresinde kontrol et. Güven göstergesi bilimsel doğruluk olasılığı değildir.</span>', "<span>{t('stellar.panorama.assist.reviewWarning')}</span>"),
    ('<img src={draft.dataUrl} alt="Skyline noktaları işaretlenecek panorama" draggable={false} onClick={addMark} />', "<img src={draft.dataUrl} alt={t('stellar.panorama.imageAlt')} draggable={false} onClick={addMark} />"),
    ('aria-label={`Skyline noktası ${index + 1}`}', "aria-label={t('stellar.panorama.markAria', { index: index + 1 })}"),
    ("? `Nokta ${index + 1}`\n                    : `Nokta ${index + 1} · A ${angleFormatter.format(mark.azimuthDeg)}° · h ${angleFormatter.format(mark.altitudeDeg ?? 0)}°`", "? t('stellar.panorama.markTitleInvalid', { index: index + 1 })\n                    : t('stellar.panorama.markTitle', { index: index + 1, azimuth: angleFormatter.format(mark.azimuthDeg), altitude: angleFormatter.format(mark.altitudeDeg ?? 0) })"),
    ('<span>Nokta <strong>{marks.length}</strong>/8+</span>', "<span>{t('stellar.panorama.diagnostics.points')} <strong>{marks.length}</strong>/8+</span>"),
    ('<span>İşaret kaynağı <strong>{markingMethodLabel(markingMethod)}</strong></span>', "<span>{t('stellar.panorama.diagnostics.markSource')} <strong>{getStellarPanoramaMarkingMethodLabel(locale, markingMethod)}</strong></span>"),
    ('<span>Yatay kapsam <strong>{preview?.horizontalCoverageDeg === null || preview?.horizontalCoverageDeg === undefined ? \'—\' : `${angleFormatter.format(preview.horizontalCoverageDeg)}°`}</strong></span>', "<span>{t('stellar.panorama.diagnostics.horizontalCoverage')} <strong>{preview?.horizontalCoverageDeg === null || preview?.horizontalCoverageDeg === undefined ? '—' : `${angleFormatter.format(preview.horizontalCoverageDeg)}°`}</strong></span>"),
    ('<span>Düşey kapsam <strong>{preview?.verticalCoverageDeg === null || preview?.verticalCoverageDeg === undefined ? \'—\' : `${angleFormatter.format(preview.verticalCoverageDeg)}°`}</strong></span>', "<span>{t('stellar.panorama.diagnostics.verticalCoverage')} <strong>{preview?.verticalCoverageDeg === null || preview?.verticalCoverageDeg === undefined ? '—' : `${angleFormatter.format(preview.verticalCoverageDeg)}°`}</strong></span>"),
    ('<span>En büyük azimut boşluğu <strong>{preview?.maximumGapDeg === null || preview?.maximumGapDeg === undefined ? \'—\' : `${angleFormatter.format(preview.maximumGapDeg)}°`}</strong></span>', "<span>{t('stellar.panorama.diagnostics.maximumGap')} <strong>{preview?.maximumGapDeg === null || preview?.maximumGapDeg === undefined ? '—' : `${angleFormatter.format(preview.maximumGapDeg)}°`}</strong></span>"),
    ("{mark.azimuthDeg === null ? 'geometri geçersiz' : `A ${angleFormatter.format(mark.azimuthDeg)}° · h ${angleFormatter.format(mark.altitudeDeg ?? 0)}°`}", "{mark.azimuthDeg === null ? t('stellar.panorama.invalidGeometry') : `A ${angleFormatter.format(mark.azimuthDeg)}° · h ${angleFormatter.format(mark.altitudeDeg ?? 0)}°`}"),
    ("<span>{preview?.error || (!coverageReady ? '360° yatay panorama kapsamı gerekir.' : !marksReady ? 'En az 8 skyline noktası gerekir.' : !gapReady ? 'Azimut işaretleri arasındaki boşluk 90°’yi aşamaz.' : 'Kaynak taslağı hazırlanabilir; yıldız hesabı ayrıca uygulanacaktır.')}</span>", "<span>{preview?.error || (!coverageReady ? t('stellar.panorama.needCoverage') : !marksReady ? t('stellar.panorama.needMarks') : !gapReady ? t('stellar.panorama.needGap') : t('stellar.panorama.ready'))}</span>"),
    ('<button type="button" disabled={!canPrepare} onClick={prepare}>Panorama skyline hazırla</button>', "<button type=\"button\" disabled={!canPrepare} onClick={prepare}>{t('stellar.panorama.prepare')}</button>"),
    ("{message}{preparedSha ? ' Profil yerel ufuk taslağına aktarıldı; yıldız hesabı için alttaki “Uygula ve hesapla” düğmesini kullan.' : ''}", "{message}{preparedSha ? t('stellar.panorama.profileTransferred') : ''}")
]
for index, (old, new) in enumerate(replacements, start=1):
    panel = replace_once(panel, old, new, f'panel replacement {index}')

progress = '- Stellar control slice (part 7a): panorama source, GPano metadata and geometry controls use TR/EN and active-locale formatting; metadata/geometry ids and raw IPC messages remain unchanged. Assisted marking and panorama diagnostics remain follow-up work.\n'
docs = replace_once(
    docs,
    progress,
    progress + '- Stellar control slice (part 7b): panorama assisted-marking actions, marking-method presentation, mark accessibility/readout, readiness diagnostics and prepared-source messages use TR/EN; stable marking ids and raw imported/algorithm warnings remain unchanged.\n',
    'docs progress'
)
docs = replace_once(
    docs,
    'Engine-emitted warnings/assumptions/raw calculation errors and traces, panorama assisted-marking/diagnostic controls, terrain/calibration panels, dialogs, help/AI guidance and reports remain separate follow-up slices.',
    'Engine-emitted warnings/assumptions/raw calculation errors and traces, terrain/calibration panels, dialogs, help/AI guidance and reports remain separate follow-up slices.',
    'docs remaining scope'
)

test = """import { describe, expect, it } from 'vitest';
import { getStellarPanoramaMarkingMethodLabel } from '../src/renderer/src/astronomy-result-presentation';
import { translate } from '../src/renderer/src/i18n';

describe('stellar panorama assisted-marking localization', () => {
  it('maps stable marking-method ids only at the renderer boundary', () => {
    const method = 'assisted-gradient-v1-edited' as const;
    expect(getStellarPanoramaMarkingMethodLabel('tr', method)).toBe('Yardımcı gradyan taslağı · elle düzenlendi');
    expect(getStellarPanoramaMarkingMethodLabel('en', method)).toBe('Assisted gradient draft · manually edited');
    expect(method).toBe('assisted-gradient-v1-edited');
  });

  it('localizes assisted-draft and readiness presentation', () => {
    expect(translate('en', 'stellar.panorama.assist.generated', { count: 72, confidence: '83%' }))
      .toBe('Assisted skyline draft generated (72 points · confidence 83%). Inspect the line and explicitly accept it before it can enter the calculation.');
    expect(translate('en', 'stellar.panorama.needMarks')).toBe('At least 8 skyline points are required.');
    expect(translate('en', 'stellar.panorama.prepare')).toBe('Prepare panorama skyline');
  });
});
"""

I18N.write_text(i18n, encoding='utf-8')
PRESENTATION.write_text(presentation, encoding='utf-8')
PANEL.write_text(panel, encoding='utf-8')
DOCS.write_text(docs, encoding='utf-8')
TEST.write_text(test, encoding='utf-8')

print('Stellar panorama assisted-marking localization slice applied. Run npm run verify; Electron smoke remains deferred until final localization audit.')
