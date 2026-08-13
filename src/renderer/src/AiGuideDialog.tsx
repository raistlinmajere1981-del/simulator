import { useMemo, useState } from 'react';
import {
  GGL_AI_ANALYSIS_SYSTEM_PROMPT_V1,
  GGL_AI_COLLABORATION_GUIDE_VERSION,
  GGL_AI_TEST_AUTHORING_PROMPT_V1,
  createGglAiGuideBundle
} from '../../shared/ai-collaboration-guide';
import { useI18n } from './I18nProvider';
import { appLocaleTag } from './i18n';

type GuideMode = 'analysis' | 'test' | 'bundle';

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

export function AiGuideDialog({ onClose }: { onClose(): void }): React.JSX.Element {
  const { locale, t } = useI18n();
  const [mode, setMode] = useState<GuideMode>('analysis');
  const [copyMessage, setCopyMessage] = useState('');
  const bundle = useMemo(() => createGglAiGuideBundle(), []);
  const text = mode === 'analysis'
    ? GGL_AI_ANALYSIS_SYSTEM_PROMPT_V1
    : mode === 'test'
      ? GGL_AI_TEST_AUTHORING_PROMPT_V1
      : bundle;
  const title = mode === 'analysis'
    ? t('ai.guide.title.analysis')
    : mode === 'test'
      ? t('ai.guide.title.test')
      : t('ai.guide.title.bundle');
  const description = mode === 'analysis'
    ? t('ai.guide.description.analysis')
    : mode === 'test'
      ? t('ai.guide.description.test')
      : t('ai.guide.description.bundle');
  const characterCount = new Intl.NumberFormat(appLocaleTag(locale)).format(text.length);

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={onClose}
      style={{ zIndex: 1260 }}
    >
      <section
        aria-label={t('ai.guide.aria')}
        className="dialog-card data-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        style={{
          width: 'min(1120px, 96vw)',
          maxWidth: '1120px',
          maxHeight: '92vh',
          overflow: 'auto'
        }}
      >
        <header>
          <div>
            <span className="eyebrow">
              {t('ai.guide.eyebrow')} · {GGL_AI_COLLABORATION_GUIDE_VERSION.toUpperCase()}
            </span>
            <h2>{t('ai.guide.heading')}</h2>
          </div>
          <button className="dialog-close" type="button" onClick={onClose}>×</button>
        </header>

        <div className="portable-info">
          <strong>{t('ai.guide.infoStrong')}</strong>
          <span>{t('ai.guide.infoText')}</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <button
            className={mode === 'analysis' ? 'primary-button' : 'secondary-button'}
            type="button"
            onClick={() => {
              setMode('analysis');
              setCopyMessage('');
            }}
          >
            {t('ai.guide.mode.analysis')}
          </button>
          <button
            className={mode === 'test' ? 'primary-button' : 'secondary-button'}
            type="button"
            onClick={() => {
              setMode('test');
              setCopyMessage('');
            }}
          >
            {t('ai.guide.mode.test')}
          </button>
          <button
            className={mode === 'bundle' ? 'primary-button' : 'secondary-button'}
            type="button"
            onClick={() => {
              setMode('bundle');
              setCopyMessage('');
            }}
          >
            {t('ai.guide.mode.bundle')}
          </button>
        </div>

        <section style={{ display: 'grid', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <strong>{title}</strong>
            <span style={{ opacity: 0.72 }}>{description}</span>
            <button
              className="primary-button"
              style={{ marginLeft: 'auto' }}
              type="button"
              onClick={() => void copyText(text).then((copied) => {
                setCopyMessage(
                  copied
                    ? t('ai.guide.copySuccess', { title })
                    : t('ai.guide.copyFailure')
                );
              })}
            >
              {t('ai.guide.copy')}
            </button>
          </div>
          <textarea
            aria-label={title}
            readOnly
            spellCheck={false}
            value={text}
            style={{
              width: '100%',
              minHeight: '58vh',
              resize: 'vertical',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontSize: '12px',
              lineHeight: 1.42,
              boxSizing: 'border-box'
            }}
          />
          <small style={{ opacity: 0.76 }}>
            {copyMessage || t('ai.guide.characterCount', { count: characterCount })}
          </small>
        </section>

        <footer>
          <span style={{ marginRight: 'auto', opacity: 0.76 }}>
            {t('ai.guide.footer')}
          </span>
          <button className="secondary-button" type="button" onClick={onClose}>
            {t('ai.common.close')}
          </button>
        </footer>
      </section>
    </div>
  );
}
