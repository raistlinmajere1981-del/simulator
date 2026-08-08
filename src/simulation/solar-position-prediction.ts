import type { ModelMetadata, ModelPrediction } from '../shared/domain';
import {
  SOLAR_POSITION_ALGORITHM_ID,
  SOLAR_POSITION_ALGORITHM_VERSION,
  type SolarPositionResult
} from './solar-position';

export const solarPositionMetadata: ModelMetadata = {
  id: SOLAR_POSITION_ALGORITHM_ID,
  name: 'Güneş Konumu · Astronomik Referans',
  version: SOLAR_POSITION_ALGORITHM_VERSION,
  description: 'Tarih/saat ve WGS84 gözlem konumundan Güneşin geometrik yerel yükseklik ve azimutunu hesaplayan astronomik referans.',
  capabilities: ['solar-position'],
  assumptions: [
    'Gözlem zamanı açık saat dilimli bir an olarak UTC’ye normalize edilir.',
    'Gözlem konumu WGS84 enlem/boylamıdır.',
    'Atmosferik kırılma bu geometrik referans sonucuna uygulanmaz.',
    'Bu kayıt fiziksel Dünya modeli karşılaştırması değildir; göksel konum için astronomik referanstır.'
  ]
};

export function createSolarPositionPrediction(
  experimentId: string,
  result: SolarPositionResult
): ModelPrediction {
  const aboveHorizon = result.elevationDeg >= 0;
  return {
    modelId: SOLAR_POSITION_ALGORITHM_ID,
    experimentId,
    status: 'compatible',
    metrics: [
      { key: 'solarElevationDeg', label: 'Geometrik Güneş yüksekliği', value: result.elevationDeg, unit: 'deg' },
      { key: 'solarAzimuthDeg', label: 'Güneş azimutu', value: result.azimuthDeg, unit: 'deg' },
      { key: 'solarZenithDeg', label: 'Güneş zenit açısı', value: result.zenithDeg, unit: 'deg' },
      { key: 'solarDeclinationDeg', label: 'Güneş deklinasyonu', value: result.declinationDeg, unit: 'deg' },
      { key: 'solarHourAngleDeg', label: 'Güneş saat açısı', value: result.hourAngleDeg, unit: 'deg' },
      { key: 'equationOfTimeMinutes', label: 'Zaman denklemi', value: result.equationOfTimeMinutes, unit: 'min' },
      { key: 'sunAboveGeometricHorizon', label: 'Geometrik ufkun üstünde', value: aboveHorizon ? 1 : 0, unit: 'boolean' }
    ],
    warnings: aboveHorizon
      ? ['Atmosferik kırılma uygulanmadı; yükseklik açısı geometriktir.']
      : ['Güneş geometrik yerel ufkun altındadır. Atmosferik kırılma uygulanmadı.'],
    traceId: result.traceId,
    trace: result.trace
  };
}
