from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise RuntimeError(f'anchor missing in {path}: {old[:120]!r}')
    p.write_text(text.replace(old, new, 1))

# ---------------------------------------------------------------------------
# SavedExperiment persistence type.
# ---------------------------------------------------------------------------
path = 'src/shared/simulator.ts'
replace_once(
    path,
    """import type { ModelInputUncertaintySettings } from './uncertainty';\n""",
    """import type { ModelInputUncertaintySettings } from './uncertainty';\nimport type { TextExperimentSetupProvenance } from './text-experiment-setup';\n"""
)
replace_once(
    path,
    """  /** Optional explicit model-input uncertainties used by photo/model angular comparison. */\n  photoModelUncertainty?: ModelInputUncertaintySettings;\n  inputs: SimulatorInputs;""",
    """  /** Optional explicit model-input uncertainties used by photo/model angular comparison. */\n  photoModelUncertainty?: ModelInputUncertaintySettings;\n  /** Provenance history for user-approved values extracted from free-form experiment text. */\n  textSetupHistory?: TextExperimentSetupProvenance[];\n  inputs: SimulatorInputs;"""
)

# ---------------------------------------------------------------------------
# Portable parser: strict optional text-setup provenance.
# ---------------------------------------------------------------------------
path = 'src/shared/portable.ts'
replace_once(
    path,
    """import { normalizeSimulationScenarioId } from './scenario';\n""",
    """import { normalizeSimulationScenarioId } from './scenario';\nimport type { TextExperimentSetupProvenance } from './text-experiment-setup';\n"""
)
anchor = """function parseSavedExperiment(value: unknown, allowLegacyInputs: boolean): SavedExperiment | null {"""
helper = r'''function parseTextSetupHistory(value: unknown): TextExperimentSetupProvenance[] | null {
  if (!Array.isArray(value) || value.length > 50) return null;
  const history: TextExperimentSetupProvenance[] = [];
  for (const item of value) {
    if (!isRecord(item) || !isNonEmptyString(item.parserVersion) ||
      typeof item.sourceText !== 'string' || item.sourceText.length > 10_000 ||
      !isIsoDate(item.appliedAtIso) || !Array.isArray(item.appliedFields) ||
      item.appliedFields.length > 64) return null;
    const appliedFields: TextExperimentSetupProvenance['appliedFields'] = [];
    for (const field of item.appliedFields) {
      if (!isRecord(field) || !isNonEmptyString(field.fieldId) || field.fieldId.length > 80 ||
        typeof field.displayValue !== 'string' || field.displayValue.length > 500 ||
        typeof field.sourceExcerpt !== 'string' || field.sourceExcerpt.length > 1_000) return null;
      appliedFields.push({
        fieldId: field.fieldId as TextExperimentSetupProvenance['appliedFields'][number]['fieldId'],
        displayValue: field.displayValue,
        sourceExcerpt: field.sourceExcerpt
      });
    }
    history.push({
      parserVersion: item.parserVersion.trim(),
      sourceText: item.sourceText,
      appliedAtIso: item.appliedAtIso,
      appliedFields
    });
  }
  return history;
}

'''
replace_once(path, anchor, helper + anchor)
replace_once(
    path,
    """  const photoModelUncertainty = value.photoModelUncertainty === undefined\n    ? undefined\n    : parseModelInputUncertainty(value.photoModelUncertainty);\n  if (photoModelUncertainty === null) return null;\n\n  return {""",
    """  const photoModelUncertainty = value.photoModelUncertainty === undefined\n    ? undefined\n    : parseModelInputUncertainty(value.photoModelUncertainty);\n  if (photoModelUncertainty === null) return null;\n  const textSetupHistory = value.textSetupHistory === undefined\n    ? undefined\n    : parseTextSetupHistory(value.textSetupHistory);\n  if (textSetupHistory === null) return null;\n\n  return {"""
)
replace_once(
    path,
    """    ...(photoModelUncertainty === undefined ? {} : { photoModelUncertainty }),\n    inputs,""",
    """    ...(photoModelUncertainty === undefined ? {} : { photoModelUncertainty }),\n    ...(textSetupHistory === undefined ? {} : { textSetupHistory }),\n    inputs,"""
)

# ---------------------------------------------------------------------------
# App integration.
# ---------------------------------------------------------------------------
path = 'src/renderer/src/AppNext.tsx'
replace_once(
    path,
    """import type { HelpPanelId } from '../../shared/help-content';\n""",
    """import type { HelpPanelId } from '../../shared/help-content';\nimport type {\n  ExperimentSetupApplication,\n  TextExperimentSetupProvenance\n} from '../../shared/text-experiment-setup';\n"""
)
replace_once(
    path,
    """import { HelpOverlay, HelpProvider, PanelHelpButton } from './HelpSystem';\n""",
    """import { HelpOverlay, HelpProvider, PanelHelpButton } from './HelpSystem';\nimport { TextExperimentSetupDialog } from './TextExperimentSetupDialog';\n"""
)
replace_once(
    path,
    """  const [helpCatalogOpen, setHelpCatalogOpen] = useState(false);\n  const [visualLayers, setVisualLayers] = useState<VisualLayerState>({""",
    """  const [helpCatalogOpen, setHelpCatalogOpen] = useState(false);\n  const [textSetupOpen, setTextSetupOpen] = useState(false);\n  const [textSetupHistory, setTextSetupHistory] = useState<TextExperimentSetupProvenance[]>([]);\n  const [visualLayers, setVisualLayers] = useState<VisualLayerState>({"""
)

apply_anchor = """  const updateTerrainPoints = (points: ManualTerrainPoint[]): void => {"""
apply_fn = r'''  const applyTextExperimentSetup = (application: ExperimentSetupApplication): void => {
    const nextScenario = application.scenarioId;
    const scenarioChanged = nextScenario !== undefined && nextScenario !== activeScenarioId;
    const changed = application.inputChanges;
    const terrainRelevant = changed.surfaceDistanceKm !== undefined || changed.distanceSource !== undefined ||
      changed.observerLatitudeDeg !== undefined || changed.observerLongitudeDeg !== undefined ||
      changed.targetLatitudeDeg !== undefined || changed.targetLongitudeDeg !== undefined ||
      changed.observerGroundElevationM !== undefined || changed.targetGroundElevationM !== undefined;
    const verticalRelevant = changed.verticalDatumKind !== undefined || changed.verticalDatumOffsetM !== undefined ||
      changed.observerGroundElevationM !== undefined || changed.targetGroundElevationM !== undefined;

    if (terrainRelevant) markTerrainSourceModified();
    if (verticalRelevant) {
      markGeoidConversionModified();
      markWaterApplicationModified();
    }

    if (scenarioChanged && nextScenario) {
      setActiveScenarioId(nextScenario);
      setActiveExperimentId(crypto.randomUUID());
      setActiveExperimentName('');
      setExperimentObservedAtIso(new Date().toISOString());
      setGeoidConversionRecord(undefined);
      setWaterObservationRecord(undefined);
      setWaterApplicationRecord(undefined);
      setPhotoCalibration(undefined);
      setPhotoCalibrationRecord(undefined);
      setPhotoModelUncertainty({ ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS, ...application.modelUncertaintyChanges });
      setModelAngularUncertaintyById({});
      setModelUncertaintyError(undefined);
      setTextSetupHistory([application.provenance]);
    } else {
      if (Object.keys(application.modelUncertaintyChanges).length > 0) {
        setPhotoModelUncertainty((current) => ({ ...current, ...application.modelUncertaintyChanges }));
      }
      setTextSetupHistory((current) => [...current, application.provenance].slice(-50));
    }

    setInputs((current) => ({ ...current, ...application.inputChanges }));
    if (application.atmosphereMode) {
      setAtmosphereState((current) => ({ ...current, mode: application.atmosphereMode! }));
    }
    setIsDirty(true);
    const count = application.provenance.appliedFields.length;
    setStorageMessage(`Metinden hazırlanan taslaktan ${count} alan uygulandı.`);
  };

'''
replace_once(path, apply_anchor, apply_fn + apply_anchor)

replace_once(
    path,
    """    setPhotoModelUncertainty(saved.photoModelUncertainty ?? { ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS });\n    setPhotoCalibrationRecord(photoPrediction""",
    """    setPhotoModelUncertainty(saved.photoModelUncertainty ?? { ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS });\n    setTextSetupHistory(saved.textSetupHistory ?? []);\n    setPhotoCalibrationRecord(photoPrediction"""
)
replace_once(
    path,
    """      ...(photoCalibration && modelInputUncertaintyDefined ? { photoModelUncertainty } : {}),\n      inputs,""",
    """      ...(photoCalibration && modelInputUncertaintyDefined ? { photoModelUncertainty } : {}),\n      ...(textSetupHistory.length > 0 ? { textSetupHistory } : {}),\n      inputs,"""
)
# Save result reload.
replace_once(
    path,
    """      setPhotoModelUncertainty(saved.photoModelUncertainty ?? { ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS });\n      setPhotoCalibrationRecord(savedPhotoPrediction""",
    """      setPhotoModelUncertainty(saved.photoModelUncertainty ?? { ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS });\n      setTextSetupHistory(saved.textSetupHistory ?? []);\n      setPhotoCalibrationRecord(savedPhotoPrediction"""
)

# Clear history in existing new/reset flows alongside model uncertainty reset.
text = Path(path).read_text()
text = text.replace(
    """        setPhotoModelUncertainty({ ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS });\n        setModelAngularUncertaintyById({});""",
    """        setPhotoModelUncertainty({ ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS });\n        setTextSetupHistory([]);\n        setModelAngularUncertaintyById({});"""
)
text = text.replace(
    """            setPhotoModelUncertainty({ ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS });\n            setModelAngularUncertaintyById({});""",
    """            setPhotoModelUncertainty({ ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS });\n            setTextSetupHistory([]);\n            setModelAngularUncertaintyById({});"""
)
text = text.replace(
    """                setPhotoModelUncertainty({ ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS });\n                setModelAngularUncertaintyById({});""",
    """                setPhotoModelUncertainty({ ...DEFAULT_MODEL_INPUT_UNCERTAINTY_SETTINGS });\n                setTextSetupHistory([]);\n                setModelAngularUncertaintyById({});"""
)
Path(path).write_text(text)

# Topbar action.
replace_once(
    path,
    """        <div className=\"top-actions\">\n          <button type=\"button\" onClick={() => setDataManagerOpen(true)}>▤ Veri Yöneticisi</button>""",
    """        <div className=\"top-actions\">\n          <button type=\"button\" onClick={() => setTextSetupOpen(true)}>✦ Metinden Hazırla</button>\n          <button type=\"button\" onClick={() => setDataManagerOpen(true)}>▤ Veri Yöneticisi</button>"""
)

# Dialog near other dialogs.
replace_once(
    path,
    """      <SaveExperimentDialog\n        initialName={activeExperimentName || defaultExperimentName(activeScenarioId)}""",
    """      <TextExperimentSetupDialog\n        open={textSetupOpen}\n        scenarioId={activeScenarioId}\n        inputs={inputs}\n        atmosphereMode={atmosphereState.mode}\n        modelUncertainty={photoModelUncertainty}\n        onClose={() => setTextSetupOpen(false)}\n        onApply={applyTextExperimentSetup}\n      />\n      <SaveExperimentDialog\n        initialName={activeExperimentName || defaultExperimentName(activeScenarioId)}"""
)

# ---------------------------------------------------------------------------
# Help catalog: new panel entry.
# ---------------------------------------------------------------------------
path = 'src/shared/help-content.ts'
replace_once(path, """  | 'scenario-summary'\n  | 'photo-calibration'""", """  | 'scenario-summary'\n  | 'text-experiment-setup'\n  | 'photo-calibration'""")
entry_anchor = """  {\n    id: 'photo-calibration',"""
entry = r'''  {
    id: 'text-experiment-setup',
    category: 'Deney',
    title: 'Metinden deney hazırlama',
    summary: 'Serbest gözlem notunu deterministik kurallarla tipli bir taslağa dönüştürür. Bulunan değerler kullanıcı onayı olmadan deney state’ine yazılmaz.',
    fields: [
      { label: 'Bulundu', description: 'Birim, bağlam ve aralık bakımından güvenle eşlenen; seçilirse uygulanabilen alan.' },
      { label: 'Kontrol gerekli', description: 'Eksik birim, çelişen tekrar veya ek fiziksel bağlam gerektiren ifade. Otomatik uygulanmaz.' },
      { label: 'Kullanılamadı', description: 'Mevcut sözleşmede tek başına güvenli uygulanamayan ifade; örneğin provenansı eksik su seviyesi veya fotoğrafsız FOV.' },
      { label: 'Mevcut → önerilen', description: 'Forma yazmadan önce mevcut değer ile metinden çıkarılan aday değeri yan yana gösterir.' }
    ],
    assumptions: ['İlk sürüm çevrimdışı ve kural tabanlıdır; harici AI servisi kullanmaz.', 'Metinde bulunmayan değerler için fiziksel varsayım uydurulmaz.'],
    commonMistakes: ['Birimsiz sayının metre/km olduğu varsayımını beklemek.', 'Kontrol gerekli satırın otomatik uygulanacağını sanmak.', 'Metinden hazırlama provenansını gerçek ölçüm kaynağının yerine koymak.'],
    example: '“Gözlemci deniz seviyesinden 12 m, kamera yerden 1,7 m; hedef 34,2 km uzakta ve 42 m yüksekliğinde; standart kırılma k=0,13.” metni önce taslak önizlemesine dönüşür.',
    relatedTerms: ['provenance', 'uncertainty', 'datum', 'k']
  },
'''
replace_once(path, entry_anchor, entry + entry_anchor)

# ---------------------------------------------------------------------------
# HTML report section.
# ---------------------------------------------------------------------------
path = 'src/report/html-report.ts'
anchor = """export function createExperimentHtmlReport("""
helper = r'''function textSetupHistorySection(experiment: SavedExperiment): string {
  const history = experiment.textSetupHistory;
  if (!history || history.length === 0) return '';
  const entries = history.map((item, index) => `
    <div class="source-card">
      <div class="source-card-heading"><strong>Metinden uygulama ${index + 1}</strong><span>${formatDate(item.appliedAtIso)} · parser ${escapeHtml(item.parserVersion)}</span></div>
      <p>${escapeHtml(item.sourceText)}</p>
      <table><thead><tr><th>Alan</th><th>Uygulanan değer</th><th>Kaynak ifade</th></tr></thead><tbody>
        ${item.appliedFields.map((field) => `<tr><td>${escapeHtml(field.fieldId)}</td><td>${escapeHtml(field.displayValue)}</td><td>${escapeHtml(field.sourceExcerpt)}</td></tr>`).join('')}
      </tbody></table>
    </div>`).join('');
  return `
    <section class="model-section vertical-section">
      <header class="model-heading"><div><h2>Metinden deney hazırlama provenansı</h2><span>Kullanıcı onayıyla forma uygulanan serbest metin alanları</span></div><strong class="status status-compatible">${history.length} uygulama</strong></header>
      <p>Bu metin parser girdisidir; fiziksel ölçüm kaynağının kendisi değildir. Yalnız hangi UI değerlerinin hangi ifadelerden çıkarılıp kullanıcı onayıyla uygulandığını izler.</p>
      <div class="trace-list">${entries}</div>
    </section>`;
}

'''
replace_once(path, anchor, helper + anchor)
replace_once(
    path,
    """    ${photoModelUncertaintySection(experiment)}\n    ${experiment.predictions.map""",
    """    ${photoModelUncertaintySection(experiment)}\n    ${textSetupHistorySection(experiment)}\n    ${experiment.predictions.map"""
)

# ---------------------------------------------------------------------------
# Version/docs.
# ---------------------------------------------------------------------------
path = 'package.json'
p = Path(path)
p.write_text(p.read_text().replace('"version": "1.6.0"', '"version": "1.7.0"', 1))
path = 'src/preload/index.ts'
p = Path(path)
p.write_text(p.read_text().replace("version: '1.6.0'", "version: '1.7.0'", 1))

path = 'docs/roadmap-stage-5.6.md'
p = Path(path)
text = p.read_text().replace("Durum: planlandı · Aşama 6'dan önce", "Durum: tamamlandı · `1.7.0`", 1)
text += r'''

## 1.7.0 gerçekleşen kapsam

- Çevrimdışı, deterministik Türkçe ayrıştırıcı.
- Senaryo, manuel mesafe/koordinat, göz ve hedef yükseklikleri, uç zemin kotları, görünürlük/gözlem belirsizliği, datum/ofset, Standart k/kapalı atmosfer ve açık model belirsizliği adayları.
- `Bulundu / Kontrol gerekli / Kullanılamadı` sınıflandırması.
- Her alan için `mevcut → önerilen` önizlemesi ve bağımsız uygula/atla seçimi.
- Birimsiz veya çelişkili ifadelerin otomatik uygulanmaması.
- Fotoğraf/FOV ve su seviyesi gibi ek provenans gerektiren ifadelerin başka alana zorla eşlenmemesi.
- Kullanıcı onayından sonra tek batch state güncellemesi; model hesapları ancak bundan sonra yeniden çalışır.
- Kaynak metin, parser sürümü, uygulama zamanı ve uygulanan alan parçalarının deney kaydı / `.ggl.json` / HTML raporunda provenans olarak korunması.
- Üst araç çubuğunda `Metinden Hazırla` girişi ve merkezi Yardım kataloğunda ilgili açıklama.

Bu sürüm harici AI/LLM kullanmaz. Gelecekte bir LLM adaptörü eklenirse yalnız aynı tipli taslak sözleşmesine aday veri üretmeli; doğrudan React state veya fiziksel modele yazmamalıdır.
'''
p.write_text(text)

path = 'README.md'
p = Path(path)
text = p.read_text()
text = text.replace('Aktif geliştirme sürümü `1.6.0`dir.', 'Aktif geliştirme sürümü `1.7.0`dir.', 1)
text = text.replace('- model sürümleri ve sonuç anlık görüntülerini', '- metinden deney hazırlama kaynak metni, parser sürümü ve kullanıcı onaylı alan provenansını,\n- model sürümleri ve sonuç anlık görüntülerini', 1)
marker = '## Deney kayıtları\n'
section = r'''## Metinden deney hazırlama

`1.7.0` ile üst araç çubuğundaki **Metinden Hazırla** akışı serbest Türkçe gözlem notunu doğrudan forma yazmak yerine önce güvenli bir taslağa dönüştürür:

- güvenle eşlenen alanlar `Bulundu`,
- birimi eksik veya çelişkili ifadeler `Kontrol gerekli`,
- ek provenans gerektiren/otomatik uygulanamayan ifadeler `Kullanılamadı`

olarak ayrılır. Her bulunan satırda mevcut değer ile önerilen değer yan yana gösterilir ve kullanıcı alan bazında `uygula / atla` seçer. Bu sürüm çevrimdışı deterministik parser kullanır; harici AI servisi yoktur. Kaynak metin ve yalnız kullanıcı tarafından uygulanan alanlar deney provenansında korunur.

'''
if marker in text and section not in text:
    text = text.replace(marker, section + marker, 1)
p.write_text(text)

# ---------------------------------------------------------------------------
# Persistence/report tests.
# ---------------------------------------------------------------------------
Path('tests/text-experiment-setup-persistence.test.ts').write_text(r'''import { describe, expect, it } from 'vitest';
import { createPortableExperimentFile, parsePortableExperimentFile } from '../src/shared/portable';
import { createExperimentHtmlReport } from '../src/report/html-report';
import { DEFAULT_SIMULATOR_INPUTS, type SavedExperiment } from '../src/shared/simulator';

function experiment(): SavedExperiment {
  return {
    id: 'text-setup-test',
    name: 'Metinden hazırlanan deney',
    createdAtIso: '2026-08-08T12:00:00.000Z',
    updatedAtIso: '2026-08-08T12:05:00.000Z',
    scenarioId: 'target-visibility',
    inputs: { ...DEFAULT_SIMULATOR_INPUTS },
    textSetupHistory: [{
      parserVersion: '0.1.0',
      sourceText: 'Mesafe 25 km. Standart kırılma k=0,13.',
      appliedAtIso: '2026-08-08T12:01:00.000Z',
      appliedFields: [
        { fieldId: 'surfaceDistanceKm', displayValue: '25 km', sourceExcerpt: 'Mesafe 25 km' },
        { fieldId: 'refractionCoefficient', displayValue: 'k=0,13', sourceExcerpt: 'k=0,13' }
      ]
    }],
    modelVersions: {},
    predictions: []
  };
}

describe('text experiment setup persistence', () => {
  it('round-trips user-approved parser provenance through portable JSON', () => {
    const portable = createPortableExperimentFile(experiment(), '1.7.0', '2026-08-08T12:10:00.000Z');
    const parsed = parsePortableExperimentFile(portable).experiment;
    expect(parsed.textSetupHistory).toEqual(experiment().textSetupHistory);
  });

  it('renders escaped source provenance into the offline HTML report', () => {
    const source = experiment();
    source.textSetupHistory![0]!.sourceText = '<script>alert(1)</script> Mesafe 25 km';
    const report = createExperimentHtmlReport(source, '2026-08-08T12:10:00.000Z');
    expect(report).toContain('Metinden deney hazırlama provenansı');
    expect(report).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(report).not.toContain('<script>alert(1)</script>');
  });

  it('rejects malformed or oversized parser provenance', () => {
    const portable = createPortableExperimentFile(experiment(), '1.7.0');
    const tampered = structuredClone(portable) as unknown as { experiment: { textSetupHistory: unknown } };
    tampered.experiment.textSetupHistory = [{
      parserVersion: '0.1.0',
      sourceText: 'x'.repeat(10_001),
      appliedAtIso: '2026-08-08T12:01:00.000Z',
      appliedFields: []
    }];
    expect(() => parsePortableExperimentFile(tampered)).toThrow();
  });
});
''')

# Remove temporary patch machinery from final product diff.
Path('scripts/apply_stage_5_6_integration.py').unlink(missing_ok=True)
Path('.github/workflows/apply-stage-5-6-integration.yml').unlink(missing_ok=True)
