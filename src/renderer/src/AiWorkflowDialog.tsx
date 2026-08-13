import { useMemo, useState } from 'react';
import {
  createAiAnalysisPackage,
  GGL_AI_ANALYSIS_PACKAGE_VERSION
} from '../../shared/ai-analysis-package';
import { createAiFollowUpLineage, type AiFollowUpLineage } from '../../shared/ai-lineage';
import {
  extractCanonicalAiTestBlock,
  type AiTestExtractionReason
} from '../../shared/ai-workflow';
import type { SavedExperiment } from '../../shared/simulator';
import { useI18n } from './I18nProvider';
import { appLocaleTag, type TranslationKey } from './i18n';

const extractionMessageKeys: Record<AiTestExtractionReason, TranslationKey> = {
  empty: 'ai.workflow.extraction.empty',
  'missing-header': 'ai.workflow.extraction.missingHeader',
  'multiple-headers': 'ai.workflow.extraction.multipleHeaders',
  'missing-end': 'ai.workflow.extraction.missingEnd',
  'multiple-ends': 'ai.workflow.extraction.multipleEnds',
  found: 'ai.workflow.extraction.found'
};

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Electron/file contexts may not expose the async Clipboard API.
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

export function AiWorkflowDialog({
  experiment,
  onClose,
  onUseTest
}: {
  experiment: SavedExperiment;
  onClose(): void;
  onUseTest(testBlock: string, lineage: AiFollowUpLineage): void;
}): React.JSX.Element {
  const { locale, t } = useI18n();
  const [analysisGeneratedAtIso] = useState(() => new Date().toISOString());
  const packageText = useMemo(
    () => createAiAnalysisPackage(experiment, analysisGeneratedAtIso),
    [analysisGeneratedAtIso, experiment]
  );
  const [copyMessage, setCopyMessage] = useState('');
  const [lineageMessage, setLineageMessage] = useState('');
  const [aiReply, setAiReply] = useState('');
  const extraction = useMemo(() => extractCanonicalAiTestBlock(aiReply), [aiReply]);
  const numberFormatter = new Intl.NumberFormat(appLocaleTag(locale));

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={onClose}
      style={{ zIndex: 1250 }}
    >
      <section
        aria-label={t('ai.workflow.aria')}
        className="dialog-card data-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        style={{
          width: 'min(1240px, 96vw)',
          maxWidth: '1240px',
          maxHeight: '92vh',
          overflow: 'auto'
        }}
      >
        <header>
          <div>
            <span className="eyebrow">{t('ai.workflow.eyebrow')}</span>
            <h2>{t('ai.workflow.title')}</h2>
          </div>
          <button className="dialog-close" type="button" onClick={onClose}>×</button>
        </header>

        <div className="portable-info">
          <strong>{experiment.name}</strong>
          <span>{t('ai.workflow.info')}</span>
        </div>

        <section style={{ display: 'grid', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <strong>{t('ai.workflow.step1')}</strong>
            <span style={{ opacity: 0.72 }}>{t('ai.workflow.step1Description')}</span>
            <button
              className="primary-button"
              style={{ marginLeft: 'auto' }}
              type="button"
              onClick={() => void copyText(packageText).then((copied) => {
                setCopyMessage(
                  copied
                    ? t('ai.workflow.copySuccess')
                    : t('ai.workflow.copyFailure')
                );
              })}
            >
              {t('ai.workflow.copyPackage')}
            </button>
          </div>
          <textarea
            aria-label={t('ai.workflow.packageAria')}
            readOnly
            spellCheck={false}
            value={packageText}
            style={{
              width: '100%',
              minHeight: '29vh',
              resize: 'vertical',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontSize: '12px',
              lineHeight: 1.42,
              boxSizing: 'border-box'
            }}
          />
          <small style={{ opacity: 0.76 }}>
            {copyMessage || t('ai.workflow.packageSummary', {
              characters: numberFormatter.format(packageText.length),
              count: numberFormatter.format(experiment.predictions.length)
            })}
          </small>
        </section>

        <section style={{ display: 'grid', gap: '8px', marginTop: '16px' }}>
          <div>
            <strong>{t('ai.workflow.step2')}</strong>
            <p style={{ margin: '4px 0 0', opacity: 0.76 }}>
              {t('ai.workflow.step2Description')}
            </p>
          </div>
          <textarea
            aria-label={t('ai.workflow.replyAria')}
            spellCheck={false}
            value={aiReply}
            placeholder={t('ai.workflow.replyPlaceholder')}
            onChange={(event) => setAiReply(event.currentTarget.value)}
            style={{
              width: '100%',
              minHeight: '18vh',
              resize: 'vertical',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontSize: '12px',
              lineHeight: 1.42,
              boxSizing: 'border-box'
            }}
          />
          <div className="portable-info" style={{ margin: 0 }}>
            <strong>
              {extraction.status === 'found'
                ? t('ai.workflow.ready')
                : t('ai.workflow.controlled')}
            </strong>
            <span>{t(extractionMessageKeys[extraction.reason])}</span>
            {lineageMessage && <small>{lineageMessage}</small>}
          </div>
        </section>

        <footer>
          <span style={{ marginRight: 'auto', opacity: 0.76 }}>
            {t('ai.workflow.footer')}
          </span>
          <button className="secondary-button" type="button" onClick={onClose}>
            {t('ai.common.close')}
          </button>
          <button
            className="primary-button"
            disabled={extraction.status !== 'found'}
            type="button"
            onClick={() => {
              if (extraction.status !== 'found') return;
              const testBlock = extraction.block;
              setLineageMessage(t('ai.workflow.lineageCalculating'));
              void createAiFollowUpLineage({
                sourceExperiment: experiment,
                analysisPackageVersion: GGL_AI_ANALYSIS_PACKAGE_VERSION,
                analysisGeneratedAtIso,
                analysisPackageText: packageText,
                canonicalTestBlock: testBlock
              }).then((lineage) => {
                onUseTest(testBlock, lineage);
              }).catch((caught) => {
                setLineageMessage(
                  caught instanceof Error
                    ? caught.message
                    : t('ai.workflow.lineageFallback')
                );
              });
            }}
          >
            {t('ai.workflow.transfer')}
          </button>
        </footer>
      </section>
    </div>
  );
}
