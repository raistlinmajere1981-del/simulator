import { useMemo, useState } from 'react';
import {
  GGL_AI_ANALYSIS_SYSTEM_PROMPT_V1,
  GGL_AI_COLLABORATION_GUIDE_VERSION,
  GGL_AI_TEST_AUTHORING_PROMPT_V1,
  createGglAiGuideBundle
} from '../../shared/ai-collaboration-guide';

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
  const [mode, setMode] = useState<GuideMode>('analysis');
  const [copyMessage, setCopyMessage] = useState('');
  const bundle = useMemo(() => createGglAiGuideBundle(), []);
  const text = mode === 'analysis'
    ? GGL_AI_ANALYSIS_SYSTEM_PROMPT_V1
    : mode === 'test'
      ? GGL_AI_TEST_AUTHORING_PROMPT_V1
      : bundle;
  const title = mode === 'analysis'
    ? 'Sonuç analiz AI talimatı'
    : mode === 'test'
      ? 'Test hazırlama AI talimatı'
      : 'Tam işbirliği kılavuzu';

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose} style={{ zIndex: 1260 }}>
      <section
        aria-label="AI işbirliği kılavuzu"
        className="dialog-card data-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        style={{ width: 'min(1120px, 96vw)', maxWidth: '1120px', maxHeight: '92vh', overflow: 'auto' }}
      >
        <header>
          <div>
            <span className="eyebrow">GGL AI İŞBİRLİĞİ KILAVUZU · {GGL_AI_COLLABORATION_GUIDE_VERSION.toUpperCase()}</span>
            <h2>AI’ye Verilecek Talimatlar</h2>
          </div>
          <button className="dialog-close" type="button" onClick={onClose}>×</button>
        </header>

        <div className="portable-info">
          <strong>Bu metinler GGL’nin AI sözleşmesiyle eşleşir.</strong>
          <span>
            Birlikte çalıştığın AI’nin proje/sistem talimatına uygun olan metni kopyala. AI test planlar ve sonuçları yorumlar; sayısal hesap ve kullanıcı onayı GGL’de kalır.
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <button className={mode === 'analysis' ? 'primary-button' : 'secondary-button'} type="button" onClick={() => { setMode('analysis'); setCopyMessage(''); }}>
            Sonuç Analizi
          </button>
          <button className={mode === 'test' ? 'primary-button' : 'secondary-button'} type="button" onClick={() => { setMode('test'); setCopyMessage(''); }}>
            Test Hazırlama
          </button>
          <button className={mode === 'bundle' ? 'primary-button' : 'secondary-button'} type="button" onClick={() => { setMode('bundle'); setCopyMessage(''); }}>
            Tam Kılavuz
          </button>
        </div>

        <section style={{ display: 'grid', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <strong>{title}</strong>
            <span style={{ opacity: 0.72 }}>
              {mode === 'analysis'
                ? 'GGL-AI-ANALYSIS / COMPARISON paketlerini yorumlayan AI için.'
                : mode === 'test'
                  ? 'Kullanıcı anlatımından tek GGL-AI-TEST v1 bloğu üreten AI için.'
                  : 'İki rolü ve GGL ↔ AI geri-besleme akışını tek metinde taşır.'}
            </span>
            <button
              className="primary-button"
              style={{ marginLeft: 'auto' }}
              type="button"
              onClick={() => void copyText(text).then((copied) => {
                setCopyMessage(copied ? `${title} panoya kopyalandı.` : 'Otomatik kopyalama başarısız; metni elle seçip kopyalayabilirsin.');
              })}
            >
              Panoya Kopyala
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
            {copyMessage || `${text.length.toLocaleString('tr-TR')} karakter`}
          </small>
        </section>

        <footer>
          <span style={{ marginRight: 'auto', opacity: 0.76 }}>
            Tam teknik alan sözleşmesi repository’de docs/ai-test-spec-v1.md ve docs/ai-analysis-guide-v1.md altında korunur.
          </span>
          <button className="secondary-button" type="button" onClick={onClose}>Kapat</button>
        </footer>
      </section>
    </div>
  );
}
