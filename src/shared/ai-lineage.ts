import type { SavedExperiment } from './simulator';
import { GGL_AI_TEST_END, GGL_AI_TEST_HEADER } from './ai-workflow';

export const AI_FOLLOW_UP_LINEAGE_VERSION = 'v1';

export interface AiFollowUpLineage {
  version: typeof AI_FOLLOW_UP_LINEAGE_VERSION;
  analysisPackageVersion: string;
  analysisGeneratedAtIso: string;
  sourceExperimentId: string;
  sourceExperimentUpdatedAtIso: string;
  analysisSha256: string;
  canonicalTestSha256: string;
}

export function isSha256Hex(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}

export async function sha256Utf8(text: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('SHA-256 için Web Crypto API kullanılamıyor; AI soy ağacı kaydı oluşturulmadı.');
  }
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function createAiFollowUpLineage({
  sourceExperiment,
  analysisPackageVersion,
  analysisGeneratedAtIso,
  analysisPackageText,
  canonicalTestBlock
}: {
  sourceExperiment: Pick<SavedExperiment, 'id' | 'updatedAtIso'>;
  analysisPackageVersion: string;
  analysisGeneratedAtIso: string;
  analysisPackageText: string;
  canonicalTestBlock: string;
}): Promise<AiFollowUpLineage> {
  const testBlock = canonicalTestBlock.trim();
  if (!testBlock.startsWith(GGL_AI_TEST_HEADER) || !testBlock.endsWith(GGL_AI_TEST_END)) {
    throw new Error('AI soy ağacı yalnız kanonik GGL-AI-TEST v1 bloğuna bağlanabilir.');
  }
  if (analysisPackageText.trim().length === 0 || analysisPackageVersion.trim().length === 0) {
    throw new Error('AI analiz paketi soy ağacı için eksik.');
  }

  const [analysisSha256, canonicalTestSha256] = await Promise.all([
    sha256Utf8(analysisPackageText),
    sha256Utf8(testBlock)
  ]);

  return {
    version: AI_FOLLOW_UP_LINEAGE_VERSION,
    analysisPackageVersion: analysisPackageVersion.trim(),
    analysisGeneratedAtIso,
    sourceExperimentId: sourceExperiment.id,
    sourceExperimentUpdatedAtIso: sourceExperiment.updatedAtIso,
    analysisSha256,
    canonicalTestSha256
  };
}
