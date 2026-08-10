import type { SolarEclipseOverlapResult } from '../../simulation/solar-eclipse-overlap';
import './eclipse-overlap-panel.css';

const angleFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 5 });
const percentFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 });
const distanceFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });

function classLabel(result: SolarEclipseOverlapResult): string {
  switch (result.geometryClass) {
    case 'partial-overlap': return 'Kısmi disk örtüşmesi';
    case 'total-type-contained': return 'Tam-tip anlık geometri';
    case 'annular-type-contained': return 'Halkalı-tip anlık geometri';
    default: return 'Disk örtüşmesi yok';
  }
}

function classTone(result: SolarEclipseOverlapResult): string {
  return result.geometryClass === 'no-overlap' ? 'clear' : 'overlap';
}

export function EclipseOverlapPanel({
  result,
  onShowTrace
}: {
  result: SolarEclipseOverlapResult;
  onShowTrace?: () => void;
}): React.JSX.Element {
  const sunRadius = 78;
  const moonRadius = sunRadius * result.lunarAngularRadiusDeg / result.solarAngularRadiusDeg;
  const exactSeparationPx = sunRadius * result.centerSeparationDeg / result.solarAngularRadiusDeg;
  const compressed = exactSeparationPx > 220;
  const separationPx = compressed ? 220 : exactSeparationPx;
  const sunX = 265;
  const moonX = sunX + separationPx;
  const centerY = 145;

  return (
    <section className="eclipse-overlap-panel panel">
      <div className="eclipse-overlap-heading">
        <div>
          <span className="eyebrow">Aşama 7.2 · anlık tutulma geometrisi</span>
          <h2>Güneş–Ay apparent disk örtüşmesi</h2>
          <p>Seçili gözlemci ve zaman için iki disk birlikte çözülür. Bu panel temas zamanı veya resmi tutulma yolu üretmez.</p>
        </div>
        <div className="eclipse-overlap-actions">
          {onShowTrace && <button type="button" onClick={onShowTrace}>Hesap izi</button>}
          <strong className={`eclipse-overlap-state ${classTone(result)}`}>{classLabel(result)}</strong>
        </div>
      </div>

      <div className="eclipse-overlap-body">
        <div className="eclipse-disk-stage">
          <svg viewBox="0 0 600 290" role="img" aria-label="Güneş ve Ay apparent disk geometrisi">
            <line className="eclipse-center-line" x1={sunX} y1={centerY} x2={moonX} y2={centerY} />
            <circle className="eclipse-sun-disk" cx={sunX} cy={centerY} r={sunRadius} />
            <circle className="eclipse-moon-disk" cx={moonX} cy={centerY} r={moonRadius} />
            <circle className="eclipse-center-mark" cx={sunX} cy={centerY} r="2.5" />
            <circle className="eclipse-center-mark" cx={moonX} cy={centerY} r="2.5" />
            <text x={sunX} y="258" textAnchor="middle">Güneş</text>
            <text x={Math.min(540, moonX)} y="258" textAnchor="middle">Ay</text>
          </svg>
          <div className="eclipse-scale-note">
            {compressed
              ? 'Merkez ayrımı çok büyük olduğu için yalnız yerleşim sıkıştırılmıştır; disk çap oranları kendi aralarında ölçeklidir.'
              : 'Disk yarıçapları ve merkez ayrımı aynı açısal ölçekte çizilmiştir.'}
          </div>
        </div>

        <div className="eclipse-overlap-metrics">
          <div><small>Merkez ayrımı</small><strong>{angleFormatter.format(result.centerSeparationDeg)}°</strong></div>
          <div><small>Güneş açısal yarıçapı</small><strong>{angleFormatter.format(result.solarAngularRadiusDeg)}°</strong></div>
          <div><small>Ay açısal yarıçapı</small><strong>{angleFormatter.format(result.lunarAngularRadiusDeg)}°</strong></div>
          <div><small>Güneş disk alanı örtüşmesi</small><strong>%{percentFormatter.format(result.solarDiskCoveredFraction * 100)}</strong></div>
          <div><small>Çap doğrultusu örtme oranı</small><strong>%{percentFormatter.format(result.solarDiameterCoverageRatio * 100)}</strong></div>
          <div><small>Dış limb açıklığı</small><strong>{angleFormatter.format(result.outerLimbClearanceDeg)}°</strong></div>
          <div><small>Güneş merkez yüksekliği</small><strong>{angleFormatter.format(result.sunCenterElevationDeg)}°</strong></div>
          <div><small>Ay merkez yüksekliği</small><strong>{angleFormatter.format(result.moonCenterElevationDeg)}°</strong></div>
        </div>
      </div>

      <div className="eclipse-overlap-provenance">
        <span>Güneş uzaklığı <strong>{result.solarDistanceAu.toFixed(6)} AU</strong></span>
        <span>Ay uzaklığı <strong>{distanceFormatter.format(result.lunarDistanceKm)} km</strong></span>
        <span>Geometrik ufuk <strong>{result.bothCentersAboveGeometricHorizon ? 'iki merkez üstte' : 'en az bir merkez altta'}</strong></span>
      </div>

      <p className="eclipse-overlap-limit">
        Düşük hassasiyetli astronomik tanıdır: Bessel elemanları, C1–C4 temasları, merkez hattı, Ay limb topografyası, atmosferik kırılma ve JPL DE efemerisi uygulanmaz. “Tam-tip / halkalı-tip” yalnız bu anın disk kapsanma geometrisini ifade eder.
      </p>
    </section>
  );
}
