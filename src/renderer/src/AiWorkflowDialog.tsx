import { useMemo, useState } from 'react';
import { createAiAnalysisPackage, GGL_AI_ANALYSIS_PACKAGE_VERSION } from '../../shared/ai-analysis-package';
import { createAiFollowUpLineage, type AiFollowUpLineage } from '../../shared/ai-lineage';
import { extractCanonicalAiTestBlock } from '../../shared/ai-workflow';
import type { SavedExperiment } from '../../shared/simulator';

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
  const [analysisGeneratedAtIso] = useState(() => new Date().toISOString());
  const packageText = useMemo(
    () => createAiAnalysisPackage(experiment, analysisGeneratedAtIso),
    [analysisGeneratedAtIso, experiment]
  );
  const [copyMessage, setCopyMessage] = useState('');
  const [lineageMessage, setLineageMessage] = useState('');
  const [aiReply, setAiReply] = useState('');
  const extraction = useMemo(() => extractCanonicalAiTestBlock(aiReply), [aiReply]);

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose} style={{ zIndex: 1250 }}>
      <section
        aria-label="AI çalışma döngüsü"
        className="dialog-card data-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        style={{ width: 'min(1240px, 96vw)', maxWidth: '1240px', maxHeight: '92vh', overflow: 'auto' }}
      >
        <header>
          <div>
            <span className="eyebrow">AŞAMA 8.9 · TARİHSEL ANALİZ KANITI</span>
            <h2>AI Çalışma Döngüsü</h2>
          </div>
          <button className="dialog-close" type="button" onClick={onClose}>×</button>
        </header>

        <div className="portable-info">
          <strong>{experiment.name}</strong>
          <span>
            Bu deterministik GGL-AI-ANALYSIS paketi dış AI'ye gönderilecek anlık görüntüdür. Yalnız bir takip testi kullanıcı tarafından uygulanırsa bu exact paket lineage snapshot kanıtı olarak saklanır; dış AI'nin serbest yanıtı kaydedilmez.
          </span>
        </div>

        <section style={{ display: 'grid', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <strong>1 · GGL’den AI’ye</strong>
            <span style={{ opacity: 0.72 }}>Paketi birlikte çalıştığın AI’ye gönder.</span>
            <button
              className="primary-button"
              style={{ marginLeft: 'auto' }}
              type="button"
              onClick={() => void copyText(packageText).then((copied) => {
                setCopyMessage(copied ? 'Aktif deney AI paketi panoya kopyalandı.' : 'Otomatik kopyalama başarısız; metni elle seçip kopyalayabilirsin.');
              })}
            >
              AI Paketini Kopyala
            </button>
          </div>
          <textarea
            aria-label="Aktif deney AI analiz paketi"
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
            {copyMessage || `${packageText.length.toLocaleString('tr-TR')} karakter · ${experiment.predictions.length} hesap sonucu`}
          </small>
        </section>

        <section style={{ display: 'grid', gap: '8px', marginTop: '16px' }}>
          <div>
            <strong>2 · AI’den GGL’ye</strong>
            <p style={{ margin: '4px 0 0', opacity: 0.76 }}>
              AI’nin yanıtını tamamıyla yapıştırabilirsin. Sistem yalnız yanıt içindeki tek ve eksiksiz <code>GGL-AI-TEST v1</code> bloğunu ayıklar; birden fazla test varsa seçim yapmaz.
            </p>
          </div>
          <textarea
            aria-label="AI yanıtı"
            spellCheck={false}
            value={aiReply}
            placeholder={'AI analizini ve önerisini buraya yapıştır. Yanıtta tam olarak bir GGL-AI-TEST v1 ... END GGL-AI-TEST bloğu bulunmalı.'}
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
            <strong>{extraction.status === 'found' ? 'TEST BLOĞU HAZIR' : 'KONTROLLÜ AKTARIM'}</strong>
            <span>{extraction.message}</span>
            {lineageMessage && <small>{lineageMessage}</small>}
          </div>
        </section>

        <footer>
          <span style={{ marginRight: 'auto', opacity: 0.76 }}>
            AI hiçbir alanı doğrudan değiştirmez. Serbest AI yanıtı kaydedilmez; kanonik test bloğu, hashler ve GGL'nin kendi deterministik analiz snapshot kanıtı kontrollü provenansa taşınır.
          </span>
          <button className="secondary-button" type="button" onClick={onClose}>Kapat</button>
          <button
            className="primary-button"
            disabled={extraction.status !== 'found'}
            type="button"
            onClick={() => {
              if (extraction.status !== 'found') return;
              const testBlock = extraction.block;
              setLineageMessage('Kaynak analiz ve kanonik test için SHA-256 hesaplanıyor…');
              void createAiFollowUpLineage({
                sourceExperiment: experiment,
                analysisPackageVersion: GGL_AI_ANALYSIS_PACKAGE_VERSION,
                analysisGeneratedAtIso,
                analysisPackageText: packageText,
                canonicalTestBlock: testBlock
              }).then((lineage) => {
                onUseTest(testBlock, lineage);
              }).catch((caught) => {
                setLineageMessage(caught instanceof Error
                  ? caught.message
                  : 'AI soy ağacı hashleri oluşturulamadı; test aktarılmadı.');
              });
            }}
          >
            Testi Metinden Hazırla’ya Aktar
          </button>
        </footer>
      </section>
    </div>
  );
}
