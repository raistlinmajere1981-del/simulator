import { useMemo } from 'react';
import type { ImportedDemTerrainProfile } from '../../shared/simulator';
import { reviewDemLineOfSight } from '../../simulation/dem-line-of-sight-review';
import './dem-line-of-sight-review.css';

interface DemLineOfSightReviewCardProps {
  profile: ImportedDemTerrainProfile;
  applyObserverEndpoint: boolean;
  applyTargetEndpoint: boolean;
  observerGroundElevationM: number;
  targetGroundElevationM: number;
  observerHeightM: number;
  targetHeightM: number;
  verticalDatumOffsetM: number;
  useStandardRefraction: boolean;
  refractionCoefficient: number;
}

const numberFormatter = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 2
});

export function DemLineOfSightReviewCard({
  profile,
  applyObserverEndpoint,
  applyTargetEndpoint,
  observerGroundElevationM,
  targetGroundElevationM,
  observerHeightM,
  targetHeightM,
  verticalDatumOffsetM,
  useStandardRefraction,
  refractionCoefficient
}: DemLineOfSightReviewCardProps): React.JSX.Element {
  const preview = useMemo(() => {
    try {
      return {
        result: reviewDemLineOfSight(profile, {
          observerGroundElevationM: applyObserverEndpoint
            ? profile.observerEndpointElevationM
            : observerGroundElevationM,
          targetGroundElevationM: applyTargetEndpoint
            ? profile.targetEndpointElevationM
            : targetGroundElevationM,
          observerHeightM,
          targetHeightM,
          verticalDatumOffsetM,
          useStandardRefraction,
          refractionCoefficient
        })
      };
    } catch (error) {
      return {
        error: error instanceof Error
          ? error.message
          : 'DEM görüş hattı önizlemesi hesaplanamadı.'
      };
    }
  }, [
    applyObserverEndpoint,
    applyTargetEndpoint,
    observerGroundElevationM,
    observerHeightM,
    profile,
    refractionCoefficient,
    targetGroundElevationM,
    targetHeightM,
    useStandardRefraction,
    verticalDatumOffsetM
  ]);

  if ('error' in preview) {
    return (
      <div className="dem-line-of-sight-review error">
        <strong>Görüş hattı önizlemesi hesaplanamadı</strong>
        <span>{preview.error}</span>
      </div>
    );
  }

  const result = preview.result;
  return (
    <div className={`dem-line-of-sight-review ${result.blocked ? 'blocked' : 'clear'}`}>
      <div className="dem-line-of-sight-heading">
        <div>
          <small>DEM ÖRNEKLERİ BOYUNCA KÜRESEL GÖRÜŞ HATTI</small>
          <strong>
            {result.blocked
              ? 'Görüş hattı arazi tarafından engelleniyor'
              : 'Görüş hattı DEM örneklerini temizliyor'}
          </strong>
        </div>
        <b>{result.blocked ? 'ENGELLİ' : 'AÇIK'}</b>
      </div>
      <div className="dem-line-of-sight-metrics">
        <span>
          Minimum açıklık
          <b>{numberFormatter.format(result.minimumClearanceM)} m</b>
        </span>
        <span>
          Kritik konum
          <b>
            %{numberFormatter.format(result.criticalDistancePercent)} ·{' '}
            {numberFormatter.format(result.criticalDistanceM / 1_000)} km
          </b>
        </span>
        <span>
          Kritik arazi / görüş hattı
          <b>
            {numberFormatter.format(result.criticalTerrainElevationM)} /{' '}
            {numberFormatter.format(result.criticalLineOfSightElevationM)} m
          </b>
        </span>
        <span>Engelleyen örnek <b>{result.blockingSampleCount}</b></span>
        <span>
          0–{numberFormatter.format(result.nearClearanceThresholdM)} m yakın örnek
          <b>{result.nearClearanceSampleCount}</b>
        </span>
        <span>
          Geometri
          <b>
            {result.atmosphereMode === 'standard'
              ? 'etkin yarıçap / standart kırılma'
              : 'ortalama Dünya yarıçapı / kırılma kapalı'}
          </b>
        </span>
      </div>
      <p>
        Uç kotu kutuları, gözlemci ve hedef yükseklikleri, datum ofseti ve kırılma
        ayarı değiştikçe bu önizleme canlı yenilenir.
      </p>
    </div>
  );
}
