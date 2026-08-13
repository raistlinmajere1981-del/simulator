import { useEffect, useState } from 'react';
import {
  verifyExperimentAiLineage,
  type AiFollowUpVerification
} from '../../shared/ai-lineage-verification';
import type { SavedExperiment } from '../../shared/simulator';
import { useI18n } from './I18nProvider';
import { translate, type TranslationKey } from './i18n';

const statusKeys: Record<AiFollowUpVerification['status'], TranslationKey> = {
  verified: 'ai.lineage.status.verified',
  partial: 'ai.lineage.status.partial',
  mismatch: 'ai.lineage.status.mismatch'
};

function analysisLabelKey(
  analysis: AiFollowUpVerification['analysis']
): TranslationKey {
  if (analysis.status === 'verified') {
    return analysis.verificationMethod === 'snapshot'
      ? 'ai.lineage.analysis.snapshotVerified'
      : 'ai.lineage.analysis.regeneratedVerified';
  }
  if (analysis.status === 'source-missing') {
    return 'ai.lineage.analysis.sourceMissing';
  }
  if (analysis.status === 'source-changed') {
    return 'ai.lineage.analysis.sourceChanged';
  }
  return analysis.verificationMethod === 'snapshot'
    ? 'ai.lineage.analysis.snapshotMismatch'
    : 'ai.lineage.analysis.regeneratedMismatch';
}

function shortHash(hash: string): string {
  return `${hash.slice(0, 12)}…${hash.slice(-12)}`;
}

export function AiLineageDialog({
  experiment,
  experiments,
  onClose
}: {
  experiment: SavedExperiment;
  experiments: SavedExperiment[];
  onClose(): void;
}): React.JSX.Element {
  const { locale, t } = useI18n();
  const [results, setResults] = useState<AiFollowUpVerification[]>();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setResults(undefined);
    setError('');
    void verifyExperimentAiLineage(experiment, experiments)
      .then((next) => {
        if (!cancelled) setResults(next);
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : translate(locale, 'ai.lineage.errorFallback')
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [experiment, experiments, locale]);

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={onClose}
      style={{ zIndex: 1300 }}
    >
      <section
        aria-label={t('ai.lineage.aria')}
        className="dialog-card data-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        style={{
          width: 'min(1120px, 95vw)',
          maxWidth: '1120px',
          maxHeight: '92vh',
          overflow: 'auto'
        }}
      >
        <header>
          <div>
            <span className="eyebrow">{t('ai.lineage.eyebrow')}</span>
            <h2>{t('ai.lineage.title')}</h2>
          </div>
          <button className="dialog-close" type="button" onClick={onClose}>×</button>
        </header>

        <div className="portable-info">
          <strong>{experiment.name}</strong>
          <span>{t('ai.lineage.info')}</span>
        </div>

        {error && <p className="dialog-warning">{error}</p>}
        {!error && results === undefined && (
          <div className="empty-state">
            <strong>{t('ai.lineage.verifying')}</strong>
            <span>{t('ai.lineage.verifyingDetail')}</span>
          </div>
        )}

        {results && results.length === 0 && (
          <div className="empty-state">
            <strong>{t('ai.lineage.empty')}</strong>
            <span>{t('ai.lineage.emptyDetail')}</span>
          </div>
        )}

        {results && results.map((result) => {
          const provenance = experiment.textSetupHistory?.[result.historyIndex];
          const lineage = provenance?.aiLineage;
          if (!provenance || !lineage) return null;
          return (
            <article
              className="source-card"
              key={`${result.historyIndex}:${lineage.canonicalTestSha256}`}
              style={{ marginTop: '12px' }}
            >
              <div className="source-card-heading">
                <strong>
                  {t('ai.lineage.followUp', { index: result.historyIndex + 1 })}
                </strong>
                <span>{t(statusKeys[result.status])}</span>
              </div>
              <table>
                <tbody>
                  <tr>
                    <td>{t('ai.lineage.sourceExperiment')}</td>
                    <td><code>{lineage.sourceExperimentId}</code></td>
                  </tr>
                  <tr>
                    <td>{t('ai.lineage.sourceSnapshot')}</td>
                    <td>{lineage.sourceExperimentUpdatedAtIso}</td>
                  </tr>
                  {result.analysis.availableSourceUpdatedAtIso && (
                    <tr>
                      <td>{t('ai.lineage.availableSourceUpdate')}</td>
                      <td>{result.analysis.availableSourceUpdatedAtIso}</td>
                    </tr>
                  )}
                  <tr>
                    <td>{t('ai.lineage.canonicalTest')}</td>
                    <td>
                      {result.canonicalTest.status === 'verified'
                        ? t('ai.lineage.shaMatched')
                        : t('ai.lineage.shaMismatch')}
                    </td>
                  </tr>
                  <tr>
                    <td>{t('ai.lineage.expectedTestHash')}</td>
                    <td>
                      <code title={result.canonicalTest.expectedSha256}>
                        {shortHash(result.canonicalTest.expectedSha256)}
                      </code>
                    </td>
                  </tr>
                  <tr>
                    <td>{t('ai.lineage.actualTestHash')}</td>
                    <td>
                      <code title={result.canonicalTest.actualSha256}>
                        {shortHash(result.canonicalTest.actualSha256)}
                      </code>
                    </td>
                  </tr>
                  <tr>
                    <td>{t('ai.lineage.analysisMethod')}</td>
                    <td>
                      {result.analysis.verificationMethod === 'snapshot'
                        ? t('ai.lineage.method.snapshot')
                        : t('ai.lineage.method.regenerated')}
                    </td>
                  </tr>
                  <tr>
                    <td>{t('ai.lineage.sourceAnalysis')}</td>
                    <td>{t(analysisLabelKey(result.analysis))}</td>
                  </tr>
                  <tr>
                    <td>{t('ai.lineage.expectedAnalysisHash')}</td>
                    <td>
                      <code title={result.analysis.expectedSha256}>
                        {shortHash(result.analysis.expectedSha256)}
                      </code>
                    </td>
                  </tr>
                  {result.analysis.actualSha256 && (
                    <tr>
                      <td>{t('ai.lineage.actualAnalysisHash')}</td>
                      <td>
                        <code title={result.analysis.actualSha256}>
                          {shortHash(result.analysis.actualSha256)}
                        </code>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {result.status === 'partial' && (
                <p className="muted">{t('ai.lineage.partialNote')}</p>
              )}
            </article>
          );
        })}

        <footer>
          <span style={{ marginRight: 'auto', opacity: 0.76 }}>
            {t('ai.lineage.footer')}
          </span>
          <button className="secondary-button" type="button" onClick={onClose}>
            {t('ai.common.close')}
          </button>
        </footer>
      </section>
    </div>
  );
}
