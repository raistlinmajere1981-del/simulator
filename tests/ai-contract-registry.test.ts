import { describe, expect, it } from 'vitest';
import {
  AI_ANALYSIS_SNAPSHOT_FORMAT,
  AI_CONTRACT_REGISTRY,
  AI_FOLLOW_UP_LINEAGE_VERSION,
  GGL_AI_ANALYSIS_END,
  GGL_AI_ANALYSIS_HEADER,
  GGL_AI_ANALYSIS_PACKAGE_VERSION,
  GGL_AI_COMPARISON_END,
  GGL_AI_COMPARISON_HEADER,
  GGL_AI_COMPARISON_PACKAGE_VERSION,
  GGL_AI_TEST_END,
  GGL_AI_TEST_HEADER,
  GGL_AI_TEST_SPEC_VERSION
} from '../src/shared/ai-contracts';
import {
  GGL_AI_ANALYSIS_PACKAGE_VERSION as analysisFacadeVersion,
  GGL_AI_COMPARISON_PACKAGE_VERSION as comparisonFacadeVersion,
  createAiAnalysisPackage,
  createAiComparisonPackage
} from '../src/shared/ai-analysis-package';
import { AI_FOLLOW_UP_LINEAGE_VERSION as lineageFacadeVersion } from '../src/shared/ai-lineage';
import { GGL_AI_TEST_SPEC_VERSION as testFacadeVersion } from '../src/shared/ai-test-spec';
import {
  GGL_AI_TEST_END as workflowEnd,
  GGL_AI_TEST_HEADER as workflowHeader
} from '../src/shared/ai-workflow';
import { DEFAULT_SIMULATOR_INPUTS, type SavedExperiment } from '../src/shared/simulator';

function experiment(id: string): SavedExperiment {
  return {
    id,
    name: `Contract ${id}`,
    createdAtIso: '2026-08-13T08:00:00.000Z',
    updatedAtIso: '2026-08-13T08:00:00.000Z',
    scenarioId: 'target-visibility',
    inputs: { ...DEFAULT_SIMULATOR_INPUTS },
    modelVersions: {},
    predictions: []
  };
}

describe('AI contract registry', () => {
  it('pins the public v1 identities, headers and end markers in one dependency-free registry', () => {
    expect(AI_CONTRACT_REGISTRY).toEqual({
      test: {
        id: 'GGL-AI-TEST', version: 'v1', header: 'GGL-AI-TEST v1',
        endMarker: 'END GGL-AI-TEST', direction: 'ai-to-ggl', authority: 'proposal-only'
      },
      analysis: {
        id: 'GGL-AI-ANALYSIS', version: 'v1', header: 'GGL-AI-ANALYSIS v1',
        endMarker: 'END GGL-AI-ANALYSIS', direction: 'ggl-to-ai', authority: 'deterministic-snapshot'
      },
      comparison: {
        id: 'GGL-AI-COMPARISON', version: 'v1', header: 'GGL-AI-COMPARISON v1',
        endMarker: 'END GGL-AI-COMPARISON', direction: 'ggl-to-ai', authority: 'deterministic-snapshot'
      },
      lineage: {
        id: 'ai-follow-up-lineage', version: 'v1', direction: 'persisted-provenance',
        authority: 'integrity-metadata'
      }
    });
    expect(GGL_AI_TEST_SPEC_VERSION).toBe('v1');
    expect(GGL_AI_TEST_HEADER).toBe('GGL-AI-TEST v1');
    expect(GGL_AI_TEST_END).toBe('END GGL-AI-TEST');
    expect(GGL_AI_ANALYSIS_PACKAGE_VERSION).toBe('v1');
    expect(GGL_AI_ANALYSIS_HEADER).toBe('GGL-AI-ANALYSIS v1');
    expect(GGL_AI_ANALYSIS_END).toBe('END GGL-AI-ANALYSIS');
    expect(GGL_AI_COMPARISON_PACKAGE_VERSION).toBe('v1');
    expect(GGL_AI_COMPARISON_HEADER).toBe('GGL-AI-COMPARISON v1');
    expect(GGL_AI_COMPARISON_END).toBe('END GGL-AI-COMPARISON');
    expect(AI_FOLLOW_UP_LINEAGE_VERSION).toBe('v1');
    expect(AI_ANALYSIS_SNAPSHOT_FORMAT).toBe('GGL-AI-ANALYSIS');
  });

  it('keeps historical facade exports aligned with the registry', () => {
    expect(testFacadeVersion).toBe(GGL_AI_TEST_SPEC_VERSION);
    expect(workflowHeader).toBe(GGL_AI_TEST_HEADER);
    expect(workflowEnd).toBe(GGL_AI_TEST_END);
    expect(analysisFacadeVersion).toBe(GGL_AI_ANALYSIS_PACKAGE_VERSION);
    expect(comparisonFacadeVersion).toBe(GGL_AI_COMPARISON_PACKAGE_VERSION);
    expect(lineageFacadeVersion).toBe(AI_FOLLOW_UP_LINEAGE_VERSION);
  });

  it('keeps generated analysis and comparison package boundaries aligned with the registry', () => {
    const generatedAt = '2026-08-13T09:00:00.000Z';
    const analysis = createAiAnalysisPackage(experiment('one'), generatedAt).split('\n');
    expect(analysis[0]).toBe(GGL_AI_ANALYSIS_HEADER);
    expect(analysis.at(-1)).toBe(GGL_AI_ANALYSIS_END);

    const comparison = createAiComparisonPackage([experiment('one'), experiment('two')], generatedAt).split('\n');
    expect(comparison[0]).toBe(GGL_AI_COMPARISON_HEADER);
    expect(comparison.at(-1)).toBe(GGL_AI_COMPARISON_END);
  });
});
