import { useEffect, useState } from 'react';
import type { ModelMetadata, ModelPrediction } from '../../shared/domain';
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

  useEffect(() => {
    if (!open) setBusyAction(undefined);
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
            JSON dosyaları girdileri, model sürümlerini, sonuç anlık görüntülerini ve hesap izlerini birlikte taşır. HTML raporları çevrimdışı açılabilir ve yazdırılabilir.
          </span>
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
