import type { AtmosphereMode } from './atmosphere';
import type { SimulationScenarioId } from './scenario';
import type { SimulatorInputs } from './simulator';
import type { ModelInputUncertaintySettings } from './uncertainty';
import type { AiFollowUpLineage } from './ai-lineage';

export const TEXT_EXPERIMENT_SETUP_PARSER_VERSION = '0.3.0';

export type ExperimentSetupFieldId =
  | 'scenarioId'
  | 'experimentName'
  | 'observedAtUtc'
  | 'utcOffsetMinutes'
  | 'surfaceDistanceKm'
  | 'observerHeightM'
  | 'targetHeightM'
  | 'observerGroundElevationM'
  | 'targetGroundElevationM'
  | 'observerCoordinates'
  | 'targetCoordinates'
  | 'observedVisiblePercent'
  | 'observationUncertaintyPercent'
  | 'verticalDatumKind'
  | 'verticalDatumOffsetM'
  | 'atmosphereMode'
  | 'refractionCoefficient'
  | 'surfaceDistanceUncertaintyM'
  | 'observerEyeHeightUncertaintyM'
  | 'observerGroundElevationUncertaintyM'
  | 'targetHeightUncertaintyM'
  | 'targetGroundElevationUncertaintyM'
  | 'refractionCoefficientUncertainty'
  | 'shadowGnomonHeightM'
  | 'shadowObservedLengthM'
  | 'shadowObservedLengthUncertaintyM'
  | 'shadowObservedAzimuthDeg'
  | 'shadowObservedAzimuthUncertaintyDeg'
  | 'shadowStationBCoordinates'
  | 'shadowStationBGnomonHeightM'
  | 'shadowStationBObservedLengthM'
  | 'shadowStationBObservedLengthUncertaintyM'
  | 'shadowStationBObservedAzimuthDeg'
  | 'shadowStationBObservedAzimuthUncertaintyDeg'
  | 'stellarStarId'
  | 'stellarTrailDurationMinutes'
  | 'stellarSampleIntervalMinutes'
  | 'stellarLocalHorizonEnabled'
  | 'stellarLocalHorizonNorthDeg'
  | 'stellarLocalHorizonNorthEastDeg'
  | 'stellarLocalHorizonEastDeg'
  | 'stellarLocalHorizonSouthEastDeg'
  | 'stellarLocalHorizonSouthDeg'
  | 'stellarLocalHorizonSouthWestDeg'
  | 'stellarLocalHorizonWestDeg'
  | 'stellarLocalHorizonNorthWestDeg'
  | 'eclipseSearchHalfWindowHours'
  | 'cameraCalibration'
  | 'waterSurface';

export type ExperimentSetupCandidateStatus = 'found' | 'review' | 'unavailable';

export interface ExperimentSetupCandidate {
  id: string;
  fieldId: ExperimentSetupFieldId;
  label: string;
  status: ExperimentSetupCandidateStatus;
  displayValue: string;
  sourceExcerpt: string;
  numericValue?: number;
  stringValue?: string;
  latitudeDeg?: number;
  longitudeDeg?: number;
  reason?: string;
}

export interface ExperimentSetupDraft {
  sourceText: string;
  parserVersion: typeof TEXT_EXPERIMENT_SETUP_PARSER_VERSION;
  candidates: ExperimentSetupCandidate[];
  notes: string[];
}

export interface TextSetupAppliedField {
  fieldId: ExperimentSetupFieldId;
  displayValue: string;
  sourceExcerpt: string;
}

export type TextExperimentSetupSourceKind = 'manual-text' | 'ai-follow-up';

export interface TextExperimentSetupProvenance {
  parserVersion: string;
  sourceText: string;
  appliedAtIso: string;
  sourceKind?: TextExperimentSetupSourceKind;
  aiLineage?: AiFollowUpLineage;
  appliedFields: TextSetupAppliedField[];
}

export interface TextSetupProvenanceContext {
  sourceKind: TextExperimentSetupSourceKind;
  aiLineage?: AiFollowUpLineage;
}


export interface ShadowTextSetupChanges {
  gnomonHeightM?: number;
  observedShadowLengthM?: number;
  observedShadowLengthUncertaintyM?: number;
  observedShadowAzimuthDeg?: number;
  observedShadowAzimuthUncertaintyDeg?: number;
}

export interface ShadowStationBTextSetupChanges extends ShadowTextSetupChanges {
  latitudeDeg?: number;
  longitudeDeg?: number;
}

export interface StellarTextSetupChanges {
  starId?: string;
  trailDurationMinutes?: number;
  trailSampleIntervalMinutes?: number;
  localHorizonEnabled?: boolean;
  localHorizonNorthDeg?: number;
  localHorizonNorthEastDeg?: number;
  localHorizonEastDeg?: number;
  localHorizonSouthEastDeg?: number;
  localHorizonSouthDeg?: number;
  localHorizonSouthWestDeg?: number;
  localHorizonWestDeg?: number;
  localHorizonNorthWestDeg?: number;
}

export interface ExperimentSetupApplication {
  scenarioId?: SimulationScenarioId;
  experimentName?: string;
  observedAtIso?: string;
  utcOffsetMinutes?: number;
  inputChanges: Partial<SimulatorInputs>;
  atmosphereMode?: AtmosphereMode;
  modelUncertaintyChanges: Partial<ModelInputUncertaintySettings>;
  shadowSettingsChanges?: ShadowTextSetupChanges;
  dualShadowStationBChanges?: ShadowStationBTextSetupChanges;
  stellarSettingsChanges?: StellarTextSetupChanges;
  eclipseSearchHalfWindowHours?: number;
  provenance: TextExperimentSetupProvenance;
}
