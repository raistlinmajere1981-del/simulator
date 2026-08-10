import type {
  SavedStellarLocalHorizonSource,
  StellarDemSkylineDraft,
  StellarDemSkylineGenerationSettings
} from '../shared/stellar-local-horizon-import';
import {
  DEM_SKYLINE_ALGORITHM_ID,
  DEM_SKYLINE_ALGORITHM_VERSION,
  type DemSkylineResult
} from './dem-skyline';

export class StellarDemSkylineSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StellarDemSkylineSourceError';
  }
}

export function savedStellarLocalHorizonSourceFromDemSkyline(input: {
  draft: StellarDemSkylineDraft;
  settings: StellarDemSkylineGenerationSettings;
  result: DemSkylineResult;
}): SavedStellarLocalHorizonSource {
  if (!input.result.completeCoverage ||
    input.result.completeRayCount !== input.result.pointCount ||
    input.result.coverageLimitedRayCount !== 0 ||
    input.result.noDataAffectedRayCount !== 0 ||
    input.result.noCoverageRayCount !== 0) {
    throw new StellarDemSkylineSourceError(
      'Eksik kapsamalı DEM skyline sonucu tam yerel ufuk kaynağına dönüştürülemez.'
    );
  }
  if (input.result.pointCount !== input.result.points.length) {
    throw new StellarDemSkylineSourceError('DEM skyline nokta sayısı sonuç dizisiyle uyuşmuyor.');
  }
  const points = input.result.points.map((point) => {
    if (point.status !== 'complete' || point.elevationDeg === null) {
      throw new StellarDemSkylineSourceError(
        `DEM skyline ${point.azimuthDeg}° yönünde tanımsız veya eksik nokta içeriyor.`
      );
    }
    return { azimuthDeg: point.azimuthDeg, altitudeDeg: point.elevationDeg };
  });

  return {
    fileName: input.draft.fileName,
    importedAtIso: input.draft.importedAtIso,
    format: 'dem',
    pointCount: points.length,
    maximumAzimuthGapDeg: input.settings.azimuthStepDeg,
    points,
    warnings: [...input.result.warnings],
    fileSizeBytes: input.draft.fileSizeBytes,
    sha256: input.draft.sha256,
    modifiedAfterImport: false,
    demDerivation: {
      ...input.settings,
      algorithmId: DEM_SKYLINE_ALGORITHM_ID,
      algorithmVersion: DEM_SKYLINE_ALGORITHM_VERSION,
      completeCoverage: true,
      completeRayCount: input.result.completeRayCount,
      coverageLimitedRayCount: 0,
      noDataAffectedRayCount: 0,
      noCoverageRayCount: 0,
      geodesicFallbackSampleCount: input.result.geodesicFallbackSampleCount
    }
  };
}
