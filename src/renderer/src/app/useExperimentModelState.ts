import { useEffect, useMemo, useState } from 'react';
import { simulationModels } from '../../../models';
import type { AtmosphereExperimentState } from '../../../shared/atmosphere';
import type { ExperimentDefinition, UncertainValue } from '../../../shared/domain';
import { getSimulationScenario, type SimulationScenarioId } from '../../../shared/scenario';
import type { SimulatorInputs } from '../../../shared/simulator';
import type { ManualTerrainPoint, TerrainProfile } from '../../../shared/terrain';
import { inverseWgs84Geodesic } from '../../../simulation/geodesy';
import { buildManualTerrainProfile } from '../../../simulation/manual-terrain-profile';
import { runSimulationModels, type ModelRun } from '../../../simulation/runner';
import { datumLabels, isAstronomyScenario } from './app-config';

interface UseExperimentModelStateArgs {
  activeExperimentId: string;
  activeExperimentName: string;
  activeScenarioId: SimulationScenarioId;
  experimentObservedAtIso: string;
  inputs: SimulatorInputs;
  atmosphereState: AtmosphereExperimentState;
  manualTerrainPoints: ManualTerrainPoint[];
}

function buildTerrainProfile(
  inputs: SimulatorInputs,
  effectiveDistanceM: number,
  manualTerrainPoints: ManualTerrainPoint[]
): TerrainProfile | undefined {
  if (inputs.terrainMode === 'off' || effectiveDistanceM <= 0) return undefined;

  return buildManualTerrainProfile({
    id: 'interactive-manual-points',
    label: `Manuel ${manualTerrainPoints.length} ara noktalı profil`,
    datum: {
      kind: inputs.verticalDatumKind,
      label: datumLabels[inputs.verticalDatumKind],
      offsetM: inputs.verticalDatumOffsetM
    },
    totalDistanceM: effectiveDistanceM,
    observerGroundElevationM: inputs.observerGroundElevationM,
    targetGroundElevationM: inputs.targetGroundElevationM,
    points: manualTerrainPoints
  });
}

export function useExperimentModelState({
  activeExperimentId,
  activeExperimentName,
  activeScenarioId,
  experimentObservedAtIso,
  inputs,
  atmosphereState,
  manualTerrainPoints
}: UseExperimentModelStateArgs): {
  geodesic: ReturnType<typeof inverseWgs84Geodesic> | undefined;
  effectiveDistanceKm: number;
  effectiveInputs: SimulatorInputs;
  terrainProfile: TerrainProfile | undefined;
  experiment: ExperimentDefinition;
  context: {
    atmosphereMode: AtmosphereExperimentState['mode'];
    refractionCoefficient: number;
    atmosphereProfile?: AtmosphereExperimentState['profile'];
    opticalAtmosphereSettings?: AtmosphereExperimentState['opticalSettings'];
    rayTraceStepM?: number;
  };
  runs: ModelRun[];
  isCalculating: boolean;
} {
  const geodesic = useMemo(() => {
    if (isAstronomyScenario(activeScenarioId) || inputs.distanceSource !== 'coordinates') return undefined;
    return inverseWgs84Geodesic(
      { latitudeDeg: inputs.observerLatitudeDeg, longitudeDeg: inputs.observerLongitudeDeg },
      { latitudeDeg: inputs.targetLatitudeDeg, longitudeDeg: inputs.targetLongitudeDeg }
    );
  }, [
    activeScenarioId,
    inputs.distanceSource,
    inputs.observerLatitudeDeg,
    inputs.observerLongitudeDeg,
    inputs.targetLatitudeDeg,
    inputs.targetLongitudeDeg
  ]);

  const effectiveDistanceKm = inputs.distanceSource === 'coordinates' && geodesic
    ? geodesic.distanceM / 1_000
    : inputs.surfaceDistanceKm;

  const effectiveInputs = useMemo<SimulatorInputs>(() => ({
    ...inputs,
    surfaceDistanceKm: effectiveDistanceKm
  }), [effectiveDistanceKm, inputs]);

  const terrainProfile = useMemo(
    () => buildTerrainProfile(inputs, effectiveDistanceKm * 1_000, manualTerrainPoints),
    [effectiveDistanceKm, inputs, manualTerrainPoints]
  );

  const experiment = useMemo<ExperimentDefinition>(() => {
    const scenario = getSimulationScenario(activeScenarioId);
    const observer = {
      latitudeDeg: inputs.observerLatitudeDeg,
      longitudeDeg: inputs.observerLongitudeDeg,
      elevationM: inputs.observerGroundElevationM + inputs.verticalDatumOffsetM,
      eyeHeightM: inputs.observerHeightM
    };

    if (
      activeScenarioId === 'sun-moon-observation' ||
      activeScenarioId === 'stellar-observation' ||
      activeScenarioId === 'eclipse-simulation'
    ) {
      return {
        id: activeExperimentId,
        title: activeExperimentName || (activeScenarioId === 'stellar-observation'
          ? 'Etkileşimli yıldız gözlemi'
          : activeScenarioId === 'eclipse-simulation'
            ? 'Etkileşimli tutulma simülasyonu'
            : 'Etkileşimli Güneş ve Ay gözlemi'),
        type: 'celestial',
        observer,
        observedAtIso: experimentObservedAtIso,
        measurements: {} as Record<string, UncertainValue>
      };
    }

    if (activeScenarioId === 'shadow-observation') {
      return {
        id: activeExperimentId,
        title: activeExperimentName || 'Etkileşimli gölge deneyi',
        type: 'shadow',
        observer,
        observedAtIso: experimentObservedAtIso,
        measurements: {} as Record<string, UncertainValue>
      };
    }

    if (activeScenarioId === 'horizon') {
      return {
        id: activeExperimentId,
        title: activeExperimentName || `Etkileşimli ${scenario.label.toLocaleLowerCase('tr-TR')} deneyi`,
        type: 'horizon',
        observer,
        observedAtIso: experimentObservedAtIso,
        measurements: {} as Record<string, UncertainValue>
      };
    }

    return {
      id: activeExperimentId,
      title: activeExperimentName || `Etkileşimli ${scenario.label.toLocaleLowerCase('tr-TR')} deneyi`,
      type: 'target-visibility',
      observer,
      target: {
        label: 'Hedef',
        latitudeDeg: inputs.targetLatitudeDeg,
        longitudeDeg: inputs.targetLongitudeDeg,
        elevationM: inputs.targetGroundElevationM + inputs.verticalDatumOffsetM,
        heightM: inputs.targetHeightM
      },
      terrainProfile,
      observedAtIso: experimentObservedAtIso,
      measurements: {
        surfaceDistanceM: {
          value: effectiveDistanceKm * 1_000,
          uncertainty: inputs.distanceSource === 'coordinates' ? 0.01 : 20,
          unit: 'm'
        },
        visibleFraction: {
          value: inputs.observedVisiblePercent / 100,
          uncertainty: inputs.observationUncertaintyPercent / 100,
          unit: 'fraction'
        }
      }
    };
  }, [
    activeExperimentId,
    activeExperimentName,
    activeScenarioId,
    effectiveDistanceKm,
    experimentObservedAtIso,
    inputs,
    terrainProfile
  ]);

  const context = useMemo(() => ({
    atmosphereMode: atmosphereState.mode,
    refractionCoefficient: inputs.refractionCoefficient,
    ...(atmosphereState.mode === 'profile' ? {
      atmosphereProfile: atmosphereState.profile,
      opticalAtmosphereSettings: atmosphereState.opticalSettings,
      rayTraceStepM: atmosphereState.rayTraceStepM
    } : {})
  }), [atmosphereState, inputs.refractionCoefficient]);

  const [runs, setRuns] = useState<ModelRun[]>([]);
  const [isCalculating, setIsCalculating] = useState(true);

  useEffect(() => {
    if (isAstronomyScenario(activeScenarioId)) {
      setRuns([]);
      setIsCalculating(false);
      return;
    }

    let cancelled = false;
    setIsCalculating(true);
    void runSimulationModels(simulationModels, experiment, context).then((nextRuns) => {
      if (!cancelled) {
        setRuns(nextRuns);
        setIsCalculating(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeScenarioId, context, experiment]);

  return {
    geodesic,
    effectiveDistanceKm,
    effectiveInputs,
    terrainProfile,
    experiment,
    context,
    runs,
    isCalculating
  };
}
