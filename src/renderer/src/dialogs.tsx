import { useEffect, useMemo, useState } from 'react';
import type { ModelMetadata, ModelPrediction } from '../../shared/domain';
import { createAiAnalysisPackage, createAiComparisonPackage } from '../../shared/ai-analysis-package';
import type { SavedExperiment } from '../../shared/simulator';
import { PanelHelpButton } from './HelpSystem';
import { AiLineageDialog } from './AiLineageDialog';
import { useI18n } from './I18nProvider';
import { appLocaleTag, type AppLocale } from './i18n';

interface SaveExperimentDialogProps {
  initialName: string;
  open: boolean;
  onCancel(): void;
  onSave(name: string): Promise<void>;
  photoWarning?: string;
}

export function SaveExperimentDialog({
  initialName,
  open,
  onCancel,
  onSave,
  photoWarning
}: SaveExperimentDialogProps): React.JSX.Element | null {
  const { t } = useI18n();
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
        aria-label={t('dialog.save.aria')}
        className="dialog-card save-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => void submit(event)}
      >
        <header>
          <div>
            <span className="eyebrow">{t('dialog.save.eyebrow')}</span>
            <h2>{t('dialog.save.title')}</h2>
          </div>
          <button className="dialog-close" type="button" onClick={onCancel}>×</button>
        </header>
        <label className="dialog-field">
          <span>{t('dialog.save.name')}</span>
          <input
            autoFocus
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
          />
        </label>
        <p className="dialog-help">
          {t('dialog.save.help')}
        </p>
        {photoWarning && <p className="dialog-warning" role="status">{photoWarning}</p>}
        <footer>
          <button className="secondary-button" type="button" onClick={onCancel}>{t('dialog.common.cancel')}</button>
          <button className="primary-button" disabled={name.trim().length === 0 || isSaving} type="submit">
            {isSaving ? t('dialog.common.saving') : t('dialog.common.save')}
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

function formatDate(iso: string, locale: AppLocale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(appLocaleTag(locale), {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

function aiFollowUpCount(experiment: SavedExperiment): number {
  return experiment.textSetupHistory?.filter(
    (item) => item.sourceKind === 'ai-follow-up' && item.aiLineage !== undefined
  ).length ?? 0;
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
  const { locale, t } = useI18n();
  const text = useMemo(() => createAiAnalysisPackage(experiment), [experiment]);
  const [copyMessage, setCopyMessage] = useState('');

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose} style={{ zIndex: 1200 }}>
      <section
        aria-label={t('dialog.aiAnalysis.aria')}
        className="dialog-card data-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        style={{ width: 'min(1120px, 94vw)', maxWidth: '1120px' }}
      >
        <header>
          <div>
            <span className="eyebrow">GGL-AI-ANALYSIS v1</span>
            <h2>{t('dialog.aiAnalysis.title')}</h2>
          </div>
          <button className="dialog-close" type="button" onClick={onClose}>×</button>
        </header>

        <div className="portable-info">
          <strong>{experiment.name}</strong>
          <span>
            {t('dialog.aiAnalysis.info')}
          </span>
        </div>

        <textarea
          aria-label={t('dialog.aiAnalysis.textAria')}
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
            {copyMessage || t('dialog.aiAnalysis.summary', { characters: text.length.toLocaleString(appLocaleTag(locale)), results: experiment.predictions.length.toLocaleString(appLocaleTag(locale)) })}
          </span>
          <button className="secondary-button" type="button" onClick={onClose}>{t('dialog.common.close')}</button>
          <button
            className="primary-button"
            type="button"
            onClick={() => void copyText(text).then((copied) => {
              setCopyMessage(copied ? t('dialog.aiAnalysis.copySuccess') : t('dialog.aiAnalysis.copyFailure'));
            })}
          >
            {t('dialog.common.copy')}
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
  const { locale, t } = useI18n();
  const text = useMemo(() => createAiComparisonPackage(experiments), [experiments]);
  const [copyMessage, setCopyMessage] = useState('');
  const resultCount = experiments.reduce((sum, experiment) => sum + experiment.predictions.length, 0);

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose} style={{ zIndex: 1200 }}>
      <section
        aria-label={t('dialog.aiComparison.aria')}
        className="dialog-card data-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        style={{ width: 'min(1180px, 95vw)', maxWidth: '1180px' }}
      >
        <header>
          <div>
            <span className="eyebrow">GGL-AI-COMPARISON v1</span>
            <h2>{t('dialog.aiComparison.title')}</h2>
          </div>
          <button className="dialog-close" type="button" onClick={onClose}>×</button>
        </header>

        <div className="portable-info">
          <strong>{t('dialog.aiComparison.experimentCount', { count: experiments.length })}</strong>
          <span>
            {t('dialog.aiComparison.info')}
          </span>
        </div>

        <textarea
          aria-label={t('dialog.aiComparison.textAria')}
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
            {copyMessage || t('dialog.aiComparison.summary', { characters: text.length.toLocaleString(appLocaleTag(locale)), experiments: experiments.length.toLocaleString(appLocaleTag(locale)), results: resultCount.toLocaleString(appLocaleTag(locale)) })}
          </span>
          <button className="secondary-button" type="button" onClick={onClose}>{t('dialog.common.close')}</button>
          <button
            className="primary-button"
            type="button"
            onClick={() => void copyText(text).then((copied) => {
              setCopyMessage(copied ? t('dialog.aiComparison.copySuccess') : t('dialog.aiComparison.copyFailure'));
            })}
          >
            {t('dialog.common.copy')}
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
  const { locale, t } = useI18n();
  const [busyAction, setBusyAction] = useState<string>();
  const [analysisExperiment, setAnalysisExperiment] = useState<SavedExperiment>();
  const [lineageExperiment, setLineageExperiment] = useState<SavedExperiment>();
  const [selectedAnalysisIds, setSelectedAnalysisIds] = useState<string[]>([]);
  const [comparisonExperiments, setComparisonExperiments] = useState<SavedExperiment[]>();

  useEffect(() => {
    if (!open) {
      setBusyAction(undefined);
      setAnalysisExperiment(undefined);
      setLineageExperiment(undefined);
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
        aria-label={t('dialog.data.aria')}
        className="dialog-card data-dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="eyebrow">{t('dialog.data.eyebrow')}</span>
            <h2>{t('dialog.data.title')}</h2>
          </div>
          <div className="dialog-header-actions">
            <PanelHelpButton panelId="data-manager" />
            <button
              className="primary-button"
              disabled={Boolean(busyAction)}
              type="button"
              onClick={() => void runAction('import', onImport)}
            >
              {busyAction === 'import' ? t('dialog.data.importing') : t('dialog.data.importJson')}
            </button>
            <button className="dialog-close" type="button" onClick={onClose}>×</button>
          </div>
        </header>

        <div className="portable-info">
          <strong>{t('dialog.data.versionedTitle')}</strong>
          <span>
            {t('dialog.data.versionedInfo')}
          </span>
        </div>


        <div className="portable-info">
          <strong>{t('dialog.data.compareTitle')}</strong>
          <span>
            {t('dialog.data.compareInfo')}
          </span>
          <button
            className="primary-button"
            disabled={selectedAnalysisIds.length < 2 || selectedAnalysisIds.length > 12}
            type="button"
            onClick={() => setComparisonExperiments(
              experiments.filter((experiment) => selectedAnalysisIds.includes(experiment.id))
            )}
          >
            {t('dialog.data.compareAction', { count: selectedAnalysisIds.length })}
          </button>
        </div>

        {experiments.length === 0 ? (
          <div className="empty-state">
            <strong>{t('dialog.data.emptyTitle')}</strong>
            <span>{t('dialog.data.emptyInfo')}</span>
          </div>
        ) : (
          <div className="experiment-list">
            {experiments.map((experiment) => (
              <article className="experiment-record" key={experiment.id}>
                <div>
                  <strong>{experiment.name}</strong>
                  <span>{t('dialog.data.updated', { date: formatDate(experiment.updatedAtIso, locale) })}</span>
                  <small>
                    {t('dialog.data.recordSummary', {
                      distance: experiment.inputs.surfaceDistanceKm.toLocaleString(appLocaleTag(locale)),
                      visibility: experiment.inputs.observedVisiblePercent.toLocaleString(appLocaleTag(locale)),
                      results: experiment.predictions.length.toLocaleString(appLocaleTag(locale))
                    })}
                    {experiment.photoCalibration ? t('dialog.data.photoSaved') : t('dialog.data.photoMissing')}
                    {aiFollowUpCount(experiment) > 0 ? t('dialog.data.aiFollowUp', { count: aiFollowUpCount(experiment) }) : ''}
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
                    {t('dialog.data.open')}
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
                    {busyAction === `export:${experiment.id}` ? t('dialog.common.saving') : 'JSON'}
                  </button>

                  <button
                    className={selectedAnalysisIds.includes(experiment.id) ? 'primary-button' : 'secondary-button'}
                    disabled={Boolean(busyAction) || (!selectedAnalysisIds.includes(experiment.id) && selectedAnalysisIds.length >= 12)}
                    type="button"
                    onClick={() => setSelectedAnalysisIds((current) => current.includes(experiment.id)
                      ? current.filter((id) => id !== experiment.id)
                      : [...current, experiment.id])}
                  >
                    {selectedAnalysisIds.includes(experiment.id) ? t('dialog.data.selected') : t('dialog.data.compare')}
                  </button>
                  <button
                    className="secondary-button"
                    disabled={Boolean(busyAction)}
                    type="button"
                    onClick={() => setAnalysisExperiment(experiment)}
                  >
                    {t('dialog.data.aiPackage')}
                  </button>
                  {aiFollowUpCount(experiment) > 0 && (
                    <button
                      className="secondary-button"
                      disabled={Boolean(busyAction)}
                      type="button"
                      onClick={() => setLineageExperiment(experiment)}
                    >
                      {t('dialog.data.aiLineage')}
                    </button>
                  )}
                  <button
                    className="report-button"
                    disabled={Boolean(busyAction)}
                    type="button"
                    onClick={() => void runAction(
                      `report:${experiment.id}`,
                      () => onReport(experiment)
                    )}
                  >
                    {busyAction === `report:${experiment.id}` ? t('dialog.data.generating') : t('dialog.data.report')}
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
                    {busyAction === `delete:${experiment.id}` ? t('dialog.data.deleting') : t('dialog.data.delete')}
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

      {lineageExperiment && (
        <AiLineageDialog
          experiment={lineageExperiment}
          experiments={experiments}
          onClose={() => setLineageExperiment(undefined)}
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
  const { t } = useI18n();
  if (!metadata || !prediction) return null;

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-label={t('dialog.trace.aria', { model: metadata.name })}
        className="dialog-card trace-dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="eyebrow">{t('dialog.trace.eyebrow')}</span>
            <h2>{t('dialog.trace.title', { model: metadata.name })}</h2>
          </div>
          <button className="dialog-close" type="button" onClick={onClose}>×</button>
        </header>

        <p className="trace-summary">{prediction.trace.summary}</p>

        <div className="trace-layout">
          <aside className="trace-assumptions">
            <span className="eyebrow">{t('dialog.trace.assumptions')}</span>
            <ul>
              {prediction.trace.assumptions.map((assumption) => (
                <li key={assumption}>{assumption}</li>
              ))}
            </ul>
            <small>{t('dialog.trace.traceId', { id: prediction.traceId })}</small>
          </aside>

          <div className="trace-steps">
            {prediction.trace.steps.length === 0 ? (
              <div className="empty-state">{t('dialog.trace.noSteps')}</div>
            ) : (
              prediction.trace.steps.map((step, index) => (
                <article className="trace-step" key={step.id}>
                  <span className="trace-index">{index + 1}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <code>{step.formula}</code>
                    <p><b>{t('dialog.trace.substitution')}</b> {step.substitution}</p>
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
