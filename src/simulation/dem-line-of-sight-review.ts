import type { ImportedDemTerrainProfile } from '../shared/simulator';
import type { TerrainProfile } from '../shared/terrain';
import {
  effectiveRadiusM,
  MEAN_EARTH_RADIUS_M
} from './geometry';
import { analyzeSphericalTerrainClearance } from './terrain';

const DEFAULT_NEAR_CLEARANCE_THRESHOLD_M = 5;

export interface DemLineOfSightReviewInput {
  observerGroundElevationM: number;
  targetGroundElevationM: number;
  observerHeightM: number;
  targetHeightM: number;
  verticalDatumOffsetM: number;
  useStandardRefraction: boolean;
  refractionCoefficient: number;
  nearClearanceThresholdM?: number;
}

export interface DemLineOfSightReview {
  blocked: boolean;
  minimumClearanceM: number;
  criticalDistanceM: number;
  criticalDistancePercent: number;
  criticalTerrainElevationM: number;
  criticalLineOfSightElevationM: number;
  blockingSampleCount: number;
  nearClearanceSampleCount: number;
  nearClearanceThresholdM: number;
  radiusM: number;
  atmosphereMode: 'off' | 'standard';
  warnings: string[];
}

function assertFinite(label: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} sonlu bir sayı olmalı.`);
  }
}

function validateInput(
  profile: ImportedDemTerrainProfile,
  input: DemLineOfSightReviewInput
): number {
  if (!Number.isFinite(profile.sourceDistanceM) || profile.sourceDistanceM <= 0) {
    throw new RangeError('DEM görüş hattı önizlemesi için pozitif rota mesafesi gerekli.');
  }
  assertFinite('Gözlemci zemin kotu', input.observerGroundElevationM);
  assertFinite('Hedef zemin kotu', input.targetGroundElevationM);
  assertFinite('Gözlemci yüksekliği', input.observerHeightM);
  assertFinite('Hedef yüksekliği', input.targetHeightM);
  assertFinite('Düşey datum ofseti', input.verticalDatumOffsetM);
  assertFinite('Kırılma katsayısı', input.refractionCoefficient);
  if (input.observerHeightM < 0 || input.targetHeightM < 0) {
    throw new RangeError('Gözlemci ve hedef yükseklikleri negatif olamaz.');
  }
  const threshold = input.nearClearanceThresholdM ??
    DEFAULT_NEAR_CLEARANCE_THRESHOLD_M;
  assertFinite('Yakın açıklık eşiği', threshold);
  if (threshold < 0) {
    throw new RangeError('Yakın açıklık eşiği negatif olamaz.');
  }
  return threshold;
}

function buildReviewProfile(
  profile: ImportedDemTerrainProfile,
  input: DemLineOfSightReviewInput
): TerrainProfile {
  return {
    id: 'dem-line-of-sight-review',
    label: `${profile.fileName} görüş hattı önizlemesi`,
    source: 'dem',
    datum: {
      kind: 'local',
      label: 'Deneyin seçili düşey referansı',
      offsetM: input.verticalDatumOffsetM
    },
    totalDistanceM: profile.sourceDistanceM,
    samples: [
      {
        distanceM: 0,
        elevationM: input.observerGroundElevationM
      },
      ...profile.points.map((point) => ({
        distanceM: profile.sourceDistanceM * point.distancePercent / 100,
        elevationM: point.elevationM
      })),
      {
        distanceM: profile.sourceDistanceM,
        elevationM: input.targetGroundElevationM
      }
    ]
  };
}

export function reviewDemLineOfSight(
  profile: ImportedDemTerrainProfile,
  input: DemLineOfSightReviewInput
): DemLineOfSightReview {
  const nearClearanceThresholdM = validateInput(profile, input);
  const radiusM = input.useStandardRefraction
    ? effectiveRadiusM(MEAN_EARTH_RADIUS_M, input.refractionCoefficient)
    : MEAN_EARTH_RADIUS_M;
  const terrainProfile = buildReviewProfile(profile, input);
  const result = analyzeSphericalTerrainClearance(terrainProfile, {
    observerEyeElevationM: input.observerGroundElevationM +
      input.verticalDatumOffsetM + input.observerHeightM,
    targetTopElevationM: input.targetGroundElevationM +
      input.verticalDatumOffsetM + input.targetHeightM,
    surfaceDistanceM: profile.sourceDistanceM,
    radiusM
  });
  const critical = result.criticalSample;
  if (result.minimumClearanceM === null || critical === null) {
    throw new RangeError('DEM görüş hattını sınayacak ara rota örneği bulunamadı.');
  }

  const interior = result.samples.filter((sample) =>
    sample.distanceM > 0 && sample.distanceM < profile.sourceDistanceM
  );
  const warnings = [...result.warnings];
  if (input.useStandardRefraction) {
    warnings.push(
      `Standart kırılma etkin yarıçap yaklaşımıyla önizlendi (k=${input.refractionCoefficient.toFixed(3)}).`
    );
  } else {
    warnings.push('Görüş hattı önizlemesinde atmosferik kırılma uygulanmadı.');
  }

  return {
    blocked: result.blocked,
    minimumClearanceM: result.minimumClearanceM,
    criticalDistanceM: critical.distanceM,
    criticalDistancePercent: critical.distanceM / profile.sourceDistanceM * 100,
    criticalTerrainElevationM: critical.elevationM,
    criticalLineOfSightElevationM: critical.lineOfSightElevationM,
    blockingSampleCount: interior.filter((sample) => sample.clearanceM <= 0).length,
    nearClearanceSampleCount: interior.filter((sample) =>
      sample.clearanceM > 0 && sample.clearanceM <= nearClearanceThresholdM
    ).length,
    nearClearanceThresholdM,
    radiusM,
    atmosphereMode: input.useStandardRefraction ? 'standard' : 'off',
    warnings
  };
}
