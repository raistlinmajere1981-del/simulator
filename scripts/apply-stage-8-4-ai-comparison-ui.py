#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'src/renderer/src/dialogs.tsx'


def replace_once(text: str, old: str, new: str, marker: str) -> str:
    if marker in text:
        print(f'[ok] already applied: {marker}')
        return text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'Expected exactly one match for {marker}, found {count}')
    print(f'[updated] {marker}')
    return text.replace(old, new, 1)


text = TARGET.read_text(encoding='utf-8')

text = replace_once(
    text,
    "import { createAiAnalysisPackage } from '../../shared/ai-analysis-package';",
    "import { createAiAnalysisPackage, createAiComparisonPackage } from '../../shared/ai-analysis-package';",
    'createAiComparisonPackage import'
)

comparison_dialog = r'''
function AiComparisonPackageDialog({
  experiments,
  onClose
}: {
  experiments: SavedExperiment[];
  onClose(): void;
}): React.JSX.Element {
  const text = useMemo(() => createAiComparisonPackage(experiments), [experiments]);
  const [copyMessage, setCopyMessage] = useState('');
  const resultCount = experiments.reduce((sum, experiment) => sum + experiment.predictions.length, 0);

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose} style={{ zIndex: 1200 }}>
      <section
        aria-label="AI karşılaştırma paketi"
        className="dialog-card data-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        style={{ width: 'min(1180px, 95vw)', maxWidth: '1180px' }}
      >
        <header>
          <div>
            <span className="eyebrow">GGL-AI-COMPARISON v1</span>
            <h2>AI Karşılaştırma Paketi</h2>
          </div>
          <button className="dialog-close" type="button" onClick={onClose}>×</button>
        </header>

        <div className="portable-info">
          <strong>{experiments.length} bağımsız deney</strong>
          <span>
            Her deney ayrı EXPERIMENT bloğunda tutulur. AI yalnız anlamı ve birimi aynı metrikleri doğrudan karşılaştırmalı; farklı senaryoların sonuçları otomatik olarak eşdeğer sayılmaz.
          </span>
        </div>

        <textarea
          aria-label="AI karşılaştırma paketi metni"
          readOnly
          spellCheck={false}
          value={text}
          style={{
            width: '100%',
            minHeight: '58vh',
            resize: 'vertical',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: '12px',
            lineHeight: 1.45,
            boxSizing: 'border-box'
          }}
        />

        <footer>
          <span style={{ marginRight: 'auto', opacity: 0.8 }}>
            {copyMessage || `${text.length.toLocaleString('tr-TR')} karakter · ${experiments.length} deney · ${resultCount} hesap sonucu`}
          </span>
          <button className="secondary-button" type="button" onClick={onClose}>Kapat</button>
          <button
            className="primary-button"
            type="button"
            onClick={() => void copyText(text).then((copied) => {
              setCopyMessage(copied ? 'AI karşılaştırma paketi panoya kopyalandı.' : 'Otomatik kopyalama başarısız; metni seçip kopyalayabilirsin.');
            })}
          >
            Panoya Kopyala
          </button>
        </footer>
      </section>
    </div>
  );
}

'''
text = replace_once(
    text,
    'export function DataManagerDialog({\n',
    comparison_dialog + 'export function DataManagerDialog({\n',
    'function AiComparisonPackageDialog('
)

text = replace_once(
    text,
    "  const [analysisExperiment, setAnalysisExperiment] = useState<SavedExperiment>();\n",
    "  const [analysisExperiment, setAnalysisExperiment] = useState<SavedExperiment>();\n  const [selectedAnalysisIds, setSelectedAnalysisIds] = useState<string[]>([]);\n  const [comparisonExperiments, setComparisonExperiments] = useState<SavedExperiment[]>();\n",
    'selectedAnalysisIds'
)

text = replace_once(
    text,
    "      setAnalysisExperiment(undefined);\n",
    "      setAnalysisExperiment(undefined);\n      setSelectedAnalysisIds([]);\n      setComparisonExperiments(undefined);\n",
    'setComparisonExperiments(undefined);'
)

compare_controls = r'''
        <div className="portable-info">
          <strong>AI karşılaştırma seçimi</strong>
          <span>
            2-12 kayıt seç. Paket deney sınırlarını korur ve karşılaştırılabilir olmayan metriklerin eşdeğer sayılmamasını AI görevine açıkça yazar.
          </span>
          <button
            className="primary-button"
            disabled={selectedAnalysisIds.length < 2 || selectedAnalysisIds.length > 12}
            type="button"
            onClick={() => setComparisonExperiments(
              experiments.filter((experiment) => selectedAnalysisIds.includes(experiment.id))
            )}
          >
            AI Karşılaştırması ({selectedAnalysisIds.length})
          </button>
        </div>

'''
text = replace_once(
    text,
    "        {experiments.length === 0 ? (\n",
    compare_controls + "        {experiments.length === 0 ? (\n",
    'AI Karşılaştırması ({selectedAnalysisIds.length})'
)

selection_button = r'''
                  <button
                    className={selectedAnalysisIds.includes(experiment.id) ? 'primary-button' : 'secondary-button'}
                    disabled={Boolean(busyAction) || (!selectedAnalysisIds.includes(experiment.id) && selectedAnalysisIds.length >= 12)}
                    type="button"
                    onClick={() => setSelectedAnalysisIds((current) => current.includes(experiment.id)
                      ? current.filter((id) => id !== experiment.id)
                      : [...current, experiment.id])}
                  >
                    {selectedAnalysisIds.includes(experiment.id) ? 'Seçili' : 'Karşılaştır'}
                  </button>
'''
text = replace_once(
    text,
    "                  <button\n                    className=\"secondary-button\"\n                    disabled={Boolean(busyAction)}\n                    type=\"button\"\n                    onClick={() => setAnalysisExperiment(experiment)}\n                  >\n                    AI Paketi\n                  </button>\n",
    selection_button + "                  <button\n                    className=\"secondary-button\"\n                    disabled={Boolean(busyAction)}\n                    type=\"button\"\n                    onClick={() => setAnalysisExperiment(experiment)}\n                  >\n                    AI Paketi\n                  </button>\n",
    "? 'Seçili' : 'Karşılaştır'"
)

comparison_mount = r'''
      {comparisonExperiments && (
        <AiComparisonPackageDialog
          experiments={comparisonExperiments}
          onClose={() => setComparisonExperiments(undefined)}
        />
      )}
'''
text = replace_once(
    text,
    "      {analysisExperiment && (\n        <AiAnalysisPackageDialog\n          experiment={analysisExperiment}\n          onClose={() => setAnalysisExperiment(undefined)}\n        />\n      )}\n",
    "      {analysisExperiment && (\n        <AiAnalysisPackageDialog\n          experiment={analysisExperiment}\n          onClose={() => setAnalysisExperiment(undefined)}\n        />\n      )}\n" + comparison_mount,
    '<AiComparisonPackageDialog'
)

TARGET.write_text(text, encoding='utf-8')
print('Stage 8.4 AI comparison UI integration applied successfully.')
