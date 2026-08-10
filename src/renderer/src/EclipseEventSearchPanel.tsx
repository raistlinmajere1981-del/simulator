import { useEffect, useState } from 'react';
import { searchSolarEclipseEventWindow } from '../../simulation/solar-eclipse-event-search';
import {
  snapshotSolarEclipseEventSearch,
  type SolarEclipseEventSearchSnapshot
} from '../../simulation/solar-eclipse-event-search-prediction';
import type { SolarEclipseInstantGeometryClass } from '../../simulation/solar-eclipse-overlap';
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

function geometryLabel(value: SolarEclipseInstantGeometryClass | null): string {
  switch (value) {
    case 'partial-overlap': return 'Kısmi örtüşme';
    case 'total-type-contained': return 'Tam-tip iç kapsama';
    case 'annular-type-contained': return 'Halkalı-tip iç kapsama';
    case 'no-overlap': return 'Örtüşme yok';
    default: return '—';
  }
}

function searchKey(anchorObservedAtIso: string, latitudeDeg: number, longitudeDeg: number, halfWindowHours: number): string {
  return `${anchorObservedAtIso}|${latitudeDeg.toFixed(8)}|${longitudeDeg.toFixed(8)}|${halfWindowHours}`;
}

export function EclipseEventSearchPanel({
  anchorObservedAtIso,
  latitudeDeg,
  longitudeDeg,
  initialSnapshot,
  onSnapshotChange,
  onShowTrace
}: {
  anchorObservedAtIso: string;
  latitudeDeg: number;
  longitudeDeg: number;
  initialSnapshot?: SolarEclipseEventSearchSnapshot;
  onSnapshotChange?: (snapshot: SolarEclipseEventSearchSnapshot | undefined) => void;
  onShowTrace?: () => void;
}): React.JSX.Element {
  const [halfWindowHours, setHalfWindowHours] = useState(initialSnapshot?.halfWindowHours ?? 12);
  const [snapshot, setSnapshot] = useState<SolarEclipseEventSearchSnapshot | undefined>(initialSnapshot);
  const [error, setError] = useState<string>();

  useEffect(() => {
    setSnapshot(initialSnapshot);
    if (initialSnapshot) setHalfWindowHours(initialSnapshot.halfWindowHours);
  }, [initialSnapshot]);

  const currentKey = searchKey(anchorObservedAtIso, latitudeDeg, longitudeDeg, halfWindowHours);
  const snapshotKey = snapshot
    ? searchKey(snapshot.anchorObservedAtIso, snapshot.latitudeDeg, snapshot.longitudeDeg, snapshot.halfWindowHours)
    : undefined;
  const stale = snapshot !== undefined && snapshotKey !== currentKey;

  const runSearch = (): void => {
    try {
      setError(undefined);
      const next = snapshotSolarEclipseEventSearch(searchSolarEclipseEventWindow({
        anchorObservedAtIso,
        latitudeDeg,
        longitudeDeg,
        halfWindowHours,
        coarseStepMinutes: 5
      }));
      setSnapshot(next);
      onSnapshotChange?.(next);
    } catch (caught) {
      setSnapshot(undefined);
      onSnapshotChange?.(undefined);
      setError(caught instanceof Error ? caught.message : 'Tutulma zaman penceresi taranamadı.');
    }
  };

  return (
    <section className="eclipse-event-search-panel panel">
      <div className="eclipse-event-search-heading">
        <div>
          <span className="eyebrow">Aşama 7.4 · kaydedilebilir zaman penceresi</span>
          <h2>Yerel disk örtüşme olayı ara</h2>
          <p>Seçili gözlem anının çevresini tarar; varsa örtüşmenin yaklaşık başlangıcını, maksimumunu ve bitişini düşük hassasiyetli modelle bulur. Son tarama ayrı tutulma senaryosunda deney kaydına eklenebilir.</p>
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
          {snapshot && !stale && onShowTrace && <button type="button" className="secondary" onClick={onShowTrace}>Hesap izi</button>}
          <button type="button" onClick={runSearch}>Pencereyi tara</button>
        </div>
      </div>

      <div className="eclipse-event-search-anchor">
        <span>Merkez zaman <strong>{utcTime(anchorObservedAtIso)}</strong></span>
        <span>Konum <strong>{latitudeDeg.toFixed(5)}°, {longitudeDeg.toFixed(5)}°</strong></span>
        <span>Kaba adım <strong>5 dk</strong></span>
        {snapshot && <span>Kayıt durumu <strong>{stale ? 'ESKİ SONUÇ' : 'KAYDA HAZIR'}</strong></span>}
      </div>

      {error && <div className="eclipse-event-search-error">{error}</div>}
      {!snapshot && !error && (
        <div className="eclipse-event-search-empty">
          Bu tarama kullanıcı isteğiyle çalışır. Böylece her tarih veya koordinat değişiminde yüzlerce astronomik örnek otomatik hesaplanmaz.
        </div>
      )}

      {snapshot && (
        <>
          {stale && (
            <div className="eclipse-event-search-stale">
              Tarih, konum veya pencere değişti. Aşağıdaki sonuç önceki taramaya aittir ve kayda güncel sonuç olarak eklenmez; yeniden tara.
            </div>
          )}

          {snapshot.status === 'overlap-found' && snapshot.maximumSolarDiskCoveredFraction !== null ? (
            <>
              <div className="eclipse-event-timeline">
                <article>
                  <small>Örtüşme başlangıcı</small>
                  <strong>{utcTime(snapshot.overlapStartIso)}</strong>
                  <span>{snapshot.windowClipsEventStart ? 'Arama penceresinden önce başlamış olabilir' : 'Dış disk sınırı · yaklaşık'}</span>
                </article>
                <article className="peak">
                  <small>Maksimum örtüşme</small>
                  <strong>{utcTime(snapshot.maximumOverlapIso)}</strong>
                  <span>%{percentFormatter.format(snapshot.maximumSolarDiskCoveredFraction * 100)} Güneş disk alanı</span>
                </article>
                <article>
                  <small>Örtüşme bitişi</small>
                  <strong>{utcTime(snapshot.overlapEndIso)}</strong>
                  <span>{snapshot.windowClipsEventEnd ? 'Arama penceresinden sonra sürebilir' : 'Dış disk sınırı · yaklaşık'}</span>
                </article>
              </div>

              <div className="eclipse-event-metrics">
                <div><small>Örtüşme süresi</small><strong>{snapshot.overlapDurationMinutes === null ? 'Pencere ile sınırlı' : `${durationFormatter.format(snapshot.overlapDurationMinutes)} dk`}</strong></div>
                <div><small>Maksimum sınıf</small><strong>{geometryLabel(snapshot.maximumGeometryClass)}</strong></div>
                <div><small>Maksimum merkez ayrımı</small><strong>{snapshot.maximumCenterSeparationDeg === null ? '—' : `${angleFormatter.format(snapshot.maximumCenterSeparationDeg)}°`}</strong></div>
                <div><small>Maksimum çap örtme oranı</small><strong>{snapshot.maximumSolarDiameterCoverageRatio === null ? '—' : `%${percentFormatter.format(snapshot.maximumSolarDiameterCoverageRatio * 100)}`}</strong></div>
                <div><small>Maksimumda geometrik ufuk</small><strong>{snapshot.maximumBothCentersAboveGeometricHorizon === null ? '—' : snapshot.maximumBothCentersAboveGeometricHorizon ? 'İki merkez üstte' : 'En az bir merkez altta'}</strong></div>
                <div><small>Kaba tarama örneği</small><strong>{snapshot.coarseSampleCount}</strong></div>
              </div>

              {snapshot.containedStartIso && snapshot.containedEndIso && (
                <div className="eclipse-contained-strip">
                  <strong>İç kapsama aralığı bulundu</strong>
                  <span>{utcTime(snapshot.containedStartIso)} → {utcTime(snapshot.containedEndIso)}</span>
                  <span>{snapshot.containedDurationMinutes === null ? '' : `≈ ${durationFormatter.format(snapshot.containedDurationMinutes)} dk`}</span>
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
                <strong>{utcTime(snapshot.closestApproachIso)}</strong>
                <span>Dış limb açıklığı {angleFormatter.format(snapshot.closestApproachOuterLimbClearanceDeg)}°</span>
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
