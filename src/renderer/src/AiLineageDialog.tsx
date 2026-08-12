import { useEffect, useMemo, useState } from 'react';
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

const analysisLabel: Record<AiFollowUpVerification['analysis']['status'], string> = {
  verified: 'Kaynak analiz yeniden üretildi ve hash eşleşti.',
  'source-missing': 'Kaynak deney anlık görüntüsü kayıt listesinde yok; analiz hash’i yeniden üretilemedi.',
  'source-changed': 'Aynı deney kimliği bulundu ancak updatedAt snapshot zamanı farklı; tarihsel analiz yeniden üretilmedi.',
  mismatch: 'Kaynak snapshot yeniden üretildi ancak analiz SHA-256 eşleşmedi.'
};

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
  const entries = useMemo(
    () => (experiment.textSetupHistory ?? []).filter(
      (item) => item.sourceKind === 'ai-follow-up' && item.aiLineage
    ),
    [experiment]
  );
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
            <span className="eyebrow">AŞAMA 8.8 · HASH DOĞRULAMA</span>
            <h2>AI Soy Ağacı Doğrulaması</h2>
          </div>
          <button className="dialog-close" type="button" onClick={onClose}>×</button>
        </header>

        <div className="portable-info">
          <strong>{experiment.name}</strong>
          <span>
            Kanonik GGL-AI-TEST bloğunun SHA-256 özeti her zaman yeniden hesaplanır. Kaynak deney snapshot’ı hâlâ kayıt listesinde aynı kimlik ve güncelleme zamanı ile bulunuyorsa GGL-AI-ANALYSIS paketi de deterministik olarak yeniden üretilip doğrulanır.
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
                <tr><td>Kaynak snapshot</td><td>{lineage.sourceExperimentUpdatedAtIso}</td></tr>
                <tr><td>Kanonik test</td><td>{result.canonicalTest.status === 'verified' ? 'SHA-256 eşleşti' : 'SHA-256 UYUŞMADI'}</td></tr>
                <tr><td>Beklenen test hash</td><td><code title={result.canonicalTest.expectedSha256}>{shortHash(result.canonicalTest.expectedSha256)}</code></td></tr>
                <tr><td>Hesaplanan test hash</td><td><code title={result.canonicalTest.actualSha256}>{shortHash(result.canonicalTest.actualSha256)}</code></td></tr>
                <tr><td>Kaynak analiz</td><td>{analysisLabel[result.analysis.status]}</td></tr>
                <tr><td>Beklenen analiz hash</td><td><code title={result.analysis.expectedSha256}>{shortHash(result.analysis.expectedSha256)}</code></td></tr>
                {result.analysis.actualSha256 && <tr><td>Hesaplanan analiz hash</td><td><code title={result.analysis.actualSha256}>{shortHash(result.analysis.actualSha256)}</code></td></tr>}
              </tbody></table>
              {result.status === 'partial' && (
                <p className="muted">
                  Kısmi doğrulama bir hata değildir: tarihsel kaynak snapshot artık kayıt listesinde tutulmuyorsa analiz paketi yeniden üretilemez. Kanonik test bloğunun bütünlüğü yine bağımsız olarak doğrulanır.
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
