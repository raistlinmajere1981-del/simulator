#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'src/renderer/src/AppNext.tsx'


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
    "import { AiWorkflowDialog } from './AiWorkflowDialog';",
    "import { AiWorkflowDialog } from './AiWorkflowDialog';\nimport { AiGuideDialog } from './AiGuideDialog';",
    "import { AiGuideDialog } from './AiGuideDialog';"
)

app = replace_once(
    app,
    "  const [aiWorkflowExperiment, setAiWorkflowExperiment] = useState<SavedExperiment>();\n  const [textSetupHistory, setTextSetupHistory] = useState<TextExperimentSetupProvenance[]>([]);",
    "  const [aiWorkflowExperiment, setAiWorkflowExperiment] = useState<SavedExperiment>();\n  const [aiGuideOpen, setAiGuideOpen] = useState(false);\n  const [textSetupHistory, setTextSetupHistory] = useState<TextExperimentSetupProvenance[]>([]);",
    "const [aiGuideOpen, setAiGuideOpen]"
)

app = replace_once(
    app,
    "          }}>◇ AI ile Analiz</button>\n          <button type=\"button\" onClick={() => setDataManagerOpen(true)}>▤ Veri Yöneticisi</button>",
    "          }}>◇ AI ile Analiz</button>\n          <button type=\"button\" onClick={() => setAiGuideOpen(true)}>▧ AI Kılavuzu</button>\n          <button type=\"button\" onClick={() => setDataManagerOpen(true)}>▤ Veri Yöneticisi</button>",
    "▧ AI Kılavuzu"
)

app = replace_once(
    app,
    "      <TextExperimentSetupDialog\n",
    "      {aiGuideOpen && <AiGuideDialog onClose={() => setAiGuideOpen(false)} />}\n      <TextExperimentSetupDialog\n",
    "{aiGuideOpen && <AiGuideDialog"
)

APP.write_text(app, encoding='utf-8')
print('Stage 8.6 in-app AI guide integration applied successfully.')
