import { describe, expect, it } from 'vitest';
import {
  createAiFollowUpLineage,
  sha256Utf8
} from '../src/shared/ai-lineage';
import {
  TEXT_EXPERIMENT_SETUP_PARSER_VERSION,
  buildExperimentSetupApplication,
  type ExperimentSetupDraft
} from '../src/shared/text-experiment-setup';

const canonicalTest = [
  'GGL-AI-TEST v1',
  'scenario: target-visibility',
  'distance.surface_km: 42',
  'END GGL-AI-TEST'
].join('\n');

const draft: ExperimentSetupDraft = {
  sourceText: canonicalTest,
  parserVersion: TEXT_EXPERIMENT_SETUP_PARSER_VERSION,
  candidates: [
    {
      id: 'surface-distance',
      fieldId: 'surfaceDistanceKm',
      label: 'Yüzey mesafesi',
      status: 'found',
      displayValue: '42 km',
      sourceExcerpt: 'distance.surface_km: 42',
      numericValue: 42
    }
  ],
  notes: []
};

describe('AI follow-up lineage', () => {
  it('computes deterministic SHA-256 over exact UTF-8 text', async () => {
    expect(await sha256Utf8('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });

  it('binds the exact analysis package and canonical test block to applied provenance', async () => {
    const analysisPackage = [
      'GGL-AI-ANALYSIS v1',
      'generated_at_utc: 2026-08-12T13:00:00.000Z',
      'experiment.id: source-experiment',
      'END GGL-AI-ANALYSIS'
    ].join('\n');
    const lineage = await createAiFollowUpLineage({
      sourceExperiment: {
        id: 'source-experiment',
        updatedAtIso: '2026-08-12T12:59:59.000Z'
      },
      analysisPackageVersion: 'v1',
      analysisGeneratedAtIso: '2026-08-12T13:00:00.000Z',
      analysisPackageText: analysisPackage,
      canonicalTestBlock: canonicalTest
    });

    const application = buildExperimentSetupApplication(
      draft,
      ['surface-distance'],
      '2026-08-12T13:01:00.000Z',
      { sourceKind: 'ai-follow-up', aiLineage: lineage }
    );

    expect(application.provenance.sourceKind).toBe('ai-follow-up');
    expect(application.provenance.sourceText).toBe(canonicalTest);
    expect(application.provenance.aiLineage).toEqual(lineage);
    expect(lineage.analysisSha256).toHaveLength(64);
    expect(lineage.canonicalTestSha256).toBe(await sha256Utf8(canonicalTest));
    expect(lineage.analysisSnapshot).toEqual({
      format: 'GGL-AI-ANALYSIS',
      packageText: analysisPackage
    });
  });

  it('marks ordinary text setup as manual text by default', () => {
    const application = buildExperimentSetupApplication(
      draft,
      ['surface-distance'],
      '2026-08-12T13:02:00.000Z'
    );
    expect(application.provenance.sourceKind).toBe('manual-text');
    expect(application.provenance.aiLineage).toBeUndefined();
  });
});
