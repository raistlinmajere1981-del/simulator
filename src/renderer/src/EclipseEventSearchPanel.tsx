import { useState } from 'react';
import {
  searchSolarEclipseEventWindow,
  type SolarEclipseEventSearchResult
} from '../../simulation/solar-eclipse-event-search';
import type { SolarEclipseOverlapResult } from '../../simulation/solar-eclipse-overlap';
import './eclipse-event-search-panel.css';

const percentFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 });
const angleFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 5 });
const durationFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });
const utcFormatter = new Intl.DateTimeFormat('tr-TR', {
  timeZone: 'UTC',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
});

function utcTime(value: string | null): string {
  return value ? `${utcFormatter.format(new Date(value))} UTC` : 'Pencere dışında';
}

function geometryLabel(result: SolarEclipseOverlapResult | null): string {
  if (!result) return '—';
  switch (result.geometryClass) {
    case 'partial-overlap': return 'Kısmi örtüşme';
    case 'total-type-contained': return 'Tam-tip iç kapsama';
    case 'annular-type-contained': return 'Halkalı-tip iç kapsama';
    default: return 'Örtüşme yok';
  }
}

export function EclipseEventSearchPanel({
  anchorObservedAtIso,
  latitudeDeg,
  longitudeDeg
}: {
  anchorObservedAtIso: string;
  latitudeDeg: number;
  longitudeDeg: number;
}): React.JSX.Element {
  const [halfWindowHours, setHalfWindowHours] = useState(12);
  const [result, setResult] = useState<SolarEclipseEventSearchResult>();
  const [error, setError] = useState<string>();
  const [searchedKey, setSearchedKey] = useState<string>();
  const currentKey = `${anchorObservedAtIso}|${latitudeDeg.toFixed(8)}|${longitudeDeg.toFixed(8)}|${halfWindowHours}`;
  const stale = result !== undefined && searchedKey !== currentKey;

  const runSearch = (): void => {
    try {
      setError(undefined);
      const next = searchSolarEclipseEventWindow({
        anchorObservedAtIso,
        latitudeDeg,
        longitudeDeg,
        halfWindowHours,
        coarseStepMinutes: 5
      });
      setResult(next);
      setSearchedKey(currentKey);
    } catch (caught) {
      setResult(undefined);
      setSearchedKey(undefined);
      setError(caught instanceof Error ? caught.message : 'Tutulma zaman penceresi taranamadı.');
    }
  };

  return (
    <section className="eclipse-event-search-panel panel">
      <div className="eclipse-event-search-heading">
        <div>
          <span className="eyebrow">Aşama 7.3 · kontrollü zaman penceresi</span>
          <h2>Yerel disk örtüşme olayı ara</h2>
          <p>Seçili gözlem anının çevresini tarar; varsa örtüşmenin yaklaşık başlangıcını, maksimumunu ve bitişini düşük hassasiyetli modelle bulur.</p>
        </div>
        <div className="eclipse-event-search-controls">
          <label>
            <span>Yarım pencere</span>
            <select value={halfWindowHours} onChange={(event) => setHalfWindowHours(Number(event.target.value))}>
              <option value={6}>±6 saat</option>
              <option value={12}>±12 saat</option>
              <option value={24}>±24 saat</option>
              <option value={48}>±48 saat</option>
            </select>
          </label>
          <button type="button" onClick={runSearch}>Pencereyi tara</button>
        </div>
      </div>

      <div className="eclipse-event-search-anchor">
        <span>Merkez zaman <strong>{utcTime(anchorObservedAtIso)}</strong></span>
        <span>Konum <strong>{latitudeDeg.toFixed(5)}°, {longitudeDeg.toFixed(5)}°</strong></span>
        <span>Kaba adım <strong>5 dk</strong></span>
      </div>

      {error && <div className="eclipse-event-search-error">{error}</div>}
      {!result && !error && (
        <div className="eclipse-event-search-empty">
          Bu tarama kullanıcı isteğiyle çalışır. Böylece her tarih veya koordinat değişiminde yüzlerce astronomik örnek otomatik hesaplanmaz.
        </div>
      )}

      {result && (
        <>
          {stale && (
            <div className="eclipse-event-search-stale">
              Tarih, konum veya pencere değişti. Aşağıdaki sonuç önceki taramaya aittir; güncellemek için yeniden tara.
            </div>
          )}

          {result.status === 'overlap-found' && result.maximumOverlap ? (
            <>
              <div className="eclipse-event-timeline">
                <article>
                  <small>Örtüşme başlangıcı</small>
                  <strong>{utcTime(result.overlapStartIso)}</strong>
                  <span>{result.windowClipsEventStart ? 'Arama penceresinden önce başlamış olabilir' : 'Dış disk sınırı · yaklaşık'}</span>
                </article>
                <article className="peak">
                  <small>Maksimum örtüşme</small>
                  <strong>{utcTime(result.maximumOverlapIso)}</strong>
                  <span>%{percentFormatter.format(result.maximumOverlap.solarDiskCoveredFraction * 100)} Güneş disk alanı</span>
                </article>
                <article>
                  <small>Örtüşme bitişi</small>
                  <strong>{utcTime(result.overlapEndIso)}</strong>
                  <span>{result.windowClipsEventEnd ? 'Arama penceresinden sonra sürebilir' : 'Dış disk sınırı · yaklaşık'}</span>
                </article>
              </div>

              <div className="eclipse-event-metrics">
                <div><small>Örtüşme süresi</small><strong>{result.overlapDurationMinutes === null ? 'Pencere ile sınırlı' : `${durationFormatter.format(result.overlapDurationMinutes)} dk`}</strong></div>
                <div><small>Maksimum sınıf</small><strong>{geometryLabel(result.maximumOverlap)}</strong></div>
                <div><small>Maksimum merkez ayrımı</small><strong>{angleFormatter.format(result.maximumOverlap.centerSeparationDeg)}°</strong></div>
                <div><small>Maksimum çap örtme oranı</small><strong>%{percentFormatter.format(result.maximumOverlap.solarDiameterCoverageRatio * 100)}</strong></div>
                <div><small>Maksimumda geometrik ufuk</small><strong>{result.maximumOverlap.bothCentersAboveGeometricHorizon ? 'İki merkez üstte' : 'En az bir merkez altta'}</strong></div>
                <div><small>Kaba tarama örneği</small><strong>{result.coarseSampleCount}</strong></div>
              </div>

              {result.containedStartIso && result.containedEndIso && (
                <div className="eclipse-contained-strip">
                  <strong>İç kapsama aralığı bulundu</strong>
                  <span>{utcTime(result.containedStartIso)} → {utcTime(result.containedEndIso)}</span>
                  <span>{result.containedDurationMinutes === null ? '' : `≈ ${durationFormatter.format(result.containedDurationMinutes)} dk`}</span>
                </div>
              )}
            </>
          ) : (
            <div className="eclipse-no-event-result">
              <div>
                <small>Sonuç</small>
                <strong>Seçilen pencerede disk örtüşmesi yok</strong>
              </div>
              <div>
                <small>En yakın yaklaşım</small>
                <strong>{utcTime(result.closestApproachIso)}</strong>
                <span>Dış limb açıklığı {angleFormatter.format(result.closestApproach.outerLimbClearanceDeg)}°</span>
              </div>
            </div>
          )}

          <p className="eclipse-event-search-limit">
            Bu zamanlar resmi C1–C4 temasları değildir. 5 dakikalık kaba tarama, ardından yaklaşık 1 saniyelik sayısal sınır inceltmesi kullanılır. Bessel elemanları, Ay limb topografyası, atmosferik kırılma ve yüksek hassasiyetli JPL efemerisi uygulanmaz.
          </p>
        </>
      )}
    </section>
  );
}
