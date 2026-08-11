import { useMemo } from 'react';
import type { SavedStellarLocalHorizonSource } from '../../../shared/stellar-local-horizon-import';
import type { SavedStellarMotionSource } from '../../../shared/stellar-motion-source';
import type { SimulationScenarioId } from '../../../shared/scenario';
import type { SimulatorInputs } from '../../../shared/simulator';
import { calculateSolarPosition } from '../../../simulation/solar-position';
import { createSolarPositionPrediction } from '../../../simulation/solar-position-prediction';
import {
  calculateSolarDayEvents,
  createSolarDayEventsPrediction
} from '../../../simulation/solar-day-events';
import {
  calculateSolarSeasonEvents,
  createSolarSeasonEventsPrediction
} from '../../../simulation/solar-season-events';
import {
  calculateSolarTimeOffset,
  createSolarTimeOffsetPrediction
} from '../../../simulation/solar-time-offset';
import {
  calculateSolarRouteComparison,
  createSolarRouteComparisonPrediction
} from '../../../simulation/solar-route-comparison';
import { calculateLunarPosition } from '../../../simulation/lunar-position';
import { createLunarPositionPrediction } from '../../../simulation/lunar-position-prediction';
import { calculateSolarEclipseOverlap } from '../../../simulation/solar-eclipse-overlap';
import { createSolarEclipseOverlapPrediction } from '../../../simulation/solar-eclipse-overlap-prediction';
import {
  createSolarEclipseEventSearchPrediction,
  type SolarEclipseEventSearchSnapshot
} from '../../../simulation/solar-eclipse-event-search-prediction';
import {
  calculateShadowObservation,
  createShadowObservationPrediction,
  type ShadowObservationSettings
} from '../../../simulation/shadow-observation';
import {
  calculateDualShadowComparison,
  createDualShadowComparisonPrediction,
  type DualShadowComparisonSettings
} from '../../../simulation/dual-shadow-comparison';
import {
  calculateStellarObservation,
  createStellarObservationPrediction,
  type StellarObservationSettings
} from '../../../simulation/stellar-observation';
import { verifiedMotionSubsetFromSavedSource } from '../../../simulation/stellar-motion-source';

export function useAstronomyCalculations({
  activeExperimentId,
  activeScenarioId,
  experimentObservedAtIso,
  observationUtcOffsetMinutes,
  inputs,
  eclipseEventSearchSnapshot,
  shadowObservationSettings,
  dualShadowSettings,
  stellarObservationSettings,
  stellarLocalHorizonSource,
  stellarMotionSource
}: {
  activeExperimentId: string;
  activeScenarioId: SimulationScenarioId;
  experimentObservedAtIso: string;
  observationUtcOffsetMinutes: number;
  inputs: SimulatorInputs;
  eclipseEventSearchSnapshot: SolarEclipseEventSearchSnapshot | undefined;
  shadowObservationSettings: ShadowObservationSettings;
  dualShadowSettings: DualShadowComparisonSettings | undefined;
  stellarObservationSettings: StellarObservationSettings;
  stellarLocalHorizonSource: SavedStellarLocalHorizonSource | undefined;
  stellarMotionSource: SavedStellarMotionSource | undefined;
}) {
  const solarPosition = useMemo(() => (activeScenarioId === 'sun-moon-observation' || activeScenarioId === 'shadow-observation' || activeScenarioId === 'eclipse-simulation')
    ? calculateSolarPosition({
        observedAtIso: experimentObservedAtIso,
        latitudeDeg: inputs.observerLatitudeDeg,
        longitudeDeg: inputs.observerLongitudeDeg
      })
    : undefined, [activeScenarioId, experimentObservedAtIso, inputs.observerLatitudeDeg, inputs.observerLongitudeDeg]);
  const solarPositionPrediction = useMemo(() => (activeScenarioId === 'sun-moon-observation' || activeScenarioId === 'eclipse-simulation') && solarPosition
    ? createSolarPositionPrediction(activeExperimentId, solarPosition)
    : undefined, [activeExperimentId, activeScenarioId, solarPosition]);
  const solarDayEventsResult = useMemo(() => activeScenarioId === 'sun-moon-observation'
    ? calculateSolarDayEvents({
        experimentId: activeExperimentId,
        observedAtIso: experimentObservedAtIso,
        utcOffsetMinutes: observationUtcOffsetMinutes,
        latitudeDeg: inputs.observerLatitudeDeg,
        longitudeDeg: inputs.observerLongitudeDeg
      })
    : undefined, [activeExperimentId, activeScenarioId, experimentObservedAtIso, inputs.observerLatitudeDeg, inputs.observerLongitudeDeg, observationUtcOffsetMinutes]);
  const solarDayEventsPrediction = useMemo(() => solarDayEventsResult
    ? createSolarDayEventsPrediction(solarDayEventsResult)
    : undefined, [solarDayEventsResult]);
  const solarTimeOffsetResult = useMemo(() => activeScenarioId === 'sun-moon-observation'
    ? calculateSolarTimeOffset({
        experimentId: activeExperimentId,
        observedAtIso: experimentObservedAtIso,
        utcOffsetMinutes: observationUtcOffsetMinutes,
        longitudeDeg: inputs.observerLongitudeDeg
      })
    : undefined, [activeExperimentId, activeScenarioId, experimentObservedAtIso, inputs.observerLongitudeDeg, observationUtcOffsetMinutes]);
  const solarTimeOffsetPrediction = useMemo(() => solarTimeOffsetResult
    ? createSolarTimeOffsetPrediction(solarTimeOffsetResult)
    : undefined, [solarTimeOffsetResult]);
  const solarSeasonEventsResult = useMemo(() => {
    if (activeScenarioId !== 'sun-moon-observation' || !solarDayEventsResult) return undefined;
    const year = Number(solarDayEventsResult.localDate.slice(0, 4));
    if (!Number.isInteger(year) || year < 1900 || year > 2100) return undefined;
    return calculateSolarSeasonEvents({
      experimentId: activeExperimentId,
      year,
      latitudeDeg: inputs.observerLatitudeDeg,
      longitudeDeg: inputs.observerLongitudeDeg,
      utcOffsetMinutes: observationUtcOffsetMinutes
    });
  }, [activeExperimentId, activeScenarioId, inputs.observerLatitudeDeg, inputs.observerLongitudeDeg, observationUtcOffsetMinutes, solarDayEventsResult]);
  const solarSeasonEventsPrediction = useMemo(() => solarSeasonEventsResult
    ? createSolarSeasonEventsPrediction(solarSeasonEventsResult)
    : undefined, [solarSeasonEventsResult]);
  const solarRouteComparisonCalculation = useMemo(() => {
    if (activeScenarioId !== 'sun-moon-observation') return {} as { result?: ReturnType<typeof calculateSolarRouteComparison>; error?: string };
    try {
      return {
        result: calculateSolarRouteComparison({
          experimentId: activeExperimentId,
          observedAtIso: experimentObservedAtIso,
          utcOffsetMinutes: observationUtcOffsetMinutes,
          startLatitudeDeg: inputs.observerLatitudeDeg,
          startLongitudeDeg: inputs.observerLongitudeDeg,
          endLatitudeDeg: inputs.targetLatitudeDeg,
          endLongitudeDeg: inputs.targetLongitudeDeg,
          sampleCount: 5
        })
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Rota karşılaştırması hesaplanamadı.' };
    }
  }, [activeExperimentId, activeScenarioId, experimentObservedAtIso, inputs.observerLatitudeDeg, inputs.observerLongitudeDeg, inputs.targetLatitudeDeg, inputs.targetLongitudeDeg, observationUtcOffsetMinutes]);
  const solarRouteComparisonResult = solarRouteComparisonCalculation.result;
  const solarRouteComparisonPrediction = useMemo(() => solarRouteComparisonResult
    ? createSolarRouteComparisonPrediction(solarRouteComparisonResult)
    : undefined, [solarRouteComparisonResult]);
  const lunarPosition = useMemo(() => (activeScenarioId === 'sun-moon-observation' || activeScenarioId === 'eclipse-simulation') && solarPosition
    ? calculateLunarPosition({
        observedAtIso: experimentObservedAtIso,
        latitudeDeg: inputs.observerLatitudeDeg,
        longitudeDeg: inputs.observerLongitudeDeg,
        solarPosition
      })
    : undefined, [activeScenarioId, experimentObservedAtIso, inputs.observerLatitudeDeg, inputs.observerLongitudeDeg, solarPosition]);
  const lunarPositionPrediction = useMemo(() => lunarPosition
    ? createLunarPositionPrediction(activeExperimentId, lunarPosition)
    : undefined, [activeExperimentId, lunarPosition]);
  const eclipseOverlapResult = useMemo(() => activeScenarioId === 'eclipse-simulation' && solarPosition && lunarPosition
    ? calculateSolarEclipseOverlap({ solarPosition, lunarPosition })
    : undefined, [activeScenarioId, lunarPosition, solarPosition]);
  const eclipseOverlapPrediction = useMemo(() => eclipseOverlapResult
    ? createSolarEclipseOverlapPrediction(activeExperimentId, eclipseOverlapResult)
    : undefined, [activeExperimentId, eclipseOverlapResult]);
  const eclipseEventSearchSnapshotCurrent = useMemo(() => {
    if (activeScenarioId !== 'eclipse-simulation' || !eclipseEventSearchSnapshot) return false;
    const normalizedObservedAtIso = new Date(experimentObservedAtIso).toISOString();
    return eclipseEventSearchSnapshot.anchorObservedAtIso === normalizedObservedAtIso &&
      Math.abs(eclipseEventSearchSnapshot.latitudeDeg - inputs.observerLatitudeDeg) <= 1e-8 &&
      Math.abs(eclipseEventSearchSnapshot.longitudeDeg - inputs.observerLongitudeDeg) <= 1e-8;
  }, [activeScenarioId, eclipseEventSearchSnapshot, experimentObservedAtIso, inputs.observerLatitudeDeg, inputs.observerLongitudeDeg]);
  const eclipseEventSearchPrediction = useMemo(() => eclipseEventSearchSnapshotCurrent && eclipseEventSearchSnapshot
    ? createSolarEclipseEventSearchPrediction(activeExperimentId, eclipseEventSearchSnapshot)
    : undefined, [activeExperimentId, eclipseEventSearchSnapshot, eclipseEventSearchSnapshotCurrent]);
  const shadowObservationResult = useMemo(() => activeScenarioId === 'shadow-observation' && solarPosition
    ? calculateShadowObservation({
        experimentId: activeExperimentId,
        observedAtIso: experimentObservedAtIso,
        latitudeDeg: inputs.observerLatitudeDeg,
        longitudeDeg: inputs.observerLongitudeDeg,
        solarPosition,
        settings: shadowObservationSettings
      })
    : undefined, [activeExperimentId, activeScenarioId, experimentObservedAtIso, inputs.observerLatitudeDeg, inputs.observerLongitudeDeg, shadowObservationSettings, solarPosition]);
  const shadowObservationPrediction = useMemo(() => shadowObservationResult
    ? createShadowObservationPrediction(shadowObservationResult)
    : undefined, [shadowObservationResult]);
  const dualShadowComparisonResult = useMemo(() => activeScenarioId === 'shadow-observation' && dualShadowSettings
    ? calculateDualShadowComparison({
        experimentId: activeExperimentId,
        observedAtIso: experimentObservedAtIso,
        stationA: {
          latitudeDeg: inputs.observerLatitudeDeg,
          longitudeDeg: inputs.observerLongitudeDeg,
          ...shadowObservationSettings
        },
        stationB: dualShadowSettings.stationB
      })
    : undefined, [activeExperimentId, activeScenarioId, dualShadowSettings, experimentObservedAtIso, inputs.observerLatitudeDeg, inputs.observerLongitudeDeg, shadowObservationSettings]);
  const dualShadowComparisonPrediction = useMemo(() => dualShadowComparisonResult
    ? createDualShadowComparisonPrediction(dualShadowComparisonResult)
    : undefined, [dualShadowComparisonResult]);
  const appliedExternalStellarLocalHorizonSource = stellarObservationSettings.localHorizonSourceMode === 'external'
    ? stellarLocalHorizonSource
    : undefined;
  const stellarMotionSubset = useMemo(() => stellarMotionSource
    ? verifiedMotionSubsetFromSavedSource(stellarMotionSource)
    : undefined, [stellarMotionSource]);
  const stellarObservationResult = useMemo(() => activeScenarioId === 'stellar-observation'
    ? calculateStellarObservation({
        experimentId: activeExperimentId,
        observedAtIso: experimentObservedAtIso,
        latitudeDeg: inputs.observerLatitudeDeg,
        longitudeDeg: inputs.observerLongitudeDeg,
        settings: stellarObservationSettings,
        ...(appliedExternalStellarLocalHorizonSource
          ? { externalLocalHorizonSource: appliedExternalStellarLocalHorizonSource }
          : {}),
        ...(stellarMotionSubset ? { motionSubset: stellarMotionSubset } : {})
      })
    : undefined, [activeExperimentId, activeScenarioId, appliedExternalStellarLocalHorizonSource, experimentObservedAtIso, inputs.observerLatitudeDeg, inputs.observerLongitudeDeg, stellarMotionSubset, stellarObservationSettings]);
  const stellarObservationPrediction = useMemo(() => stellarObservationResult
    ? createStellarObservationPrediction(stellarObservationResult)
    : undefined, [stellarObservationResult]);

  return {
    solarPosition,
    solarPositionPrediction,
    solarDayEventsResult,
    solarDayEventsPrediction,
    solarTimeOffsetResult,
    solarTimeOffsetPrediction,
    solarSeasonEventsResult,
    solarSeasonEventsPrediction,
    solarRouteComparisonCalculation,
    solarRouteComparisonResult,
    solarRouteComparisonPrediction,
    lunarPosition,
    lunarPositionPrediction,
    eclipseOverlapResult,
    eclipseOverlapPrediction,
    eclipseEventSearchSnapshotCurrent,
    eclipseEventSearchPrediction,
    shadowObservationResult,
    shadowObservationPrediction,
    dualShadowComparisonResult,
    dualShadowComparisonPrediction,
    appliedExternalStellarLocalHorizonSource,
    stellarMotionSubset,
    stellarObservationResult,
    stellarObservationPrediction
  };
}
