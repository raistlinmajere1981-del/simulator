import type { ModelMetadata, ModelPrediction } from '../shared/domain';
import {
  LUNAR_POSITION_ALGORITHM_ID,
  LUNAR_POSITION_ALGORITHM_VERSION,
  type LunarPositionResult
} from './lunar-position';

export const lunarPositionMetadata: ModelMetadata = {
  id: LUNAR_POSITION_ALGORITHM_ID,
  name: 'Ay Konumu ve Fazı · Astronomik Referans',
  version: LUNAR_POSITION_ALGORITHM_VERSION,
  description: 'Tarih/saat ve WGS84 gözlem konumundan Ayın yaklaşık topocentrik konumu, uzaklığı ve faz geometrisini hesaplar.',
  capabilities: ['lunar-position', 'lunar-phase'],
  assumptions: [
    'Gözlem zamanı ve WGS84 konumu Güneş referansıyla ortaktır.',
    'Ayın yatay paralaksı topocentrik konuma uygulanır.',
    'Atmosferik kırılma ve yerel topoğrafik ufuk uygulanmaz.',
    'Faz sınıfı yaklaşık Güneş-Ay uzanımından türetilir; tutulma hesabı değildir.',
    'Bu düşük hassasiyetli referans JPL DE/Horizons efemerisinin yerine geçmez.'
  ]
};

export function createLunarPositionPrediction(experimentId: string, result: LunarPositionResult): ModelPrediction {
  const aboveHorizon = result.elevationDeg >= 0;
  return {
    modelId: LUNAR_POSITION_ALGORITHM_ID,
    experimentId,
    status: 'compatible',
    metrics: [
      { key: 'lunarElevationDeg', label: 'Geometrik Ay yüksekliği', value: result.elevationDeg, unit: 'deg' },
      { key: 'lunarAzimuthDeg', label: 'Ay azimutu', value: result.azimuthDeg, unit: 'deg' },
      { key: 'lunarDeclinationDeg', label: 'Ay deklinasyonu', value: result.declinationDeg, unit: 'deg' },
      { key: 'lunarDistanceKm', label: 'Ay uzaklığı', value: result.distanceKm, unit: 'km' },
      { key: 'lunarHorizontalParallaxDeg', label: 'Yatay paralaks', value: result.horizontalParallaxDeg, unit: 'deg' },
      { key: 'lunarElongationDeg', label: 'Güneş-Ay uzanımı', value: result.elongationDeg, unit: 'deg' },
      { key: 'lunarPhaseAngleDeg', label: 'Yaklaşık faz açısı', value: result.phaseAngleDeg, unit: 'deg' },
      { key: 'lunarIlluminatedFraction', label: 'Aydınlık oranı', value: result.illuminatedFraction, unit: 'fraction' },
      { key: 'lunarPhaseAgeDays', label: 'Yaklaşık Ay yaşı', value: result.phaseAgeDays, unit: 'day' },
      { key: 'moonAboveGeometricHorizon', label: 'Geometrik ufkun üstünde', value: aboveHorizon ? 1 : 0, unit: 'boolean' }
    ],
    warnings: [
      aboveHorizon ? 'Ay geometrik yerel ufkun üstündedir.' : 'Ay geometrik yerel ufkun altındadır.',
      `Faz sınıfı: ${result.phaseName}.`,
      'Atmosferik kırılma uygulanmadı; düşük hassasiyetli astronomik referanstır.'
    ],
    traceId: result.traceId,
    trace: result.trace
  };
}
