import { describe, expect, it } from 'vitest';
import { createAiAnalysisPackage } from '../src/shared/ai-analysis-package';
import { sha256Utf8 } from '../src/shared/ai-lineage';
import {
  verifyAiFollowUpProvenance,
  verifyExperimentAiLineage
} from '../src/shared/ai-lineage-verification';
import { DEFAULT_SIMULATOR_INPUTS, type SavedExperiment } from '../src/shared/simulator';
import type { TextExperimentSetupProvenance } from '../src/shared/text-experiment-setup';

const generatedAtIso = '2026-08-12T14:00:00.000Z';
const sourceUpdatedAtIso = '2026-08-12T13:59:00.000Z';
const canonicalTest = [
  'GGL-AI-TEST v1',
  'scenario: target-visibility',
  'surface_distance_km: 42',
  'END GGL-AI-TEST'
].join('\n');

function sourceExperiment(): SavedExperiment {
  return {
    id: 'lineage-source',
    name: 'Kaynak deney',
    createdAtIso: '2026-08-12T13:50:00.000Z',
    updatedAtIso: sourceUpdatedAtIso,
    scenarioId: 'target-visibility',
    inputs: { ...DEFAULT_SIMULATOR_INPUTS, surfaceDistanceKm: 40 },
    modelVersions: {},
    predictions: []
  };
}

async function provenance(): Promise<TextExperimentSetupProvenance> {
  const source = sourceExperiment();
  return {
    parserVersion: '0.3.0',
    sourceKind: 'ai-follow-up',
    sourceText: canonicalTest,
    appliedAtIso: '2026-08-12T14:01:00.000Z',
    aiLineage: {
      version: 'v1',
      analysisPackageVersion: 'v1',
      analysisGeneratedAtIso: generatedAtIso,
      sourceExperimentId: source.id,
      sourceExperimentUpdatedAtIso: source.updatedAtIso,
      analysisSha256: await sha256Utf8(createAiAnalysisPackage(source, generatedAtIso)),
      canonicalTestSha256: await sha256Utf8(canonicalTest)
    },
    appliedFields: [{
      fieldId: 'surfaceDistanceKm',
      displayValue: '42 km',
      sourceExcerpt: 'surface_distance_km: 42'
    }]
  };
}

async function provenanceWithSnapshot(): Promise<TextExperimentSetupProvenance> {
  const entry = await provenance();
  const source = sourceExperiment();
  entry.aiLineage!.analysisSnapshot = {
    format: 'GGL-AI-ANALYSIS',
    packageText: createAiAnalysisPackage(source, generatedAtIso)
  };
  return entry;
}

describe('AI lineage verification', () => {
  it('fully verifies canonical test and reconstructable source analysis', async () => {
    const result = await verifyAiFollowUpProvenance(await provenance(), [sourceExperiment()]);
    expect(result.status).toBe('verified');
    expect(result.canonicalTest.status).toBe('verified');
    expect(result.analysis.status).toBe('verified');
  });

  it('still verifies when only source updatedAt differs but reconstructed package is identical', async () => {
    const entry = await provenance();
    const sameContent = sourceExperiment();
    sameContent.updatedAtIso = '2026-08-12T14:05:00.000Z';
    const result = await verifyAiFollowUpProvenance(entry, [sameContent]);
    expect(result.status).toBe('verified');
    expect(result.analysis.status).toBe('verified');
  });

  it('reports partial verification for legacy lineage when source snapshot is missing or its content changed', async () => {
    const entry = await provenance();
    const missing = await verifyAiFollowUpProvenance(entry, []);
    expect(missing.status).toBe('partial');
    expect(missing.analysis.status).toBe('source-missing');
    expect(missing.analysis.verificationMethod).toBe('reconstructed-source');

    const changed = sourceExperiment();
    changed.updatedAtIso = '2026-08-12T14:05:00.000Z';
    changed.inputs = { ...changed.inputs, surfaceDistanceKm: 41 };
    const changedResult = await verifyAiFollowUpProvenance(entry, [changed]);
    expect(changedResult.status).toBe('partial');
    expect(changedResult.analysis.status).toBe('source-changed');
  });

  it('fully verifies immutable analysis snapshot evidence even when source is missing or changed', async () => {
    const entry = await provenanceWithSnapshot();
    const missing = await verifyAiFollowUpProvenance(entry, []);
    expect(missing.status).toBe('verified');
    expect(missing.analysis.status).toBe('verified');
    expect(missing.analysis.verificationMethod).toBe('snapshot');

    const changed = sourceExperiment();
    changed.updatedAtIso = '2026-08-12T14:05:00.000Z';
    changed.inputs = { ...changed.inputs, surfaceDistanceKm: 41 };
    const changedResult = await verifyAiFollowUpProvenance(entry, [changed]);
    expect(changedResult.status).toBe('verified');
    expect(changedResult.analysis.status).toBe('verified');
    expect(changedResult.analysis.availableSourceUpdatedAtIso).toBe(changed.updatedAtIso);
  });

  it('treats tampered stored analysis snapshot evidence as a mismatch', async () => {
    const entry = await provenanceWithSnapshot();
    entry.aiLineage!.analysisSnapshot!.packageText += '\ntampered';
    const result = await verifyAiFollowUpProvenance(entry, [sourceExperiment()]);
    expect(result.status).toBe('mismatch');
    expect(result.analysis.status).toBe('mismatch');
    expect(result.analysis.verificationMethod).toBe('snapshot');
  });

  it('detects canonical test or reconstructed analysis mismatch', async () => {
    const changedTest = await provenance();
    changedTest.sourceText = changedTest.sourceText.replace('42', '43');
    const testMismatch = await verifyAiFollowUpProvenance(changedTest, [sourceExperiment()]);
    expect(testMismatch.status).toBe('mismatch');
    expect(testMismatch.canonicalTest.status).toBe('mismatch');

    const badAnalysis = await provenance();
    badAnalysis.aiLineage!.analysisSha256 = 'f'.repeat(64);
    const analysisMismatch = await verifyAiFollowUpProvenance(badAnalysis, [sourceExperiment()]);
    expect(analysisMismatch.status).toBe('mismatch');
    expect(analysisMismatch.analysis.status).toBe('mismatch');
  });

  it('verifies every AI follow-up entry and ignores manual history', async () => {
    const entry = await provenance();
    const resultExperiment: SavedExperiment = {
      ...sourceExperiment(),
      id: 'lineage-result',
      textSetupHistory: [
        {
          parserVersion: '0.3.0',
          sourceKind: 'manual-text',
          sourceText: 'Mesafe 30 km',
          appliedAtIso: '2026-08-12T13:55:00.000Z',
          appliedFields: []
        },
        entry
      ]
    };
    const results = await verifyExperimentAiLineage(resultExperiment, [sourceExperiment(), resultExperiment]);
    expect(results).toHaveLength(1);
    expect(results[0]?.historyIndex).toBe(1);
  });
});
