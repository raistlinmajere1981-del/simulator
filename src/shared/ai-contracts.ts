/**
 * Canonical registry for public GGL AI wire-contract identities and versions.
 *
 * Keep this module dependency-free. Protocol producers/parsers may import from it,
 * but it must never import them back. Existing facade exports remain available from
 * their historical modules for backward-compatible contributor imports.
 */
export const AI_CONTRACT_REGISTRY = {
  test: {
    id: 'GGL-AI-TEST',
    version: 'v1',
    header: 'GGL-AI-TEST v1',
    endMarker: 'END GGL-AI-TEST',
    direction: 'ai-to-ggl',
    authority: 'proposal-only'
  },
  analysis: {
    id: 'GGL-AI-ANALYSIS',
    version: 'v1',
    header: 'GGL-AI-ANALYSIS v1',
    endMarker: 'END GGL-AI-ANALYSIS',
    direction: 'ggl-to-ai',
    authority: 'deterministic-snapshot'
  },
  comparison: {
    id: 'GGL-AI-COMPARISON',
    version: 'v1',
    header: 'GGL-AI-COMPARISON v1',
    endMarker: 'END GGL-AI-COMPARISON',
    direction: 'ggl-to-ai',
    authority: 'deterministic-snapshot'
  },
  lineage: {
    id: 'ai-follow-up-lineage',
    version: 'v1',
    direction: 'persisted-provenance',
    authority: 'integrity-metadata'
  }
} as const;

export const GGL_AI_TEST_SPEC_VERSION = AI_CONTRACT_REGISTRY.test.version;
export const GGL_AI_TEST_HEADER = AI_CONTRACT_REGISTRY.test.header;
export const GGL_AI_TEST_END = AI_CONTRACT_REGISTRY.test.endMarker;

export const GGL_AI_ANALYSIS_PACKAGE_VERSION = AI_CONTRACT_REGISTRY.analysis.version;
export const GGL_AI_ANALYSIS_HEADER = AI_CONTRACT_REGISTRY.analysis.header;
export const GGL_AI_ANALYSIS_END = AI_CONTRACT_REGISTRY.analysis.endMarker;

export const GGL_AI_COMPARISON_PACKAGE_VERSION = AI_CONTRACT_REGISTRY.comparison.version;
export const GGL_AI_COMPARISON_HEADER = AI_CONTRACT_REGISTRY.comparison.header;
export const GGL_AI_COMPARISON_END = AI_CONTRACT_REGISTRY.comparison.endMarker;

export const AI_FOLLOW_UP_LINEAGE_VERSION = AI_CONTRACT_REGISTRY.lineage.version;
export const AI_ANALYSIS_SNAPSHOT_FORMAT = AI_CONTRACT_REGISTRY.analysis.id;
