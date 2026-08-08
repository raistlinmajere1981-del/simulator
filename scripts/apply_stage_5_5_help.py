from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        if new in text:
            return
        raise RuntimeError(f'{label}: anchor missing in {path}')
    p.write_text(text.replace(old, new, 1))

# AppNext: provider/state/top help plus inline panel buttons.
path = 'src/renderer/src/AppNext.tsx'
replace_once(path,
    "import { useEffect, useMemo, useState } from 'react';",
    "import { useCallback, useEffect, useMemo, useState } from 'react';",
    'react useCallback')
replace_once(path,
    "import type { SavedPhotoCalibration } from '../../shared/photo-calibration';\n",
    "import type { SavedPhotoCalibration } from '../../shared/photo-calibration';\nimport type { HelpPanelId } from '../../shared/help-content';\n",
    'help type import')
replace_once(path,
    "import { WorldModelViewport } from './WorldModelViewport';\n",
    "import { WorldModelViewport } from './WorldModelViewport';\nimport { HelpOverlay, HelpProvider, PanelHelpButton } from './HelpSystem';\n",
    'help component import')

replace_once(path,
    """        <div className=\"title-actions\">\n          {isDirty && <span className=\"dirty-badge\">KAYDEDİLMEDİ</span>}""",
    """        <div className=\"title-actions\">\n          <PanelHelpButton panelId=\"scenario-summary\" />\n          {isDirty && <span className=\"dirty-badge\">KAYDEDİLMEDİ</span>}""",
    'scenario help button')
replace_once(path,
    """        <div className=\"terrain-mode-buttons\">\n          <button className={!terrainEnabled ? 'selected' : ''}""",
    """        <div className=\"terrain-mode-buttons\">\n          <PanelHelpButton panelId=\"terrain-datum\" />\n          <button className={!terrainEnabled ? 'selected' : ''}""",
    'terrain help button')
replace_once(path,
    """        <div className=\"model-header-actions\">\n          <button className=\"trace-button\"""",
    """        <div className=\"model-header-actions\">\n          <PanelHelpButton panelId=\"model-visualization\" />\n          <button className=\"trace-button\"""",
    'model help button')
replace_once(path,
    """      <section className=\"results panel\">\n        <span className=\"eyebrow\">Ufuk sonucu karşılaştırma</span>""",
    """      <section className=\"results panel\">\n        <div className=\"results-help-heading\"><span className=\"eyebrow\">Ufuk sonucu karşılaştırma</span><PanelHelpButton panelId=\"results\" /></div>""",
    'horizon results help')
replace_once(path,
    """    <section className=\"results panel\">\n      <span className=\"eyebrow\">Sonuç karşılaştırma</span>""",
    """    <section className=\"results panel\">\n      <div className=\"results-help-heading\"><span className=\"eyebrow\">Sonuç karşılaştırma</span><PanelHelpButton panelId=\"results\" /></div>""",
    'results help')

replace_once(path,
    """  const [storageMessage, setStorageMessage] = useState('');\n  const [visualLayers, setVisualLayers]""",
    """  const [storageMessage, setStorageMessage] = useState('');\n  const [helpPanelId, setHelpPanelId] = useState<HelpPanelId>();\n  const [helpCatalogOpen, setHelpCatalogOpen] = useState(false);\n  const [visualLayers, setVisualLayers]""",
    'help app state')

insert_anchor = """  const geodesic = useMemo(() => {"""
insert = """  const openHelpPanel = useCallback((panelId: HelpPanelId): void => {\n    setHelpCatalogOpen(false);\n    setHelpPanelId(panelId);\n  }, []);\n  const openHelpCatalog = useCallback((): void => {\n    setHelpPanelId(undefined);\n    setHelpCatalogOpen(true);\n  }, []);\n  const closeHelp = useCallback((): void => {\n    setHelpPanelId(undefined);\n    setHelpCatalogOpen(false);\n  }, []);\n\n"""
replace_once(path, insert_anchor, insert + insert_anchor, 'help callbacks')

replace_once(path,
    """  return (\n    <div className=\"app-shell\">""",
    """  return (\n    <HelpProvider onOpenPanel={openHelpPanel} onOpenCatalog={openHelpCatalog}>\n    <div className=\"app-shell\">""",
    'help provider open')
replace_once(path,
    """          <button disabled title=\"Yardım içeriği sonraki aşamada\" type=\"button\">ⓘ Yardım</button>""",
    """          <button type=\"button\" onClick={openHelpCatalog}>ⓘ Yardım</button>""",
    'top help enabled')
replace_once(path,
    """            <section className=\"notes panel\">\n              <span className=\"eyebrow\">Hesaplama kapsamı</span>""",
    """            <section className=\"notes panel\">\n              <div className=\"notes-help-heading\"><span className=\"eyebrow\">Hesaplama kapsamı</span><PanelHelpButton panelId=\"calculation-scope\" /></div>""",
    'scope help')
replace_once(path,
    """      <TraceDialog\n        metadata={selectedMetadata}\n        prediction={selectedPrediction}\n        onClose={() => setTraceModelId(undefined)}\n      />\n    </div>\n  );""",
    """      <TraceDialog\n        metadata={selectedMetadata}\n        prediction={selectedPrediction}\n        onClose={() => setTraceModelId(undefined)}\n      />\n      <HelpOverlay panelId={helpPanelId} catalogOpen={helpCatalogOpen} onClose={closeHelp} />\n    </div>\n    </HelpProvider>\n  );""",
    'help provider close')

# Atmosphere panel.
path = 'src/renderer/src/AtmosphereProfileControl.tsx'
replace_once(path,
    "import { buildOpticalAtmosphereProfile } from '../../simulation/optical-refraction';\n",
    "import { buildOpticalAtmosphereProfile } from '../../simulation/optical-refraction';\nimport { PanelHelpButton } from './HelpSystem';\n",
    'atmosphere help import')
replace_once(path,
    """        <div className=\"atmosphere-mode-buttons\">\n          <button className={state.mode === 'off' ? 'selected' : ''}""",
    """        <div className=\"atmosphere-mode-buttons\">\n          <PanelHelpButton panelId=\"atmosphere\" />\n          <button className={state.mode === 'off' ? 'selected' : ''}""",
    'atmosphere help button')

# Water panel.
path = 'src/renderer/src/WaterSurfaceControl.tsx'
replace_once(path,
    "import type { StoredWaterSurfaceRecord } from '../../simulation/water-surface-ui-state';\n",
    "import type { StoredWaterSurfaceRecord } from '../../simulation/water-surface-ui-state';\nimport { PanelHelpButton } from './HelpSystem';\n",
    'water help import')
replace_once(path,
    """        <span className=\"water-datum-badge\">{datumLabels[verticalDatumKind]}</span>""",
    """        <div className=\"water-heading-actions\"><PanelHelpButton panelId=\"water-surface\" /><span className=\"water-datum-badge\">{datumLabels[verticalDatumKind]}</span></div>""",
    'water help button')

# Photo calibration.
path = 'src/renderer/src/PhotoCalibrationControl.tsx'
replace_once(path,
    "import './photo-calibration-control.css';\n",
    "import './photo-calibration-control.css';\nimport { PanelHelpButton } from './HelpSystem';\n",
    'photo help import')
replace_once(path,
    """        <div className=\"photo-calibration-actions\">\n          {savedCalibration""",
    """        <div className=\"photo-calibration-actions\">\n          <PanelHelpButton panelId=\"photo-calibration\" />\n          {savedCalibration""",
    'photo help button')

# Model input uncertainty.
path = 'src/renderer/src/PhotoModelUncertaintyControl.tsx'
replace_once(path,
    "import './photo-model-uncertainty-control.css';\n",
    "import './photo-model-uncertainty-control.css';\nimport { PanelHelpButton } from './HelpSystem';\n",
    'uncertainty help import')
replace_once(path,
    """        <span className={`photo-model-uncertainty-state ${isCalculating ? 'busy' : count > 0 ? 'active' : ''}`}>""",
    """        <div className=\"photo-model-uncertainty-heading-actions\">\n          <PanelHelpButton panelId=\"model-uncertainty\" />\n          <span className={`photo-model-uncertainty-state ${isCalculating ? 'busy' : count > 0 ? 'active' : ''}`}>""",
    'uncertainty help wrapper open')
replace_once(path,
    """          {isCalculating ? 'HESAPLANIYOR…' : count > 0 ? `${count} BİLEŞEN` : 'TANIMLANMADI'}\n        </span>\n      </div>""",
    """          {isCalculating ? 'HESAPLANIYOR…' : count > 0 ? `${count} BİLEŞEN` : 'TANIMLANMADI'}\n          </span>\n        </div>\n      </div>""",
    'uncertainty help wrapper close')

# Photo/model comparison.
path = 'src/renderer/src/PhotoAngularComparisonPanel.tsx'
replace_once(path,
    "import './photo-angular-comparison.css';\n",
    "import './photo-angular-comparison.css';\nimport { PanelHelpButton } from './HelpSystem';\n",
    'comparison help import')
replace_once(path,
    """        <span className=\"photo-angular-independent\">BAĞIMSIZ GÖZLEM KANALI</span>""",
    """        <div className=\"photo-angular-heading-actions\"><PanelHelpButton panelId=\"photo-comparison\" /><span className=\"photo-angular-independent\">BAĞIMSIZ GÖZLEM KANALI</span></div>""",
    'comparison help button')

# Data manager dialog.
path = 'src/renderer/src/dialogs.tsx'
replace_once(path,
    "import type { SavedExperiment } from '../../shared/simulator';\n",
    "import type { SavedExperiment } from '../../shared/simulator';\nimport { PanelHelpButton } from './HelpSystem';\n",
    'dialogs help import')
replace_once(path,
    """          <div className=\"dialog-header-actions\">\n            <button\n              className=\"primary-button\"""",
    """          <div className=\"dialog-header-actions\">\n            <PanelHelpButton panelId=\"data-manager\" />\n            <button\n              className=\"primary-button\"""",
    'data manager help button')

# Supplemental layout styles.
p = Path('src/renderer/src/help-system.css')
css = p.read_text()
css += """

.results-help-heading,
.notes-help-heading,
.water-heading-actions,
.photo-model-uncertainty-heading-actions,
.photo-angular-heading-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.results-help-heading,
.notes-help-heading { justify-content: space-between; margin-bottom: 6px; }
.water-heading-actions,
.photo-model-uncertainty-heading-actions,
.photo-angular-heading-actions { justify-content: flex-end; }
"""
p.write_text(css)

# Version/docs status.
p = Path('package.json')
p.write_text(p.read_text().replace('"version": "1.5.0"', '"version": "1.6.0"', 1))
p = Path('src/preload/index.ts')
p.write_text(p.read_text().replace("version: '1.5.0'", "version: '1.6.0'", 1))

p = Path('docs/roadmap-stage-5.5.md')
text = p.read_text().replace('Durum: planlandı · Aşama 6\'dan önce', 'Durum: tamamlandı · `1.6.0`', 1)
text += """

## Uygulanan kapsam · 1.6.0

- merkezi ve tipli panel yardım kayıtları
- ortak terim sözlüğü ve arama
- senaryo, atmosfer, arazi/datum, su, fotoğraf, model belirsizliği, fotoğraf karşılaştırması, model sahneleri, sonuçlar, kapsam ve veri yöneticisi için `?` düğmeleri
- panelden açılan bağlamsal overlay ve üst Yardım düğmesinden açılan toplu aranabilir katalog
- ilgili terimleri aynı overlay içinde açma
- `Esc`, arka plana tıklama ve önceki odağa dönüş davranışı
- yardım state'inin deney girdisi / dirty state / hesap motorundan ayrılması
"""
p.write_text(text)

p = Path('docs/roadmap.md')
text = p.read_text()
text = text.replace('## Aşama 5.5 — Bağlamsal yardım ve terim açıklamaları\n\n- ana panellerin sağ üstünde küçük `?` yardım düğmeleri', '## Aşama 5.5 — Bağlamsal yardım ve terim açıklamaları\n\nDurum: tamamlandı · `1.6.0`\n\n- ana panellerin sağ üstünde küçük `?` yardım düğmeleri', 1)
p.write_text(text)

p = Path('README.md')
text = p.read_text()
text = text.replace('Aktif geliştirme sürümü `1.5.0`dir.', 'Aktif geliştirme sürümü `1.6.0`dir.', 1)
if '- [`docs/roadmap-stage-5.5.md`](docs/roadmap-stage-5.5.md)' not in text:
    text = text.replace('- [`docs/roadmap-stage-5.4.md`](docs/roadmap-stage-5.4.md)', '- [`docs/roadmap-stage-5.4.md`](docs/roadmap-stage-5.4.md)\n- [`docs/roadmap-stage-5.5.md`](docs/roadmap-stage-5.5.md)', 1)
p.write_text(text)

# Remove one-off machinery from the product diff.
Path('scripts/apply_stage_5_5_help.py').unlink(missing_ok=True)
Path('.github/workflows/apply-stage-5-5-help.yml').unlink(missing_ok=True)
