import type { ModelMetadata, ModelPrediction } from '../shared/domain';
import {
  SOLAR_ECLIPSE_OVERLAP_ALGORITHM_ID,
  SOLAR_ECLIPSE_OVERLAP_ALGORITHM_VERSION,
  type SolarEclipseOverlapResult
} from './solar-eclipse-overlap';

export const solarEclipseOverlapMetadata: ModelMetadata = {
  id: SOLAR_ECLIPSE_OVERLAP_ALGORITHM_ID,
  name: 'Güneş Tutulması Anlık Geometrisi · Düşük Hassasiyetli Referans',
  version: SOLAR_ECLIPSE_OVERLAP_ALGORITHM_VERSION,
  description: 'Aynı gözlem anında Güneş ve Ay apparent disklerinin merkez ayrımı, açısal yarıçapları ve geometrik örtüşmesini hesaplar.',
  capabilities: ['solar-eclipse-overlap'],
  assumptions: [
    'Mevcut NOAA Güneş ve düşük hassasiyetli topocentrik Ay referansları kullanılır.',
    'Sonuç yalnız verilen anın yerel disk geometrisidir.',
    'Bessel elemanları, temas zamanları, merkez hattı ve yüksek hassasiyetli efemeris değildir.'
  ]
};

function geometryLabel(result: SolarEclipseOverlapResult): string {
  switch (result.geometryClass) {
    case 'partial-overlap': return 'Kısmi disk örtüşmesi';
    case 'total-type-contained': return 'Ay diski Güneş diskini kapsıyor · tam-tip anlık geometri';
    case 'annular-type-contained': return 'Ay diski Güneş diskinin içinde · halkalı-tip anlık geometri';
    default: return 'Diskler örtüşmüyor';
  }
}

export function createSolarEclipseOverlapPrediction(
  experimentId: string,
  result: SolarEclipseOverlapResult
): ModelPrediction {
  return {
    modelId: SOLAR_ECLIPSE_OVERLAP_ALGORITHM_ID,
    experimentId,
    status: 'compatible',
    metrics: [
      { key: 'eclipseCenterSeparationDeg', label: 'Güneş–Ay merkez ayrımı', value: result.centerSeparationDeg, unit: 'deg' },
      { key: 'solarAngularRadiusDeg', label: 'Güneş açısal yarıçapı', value: result.solarAngularRadiusDeg, unit: 'deg' },
      { key: 'lunarAngularRadiusDeg', label: 'Ay açısal yarıçapı', value: result.lunarAngularRadiusDeg, unit: 'deg' },
      { key: 'solarDiskCoveredFraction', label: 'Güneş disk alanı örtüşmesi', value: result.solarDiskCoveredFraction, unit: 'fraction' },
      { key: 'solarDiameterCoverageRatio', label: 'Çap doğrultusu örtme oranı', value: result.solarDiameterCoverageRatio, unit: 'fraction' },
      { key: 'outerLimbClearanceDeg', label: 'Dış limb açıklığı', value: result.outerLimbClearanceDeg, unit: 'deg' },
      { key: 'innerLimbClearanceDeg', label: 'İç limb açıklığı', value: result.innerLimbClearanceDeg, unit: 'deg' },
      { key: 'sunCenterElevationDeg', label: 'Güneş merkez yüksekliği', value: result.sunCenterElevationDeg, unit: 'deg' },
      { key: 'moonCenterElevationDeg', label: 'Ay merkez yüksekliği', value: result.moonCenterElevationDeg, unit: 'deg' },
      { key: 'eclipseBothCentersAboveHorizon', label: 'İki merkez geometrik ufkun üstünde', value: result.bothCentersAboveGeometricHorizon ? 1 : 0, unit: 'boolean' }
    ],
    warnings: [
      geometryLabel(result),
      result.bothCentersAboveGeometricHorizon
        ? 'Güneş ve Ay merkezleri geometrik ufkun üstündedir.'
        : 'En az bir disk merkezi geometrik ufkun altındadır; bu tanı disk örtüşme hesabını değiştirmez.',
      'Bu düşük hassasiyetli anlık geometri resmi tutulma kontağı veya merkez hattı değildir.'
    ],
    traceId: result.traceId,
    trace: result.trace
  };
}
