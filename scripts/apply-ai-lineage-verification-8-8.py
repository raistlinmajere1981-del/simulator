#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIALOGS = ROOT / 'src/renderer/src/dialogs.tsx'
PACKAGE = ROOT / 'package.json'
PRELOAD = ROOT / 'src/preload/index.ts'


def fail(message: str) -> None:
    raise RuntimeError(message)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old in text:
        count = text.count(old)
        if count != 1:
            fail(f'{label}: expected one old marker, found {count}')
        print(f'[updated] {label}')
        return text.replace(old, new, 1)
    if new in text:
        print(f'[ok] already applied: {label}')
        return text
    fail(f'{label}: expected marker not found')


text = DIALOGS.read_text(encoding='utf-8')
text = replace_once(
    text,
    "import { PanelHelpButton } from './HelpSystem';\n",
    "import { PanelHelpButton } from './HelpSystem';\nimport { AiLineageDialog } from './AiLineageDialog';\n",
    'Data Manager lineage dialog import'
)
text = replace_once(
    text,
    """function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

""",
    """function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

function aiFollowUpCount(experiment: SavedExperiment): number {
  return experiment.textSetupHistory?.filter(
    (item) => item.sourceKind === 'ai-follow-up' && item.aiLineage !== undefined
  ).length ?? 0;
}

""",
    'Data Manager lineage count helper'
)
text = replace_once(
    text,
    """  const [analysisExperiment, setAnalysisExperiment] = useState<SavedExperiment>();
  const [selectedAnalysisIds, setSelectedAnalysisIds] = useState<string[]>([]);
  const [comparisonExperiments, setComparisonExperiments] = useState<SavedExperiment[]>();
""",
    """  const [analysisExperiment, setAnalysisExperiment] = useState<SavedExperiment>();
  const [lineageExperiment, setLineageExperiment] = useState<SavedExperiment>();
  const [selectedAnalysisIds, setSelectedAnalysisIds] = useState<string[]>([]);
  const [comparisonExperiments, setComparisonExperiments] = useState<SavedExperiment[]>();
""",
    'Data Manager lineage dialog state'
)
text = replace_once(
    text,
    """      setBusyAction(undefined);
      setAnalysisExperiment(undefined);
      setSelectedAnalysisIds([]);
      setComparisonExperiments(undefined);
""",
    """      setBusyAction(undefined);
      setAnalysisExperiment(undefined);
      setLineageExperiment(undefined);
      setSelectedAnalysisIds([]);
      setComparisonExperiments(undefined);
""",
    'Data Manager lineage state reset'
)
text = replace_once(
    text,
    """                    {experiment.photoCalibration
                      ? ' · fotoğraf provenansı kayıtlı'
                      : ' · fotoğraf kaydı yok'}
                  </small>
""",
    """                    {experiment.photoCalibration
                      ? ' · fotoğraf provenansı kayıtlı'
                      : ' · fotoğraf kaydı yok'}
                    {aiFollowUpCount(experiment) > 0
                      ? ` · AI takip ${aiFollowUpCount(experiment)}`
                      : ''}
                  </small>
""",
    'Data Manager lineage count indicator'
)
text = replace_once(
    text,
    """                  <button
                    className="secondary-button"
                    disabled={Boolean(busyAction)}
                    type="button"
                    onClick={() => setAnalysisExperiment(experiment)}
                  >
                    AI Paketi
                  </button>
                  <button
                    className="report-button"
""",
    """                  <button
                    className="secondary-button"
                    disabled={Boolean(busyAction)}
                    type="button"
                    onClick={() => setAnalysisExperiment(experiment)}
                  >
                    AI Paketi
                  </button>
                  {aiFollowUpCount(experiment) > 0 && (
                    <button
                      className="secondary-button"
                      disabled={Boolean(busyAction)}
                      type="button"
                      onClick={() => setLineageExperiment(experiment)}
                    >
                      AI Soy Ağacı
                    </button>
                  )}
                  <button
                    className="report-button"
""",
    'Data Manager lineage verification button'
)
text = replace_once(
    text,
    """      {comparisonExperiments && (
        <AiComparisonPackageDialog
          experiments={comparisonExperiments}
          onClose={() => setComparisonExperiments(undefined)}
        />
      )}
    </div>
""",
    """      {comparisonExperiments && (
        <AiComparisonPackageDialog
          experiments={comparisonExperiments}
          onClose={() => setComparisonExperiments(undefined)}
        />
      )}

      {lineageExperiment && (
        <AiLineageDialog
          experiment={lineageExperiment}
          experiments={experiments}
          onClose={() => setLineageExperiment(undefined)}
        />
      )}
    </div>
""",
    'Data Manager lineage verification dialog render'
)
DIALOGS.write_text(text, encoding='utf-8')

text = PACKAGE.read_text(encoding='utf-8')
text = replace_once(text, '"version": "1.34.0"', '"version": "1.34.1"', 'package version 1.34.1')
PACKAGE.write_text(text, encoding='utf-8')

text = PRELOAD.read_text(encoding='utf-8')
text = replace_once(text, "version: '1.34.0'", "version: '1.34.1'", 'preload version 1.34.1')
PRELOAD.write_text(text, encoding='utf-8')

print('Stage 8.8 AI lineage verification integration applied successfully.')
