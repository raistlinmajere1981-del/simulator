import { useEffect, useState } from 'react';
import {
  verifyExperimentAiLineage,
  type AiFollowUpVerification
} from '../../shared/ai-lineage-verification';
import type { SavedExperiment } from '../../shared/simulator';

const statusLabel: Record<AiFollowUpVerification['status'], string> = {
  verified: 'TAM DOĞRULANDI',
  partial: 'KISMİ DOĞRULAMA',
  mismatch: 'UYUŞMAZLIK'
};

function analysisLabel(analysis: AiFollowUpVerification['analysis']): string {
  if (analysis.status === 'verified') {
    return analysis.verificationMethod === 'snapshot'
      ? 'Kayıtlı tarihsel GGL-AI-ANALYSIS snapshot kanıtının SHA-256 özeti eşleşti.'
      : 'Kaynak analiz yeniden üretildi ve hash eşleşti.';
  }
  if (analysis.status === 'source-missing') {
    return 'Eski lineage kaydında snapshot kanıtı yok ve kaynak deney kayıt listesinde bulunamadı.';
  }
  if (analysis.status === 'source-changed') {
    return 'Eski lineage kaydında snapshot kanıtı yok; aynı deney kimliği bulundu ancak mevcut içerik tarihsel analiz hash’ini üretmiyor.';
  }
  return analysis.verificationMethod === 'snapshot'
    ? 'Kayıtlı tarihsel analiz snapshot kanıtı veya SHA-256 özeti uyuşmuyor.'
    : 'Aynı snapshot zamanı bulundu ancak yeniden üretilen analiz SHA-256 eşleşmedi.';
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
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'AI soy ağacı doğrulanamadı.');
      });
    return () => {
      cancelled = true;
    };
  }, [experiment, experiments]);

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose} style={{ zIndex: 1300 }}>
      <section
        aria-label="AI soy ağacı doğrulaması"
        className="dialog-card data-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        style={{ width: 'min(1120px, 95vw)', maxWidth: '1120px', maxHeight: '92vh', overflow: 'auto' }}
      >
        <header>
          <div>
            <span className="eyebrow">AŞAMA 8.9 · SNAPSHOT + HASH DOĞRULAMA</span>
            <h2>AI Soy Ağacı Doğrulaması</h2>
          </div>
          <button className="dialog-close" type="button" onClick={onClose}>×</button>
        </header>

        <div className="portable-info">
          <strong>{experiment.name}</strong>
          <span>
            Kanonik GGL-AI-TEST bloğunun SHA-256 özeti her zaman yeniden hesaplanır. Yeni AI takip kayıtlarında GGL'nin dış AI'ye gönderdiği deterministik GGL-AI-ANALYSIS paketi immutable snapshot kanıtı olarak saklanır ve kaynak deney sonradan değişse veya silinse bile kendi hash'iyle doğrulanır. Eski kayıtlarda snapshot yoksa Aşama 8.8 yeniden-üretim yöntemi geriye uyumlu olarak kullanılır.
          </span>
        </div>

        {error && <p className="dialog-warning">{error}</p>}
        {!error && results === undefined && <div className="empty-state"><strong>Doğrulanıyor…</strong><span>SHA-256 kontrolleri hesaplanıyor.</span></div>}

        {results && results.length === 0 && (
          <div className="empty-state">
            <strong>AI takip kaydı yok</strong>
            <span>Bu deneyde doğrulanacak ai-follow-up provenansı bulunmuyor.</span>
          </div>
        )}

        {results && results.map((result) => {
          const provenance = experiment.textSetupHistory?.[result.historyIndex];
          const lineage = provenance?.aiLineage;
          if (!provenance || !lineage) return null;
          return (
            <article className="source-card" key={`${result.historyIndex}:${lineage.canonicalTestSha256}`} style={{ marginTop: '12px' }}>
              <div className="source-card-heading">
                <strong>AI takip uygulaması {result.historyIndex + 1}</strong>
                <span>{statusLabel[result.status]}</span>
              </div>
              <table><tbody>
                <tr><td>Kaynak deney</td><td><code>{lineage.sourceExperimentId}</code></td></tr>
                <tr><td>Kaynak snapshot zamanı</td><td>{lineage.sourceExperimentUpdatedAtIso}</td></tr>
                {result.analysis.availableSourceUpdatedAtIso && <tr><td>Mevcut kaynak güncellemesi</td><td>{result.analysis.availableSourceUpdatedAtIso}</td></tr>}
                <tr><td>Kanonik test</td><td>{result.canonicalTest.status === 'verified' ? 'SHA-256 eşleşti' : 'SHA-256 UYUŞMADI'}</td></tr>
                <tr><td>Beklenen test hash</td><td><code title={result.canonicalTest.expectedSha256}>{shortHash(result.canonicalTest.expectedSha256)}</code></td></tr>
                <tr><td>Hesaplanan test hash</td><td><code title={result.canonicalTest.actualSha256}>{shortHash(result.canonicalTest.actualSha256)}</code></td></tr>
                <tr><td>Analiz doğrulama yöntemi</td><td>{result.analysis.verificationMethod === 'snapshot' ? 'Tarihsel snapshot kanıtı' : 'Kaynak deneyden yeniden üretim'}</td></tr>
                <tr><td>Kaynak analiz</td><td>{analysisLabel(result.analysis)}</td></tr>
                <tr><td>Beklenen analiz hash</td><td><code title={result.analysis.expectedSha256}>{shortHash(result.analysis.expectedSha256)}</code></td></tr>
                {result.analysis.actualSha256 && <tr><td>Hesaplanan analiz hash</td><td><code title={result.analysis.actualSha256}>{shortHash(result.analysis.actualSha256)}</code></td></tr>}
              </tbody></table>
              {result.status === 'partial' && (
                <p className="muted">
                  Kısmi doğrulama yalnız snapshot kanıtı eklenmeden önce oluşturulmuş eski lineage kayıtlarında beklenebilir: tarihsel kaynak artık yoksa veya değişmişse özgün analiz paketi yeniden üretilemeyebilir. Kanonik test bloğunun bütünlüğü yine bağımsız olarak doğrulanır.
                </p>
              )}
            </article>
          );
        })}

        <footer>
          <span style={{ marginRight: 'auto', opacity: 0.76 }}>
            Bu kontrol AI sonucunun doğruluğunu değil, kayıtlı provenance zincirinin kriptografik tutarlılığını denetler.
          </span>
          <button className="secondary-button" type="button" onClick={onClose}>Kapat</button>
        </footer>
      </section>
    </div>
  );
}
