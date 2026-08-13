import { useMemo } from 'react';
import type { ImportedDemTerrainProfile } from '../../shared/simulator';
import { reviewDemLineOfSight } from '../../simulation/dem-line-of-sight-review';
import { summarizeDemSourceTraceability } from '../../simulation/dem-source-traceability';
import { useI18n } from './I18nProvider';
import { appLocaleTag } from './i18n';
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
  const { locale, t } = useI18n();
  const numberFormatter = new Intl.NumberFormat(appLocaleTag(locale), {
    maximumFractionDigits: 2
  });
  const cellSizeFormatter = new Intl.NumberFormat(appLocaleTag(locale), {
    minimumFractionDigits: 8,
    maximumFractionDigits: 8,
    useGrouping: false
  });

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
          : t('terrain.demReview.previewFallbackError')
      };
    }
  }, [
    applyObserverEndpoint,
    applyTargetEndpoint,
    observerGroundElevationM,
    observerHeightM,
    profile,
    refractionCoefficient,
    t,
    targetGroundElevationM,
    targetHeightM,
    useStandardRefraction,
    verticalDatumOffsetM
  ]);

  const traceabilityLabel = traceability.status === 'complete'
    ? t('terrain.demReview.trace.complete')
    : traceability.status === 'partial'
      ? t('terrain.demReview.trace.partial')
      : t('terrain.demReview.trace.legacy');

  if (preview.status === 'error') {
    return (
      <div className="dem-line-of-sight-review error">
        <strong>{t('terrain.demReview.previewError')}</strong>
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
            <small>{t('terrain.demReview.traceTitle')}</small>
            <strong>{profile.fileName}</strong>
          </div>
          <b>{traceabilityLabel}</b>
        </div>

        <div className="dem-source-traceability-metrics">
          <span>
            {t('terrain.demReview.horizontalReference')}
            <b>{t('terrain.demReview.horizontalReferenceValue')}</b>
            <i>{t('terrain.demReview.horizontalReferenceNote')}</i>
          </span>
          <span>
            {t('terrain.demReview.verticalReference')}
            <b>{t('terrain.demReview.verticalReferenceValue')}</b>
            <i>{t('terrain.demReview.verticalReferenceNote')}</i>
          </span>
          <span>
            {t('terrain.demReview.fileIntegrity')}
            <b>
              {traceability.integrityRecorded
                ? t('terrain.demReview.integrityValue', {
                    bytes: numberFormatter.format(traceability.fileSizeBytes ?? 0),
                    sha: traceability.sha256Short ?? ''
                  })
                : t('terrain.demReview.integrityMissing')}
            </b>
          </span>
          <span>
            {t('terrain.demReview.nativeResolution')}
            <b>{t('terrain.demReview.cellValue', {
              size: cellSizeFormatter.format(profile.cellSizeDeg)
            })}</b>
          </span>
          <span>
            {t('terrain.demReview.effectiveResolution')}
            <b>
              {traceability.effectiveCellSpanM === null
                ? t('terrain.demReview.legacyMissing')
                : `${numberFormatter.format(traceability.effectiveCellSpanM)} m`}
            </b>
            <i>{t('terrain.demReview.effectiveResolutionNote')}</i>
          </span>
          <span>
            {t('terrain.demReview.coverageGrid')}
            <b>{t('terrain.demReview.coverageGridValue', {
              width: numberFormatter.format(traceability.coverageWidthDeg),
              height: numberFormatter.format(traceability.coverageHeightDeg),
              cells: numberFormatter.format(traceability.gridCellCount)
            })}</b>
          </span>
        </div>

        <p>{t('terrain.demReview.traceNote')}</p>
      </div>

      <div className="dem-line-of-sight-heading">
        <div>
          <small>{t('terrain.demReview.losTitle')}</small>
          <strong>
            {result.blocked
              ? t('terrain.demReview.blocked')
              : t('terrain.demReview.clear')}
          </strong>
        </div>
        <b>
          {result.blocked
            ? t('terrain.demReview.blockedBadge')
            : t('terrain.demReview.clearBadge')}
        </b>
      </div>

      <div className="dem-line-of-sight-metrics">
        <span>
          {t('terrain.demReview.minimumClearance')}
          <b>{numberFormatter.format(result.minimumClearanceM)} m</b>
        </span>
        <span>
          {t('terrain.demReview.criticalLocation')}
          <b>
            %{numberFormatter.format(result.criticalDistancePercent)} ·{' '}
            {numberFormatter.format(result.criticalDistanceM / 1_000)} km
          </b>
        </span>
        <span>
          {t('terrain.demReview.criticalTerrainLos')}
          <b>
            {numberFormatter.format(result.criticalTerrainElevationM)} /{' '}
            {numberFormatter.format(result.criticalLineOfSightElevationM)} m
          </b>
        </span>
        <span>
          {t('terrain.demReview.blockingSamples')}{' '}
          <b>{numberFormatter.format(result.blockingSampleCount)}</b>
        </span>
        <span>
          {t('terrain.demReview.nearSamples', {
            threshold: numberFormatter.format(result.nearClearanceThresholdM)
          })}
          <b>{numberFormatter.format(result.nearClearanceSampleCount)}</b>
        </span>
        <span>
          {t('terrain.demReview.geometry')}
          <b>
            {result.atmosphereMode === 'standard'
              ? t('terrain.demReview.geometryStandard')
              : t('terrain.demReview.geometryNoRefraction')}
          </b>
        </span>
      </div>

      <p>{t('terrain.demReview.liveNote')}</p>
    </div>
  );
}
