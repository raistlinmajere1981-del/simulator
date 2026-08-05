import type {
  ExperimentDefinition,
  ResultStatus,
  UncertainValue
} from '../shared/domain';

export interface FractionEvaluation {
  status: ResultStatus;
  difference: number | null;
  observed: UncertainValue | null;
}

export function getMeasurement(
  experiment: ExperimentDefinition,
  key: string,
  expectedUnit?: string
): UncertainValue | null {
  const measurement = experiment.measurements[key];

  if (!measurement) {
    return null;
  }

  if (expectedUnit && measurement.unit !== expectedUnit) {
    return null;
  }

  return measurement;
}

export function evaluateFractionPrediction(
  predictedFraction: number,
  observed: UncertainValue | null
): FractionEvaluation {
  if (!observed || observed.unit !== 'fraction') {
    return {
      status: 'indeterminate',
      difference: null,
      observed: null
    };
  }

  const difference = Math.abs(predictedFraction - observed.value);
  const tolerance = Math.max(0, observed.uncertainty);

  if (difference <= tolerance) {
    return { status: 'compatible', difference, observed };
  }

  if (difference <= tolerance * 2) {
    return { status: 'indeterminate', difference, observed };
  }

  return { status: 'incompatible', difference, observed };
}
