import type { AtmosphereMode } from './atmosphere';
import { AI_TEST_SPEC_SCENARIOS } from './ai-test-spec';
import type { SimulationScenarioId } from './scenario';
import type { SimulatorInputs } from './simulator';
import type { ModelInputUncertaintySettings } from './uncertainty';
import type {
  ExperimentSetupApplication,
  ExperimentSetupCandidate,
  ExperimentSetupDraft,
  ShadowStationBTextSetupChanges,
  ShadowTextSetupChanges,
  StellarTextSetupChanges,
  TextSetupProvenanceContext
} from './text-experiment-setup-types';

function numeric(candidate: ExperimentSetupCandidate): number | undefined {
  return candidate.status === 'found' && Number.isFinite(candidate.numericValue)
    ? candidate.numericValue
    : undefined;
}

export function buildExperimentSetupApplication(
  draft: ExperimentSetupDraft,
  selectedCandidateIds: readonly string[],
  appliedAtIso = new Date().toISOString(),
  provenanceContext?: TextSetupProvenanceContext
): ExperimentSetupApplication {
  const selected = draft.candidates.filter((candidate) =>
    candidate.status === 'found' && selectedCandidateIds.includes(candidate.id)
  );
  const inputChanges: Partial<SimulatorInputs> = {};
  const modelUncertaintyChanges: Partial<ModelInputUncertaintySettings> = {};
  const shadowSettingsChanges: ShadowTextSetupChanges = {};
  const dualShadowStationBChanges: ShadowStationBTextSetupChanges = {};
  const stellarSettingsChanges: StellarTextSetupChanges = {};
  let eclipseSearchHalfWindowHours: number | undefined;
  let scenarioId: SimulationScenarioId | undefined;
  let experimentName: string | undefined;
  let observedAtIso: string | undefined;
  let utcOffsetMinutes: number | undefined;
  let atmosphereMode: AtmosphereMode | undefined;
  let coordinateApplied = false;

  for (const candidate of selected) {
    const value = numeric(candidate);
    switch (candidate.fieldId) {
      case 'scenarioId':
        if (candidate.stringValue && AI_TEST_SPEC_SCENARIOS.includes(candidate.stringValue as SimulationScenarioId)) scenarioId = candidate.stringValue as SimulationScenarioId;
        break;
      case 'experimentName': if (candidate.stringValue) experimentName = candidate.stringValue; break;
      case 'observedAtUtc': if (candidate.stringValue) observedAtIso = candidate.stringValue; break;
      case 'utcOffsetMinutes': if (value !== undefined) utcOffsetMinutes = value; break;
      case 'surfaceDistanceKm': if (value !== undefined) { inputChanges.surfaceDistanceKm = value; inputChanges.distanceSource = 'manual'; } break;
      case 'observerHeightM': if (value !== undefined) inputChanges.observerHeightM = value; break;
      case 'targetHeightM': if (value !== undefined) inputChanges.targetHeightM = value; break;
      case 'observerGroundElevationM': if (value !== undefined) inputChanges.observerGroundElevationM = value; break;
      case 'targetGroundElevationM': if (value !== undefined) inputChanges.targetGroundElevationM = value; break;
      case 'observerCoordinates':
        if (candidate.latitudeDeg !== undefined && candidate.longitudeDeg !== undefined) {
          inputChanges.observerLatitudeDeg = candidate.latitudeDeg;
          inputChanges.observerLongitudeDeg = candidate.longitudeDeg;
          coordinateApplied = true;
        }
        break;
      case 'targetCoordinates':
        if (candidate.latitudeDeg !== undefined && candidate.longitudeDeg !== undefined) {
          inputChanges.targetLatitudeDeg = candidate.latitudeDeg;
          inputChanges.targetLongitudeDeg = candidate.longitudeDeg;
          coordinateApplied = true;
        }
        break;
      case 'observedVisiblePercent': if (value !== undefined) inputChanges.observedVisiblePercent = value; break;
      case 'observationUncertaintyPercent': if (value !== undefined) inputChanges.observationUncertaintyPercent = value; break;
      case 'verticalDatumKind':
        if (candidate.stringValue === 'orthometric-msl' || candidate.stringValue === 'ellipsoidal-wgs84' || candidate.stringValue === 'local') inputChanges.verticalDatumKind = candidate.stringValue;
        break;
      case 'verticalDatumOffsetM': if (value !== undefined) inputChanges.verticalDatumOffsetM = value; break;
      case 'atmosphereMode':
        if (candidate.stringValue === 'off' || candidate.stringValue === 'standard') atmosphereMode = candidate.stringValue;
        break;
      case 'refractionCoefficient': if (value !== undefined) inputChanges.refractionCoefficient = value; break;
      case 'surfaceDistanceUncertaintyM': if (value !== undefined) modelUncertaintyChanges.surfaceDistanceM = value; break;
      case 'observerEyeHeightUncertaintyM': if (value !== undefined) modelUncertaintyChanges.observerEyeHeightM = value; break;
      case 'observerGroundElevationUncertaintyM': if (value !== undefined) modelUncertaintyChanges.observerGroundElevationM = value; break;
      case 'targetHeightUncertaintyM': if (value !== undefined) modelUncertaintyChanges.targetHeightM = value; break;
      case 'targetGroundElevationUncertaintyM': if (value !== undefined) modelUncertaintyChanges.targetGroundElevationM = value; break;
      case 'refractionCoefficientUncertainty': if (value !== undefined) modelUncertaintyChanges.refractionCoefficient = value; break;
      case 'shadowGnomonHeightM': if (value !== undefined) shadowSettingsChanges.gnomonHeightM = value; break;
      case 'shadowObservedLengthM': if (value !== undefined) shadowSettingsChanges.observedShadowLengthM = value; break;
      case 'shadowObservedLengthUncertaintyM': if (value !== undefined) shadowSettingsChanges.observedShadowLengthUncertaintyM = value; break;
      case 'shadowObservedAzimuthDeg': if (value !== undefined) shadowSettingsChanges.observedShadowAzimuthDeg = value; break;
      case 'shadowObservedAzimuthUncertaintyDeg': if (value !== undefined) shadowSettingsChanges.observedShadowAzimuthUncertaintyDeg = value; break;
      case 'shadowStationBCoordinates':
        if (candidate.latitudeDeg !== undefined && candidate.longitudeDeg !== undefined) {
          dualShadowStationBChanges.latitudeDeg = candidate.latitudeDeg;
          dualShadowStationBChanges.longitudeDeg = candidate.longitudeDeg;
        }
        break;
      case 'shadowStationBGnomonHeightM': if (value !== undefined) dualShadowStationBChanges.gnomonHeightM = value; break;
      case 'shadowStationBObservedLengthM': if (value !== undefined) dualShadowStationBChanges.observedShadowLengthM = value; break;
      case 'shadowStationBObservedLengthUncertaintyM': if (value !== undefined) dualShadowStationBChanges.observedShadowLengthUncertaintyM = value; break;
      case 'shadowStationBObservedAzimuthDeg': if (value !== undefined) dualShadowStationBChanges.observedShadowAzimuthDeg = value; break;
      case 'shadowStationBObservedAzimuthUncertaintyDeg': if (value !== undefined) dualShadowStationBChanges.observedShadowAzimuthUncertaintyDeg = value; break;
      case 'stellarStarId': if (candidate.stringValue) stellarSettingsChanges.starId = candidate.stringValue; break;
      case 'stellarTrailDurationMinutes': if (value !== undefined) stellarSettingsChanges.trailDurationMinutes = value; break;
      case 'stellarSampleIntervalMinutes': if (value !== undefined) stellarSettingsChanges.trailSampleIntervalMinutes = value; break;
      case 'stellarLocalHorizonEnabled': if (candidate.stringValue === 'true' || candidate.stringValue === 'false') stellarSettingsChanges.localHorizonEnabled = candidate.stringValue === 'true'; break;
      case 'stellarLocalHorizonNorthDeg': if (value !== undefined) stellarSettingsChanges.localHorizonNorthDeg = value; break;
      case 'stellarLocalHorizonNorthEastDeg': if (value !== undefined) stellarSettingsChanges.localHorizonNorthEastDeg = value; break;
      case 'stellarLocalHorizonEastDeg': if (value !== undefined) stellarSettingsChanges.localHorizonEastDeg = value; break;
      case 'stellarLocalHorizonSouthEastDeg': if (value !== undefined) stellarSettingsChanges.localHorizonSouthEastDeg = value; break;
      case 'stellarLocalHorizonSouthDeg': if (value !== undefined) stellarSettingsChanges.localHorizonSouthDeg = value; break;
      case 'stellarLocalHorizonSouthWestDeg': if (value !== undefined) stellarSettingsChanges.localHorizonSouthWestDeg = value; break;
      case 'stellarLocalHorizonWestDeg': if (value !== undefined) stellarSettingsChanges.localHorizonWestDeg = value; break;
      case 'stellarLocalHorizonNorthWestDeg': if (value !== undefined) stellarSettingsChanges.localHorizonNorthWestDeg = value; break;
      case 'eclipseSearchHalfWindowHours': if (value !== undefined) eclipseSearchHalfWindowHours = value; break;
      default: break;
    }
  }

  if (coordinateApplied) inputChanges.distanceSource = 'coordinates';
  if (atmosphereMode !== undefined) inputChanges.useStandardRefraction = atmosphereMode === 'standard';

  const sourceKind = provenanceContext?.sourceKind ?? 'manual-text';
  const aiLineage = provenanceContext?.aiLineage;
  if ((sourceKind === 'ai-follow-up') !== (aiLineage !== undefined)) {
    throw new Error('AI takip provenansı için kaynak türü ve lineage kaydı birlikte bulunmalı.');
  }

  return {
    ...(scenarioId ? { scenarioId } : {}),
    ...(experimentName ? { experimentName } : {}),
    ...(observedAtIso ? { observedAtIso } : {}),
    ...(utcOffsetMinutes !== undefined ? { utcOffsetMinutes } : {}),
    inputChanges,
    ...(atmosphereMode ? { atmosphereMode } : {}),
    modelUncertaintyChanges,
    ...(Object.keys(shadowSettingsChanges).length > 0 ? { shadowSettingsChanges } : {}),
    ...(Object.keys(dualShadowStationBChanges).length > 0 ? { dualShadowStationBChanges } : {}),
    ...(Object.keys(stellarSettingsChanges).length > 0 ? { stellarSettingsChanges } : {}),
    ...(eclipseSearchHalfWindowHours !== undefined ? { eclipseSearchHalfWindowHours } : {}),
    provenance: {
      parserVersion: draft.parserVersion,
      sourceText: draft.sourceText,
      appliedAtIso,
      sourceKind,
      ...(aiLineage ? { aiLineage: { ...aiLineage } } : {}),
      appliedFields: selected.map((candidate) => ({
        fieldId: candidate.fieldId,
        displayValue: candidate.displayValue,
        sourceExcerpt: candidate.sourceExcerpt
      }))
    }
  };
}
