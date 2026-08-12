#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEXT_SETUP = ROOT / 'src/shared/text-experiment-setup.ts'
AI_DIALOG = ROOT / 'src/renderer/src/AiWorkflowDialog.tsx'
TEXT_DIALOG = ROOT / 'src/renderer/src/TextExperimentSetupDialog.tsx'
APP = ROOT / 'src/renderer/src/AppNext.tsx'
PORTABLE_SOURCES = ROOT / 'src/shared/portable-sources.ts'
REPORT_PROVENANCE = ROOT / 'src/report/report-provenance.ts'
AI_PACKAGE = ROOT / 'src/shared/ai-analysis-package.ts'
PACKAGE = ROOT / 'package.json'
PRELOAD = ROOT / 'src/preload/index.ts'


def fail(message: str) -> None:
    raise RuntimeError(message)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old in text:
        if text.count(old) != 1:
            fail(f'{label}: expected one old marker, found {text.count(old)}')
        print(f'[updated] {label}')
        return text.replace(old, new, 1)
    if new in text:
        print(f'[ok] already applied: {label}')
        return text
    fail(f'{label}: expected marker not found')


# shared/text-experiment-setup.ts
text = TEXT_SETUP.read_text(encoding='utf-8')
text = replace_once(
    text,
    "import type { ModelInputUncertaintySettings } from './uncertainty';\n",
    "import type { ModelInputUncertaintySettings } from './uncertainty';\nimport type { AiFollowUpLineage } from './ai-lineage';\n",
    'text setup AI lineage import'
)
text = replace_once(
    text,
    """export interface TextExperimentSetupProvenance {
  parserVersion: string;
  sourceText: string;
  appliedAtIso: string;
  appliedFields: TextSetupAppliedField[];
}
""",
    """export type TextExperimentSetupSourceKind = 'manual-text' | 'ai-follow-up';

export interface TextExperimentSetupProvenance {
  parserVersion: string;
  sourceText: string;
  appliedAtIso: string;
  sourceKind?: TextExperimentSetupSourceKind;
  aiLineage?: AiFollowUpLineage;
  appliedFields: TextSetupAppliedField[];
}

export interface TextSetupProvenanceContext {
  sourceKind: TextExperimentSetupSourceKind;
  aiLineage?: AiFollowUpLineage;
}
""",
    'text setup provenance contract'
)
text = replace_once(
    text,
    """export function buildExperimentSetupApplication(
  draft: ExperimentSetupDraft,
  selectedCandidateIds: readonly string[],
  appliedAtIso = new Date().toISOString()
): ExperimentSetupApplication {
""",
    """export function buildExperimentSetupApplication(
  draft: ExperimentSetupDraft,
  selectedCandidateIds: readonly string[],
  appliedAtIso = new Date().toISOString(),
  provenanceContext?: TextSetupProvenanceContext
): ExperimentSetupApplication {
""",
    'text setup provenance context argument'
)
text = replace_once(
    text,
    """  if (coordinateApplied) inputChanges.distanceSource = 'coordinates';
  if (atmosphereMode !== undefined) inputChanges.useStandardRefraction = atmosphereMode === 'standard';

  return {
""",
    """  if (coordinateApplied) inputChanges.distanceSource = 'coordinates';
  if (atmosphereMode !== undefined) inputChanges.useStandardRefraction = atmosphereMode === 'standard';

  const sourceKind = provenanceContext?.sourceKind ?? 'manual-text';
  const aiLineage = provenanceContext?.aiLineage;
  if ((sourceKind === 'ai-follow-up') !== (aiLineage !== undefined)) {
    throw new Error('AI takip provenansı için kaynak türü ve lineage kaydı birlikte bulunmalı.');
  }

  return {
""",
    'text setup provenance validation'
)
text = replace_once(
    text,
    """    provenance: {
      parserVersion: draft.parserVersion,
      sourceText: draft.sourceText,
      appliedAtIso,
      appliedFields: selected.map((candidate) => ({
""",
    """    provenance: {
      parserVersion: draft.parserVersion,
      sourceText: draft.sourceText,
      appliedAtIso,
      sourceKind,
      ...(aiLineage ? { aiLineage: { ...aiLineage } } : {}),
      appliedFields: selected.map((candidate) => ({
""",
    'text setup lineage persistence'
)
TEXT_SETUP.write_text(text, encoding='utf-8')

# renderer/AiWorkflowDialog.tsx
text = AI_DIALOG.read_text(encoding='utf-8')
text = replace_once(
    text,
    "import { createAiAnalysisPackage } from '../../shared/ai-analysis-package';\n",
    "import { createAiAnalysisPackage, GGL_AI_ANALYSIS_PACKAGE_VERSION } from '../../shared/ai-analysis-package';\nimport { createAiFollowUpLineage, type AiFollowUpLineage } from '../../shared/ai-lineage';\n",
    'AI workflow lineage imports'
)
text = replace_once(
    text,
    """  experiment: SavedExperiment;
  onClose(): void;
  onUseTest(testBlock: string): void;
}): React.JSX.Element {
  const packageText = useMemo(() => createAiAnalysisPackage(experiment), [experiment]);
  const [copyMessage, setCopyMessage] = useState('');
  const [aiReply, setAiReply] = useState('');
""",
    """  experiment: SavedExperiment;
  onClose(): void;
  onUseTest(testBlock: string, lineage: AiFollowUpLineage): void;
}): React.JSX.Element {
  const [analysisGeneratedAtIso] = useState(() => new Date().toISOString());
  const packageText = useMemo(
    () => createAiAnalysisPackage(experiment, analysisGeneratedAtIso),
    [analysisGeneratedAtIso, experiment]
  );
  const [copyMessage, setCopyMessage] = useState('');
  const [lineageMessage, setLineageMessage] = useState('');
  const [aiReply, setAiReply] = useState('');
""",
    'AI workflow stable analysis snapshot'
)
text = replace_once(
    text,
    '<span className="eyebrow">AŞAMA 8.5 · KAYITSIZ AKTİF DENEY</span>',
    '<span className="eyebrow">AŞAMA 8.7 · AI TAKİP SOY AĞACI</span>',
    'AI workflow stage label'
)
text = replace_once(
    text,
    """          <div className="portable-info" style={{ margin: 0 }}>
            <strong>{extraction.status === 'found' ? 'TEST BLOĞU HAZIR' : 'KONTROLLÜ AKTARIM'}</strong>
            <span>{extraction.message}</span>
          </div>
""",
    """          <div className="portable-info" style={{ margin: 0 }}>
            <strong>{extraction.status === 'found' ? 'TEST BLOĞU HAZIR' : 'KONTROLLÜ AKTARIM'}</strong>
            <span>{extraction.message}</span>
            {lineageMessage && <small>{lineageMessage}</small>}
          </div>
""",
    'AI workflow lineage status'
)
text = replace_once(
    text,
    """          <span style={{ marginRight: 'auto', opacity: 0.76 }}>
            AI hiçbir alanı doğrudan değiştirmez; sonraki adım mevcut Metinden Hazırla önizlemesidir.
          </span>
""",
    """          <span style={{ marginRight: 'auto', opacity: 0.76 }}>
            AI hiçbir alanı doğrudan değiştirmez. Serbest AI yanıtı kaydedilmez; yalnız kanonik test bloğu ve SHA-256 soy ağacı kontrollü önizlemeye taşınır.
          </span>
""",
    'AI workflow lineage footer'
)
text = replace_once(
    text,
    """            onClick={() => {
              if (extraction.status !== 'found') return;
              onUseTest(extraction.block);
            }}
""",
    """            onClick={() => {
              if (extraction.status !== 'found') return;
              const testBlock = extraction.block;
              setLineageMessage('Kaynak analiz ve kanonik test için SHA-256 hesaplanıyor…');
              void createAiFollowUpLineage({
                sourceExperiment: experiment,
                analysisPackageVersion: GGL_AI_ANALYSIS_PACKAGE_VERSION,
                analysisGeneratedAtIso,
                analysisPackageText: packageText,
                canonicalTestBlock: testBlock
              }).then((lineage) => {
                onUseTest(testBlock, lineage);
              }).catch((caught) => {
                setLineageMessage(caught instanceof Error
                  ? caught.message
                  : 'AI soy ağacı hashleri oluşturulamadı; test aktarılmadı.');
              });
            }}
""",
    'AI workflow hash-before-transfer'
)
AI_DIALOG.write_text(text, encoding='utf-8')

# renderer/TextExperimentSetupDialog.tsx
text = TEXT_DIALOG.read_text(encoding='utf-8')
text = replace_once(
    text,
    """  type ExperimentSetupApplication,
  type ExperimentSetupCandidate,
  type ExperimentSetupFieldId
} from '../../shared/text-experiment-setup';
""",
    """  type ExperimentSetupApplication,
  type ExperimentSetupCandidate,
  type ExperimentSetupFieldId,
  type TextSetupProvenanceContext
} from '../../shared/text-experiment-setup';
""",
    'text dialog provenance type import'
)
text = replace_once(
    text,
    """  inputs,
  atmosphereMode,
  modelUncertainty,
  onClose,
""",
    """  inputs,
  atmosphereMode,
  modelUncertainty,
  provenanceContext,
  onClose,
""",
    'text dialog provenance prop destructuring'
)
text = replace_once(
    text,
    """  inputs: SimulatorInputs;
  atmosphereMode: AtmosphereMode;
  modelUncertainty: ModelInputUncertaintySettings;
  onClose(): void;
""",
    """  inputs: SimulatorInputs;
  atmosphereMode: AtmosphereMode;
  modelUncertainty: ModelInputUncertaintySettings;
  provenanceContext?: TextSetupProvenanceContext;
  onClose(): void;
""",
    'text dialog provenance prop type'
)
text = replace_once(
    text,
    """          <p className="text-setup-intro">
            Gözlem notunu normal cümlelerle yaz veya başka bir AI'nin ürettiği <code>GGL-AI-TEST v1</code> bloğunu doğrudan yapıştır. Sistem yalnız güvenle eşleyebildiği değerleri taslağa çıkarır;
            <b> hiçbir alan önizleme ve onay olmadan değişmez.</b>
          </p>
          <textarea
            autoFocus
            maxLength={10_000}
""",
    """          <p className="text-setup-intro">
            Gözlem notunu normal cümlelerle yaz veya başka bir AI'nin ürettiği <code>GGL-AI-TEST v1</code> bloğunu doğrudan yapıştır. Sistem yalnız güvenle eşleyebildiği değerleri taslağa çıkarır;
            <b> hiçbir alan önizleme ve onay olmadan değişmez.</b>
          </p>
          {provenanceContext?.sourceKind === 'ai-follow-up' && (
            <p className="text-setup-note">
              Bu blok AI çalışma döngüsünden SHA-256 soy ağacıyla geldi. Hash eşleşmesini korumak için kaynak blok bu adımda salt okunurdur; uygulanacak alanları yine sen seçersin.
            </p>
          )}
          <textarea
            autoFocus
            readOnly={provenanceContext?.sourceKind === 'ai-follow-up'}
            maxLength={10_000}
""",
    'text dialog lineage notice and readonly source'
)
text = replace_once(
    text,
    "onApply(buildExperimentSetupApplication(draft, [...selected]));",
    "onApply(buildExperimentSetupApplication(draft, [...selected], undefined, provenanceContext));",
    'text dialog pass lineage context'
)
TEXT_DIALOG.write_text(text, encoding='utf-8')

# renderer/AppNext.tsx
text = APP.read_text(encoding='utf-8')
text = replace_once(
    text,
    """  ExperimentSetupApplication,
  TextExperimentSetupProvenance
} from '../../shared/text-experiment-setup';
""",
    """  ExperimentSetupApplication,
  TextExperimentSetupProvenance,
  TextSetupProvenanceContext
} from '../../shared/text-experiment-setup';
""",
    'AppNext lineage type import'
)
text = replace_once(
    text,
    """  const [textSetupOpen, setTextSetupOpen] = useState(false);
  const [textSetupInitialText, setTextSetupInitialText] = useState('');
  const [aiWorkflowExperiment, setAiWorkflowExperiment] = useState<SavedExperiment>();
""",
    """  const [textSetupOpen, setTextSetupOpen] = useState(false);
  const [textSetupInitialText, setTextSetupInitialText] = useState('');
  const [textSetupProvenanceContext, setTextSetupProvenanceContext] = useState<TextSetupProvenanceContext>();
  const [aiWorkflowExperiment, setAiWorkflowExperiment] = useState<SavedExperiment>();
""",
    'AppNext lineage state'
)
text = replace_once(
    text,
    """          <button type="button" onClick={() => {
            setTextSetupInitialText('');
            setTextSetupOpen(true);
          }}>✦ Metinden Hazırla</button>
""",
    """          <button type="button" onClick={() => {
            setTextSetupInitialText('');
            setTextSetupProvenanceContext(undefined);
            setTextSetupOpen(true);
          }}>✦ Metinden Hazırla</button>
""",
    'AppNext manual text source reset'
)
text = replace_once(
    text,
    """        atmosphereMode={atmosphereState.mode}
        modelUncertainty={photoModelUncertainty}
        onClose={() => {
          setTextSetupOpen(false);
          setTextSetupInitialText('');
        }}
""",
    """        atmosphereMode={atmosphereState.mode}
        modelUncertainty={photoModelUncertainty}
        provenanceContext={textSetupProvenanceContext}
        onClose={() => {
          setTextSetupOpen(false);
          setTextSetupInitialText('');
          setTextSetupProvenanceContext(undefined);
        }}
""",
    'AppNext pass and clear lineage context'
)
text = replace_once(
    text,
    """          onUseTest={(testBlock) => {
            setAiWorkflowExperiment(undefined);
            setTextSetupInitialText(testBlock);
            setTextSetupOpen(true);
          }}
""",
    """          onUseTest={(testBlock, lineage) => {
            setAiWorkflowExperiment(undefined);
            setTextSetupInitialText(testBlock);
            setTextSetupProvenanceContext({ sourceKind: 'ai-follow-up', aiLineage: lineage });
            setTextSetupOpen(true);
          }}
""",
    'AppNext AI test lineage transfer'
)
APP.write_text(text, encoding='utf-8')

# shared/portable-sources.ts
text = PORTABLE_SOURCES.read_text(encoding='utf-8')
text = replace_once(
    text,
    "import type { TextExperimentSetupProvenance } from './text-experiment-setup';\n",
    "import type { TextExperimentSetupProvenance } from './text-experiment-setup';\nimport { AI_FOLLOW_UP_LINEAGE_VERSION, isSha256Hex } from './ai-lineage';\n",
    'portable lineage validation imports'
)
old_parser = """export function parseTextSetupHistory(value: unknown): TextExperimentSetupProvenance[] | null {
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
"""
new_parser = """export function parseTextSetupHistory(value: unknown): TextExperimentSetupProvenance[] | null {
  if (!Array.isArray(value) || value.length > 50) return null;
  const history: TextExperimentSetupProvenance[] = [];
  for (const item of value) {
    if (!isRecord(item) || !isNonEmptyString(item.parserVersion) ||
      typeof item.sourceText !== 'string' || item.sourceText.length > 10_000 ||
      !isIsoDate(item.appliedAtIso) || !Array.isArray(item.appliedFields) ||
      item.appliedFields.length > 64 ||
      (item.sourceKind !== undefined && item.sourceKind !== 'manual-text' && item.sourceKind !== 'ai-follow-up')) return null;

    const sourceKind = item.sourceKind as TextExperimentSetupProvenance['sourceKind'];
    let aiLineage: NonNullable<TextExperimentSetupProvenance['aiLineage']> | undefined;
    if (item.aiLineage !== undefined) {
      const lineage = item.aiLineage;
      if (!isRecord(lineage) || lineage.version !== AI_FOLLOW_UP_LINEAGE_VERSION ||
        !isNonEmptyString(lineage.analysisPackageVersion) || lineage.analysisPackageVersion.length > 40 ||
        !isIsoDate(lineage.analysisGeneratedAtIso) ||
        !isNonEmptyString(lineage.sourceExperimentId) || lineage.sourceExperimentId.length > 200 ||
        !isIsoDate(lineage.sourceExperimentUpdatedAtIso) ||
        !isSha256Hex(lineage.analysisSha256) || !isSha256Hex(lineage.canonicalTestSha256)) return null;
      aiLineage = {
        version: AI_FOLLOW_UP_LINEAGE_VERSION,
        analysisPackageVersion: lineage.analysisPackageVersion.trim(),
        analysisGeneratedAtIso: lineage.analysisGeneratedAtIso,
        sourceExperimentId: lineage.sourceExperimentId.trim(),
        sourceExperimentUpdatedAtIso: lineage.sourceExperimentUpdatedAtIso,
        analysisSha256: lineage.analysisSha256,
        canonicalTestSha256: lineage.canonicalTestSha256
      };
    }
    if ((sourceKind === 'ai-follow-up') !== (aiLineage !== undefined)) return null;

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
      ...(sourceKind === undefined ? {} : { sourceKind }),
      ...(aiLineage ? { aiLineage } : {}),
      appliedFields
    });
  }
  return history;
}
"""
text = replace_once(text, old_parser, new_parser, 'portable text setup lineage parser')
PORTABLE_SOURCES.write_text(text, encoding='utf-8')

# report/report-provenance.ts
text = REPORT_PROVENANCE.read_text(encoding='utf-8')
old_report = """export function textSetupHistorySection(experiment: SavedExperiment): string {
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
"""
new_report = """export function textSetupHistorySection(experiment: SavedExperiment): string {
  const history = experiment.textSetupHistory;
  if (!history || history.length === 0) return '';
  const entries = history.map((item, index) => {
    const lineage = item.sourceKind === 'ai-follow-up' ? item.aiLineage : undefined;
    const sourceLabel = lineage ? 'AI takip testi' : 'Manuel metin';
    const lineageRows = lineage ? `
      <h3>AI soy ağacı</h3>
      <table><tbody>
        <tr><td>Lineage sürümü</td><td>${escapeHtml(lineage.version)}</td></tr>
        <tr><td>Kaynak analiz paketi</td><td>GGL-AI-ANALYSIS ${escapeHtml(lineage.analysisPackageVersion)} · ${formatDate(lineage.analysisGeneratedAtIso)}</td></tr>
        <tr><td>Kaynak deney</td><td><code>${escapeHtml(lineage.sourceExperimentId)}</code> · snapshot ${formatDate(lineage.sourceExperimentUpdatedAtIso)}</td></tr>
        <tr><td>Analiz SHA-256</td><td><code>${escapeHtml(lineage.analysisSha256)}</code></td></tr>
        <tr><td>Kanonik test SHA-256</td><td><code>${escapeHtml(lineage.canonicalTestSha256)}</code></td></tr>
      </tbody></table>` : '';
    return `
    <div class="source-card">
      <div class="source-card-heading"><strong>Metinden uygulama ${index + 1}</strong><span>${formatDate(item.appliedAtIso)} · parser ${escapeHtml(item.parserVersion)} · ${sourceLabel}</span></div>
      <p>${escapeHtml(item.sourceText)}</p>
      ${lineageRows}
      <table><thead><tr><th>Alan</th><th>Uygulanan değer</th><th>Kaynak ifade</th></tr></thead><tbody>
        ${item.appliedFields.map((field) => `<tr><td>${escapeHtml(field.fieldId)}</td><td>${escapeHtml(field.displayValue)}</td><td>${escapeHtml(field.sourceExcerpt)}</td></tr>`).join('')}
      </tbody></table>
    </div>`;
  }).join('');
  return `
    <section class="model-section vertical-section">
      <header class="model-heading"><div><h2>Metinden deney hazırlama provenansı</h2><span>Kullanıcı onayıyla forma uygulanan alanlar ve varsa AI takip soy ağacı</span></div><strong class="status status-compatible">${history.length} uygulama</strong></header>
      <p>Bu metin parser girdisidir; fiziksel ölçüm kaynağının kendisi değildir. AI takip akışında dış AI'nin serbest açıklaması saklanmaz; yalnız kanonik test bloğu, hash zinciri ve kullanıcı tarafından uygulanan alanlar korunur.</p>
      <div class="trace-list">${entries}</div>
    </section>`;
}
"""
text = replace_once(text, old_report, new_report, 'HTML report AI lineage section')
REPORT_PROVENANCE.write_text(text, encoding='utf-8')

# shared/ai-analysis-package.ts
text = AI_PACKAGE.read_text(encoding='utf-8')
lineage_helper = """function textSetupLineageLines(experiment: SavedExperiment): string[] {
  const history = experiment.textSetupHistory ?? [];
  const aiEntries = history.filter((item) => item.sourceKind === 'ai-follow-up' && item.aiLineage !== undefined);
  const lines = [
    `provenance.text_setup_count: ${history.length}`,
    `provenance.ai_follow_up_count: ${aiEntries.length}`
  ];
  aiEntries.forEach((item, index) => {
    const lineage = item.aiLineage!;
    const prefix = `provenance.ai_follow_up.${index + 1}`;
    lines.push(`${prefix}.lineage_version: ${lineage.version}`);
    lines.push(`${prefix}.analysis_package_version: ${lineage.analysisPackageVersion}`);
    lines.push(`${prefix}.analysis_generated_at_utc: ${lineage.analysisGeneratedAtIso}`);
    lines.push(`${prefix}.source_experiment_id: ${scalar(lineage.sourceExperimentId)}`);
    lines.push(`${prefix}.source_experiment_updated_at_utc: ${lineage.sourceExperimentUpdatedAtIso}`);
    lines.push(`${prefix}.analysis_sha256: ${lineage.analysisSha256}`);
    lines.push(`${prefix}.canonical_test_sha256: ${lineage.canonicalTestSha256}`);
  });
  return lines;
}

"""
text = replace_once(
    text,
    "function experimentLines(experiment: SavedExperiment): string[] {\n",
    lineage_helper + "function experimentLines(experiment: SavedExperiment): string[] {\n",
    'AI analysis lineage formatter'
)
text = replace_once(
    text,
    "    `provenance.text_setup_count: ${experiment.textSetupHistory?.length ?? 0}`,\n",
    "    ...textSetupLineageLines(experiment),\n",
    'AI analysis hash-only lineage summary'
)
AI_PACKAGE.write_text(text, encoding='utf-8')

# version
text = PACKAGE.read_text(encoding='utf-8')
text = replace_once(text, '"version": "1.33.1"', '"version": "1.34.0"', 'package version 1.34.0')
PACKAGE.write_text(text, encoding='utf-8')

text = PRELOAD.read_text(encoding='utf-8')
text = replace_once(text, "version: '1.33.1'", "version: '1.34.0'", 'preload version 1.34.0')
PRELOAD.write_text(text, encoding='utf-8')

print('Stage 8.7 AI lineage integration applied successfully.')
