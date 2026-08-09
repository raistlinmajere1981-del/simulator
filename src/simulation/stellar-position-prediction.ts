import type { ModelMetadata, ModelPrediction } from '../shared/domain';
import {
  STELLAR_POSITION_ALGORITHM_ID,
  STELLAR_POSITION_ALGORITHM_VERSION,
  type StellarPositionResult
} from './stellar-position';

export const stellarPositionMetadata: ModelMetadata = {
  id: STELLAR_POSITION_ALGORITHM_ID,
  name: 'Yıldız Konumu · Astronomik Referans',
  version: STELLAR_POSITION_ALGORITHM_VERSION,
  description: 'Gözlem tarihine ait ekvatoryal yıldız koordinatını yaklaşık yerel ortalama yıldız zamanı üzerinden geometrik yükseklik ve azimuta dönüştüren astronomik referans.',
  capabilities: ['stellar-position'],
  assumptions: [
    'Sağ açıklık/deklinasyon gözlem tarihinin ortalama ekvator/equinox sistemine aittir.',
    'UTC, yaklaşık yerel ortalama yıldız zamanı hesabında UT1 vekili olarak kullanılır.',
    'Atmosferik kırılma ve optik görünürlük koşulları uygulanmaz.',
    'Bu kayıt fiziksel Dünya modeli karşılaştırması değildir; göksel konum için astronomik referanstır.'
  ]
};

export function createStellarPositionPrediction(
  experimentId: string,
  result: StellarPositionResult
): ModelPrediction {
  const horizonWarning = result.horizonClass === 'circumpolar-above'
    ? 'Bu deklinasyon gözlemci enleminde geometrik ufkun altına inmez.'
    : result.horizonClass === 'never-rises'
      ? 'Bu deklinasyon gözlemci enleminde geometrik ufkun üstüne çıkmaz.'
      : result.horizonClass === 'grazes-horizon'
        ? 'Yıldızın günlük çemberi geometrik ufka teğet/sınır durumundadır.'
        : 'Yıldızın günlük çemberi geometrik ufku doğuş ve batışta keser.';

  return {
    modelId: STELLAR_POSITION_ALGORITHM_ID,
    experimentId,
    status: 'compatible',
    metrics: [
      { key: 'stellarElevationDeg', label: 'Geometrik yıldız yüksekliği', value: result.elevationDeg, unit: 'deg' },
      { key: 'stellarAzimuthDeg', label: 'Yıldız azimutu', value: result.azimuthDeg, unit: 'deg' },
      { key: 'stellarRightAscensionDeg', label: 'Sağ açıklık', value: result.rightAscensionDeg, unit: 'deg' },
      { key: 'stellarDeclinationDeg', label: 'Deklinasyon', value: result.declinationDeg, unit: 'deg' },
      { key: 'localMeanSiderealTimeDeg', label: 'Yerel ortalama yıldız zamanı', value: result.localMeanSiderealTimeDeg, unit: 'deg' },
      { key: 'stellarHourAngleDeg', label: 'Yıldız saat açısı', value: result.hourAngleDeg, unit: 'deg' },
      { key: 'stellarUpperCulminationDeg', label: 'Üst geçiş yüksekliği', value: result.upperCulminationElevationDeg, unit: 'deg' },
      { key: 'stellarLowerCulminationDeg', label: 'Alt geçiş yüksekliği', value: result.lowerCulminationElevationDeg, unit: 'deg' },
      { key: 'starAboveGeometricHorizon', label: 'Geometrik ufkun üstünde', value: result.aboveGeometricHorizon ? 1 : 0, unit: 'boolean' }
    ],
    warnings: [
      horizonWarning,
      'Atmosferik kırılma, gökyüzü parlaklığı, sönümleme ve topoğrafik ufuk uygulanmadı.',
      'J2000/ICRS katalog koordinatları kullanılacaksa gözlem tarihine dönüşüm ayrı ve izlenebilir bir adım olarak yapılmalıdır.'
    ],
    traceId: result.traceId,
    trace: result.trace
  };
}
