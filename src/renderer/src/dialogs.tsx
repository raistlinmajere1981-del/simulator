import { useEffect, useMemo, useState } from 'react';
import type { ModelMetadata, ModelPrediction } from '../../shared/domain';
import { createAiAnalysisPackage, createAiComparisonPackage } from '../../shared/ai-analysis-package';
import type { SavedExperiment } from '../../shared/simulator';
import { PanelHelpButton } from './HelpSystem';

interface SaveExperimentDialogProps {
  initialName: string;
  open: boolean;
  onCancel(): void;
  onSave(name: string): Promise<void>;
}

export function SaveExperimentDialog({
  initialName,
  open,
  onCancel,
  onSave
}: SaveExperimentDialogProps): React.JSX.Element | null {
  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) setName(initialName);
  }, [initialName, open]);

  if (!open) return null;

  const submit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (name.trim().length === 0 || isSaving) return;

    setIsSaving(true);
    try {
      await onSave(name.trim());
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <form
        aria-label="Deneyi kaydet"
        className="dialog-card save-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => void submit(event)}
      >
        <header>
          <div>
            <span className="eyebrow">Yerel deney kaydı</span>
            <h2>Deneyi Kaydet</h2>
          </div>
          <button className="dialog-close" type="button" onClick={onCancel}>×</button>
        </header>
        <label className="dialog-field">
          <span>Deney adı</span>
          <input
            autoFocus
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
          />
        </label>
        <p className="dialog-help">
          Girdiler, model sürümleri, sonuç anlık görüntüsü ve hesap izleri cihazdaki uygulama veri klasörüne kaydedilir.
        </p>
        <footer>
          <button className="secondary-button" type="button" onClick={onCancel}>İptal</button>
          <button className="primary-button" disabled={name.trim().length === 0 || isSaving} type="submit">
            {isSaving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </footer>
      </form>
    </div>
  );
}

interface DataManagerDialogProps {
  experiments: SavedExperiment[];
  open: boolean;
  onClose(): void;
  onDelete(experiment: SavedExperiment): Promise<void>;
  onExport(experiment: SavedExperiment): Promise<void>;
  onImport(): Promise<void>;
  onLoad(experiment: SavedExperiment): void;
  onReport(experiment: SavedExperiment): Promise<void>;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Electron/file contexts may not expose the async Clipboard API; use the
    // synchronous selection fallback below.
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  return copied;
}

function AiAnalysisPackageDialog({
  experiment,
  onClose
}: {
  experiment: SavedExperiment;
  onClose(): void;
}): React.JSX.Element {
  const text = useMemo(() => createAiAnalysisPackage(experiment), [experiment]);
  const [copyMessage, setCopyMessage] = useState('');

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose} style={{ zIndex: 1200 }}>
      <section
        aria-label="AI analiz paketi"
        className="dialog-card data-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        style={{ width: 'min(1120px, 94vw)', maxWidth: '1120px' }}
      >
        <header>
          <div>
            <span className="eyebrow">GGL-AI-ANALYSIS v1</span>
            <h2>AI Analiz Paketi</h2>
          </div>
          <button className="dialog-close" type="button" onClick={onClose}>×</button>
        </header>

        <div className="portable-info">
          <strong>{experiment.name}</strong>
          <span>
            Bu metin deney girdilerini, kayıtlı model sonuçlarını, uyarıları, varsayımları ve kaynak provenansını başka bir AI'ye vermek için kompakt biçimde hazırlar. Hesap izi adımlarının tamamı pakete eklenmez; özet ve iz kimliği korunur.
          </span>
        </div>

        <textarea
          aria-label="AI analiz paketi metni"
          readOnly
          spellCheck={false}
          value={text}
          style={{
            width: '100%',
            minHeight: '56vh',
            resize: 'vertical',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: '12px',
            lineHeight: 1.45,
            boxSizing: 'border-box'
          }}
        />

        <footer>
          <span style={{ marginRight: 'auto', opacity: 0.8 }}>
            {copyMessage || `${text.length.toLocaleString('tr-TR')} karakter · ${experiment.predictions.length} hesap sonucu`}
          </span>
          <button className="secondary-button" type="button" onClick={onClose}>Kapat</button>
          <button
            className="primary-button"
            type="button"
            onClick={() => void copyText(text).then((copied) => {
              setCopyMessage(copied ? 'AI analiz paketi panoya kopyalandı.' : 'Otomatik kopyalama başarısız; metni seçip kopyalayabilirsin.');
            })}
          >
            Panoya Kopyala
          </button>
        </footer>
      </section>
    </div>
  );
}


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

export function DataManagerDialog({
  experiments,
  open,
  onClose,
  onDelete,
  onExport,
  onImport,
  onLoad,
  onReport
}: DataManagerDialogProps): React.JSX.Element | null {
  const [busyAction, setBusyAction] = useState<string>();
  const [analysisExperiment, setAnalysisExperiment] = useState<SavedExperiment>();
  const [selectedAnalysisIds, setSelectedAnalysisIds] = useState<string[]>([]);
  const [comparisonExperiments, setComparisonExperiments] = useState<SavedExperiment[]>();

  useEffect(() => {
    if (!open) {
      setBusyAction(undefined);
      setAnalysisExperiment(undefined);
      setSelectedAnalysisIds([]);
      setComparisonExperiments(undefined);
    }
  }, [open]);

  if (!open) return null;

  const runAction = async (
    actionId: string,
    action: () => Promise<void>
  ): Promise<void> => {
    if (busyAction) return;
    setBusyAction(actionId);
    try {
      await action();
    } finally {
      setBusyAction(undefined);
    }
  };

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-label="Veri yöneticisi"
        className="dialog-card data-dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="eyebrow">Yerel ve taşınabilir veri yöneticisi</span>
            <h2>Kaydedilen Deneyler</h2>
          </div>
          <div className="dialog-header-actions">
            <PanelHelpButton panelId="data-manager" />
            <button
              className="primary-button"
              disabled={Boolean(busyAction)}
              type="button"
              onClick={() => void runAction('import', onImport)}
            >
              {busyAction === 'import' ? 'İçe aktarılıyor…' : 'JSON İçe Aktar'}
            </button>
            <button className="dialog-close" type="button" onClick={onClose}>×</button>
          </div>
        </header>

        <div className="portable-info">
          <strong>Sürümlemeli deney dosyaları</strong>
          <span>
            JSON dosyaları girdileri, model sürümlerini, sonuç anlık görüntülerini ve hesap izlerini birlikte taşır. HTML raporları çevrimdışı açılabilir; AI Paketi ise aynı kaydın başka bir AI tarafından analiz edilmesi için kompakt metin üretir.
          </span>
        </div>


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

        {experiments.length === 0 ? (
          <div className="empty-state">
            <strong>Henüz kayıt yok</strong>
            <span>Aktif deneyi kaydedin veya taşınabilir bir JSON deney dosyası içe aktarın.</span>
          </div>
        ) : (
          <div className="experiment-list">
            {experiments.map((experiment) => (
              <article className="experiment-record" key={experiment.id}>
                <div>
                  <strong>{experiment.name}</strong>
                  <span>Güncelleme: {formatDate(experiment.updatedAtIso)}</span>
                  <small>
                    {experiment.inputs.surfaceDistanceKm.toLocaleString('tr-TR')} km ·
                    {' '}gözlem %{experiment.inputs.observedVisiblePercent.toLocaleString('tr-TR')} ·
                    {' '}{experiment.predictions.length} çıktı
                  </small>
                </div>
                <div className="record-actions portable-actions">
                  <button
                    className="secondary-button"
                    disabled={Boolean(busyAction)}
                    type="button"
                    onClick={() => {
                      onLoad(experiment);
                      onClose();
                    }}
                  >
                    Aç
                  </button>
                  <button
                    className="secondary-button"
                    disabled={Boolean(busyAction)}
                    type="button"
                    onClick={() => void runAction(
                      `export:${experiment.id}`,
                      () => onExport(experiment)
                    )}
                  >
                    {busyAction === `export:${experiment.id}` ? 'Kaydediliyor…' : 'JSON'}
                  </button>

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
                  <button
                    className="secondary-button"
                    disabled={Boolean(busyAction)}
                    type="button"
                    onClick={() => setAnalysisExperiment(experiment)}
                  >
                    AI Paketi
                  </button>
                  <button
                    className="report-button"
                    disabled={Boolean(busyAction)}
                    type="button"
                    onClick={() => void runAction(
                      `report:${experiment.id}`,
                      () => onReport(experiment)
                    )}
                  >
                    {busyAction === `report:${experiment.id}` ? 'Üretiliyor…' : 'Rapor'}
                  </button>
                  <button
                    className="danger-button"
                    disabled={Boolean(busyAction)}
                    type="button"
                    onClick={() => void runAction(
                      `delete:${experiment.id}`,
                      () => onDelete(experiment)
                    )}
                  >
                    {busyAction === `delete:${experiment.id}` ? 'Siliniyor…' : 'Sil'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      {analysisExperiment && (
        <AiAnalysisPackageDialog
          experiment={analysisExperiment}
          onClose={() => setAnalysisExperiment(undefined)}
        />
      )}

      {comparisonExperiments && (
        <AiComparisonPackageDialog
          experiments={comparisonExperiments}
          onClose={() => setComparisonExperiments(undefined)}
        />
      )}
    </div>
  );
}

interface TraceDialogProps {
  metadata: ModelMetadata | undefined;
  prediction: ModelPrediction | undefined;
  onClose(): void;
}

export function TraceDialog({
  metadata,
  prediction,
  onClose
}: TraceDialogProps): React.JSX.Element | null {
  if (!metadata || !prediction) return null;

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-label={`${metadata.name} hesap izi`}
        className="dialog-card trace-dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="eyebrow">Yeniden üretilebilir hesap</span>
            <h2>{metadata.name} · Hesap İzi</h2>
          </div>
          <button className="dialog-close" type="button" onClick={onClose}>×</button>
        </header>

        <p className="trace-summary">{prediction.trace.summary}</p>

        <div className="trace-layout">
          <aside className="trace-assumptions">
            <span className="eyebrow">Varsayımlar</span>
            <ul>
              {prediction.trace.assumptions.map((assumption) => (
                <li key={assumption}>{assumption}</li>
              ))}
            </ul>
            <small>İz kimliği: {prediction.traceId}</small>
          </aside>

          <div className="trace-steps">
            {prediction.trace.steps.length === 0 ? (
              <div className="empty-state">Hesap adımı üretilemedi.</div>
            ) : (
              prediction.trace.steps.map((step, index) => (
                <article className="trace-step" key={step.id}>
                  <span className="trace-index">{index + 1}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <code>{step.formula}</code>
                    <p><b>Yerine koyma:</b> {step.substitution}</p>
                    <strong className="trace-result">{step.result}</strong>
                    {step.note && <small>{step.note}</small>}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
