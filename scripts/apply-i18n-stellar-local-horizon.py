#!/usr/bin/env python3
"""Localize the stellar local-horizon source/editor surface.

Temporary helper: remove before merge.
All edits are prepared in memory and written only after every anchor succeeds.
Renderer/presentation only: persisted/domain ids and raw imported warnings/messages stay unchanged.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
I18N = ROOT / 'src/renderer/src/i18n.ts'
PRESENTATION = ROOT / 'src/renderer/src/astronomy-result-presentation.ts'
PANEL = ROOT / 'src/renderer/src/StellarObservationPanel.tsx'
DOCS = ROOT / 'docs/localization.md'
TEST = ROOT / 'tests/stellar-local-horizon-i18n.test.ts'


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


for path in (I18N, PRESENTATION, PANEL, DOCS):
    if not path.exists():
        fail(f'missing expected file: {path.relative_to(ROOT)}')
if TEST.exists():
    fail(f'{TEST.relative_to(ROOT)} already exists')

i18n = I18N.read_text(encoding='utf-8')
presentation = PRESENTATION.read_text(encoding='utf-8')
panel = PANEL.read_text(encoding='utf-8')
docs = DOCS.read_text(encoding='utf-8')

tr_messages = """  'stellar.direction.north': 'K',
  'stellar.direction.northEast': 'KD',
  'stellar.direction.east': 'D',
  'stellar.direction.southEast': 'GD',
  'stellar.direction.south': 'G',
  'stellar.direction.southWest': 'GB',
  'stellar.direction.west': 'B',
  'stellar.direction.northWest': 'KB',
  'stellar.horizonEditor.title': 'Yerel ufuk · manuel veya dosya skyline',
  'stellar.horizonEditor.description': 'Kaynak ve değer düzenlemeleri hesap motorunu çalıştırmaz; seçilen profil tek seferde uygulanır.',
  'stellar.horizonEditor.enabled': 'Etkin',
  'stellar.horizonEditor.off': 'Kapalı',
  'stellar.horizonEditor.manualMode': '8 yönlü manuel',
  'stellar.horizonEditor.fileMode': 'Dosya profili',
  'stellar.horizonEditor.importing': 'Dosya okunuyor…',
  'stellar.horizonEditor.import': 'Skyline dosyasından al',
  'stellar.horizonEditor.externalRequired': 'Dış skyline modu için önce doğrulanmış bir dosya içe aktarılmalıdır.',
  'stellar.horizonEditor.importedReady': '“{fileName}” hazır. Uygula ve hesapla ile yıldız izine bağlanacak.',
  'stellar.horizonEditor.importError': 'Skyline dosyası içe aktarılamadı.',
  'stellar.horizonEditor.demReady': '“{fileName}” DEM skyline taslağı hazır. Uygula ve hesapla ile yıldız izine bağlanacak.',
  'stellar.horizonEditor.panoramaReady': '“{fileName}” panorama skyline taslağı hazır. Uygula ve hesapla ile yıldız izine bağlanacak.',
  'stellar.horizonEditor.sourceLabel': 'YEREL SKYLINE KAYNAĞI',
  'stellar.horizonEditor.formatDem': 'DEM · türetilmiş geometrik',
  'stellar.horizonEditor.formatPanorama': 'PANORAMA · türetilmiş geometrik',
  'stellar.horizonEditor.sourceSummary': '{format} · {count} nokta · en büyük boşluk {gap}°',
  'stellar.horizonEditor.demDetails': 'ΔA {azimuth}° · Δs {distance} m · menzil {range} km · {sampling}',
  'stellar.horizonEditor.geometryGpano': 'GPano XMP',
  'stellar.horizonEditor.geometryManual': 'Manuel geometri',
  'stellar.horizonEditor.panoramaDetails': '{geometry} · yatay {coverage}° · heading {heading}° · {count} işaret',
  'stellar.horizonEditor.directionAria': '{direction} yerel ufuk yüksekliği',
  'stellar.horizonEditor.externalEmpty': 'Dış profil için CSV/TSV/TXT/JSON skyline içe aktar, ESRI ASCII DEM’den profil üret veya 360° panoramayı manuel işaretle.',
  'stellar.horizonEditor.dirty': 'Değişiklikler henüz hesaplanmadı.',
  'stellar.horizonEditor.clean': 'Editör ile hesaplanan sonuç eşleşiyor.',
  'stellar.horizonEditor.revert': 'Geri al',
  'stellar.horizonEditor.apply': 'Uygula ve hesapla',
"""

en_messages = """  'stellar.direction.north': 'N',
  'stellar.direction.northEast': 'NE',
  'stellar.direction.east': 'E',
  'stellar.direction.southEast': 'SE',
  'stellar.direction.south': 'S',
  'stellar.direction.southWest': 'SW',
  'stellar.direction.west': 'W',
  'stellar.direction.northWest': 'NW',
  'stellar.horizonEditor.title': 'Local horizon · manual or file skyline',
  'stellar.horizonEditor.description': 'Editing sources and values does not run the calculation engine; the selected profile is applied in one explicit step.',
  'stellar.horizonEditor.enabled': 'Enabled',
  'stellar.horizonEditor.off': 'Off',
  'stellar.horizonEditor.manualMode': '8-direction manual',
  'stellar.horizonEditor.fileMode': 'File profile',
  'stellar.horizonEditor.importing': 'Reading file…',
  'stellar.horizonEditor.import': 'Load from skyline file',
  'stellar.horizonEditor.externalRequired': 'A verified file must be imported before external-skyline mode can be applied.',
  'stellar.horizonEditor.importedReady': '“{fileName}” is ready. Apply and calculate to attach it to the star trail.',
  'stellar.horizonEditor.importError': 'The skyline file could not be imported.',
  'stellar.horizonEditor.demReady': 'The DEM skyline draft “{fileName}” is ready. Apply and calculate to attach it to the star trail.',
  'stellar.horizonEditor.panoramaReady': 'The panorama skyline draft “{fileName}” is ready. Apply and calculate to attach it to the star trail.',
  'stellar.horizonEditor.sourceLabel': 'LOCAL SKYLINE SOURCE',
  'stellar.horizonEditor.formatDem': 'DEM · derived geometric',
  'stellar.horizonEditor.formatPanorama': 'PANORAMA · derived geometric',
  'stellar.horizonEditor.sourceSummary': '{format} · {count} points · maximum gap {gap}°',
  'stellar.horizonEditor.demDetails': 'ΔA {azimuth}° · Δs {distance} m · range {range} km · {sampling}',
  'stellar.horizonEditor.geometryGpano': 'GPano XMP',
  'stellar.horizonEditor.geometryManual': 'Manual geometry',
  'stellar.horizonEditor.panoramaDetails': '{geometry} · horizontal {coverage}° · heading {heading}° · {count} marks',
  'stellar.horizonEditor.directionAria': '{direction} local-horizon altitude',
  'stellar.horizonEditor.externalEmpty': 'For an external profile, import a CSV/TSV/TXT/JSON skyline, derive a profile from an ESRI ASCII DEM, or mark a 360° panorama manually.',
  'stellar.horizonEditor.dirty': 'Changes have not been calculated yet.',
  'stellar.horizonEditor.clean': 'The editor matches the calculated result.',
  'stellar.horizonEditor.revert': 'Revert',
  'stellar.horizonEditor.apply': 'Apply and calculate',
"""

i18n = insert_catalog(i18n, '\n} as const;\n\nexport type TranslationKey', tr_messages, 'i18n TR')
i18n = insert_catalog(i18n, '\n};\n\nexport function translate', en_messages, 'i18n EN')

presentation = replace_once(
    presentation,
    "import type { StellarObservationResult } from '../../simulation/stellar-observation';",
    "import type { StellarLocalHorizonSettingKey, StellarObservationResult } from '../../simulation/stellar-observation';",
    'presentation import'
)
presentation = replace_once(
    presentation,
    """const stellarHorizonClassKeys: Record<StellarObservationResult['position']['horizonClass'], TranslationKey> = {
  'circumpolar-above': 'stellar.horizon.circumpolarAbove',
  'rises-and-sets': 'stellar.horizon.risesSets',
  'never-rises': 'stellar.horizon.neverRises',
  'grazes-horizon': 'stellar.horizon.grazes'
};
""",
    """const stellarHorizonClassKeys: Record<StellarObservationResult['position']['horizonClass'], TranslationKey> = {
  'circumpolar-above': 'stellar.horizon.circumpolarAbove',
  'rises-and-sets': 'stellar.horizon.risesSets',
  'never-rises': 'stellar.horizon.neverRises',
  'grazes-horizon': 'stellar.horizon.grazes'
};

const stellarLocalHorizonDirectionKeys: Record<StellarLocalHorizonSettingKey, TranslationKey> = {
  localHorizonNorthDeg: 'stellar.direction.north',
  localHorizonNorthEastDeg: 'stellar.direction.northEast',
  localHorizonEastDeg: 'stellar.direction.east',
  localHorizonSouthEastDeg: 'stellar.direction.southEast',
  localHorizonSouthDeg: 'stellar.direction.south',
  localHorizonSouthWestDeg: 'stellar.direction.southWest',
  localHorizonWestDeg: 'stellar.direction.west',
  localHorizonNorthWestDeg: 'stellar.direction.northWest'
};
""",
    'presentation direction map'
)
presentation = replace_once(
    presentation,
    """export function getStellarHorizonClassLabel(
  locale: AppLocale,
  horizonClass: StellarObservationResult['position']['horizonClass']
): string {
  return translate(locale, stellarHorizonClassKeys[horizonClass]);
}
""",
    """export function getStellarHorizonClassLabel(
  locale: AppLocale,
  horizonClass: StellarObservationResult['position']['horizonClass']
): string {
  return translate(locale, stellarHorizonClassKeys[horizonClass]);
}

export function getStellarLocalHorizonDirectionLabel(
  locale: AppLocale,
  key: StellarLocalHorizonSettingKey
): string {
  return translate(locale, stellarLocalHorizonDirectionKeys[key]);
}
""",
    'presentation direction function'
)

panel = replace_once(
    panel,
    "import { appLocaleTag, translate, type AppLocale } from './i18n';\n",
    "import { appLocaleTag, translate, type AppLocale } from './i18n';\nimport { getStellarLocalHorizonDirectionLabel } from './astronomy-result-presentation';\n",
    'panel direction import'
)

replacements = [
    ("setHorizonImportMessage('Dış skyline modu için önce doğrulanmış bir dosya içe aktarılmalıdır.');", "setHorizonImportMessage(t('stellar.horizonEditor.externalRequired'));"),
    ("setHorizonImportMessage(`“${imported.fileName}” hazır. Uygula ve hesapla ile yıldız izine bağlanacak.`);", "setHorizonImportMessage(t('stellar.horizonEditor.importedReady', { fileName: imported.fileName }));"),
    ("setHorizonImportMessage(error instanceof Error ? error.message : 'Skyline dosyası içe aktarılamadı.');", "setHorizonImportMessage(error instanceof Error ? error.message : t('stellar.horizonEditor.importError'));"),
    ("setHorizonImportMessage(`“${source.fileName}” DEM skyline taslağı hazır. Uygula ve hesapla ile yıldız izine bağlanacak.`);", "setHorizonImportMessage(t('stellar.horizonEditor.demReady', { fileName: source.fileName }));"),
    ("setHorizonImportMessage(`“${source.fileName}” panorama skyline taslağı hazır. Uygula ve hesapla ile yıldız izine bağlanacak.`);", "setHorizonImportMessage(t('stellar.horizonEditor.panoramaReady', { fileName: source.fileName }));"),
    ('<strong>Yerel ufuk · manuel veya dosya skyline</strong>', "<strong>{t('stellar.horizonEditor.title')}</strong>"),
    ('<span>Kaynak ve değer düzenlemeleri hesap motorunu çalıştırmaz; seçilen profil tek seferde uygulanır.</span>', "<span>{t('stellar.horizonEditor.description')}</span>"),
    ("{localHorizonDraft.localHorizonEnabled ? 'Etkin' : 'Kapalı'}", "{localHorizonDraft.localHorizonEnabled ? t('stellar.horizonEditor.enabled') : t('stellar.horizonEditor.off')}"),
    ('              8 yönlü manuel', "              {t('stellar.horizonEditor.manualMode')}"),
    ('              Dosya profili', "              {t('stellar.horizonEditor.fileMode')}"),
    ("{isImportingHorizon ? 'Dosya okunuyor…' : 'Skyline dosyasından al'}", "{isImportingHorizon ? t('stellar.horizonEditor.importing') : t('stellar.horizonEditor.import')}"),
    ('<small>YEREL SKYLINE KAYNAĞI</small>', "<small>{t('stellar.horizonEditor.sourceLabel')}</small>"),
    ("<span>{draftExternalLocalHorizonSource.format === 'dem' ? 'DEM · türetilmiş geometrik' : draftExternalLocalHorizonSource.format === 'panorama' ? 'PANORAMA · türetilmiş geometrik' : draftExternalLocalHorizonSource.format.toUpperCase()} · {draftExternalLocalHorizonSource.pointCount} nokta · en büyük boşluk {angleFormatter.format(draftExternalLocalHorizonSource.maximumAzimuthGapDeg)}°</span>", "<span>{t('stellar.horizonEditor.sourceSummary', { format: draftExternalLocalHorizonSource.format === 'dem' ? t('stellar.horizonEditor.formatDem') : draftExternalLocalHorizonSource.format === 'panorama' ? t('stellar.horizonEditor.formatPanorama') : draftExternalLocalHorizonSource.format.toUpperCase(), count: draftExternalLocalHorizonSource.pointCount, gap: angleFormatter.format(draftExternalLocalHorizonSource.maximumAzimuthGapDeg) })}</span>"),
    ("<span>ΔA {angleFormatter.format(draftExternalLocalHorizonSource.demDerivation.azimuthStepDeg)}° · Δs {angleFormatter.format(draftExternalLocalHorizonSource.demDerivation.distanceStepM)} m · menzil {angleFormatter.format(draftExternalLocalHorizonSource.demDerivation.maximumDistanceM / 1_000)} km · {draftExternalLocalHorizonSource.demDerivation.samplingMethod}</span>", "<span>{t('stellar.horizonEditor.demDetails', { azimuth: angleFormatter.format(draftExternalLocalHorizonSource.demDerivation.azimuthStepDeg), distance: angleFormatter.format(draftExternalLocalHorizonSource.demDerivation.distanceStepM), range: angleFormatter.format(draftExternalLocalHorizonSource.demDerivation.maximumDistanceM / 1_000), sampling: draftExternalLocalHorizonSource.demDerivation.samplingMethod })}</span>"),
    ("<span>{draftExternalLocalHorizonSource.panoramaDerivation.geometrySource === 'gpano-xmp' ? 'GPano XMP' : 'Manuel geometri'} · yatay {angleFormatter.format(draftExternalLocalHorizonSource.panoramaDerivation.horizontalCoverageDeg)}° · heading {angleFormatter.format(draftExternalLocalHorizonSource.panoramaDerivation.geometry.poseHeadingDeg)}° · {draftExternalLocalHorizonSource.panoramaDerivation.marks.length} işaret</span>", "<span>{t('stellar.horizonEditor.panoramaDetails', { geometry: draftExternalLocalHorizonSource.panoramaDerivation.geometrySource === 'gpano-xmp' ? t('stellar.horizonEditor.geometryGpano') : t('stellar.horizonEditor.geometryManual'), coverage: angleFormatter.format(draftExternalLocalHorizonSource.panoramaDerivation.horizontalCoverageDeg), heading: angleFormatter.format(draftExternalLocalHorizonSource.panoramaDerivation.geometry.poseHeadingDeg), count: draftExternalLocalHorizonSource.panoramaDerivation.marks.length })}</span>"),
    ('<span>{direction.label} · {direction.azimuthDeg}°</span>', '<span>{getStellarLocalHorizonDirectionLabel(locale, direction.key)} · {direction.azimuthDeg}°</span>'),
    ('ariaLabel={`${direction.label} yerel ufuk yüksekliği`}', "ariaLabel={t('stellar.horizonEditor.directionAria', { direction: getStellarLocalHorizonDirectionLabel(locale, direction.key) })}"),
    ("<p className=\"stellar-skyline-source-empty\">Dış profil için CSV/TSV/TXT/JSON skyline içe aktar, ESRI ASCII DEM'den profil üret veya 360° panoramayı manuel işaretle.</p>", "<p className=\"stellar-skyline-source-empty\">{t('stellar.horizonEditor.externalEmpty')}</p>"),
    ("{localHorizonDirty ? 'Değişiklikler henüz hesaplanmadı.' : 'Editör ile hesaplanan sonuç eşleşiyor.'}", "{localHorizonDirty ? t('stellar.horizonEditor.dirty') : t('stellar.horizonEditor.clean')}"),
    ('>\n              Geri al\n            </button>', ">\n              {t('stellar.horizonEditor.revert')}\n            </button>"),
    ('>\n              Uygula ve hesapla\n            </button>', ">\n              {t('stellar.horizonEditor.apply')}\n            </button>")
]
for index, (old, new) in enumerate(replacements, start=1):
    panel = replace_once(panel, old, new, f'panel replacement {index}')

progress = '- Stellar control slice (part 4): catalog/trail controls, verified proper-motion source and standard-refraction diagnostic use TR/EN and active-locale formatting; local-horizon/DEM/panorama editors remain follow-up work.\n'
docs = replace_once(
    docs,
    progress,
    progress + '- Stellar control slice (part 5): local-horizon source/editor presentation uses TR/EN while stable direction/source ids and raw imported warnings/messages remain unchanged; DEM and panorama controls remain follow-up work.\n',
    'docs progress'
)
docs = replace_once(
    docs,
    'Engine-emitted warnings/assumptions/raw calculation errors, shadow/stellar specialized panels, terrain/calibration panels, dialogs, help/AI guidance and reports remain separate follow-up slices.',
    'Engine-emitted warnings/assumptions/raw calculation errors and traces, DEM/panorama skyline controls, terrain/calibration panels, dialogs, help/AI guidance and reports remain separate follow-up slices.',
    'docs remaining scope'
)

test = """import { describe, expect, it } from 'vitest';
import { getStellarLocalHorizonDirectionLabel } from '../src/renderer/src/astronomy-result-presentation';
import { translate } from '../src/renderer/src/i18n';

describe('stellar local-horizon localization', () => {
  it('maps stable direction keys only at the renderer boundary', () => {
    const key = 'localHorizonNorthEastDeg' as const;
    expect(getStellarLocalHorizonDirectionLabel('tr', key)).toBe('KD');
    expect(getStellarLocalHorizonDirectionLabel('en', key)).toBe('NE');
    expect(key).toBe('localHorizonNorthEastDeg');
  });

  it('localizes source-ready presentation without changing source identity', () => {
    expect(translate('en', 'stellar.horizonEditor.demReady', { fileName: 'terrain.asc' }))
      .toBe('The DEM skyline draft “terrain.asc” is ready. Apply and calculate to attach it to the star trail.');
    const sourceFormat = 'dem' as const;
    expect(translate('en', 'stellar.horizonEditor.formatDem')).toBe('DEM · derived geometric');
    expect(sourceFormat).toBe('dem');
  });
});
"""

I18N.write_text(i18n, encoding='utf-8')
PRESENTATION.write_text(presentation, encoding='utf-8')
PANEL.write_text(panel, encoding='utf-8')
DOCS.write_text(docs, encoding='utf-8')
TEST.write_text(test, encoding='utf-8')

print('Stellar local-horizon localization slice applied. Run npm run verify; Electron smoke remains deferred until final localization audit.')
