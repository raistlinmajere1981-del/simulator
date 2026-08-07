import type { ModelPrediction } from '../shared/domain';
import {
  WATER_SURFACE_APPLICATION_MODEL_ID,
  WATER_SURFACE_APPLICATION_MODEL_VERSION
} from './water-surface-application';
import {
  WATER_SURFACE_OBSERVATION_MODEL_ID,
  WATER_SURFACE_OBSERVATION_MODEL_VERSION
} from './water-surface-observation';

export interface StoredWaterSurfaceRecord {
  prediction: ModelPrediction;
  modelVersion: string;
}

export interface StoredWaterSurfaceState {
  observation?: StoredWaterSurfaceRecord;
  application?: StoredWaterSurfaceRecord;
}

export function readStoredWaterSurfaceState(
  predictions: ModelPrediction[],
  modelVersions: Record<string, string>
): StoredWaterSurfaceState {
  const observationPrediction = predictions.find(
    (prediction) => prediction.modelId === WATER_SURFACE_OBSERVATION_MODEL_ID
  );
  const applicationPrediction = predictions.find(
    (prediction) => prediction.modelId === WATER_SURFACE_APPLICATION_MODEL_ID
  );

  return {
    ...(observationPrediction
      ? {
          observation: {
            prediction: observationPrediction,
            modelVersion:
              modelVersions[WATER_SURFACE_OBSERVATION_MODEL_ID] ??
              WATER_SURFACE_OBSERVATION_MODEL_VERSION
          }
        }
      : {}),
    ...(applicationPrediction
      ? {
          application: {
            prediction: applicationPrediction,
            modelVersion:
              modelVersions[WATER_SURFACE_APPLICATION_MODEL_ID] ??
              WATER_SURFACE_APPLICATION_MODEL_VERSION
          }
        }
      : {})
  };
}

export function markWaterSurfaceApplicationHistorical(
  record: StoredWaterSurfaceRecord | undefined,
  reason = 'Su yüzeyi uygulamasından sonra uç kotu, düşey datum veya datum/ofset bilgisi değiştirildi; kayıt tarihsel işlem provenansı olarak korunuyor.'
): StoredWaterSurfaceRecord | undefined {
  if (!record) return undefined;
  if (record.prediction.warnings.includes(reason) && record.prediction.status === 'indeterminate') {
    return record;
  }

  return {
    ...record,
    prediction: {
      ...record.prediction,
      status: 'indeterminate',
      warnings: record.prediction.warnings.includes(reason)
        ? record.prediction.warnings
        : [...record.prediction.warnings, reason]
    }
  };
}
