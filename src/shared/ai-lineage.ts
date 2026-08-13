import type { SavedExperiment } from './simulator';
import { GGL_AI_TEST_END, GGL_AI_TEST_HEADER } from './ai-workflow';

export const AI_FOLLOW_UP_LINEAGE_VERSION = 'v1';
export const AI_ANALYSIS_SNAPSHOT_FORMAT = 'GGL-AI-ANALYSIS';
export const MAX_AI_ANALYSIS_SNAPSHOT_CHARS = 256_000;

export interface AiAnalysisSnapshotEvidence {
  format: typeof AI_ANALYSIS_SNAPSHOT_FORMAT;
  packageText: string;
}

export interface AiFollowUpLineage {
  version: typeof AI_FOLLOW_UP_LINEAGE_VERSION;
  analysisPackageVersion: string;
  analysisGeneratedAtIso: string;
  sourceExperimentId: string;
  sourceExperimentUpdatedAtIso: string;
  analysisSha256: string;
  canonicalTestSha256: string;
  analysisSnapshot?: AiAnalysisSnapshotEvidence;
}

export function isSha256Hex(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}

export function isAiAnalysisSnapshotEvidence(
  value: unknown,
  analysisPackageVersion: string,
  analysisGeneratedAtIso: string
): value is AiAnalysisSnapshotEvidence {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.format !== AI_ANALYSIS_SNAPSHOT_FORMAT ||
    typeof candidate.packageText !== 'string' ||
    candidate.packageText.length === 0 ||
    candidate.packageText.length > MAX_AI_ANALYSIS_SNAPSHOT_CHARS) {
    return false;
  }
  const lines = candidate.packageText.split(/\r?\n/u);
  return lines[0] === `${AI_ANALYSIS_SNAPSHOT_FORMAT} ${analysisPackageVersion}` &&
    lines[1] === `generated_at_utc: ${analysisGeneratedAtIso}` &&
    lines.at(-1) === `END ${AI_ANALYSIS_SNAPSHOT_FORMAT}`;
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
  const packageVersion = analysisPackageVersion.trim();
  if (analysisPackageText.trim().length === 0 || packageVersion.length === 0) {
    throw new Error('AI analiz paketi soy ağacı için eksik.');
  }
  const analysisSnapshot: AiAnalysisSnapshotEvidence = {
    format: AI_ANALYSIS_SNAPSHOT_FORMAT,
    packageText: analysisPackageText
  };
  if (!isAiAnalysisSnapshotEvidence(analysisSnapshot, packageVersion, analysisGeneratedAtIso)) {
    throw new Error('AI analiz paketi snapshot kanıtı beklenen GGL-AI-ANALYSIS sözleşmesiyle eşleşmiyor.');
  }

  const [analysisSha256, canonicalTestSha256] = await Promise.all([
    sha256Utf8(analysisPackageText),
    sha256Utf8(testBlock)
  ]);

  return {
    version: AI_FOLLOW_UP_LINEAGE_VERSION,
    analysisPackageVersion: packageVersion,
    analysisGeneratedAtIso,
    sourceExperimentId: sourceExperiment.id,
    sourceExperimentUpdatedAtIso: sourceExperiment.updatedAtIso,
    analysisSha256,
    canonicalTestSha256,
    analysisSnapshot
  };
}
