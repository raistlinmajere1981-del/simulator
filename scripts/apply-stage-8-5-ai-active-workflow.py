#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'src/renderer/src/AppNext.tsx'
TEXT_DIALOG = ROOT / 'src/renderer/src/TextExperimentSetupDialog.tsx'


def replace_once(text: str, old: str, new: str, marker: str) -> str:
    if marker in text:
        print(f'[ok] already applied: {marker}')
        return text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'Expected exactly one match for {marker}, found {count}')
    print(f'[updated] {marker}')
    return text.replace(old, new, 1)


app = APP.read_text(encoding='utf-8')

app = replace_once(
    app,
    "import { TextExperimentSetupDialog } from './TextExperimentSetupDialog';",
    "import { TextExperimentSetupDialog } from './TextExperimentSetupDialog';\nimport { AiWorkflowDialog } from './AiWorkflowDialog';",
    "import { AiWorkflowDialog } from './AiWorkflowDialog';"
)

app = replace_once(
    app,
    "  const [textSetupOpen, setTextSetupOpen] = useState(false);\n  const [textSetupHistory, setTextSetupHistory] = useState<TextExperimentSetupProvenance[]>([]);",
    "  const [textSetupOpen, setTextSetupOpen] = useState(false);\n  const [textSetupInitialText, setTextSetupInitialText] = useState('');\n  const [aiWorkflowExperiment, setAiWorkflowExperiment] = useState<SavedExperiment>();\n  const [textSetupHistory, setTextSetupHistory] = useState<TextExperimentSetupProvenance[]>([]);",
    'const [aiWorkflowExperiment, setAiWorkflowExperiment]'
)

save_prefix = """  const saveExperiment = async (name: string): Promise<void> => {
    if (!modelUncertaintyReady) {
      setStorageMessage('Model girdi belirsizliği hesabı tamamlanmadan deney kaydedilmedi.');
      return;
    }
    const now = new Date().toISOString();
    const existing = savedExperiments.find((item) => item.id === activeExperimentId);
    const record: SavedExperiment = {
"""
record_prefix = """  const buildActiveExperimentRecord = (name: string, now = new Date().toISOString()): SavedExperiment => {
    const existing = savedExperiments.find((item) => item.id === activeExperimentId);
    return {
"""
app = replace_once(app, save_prefix, record_prefix, 'const buildActiveExperimentRecord =')

record_end = """      ]
    };

    try {
"""
save_restart = """      ]
    };
  };

  const saveExperiment = async (name: string): Promise<void> => {
    if (!modelUncertaintyReady) {
      setStorageMessage('Model girdi belirsizliği hesabı tamamlanmadan deney kaydedilmedi.');
      return;
    }
    const record = buildActiveExperimentRecord(name);

    try {
"""
app = replace_once(app, record_end, save_restart, 'const record = buildActiveExperimentRecord(name);')

old_actions = """        <div className=\"top-actions\">
          <button type=\"button\" onClick={() => setTextSetupOpen(true)}>✦ Metinden Hazırla</button>
          <button type=\"button\" onClick={() => setDataManagerOpen(true)}>▤ Veri Yöneticisi</button>
"""
new_actions = """        <div className=\"top-actions\">
          <button type=\"button\" onClick={() => {
            setTextSetupInitialText('');
            setTextSetupOpen(true);
          }}>✦ Metinden Hazırla</button>
          <button type=\"button\" onClick={() => {
            if (isCalculating) {
              setStorageMessage('Hesaplama tamamlanmadan AI paketi hazırlanmadı.');
              return;
            }
            if (!modelUncertaintyReady) {
              setStorageMessage('Model girdi belirsizliği hesabı tamamlanmadan AI paketi hazırlanmadı.');
              return;
            }
            setAiWorkflowExperiment(buildActiveExperimentRecord(
              activeExperimentName || defaultExperimentName(activeScenarioId)
            ));
          }}>◇ AI ile Analiz</button>
          <button type=\"button\" onClick={() => setDataManagerOpen(true)}>▤ Veri Yöneticisi</button>
"""
app = replace_once(app, old_actions, new_actions, '◇ AI ile Analiz')

old_text_dialog = """      <TextExperimentSetupDialog
        open={textSetupOpen}
        scenarioId={activeScenarioId}
"""
new_text_dialog = """      <TextExperimentSetupDialog
        open={textSetupOpen}
        initialText={textSetupInitialText}
        scenarioId={activeScenarioId}
"""
app = replace_once(app, old_text_dialog, new_text_dialog, 'initialText={textSetupInitialText}')

app = replace_once(
    app,
    "        onClose={() => setTextSetupOpen(false)}\n        onApply={applyTextExperimentSetup}\n      />",
    "        onClose={() => {\n          setTextSetupOpen(false);\n          setTextSetupInitialText('');\n        }}\n        onApply={applyTextExperimentSetup}\n      />",
    "setTextSetupInitialText('');\n        }}\n        onApply={applyTextExperimentSetup}"
)

workflow_mount = """      {aiWorkflowExperiment && (
        <AiWorkflowDialog
          experiment={aiWorkflowExperiment}
          onClose={() => setAiWorkflowExperiment(undefined)}
          onUseTest={(testBlock) => {
            setAiWorkflowExperiment(undefined);
            setTextSetupInitialText(testBlock);
            setTextSetupOpen(true);
          }}
        />
      )}
"""
app = replace_once(
    app,
    "      <SaveExperimentDialog\n",
    workflow_mount + "      <SaveExperimentDialog\n",
    '<AiWorkflowDialog'
)

APP.write_text(app, encoding='utf-8')

text_dialog = TEXT_DIALOG.read_text(encoding='utf-8')
text_dialog = replace_once(
    text_dialog,
    "export function TextExperimentSetupDialog({\n  open,\n  scenarioId,",
    "export function TextExperimentSetupDialog({\n  open,\n  initialText,\n  scenarioId,",
    '  initialText,\n  scenarioId,'
)
text_dialog = replace_once(
    text_dialog,
    "}: {\n  open: boolean;\n  scenarioId: SimulationScenarioId;",
    "}: {\n  open: boolean;\n  initialText?: string;\n  scenarioId: SimulationScenarioId;",
    'initialText?: string;'
)

preload_effect = """
  useEffect(() => {
    if (!open) return;
    const nextText = initialText ?? '';
    setText(nextText);
    if (nextText.trim().length === 0) {
      setDraftText(undefined);
      setSelected(new Set());
      return;
    }
    const next = parseExperimentSetupText(nextText);
    setDraftText(nextText);
    setSelected(new Set(next.candidates
      .filter((candidate) => candidate.status === 'found')
      .map((candidate) => candidate.id)));
  }, [initialText, open]);

"""
text_dialog = replace_once(
    text_dialog,
    "  const draft = useMemo(() => draftText === undefined ? undefined : parseExperimentSetupText(draftText), [draftText]);\n\n  useEffect(() => {",
    "  const draft = useMemo(() => draftText === undefined ? undefined : parseExperimentSetupText(draftText), [draftText]);\n" + preload_effect + "  useEffect(() => {",
    'const nextText = initialText ??'
)

TEXT_DIALOG.write_text(text_dialog, encoding='utf-8')
print('Stage 8.5 active AI workflow integration applied successfully.')
