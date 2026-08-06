import { useMemo } from 'react';
import type { ImportedDemTerrainProfile } from '../../shared/simulator';
import { reviewDemLineOfSight } from '../../simulation/dem-line-of-sight-review';
import { summarizeDemSourceTraceability } from '../../simulation/dem-source-traceability';
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

function traceabilityLabel(status: 'complete' | 'partial' | 'legacy'): string {
  if (status === 'complete') return 'TAM KAYNAK İZİ';
  if (status === 'partial') return 'KISMİ KAYNAK İZİ';
  return 'ESKİ KAYNAK KAYDI';
}

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
  const traceability = useMemo(
    () => summarizeDemSourceTraceability(profile),
    [profile]
  );
  const preview = useMemo(() => {
    try {
      return {
        status: 'success' as const,
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
        status: 'error' as const,
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

  if (preview.status === 'error') {
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
      <div className={`dem-source-traceability ${traceability.status}`}>
        <div className="dem-source-traceability-heading">
          <div>
            <small>VERİ KAYNAĞI VE ÇÖZÜNÜRLÜK İZİ</small>
            <strong>{profile.fileName}</strong>
          </div>
          <b>{traceabilityLabel(traceability.status)}</b>
        </div>
        <div className="dem-source-traceability-metrics">
          <span>
            Yatay referans
            <b>WGS 84 · coğrafi derece</b>
            <i>İçe aktarma sözleşmesi; .prj kanıtı yok</i>
          </span>
          <span>
            Düşey referans
            <b>Dosyadan bilinmiyor</b>
            <i>Deney datumuyla kullanıcı tarafından eşleştirilir</i>
          </span>
          <span>
            Dosya bütünlüğü
            <b>
              {traceability.integrityRecorded
                ? `${numberFormatter.format(traceability.fileSizeBytes ?? 0)} bayt · ${traceability.sha256Short}…`
                : 'Boyut / SHA-256 kaydı yok'}
            </b>
          </span>
          <span>
            Doğal çözünürlük
            <b>{profile.cellSizeDeg.toFixed(8)}° hücre</b>
          </span>
          <span>
            Etkili çözünürlük
            <b>
              {traceability.effectiveCellSpanM === null
                ? 'Eski kayıtta yok'
                : `${numberFormatter.format(traceability.effectiveCellSpanM)} m`}
            </b>
            <i>Rota orta enleminde en dar hücre açıklığı</i>
          </span>
          <span>
            Kapsam / grid
            <b>
              {numberFormatter.format(traceability.coverageWidthDeg)}° ×{' '}
              {numberFormatter.format(traceability.coverageHeightDeg)}° ·{' '}
              {numberFormatter.format(traceability.gridCellCount)} hücre
            </b>
          </span>
        </div>
        <p>
          Kaynak izi dosyanın yeniden tanınmasını ve çözünürlük sınırlarının
          görülmesini sağlar; DEM'in bilimsel doğruluğunu veya düşey datumunu
          tek başına doğrulamaz.
        </p>
      </div>

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
