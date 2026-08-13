import { describe, expect, it } from 'vitest';
import { createAiAnalysisPackage } from '../src/shared/ai-analysis-package';
import { createPortableExperimentFile, parsePortableExperimentFile } from '../src/shared/portable';
import { createExperimentHtmlReport } from '../src/report/html-report';
import { DEFAULT_SIMULATOR_INPUTS, type SavedExperiment } from '../src/shared/simulator';

const analysisSha256 = 'a'.repeat(64);
const canonicalTestSha256 = 'b'.repeat(64);

function experiment(): SavedExperiment {
  return {
    id: 'ai-lineage-result',
    name: 'AI takip deneyi',
    createdAtIso: '2026-08-12T13:00:00.000Z',
    updatedAtIso: '2026-08-12T13:05:00.000Z',
    scenarioId: 'target-visibility',
    inputs: { ...DEFAULT_SIMULATOR_INPUTS, surfaceDistanceKm: 42 },
    textSetupHistory: [{
      parserVersion: '0.3.0',
      sourceKind: 'ai-follow-up',
      sourceText: [
        'GGL-AI-TEST v1',
        'scenario: target-visibility',
        'distance.surface_km: 42',
        'END GGL-AI-TEST'
      ].join('\n'),
      appliedAtIso: '2026-08-12T13:04:00.000Z',
      aiLineage: {
        version: 'v1',
        analysisPackageVersion: 'v1',
        analysisGeneratedAtIso: '2026-08-12T13:01:00.000Z',
        sourceExperimentId: 'ai-lineage-source',
        sourceExperimentUpdatedAtIso: '2026-08-12T13:00:30.000Z',
        analysisSha256,
        canonicalTestSha256
      },
      appliedFields: [{
        fieldId: 'surfaceDistanceKm',
        displayValue: '42 km',
        sourceExcerpt: 'distance.surface_km: 42'
      }]
    }],
    modelVersions: {},
    predictions: []
  };
}

function experimentWithSnapshot(): SavedExperiment {
  const result = experiment();
  const historicalSource: SavedExperiment = {
    ...experiment(),
    id: 'historical-snapshot-source',
    name: 'HISTORICAL-SNAPSHOT-EVIDENCE-ONLY',
    textSetupHistory: undefined
  };
  result.textSetupHistory![0]!.aiLineage!.analysisSnapshot = {
    format: 'GGL-AI-ANALYSIS',
    packageText: createAiAnalysisPackage(historicalSource, '2026-08-12T13:01:00.000Z')
  };
  return result;
}

describe('AI lineage persistence', () => {
  it('round-trips lineage through portable JSON', () => {
    const portable = createPortableExperimentFile(experiment(), '1.34.0', '2026-08-12T13:10:00.000Z');
    const parsed = parsePortableExperimentFile(portable).experiment;
    expect(parsed.textSetupHistory).toEqual(experiment().textSetupHistory);
  });

  it('round-trips optional deterministic analysis snapshot evidence through portable JSON', () => {
    const source = experimentWithSnapshot();
    const portable = createPortableExperimentFile(source, '1.34.1', '2026-08-12T13:10:00.000Z');
    const parsed = parsePortableExperimentFile(portable).experiment;
    expect(parsed.textSetupHistory).toEqual(source.textSetupHistory);
  });

  it('rejects malformed hashes, malformed snapshot metadata or AI lineage without ai-follow-up source kind', () => {
    const malformed = createPortableExperimentFile(experiment(), '1.34.0');
    const badHash = structuredClone(malformed) as any;
    badHash.experiment.textSetupHistory[0].aiLineage.analysisSha256 = 'bad';
    expect(() => parsePortableExperimentFile(badHash)).toThrow();

    const badSnapshot = createPortableExperimentFile(experimentWithSnapshot(), '1.34.1');
    (badSnapshot as any).experiment.textSetupHistory[0].aiLineage.analysisSnapshot.packageText = [
      'GGL-AI-ANALYSIS v1',
      'generated_at_utc: 2026-08-12T13:09:00.000Z',
      'END GGL-AI-ANALYSIS'
    ].join('\n');
    expect(() => parsePortableExperimentFile(badSnapshot)).toThrow();

    const wrongKind = structuredClone(malformed) as any;
    wrongKind.experiment.textSetupHistory[0].sourceKind = 'manual-text';
    expect(() => parsePortableExperimentFile(wrongKind)).toThrow();
  });

  it('renders lineage hashes in report without storing an external AI prose reply', () => {
    const report = createExperimentHtmlReport(experiment(), '2026-08-12T13:10:00.000Z');
    expect(report).toContain('AI takip testi');
    expect(report).toContain(analysisSha256);
    expect(report).toContain(canonicalTestSha256);
    expect(report).toContain('ai-lineage-source');
  });

  it('exposes hash-only lineage summary in the next AI analysis package', () => {
    const packageText = createAiAnalysisPackage(experimentWithSnapshot(), '2026-08-12T13:10:00.000Z');
    expect(packageText).toContain('provenance.ai_follow_up_count: 1');
    expect(packageText).toContain(`provenance.ai_follow_up.1.analysis_sha256: ${analysisSha256}`);
    expect(packageText).toContain(`provenance.ai_follow_up.1.canonical_test_sha256: ${canonicalTestSha256}`);
    expect(packageText).toContain('provenance.ai_follow_up.1.source_experiment_id: ai-lineage-source');
    expect(packageText).not.toContain('GGL-AI-TEST v1');
    expect(packageText).not.toContain('END GGL-AI-TEST');
    expect(packageText).not.toContain('HISTORICAL-SNAPSHOT-EVIDENCE-ONLY');
  });
});
