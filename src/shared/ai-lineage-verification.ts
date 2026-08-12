import { createAiAnalysisPackage } from './ai-analysis-package';
import { sha256Utf8 } from './ai-lineage';
import type { SavedExperiment } from './simulator';
import type { TextExperimentSetupProvenance } from './text-experiment-setup';

export type AiLineageVerificationStatus = 'verified' | 'partial' | 'mismatch';
export type AiLineageAnalysisVerificationStatus =
  | 'verified'
  | 'source-missing'
  | 'source-changed'
  | 'mismatch';

export interface AiFollowUpVerification {
  historyIndex: number;
  status: AiLineageVerificationStatus;
  canonicalTest: {
    status: 'verified' | 'mismatch';
    expectedSha256: string;
    actualSha256: string;
  };
  analysis: {
    status: AiLineageAnalysisVerificationStatus;
    expectedSha256: string;
    actualSha256?: string;
    sourceExperimentId: string;
    sourceExperimentUpdatedAtIso: string;
    availableSourceUpdatedAtIso?: string;
  };
}

function requireAiLineage(
  provenance: TextExperimentSetupProvenance
): NonNullable<TextExperimentSetupProvenance['aiLineage']> {
  if (provenance.sourceKind !== 'ai-follow-up' || !provenance.aiLineage) {
    throw new TypeError('Doğrulama yalnız AI takip provenansı için kullanılabilir.');
  }
  return provenance.aiLineage;
}

export async function verifyAiFollowUpProvenance(
  provenance: TextExperimentSetupProvenance,
  availableExperiments: readonly SavedExperiment[],
  historyIndex = 0
): Promise<AiFollowUpVerification> {
  const lineage = requireAiLineage(provenance);
  const actualCanonicalTestSha256 = await sha256Utf8(provenance.sourceText.trim());
  const canonicalStatus = actualCanonicalTestSha256 === lineage.canonicalTestSha256
    ? 'verified'
    : 'mismatch';

  const sourceExperiment = availableExperiments.find(
    (experiment) => experiment.id === lineage.sourceExperimentId
  );

  let analysis: AiFollowUpVerification['analysis'];
  if (!sourceExperiment) {
    analysis = {
      status: 'source-missing',
      expectedSha256: lineage.analysisSha256,
      sourceExperimentId: lineage.sourceExperimentId,
      sourceExperimentUpdatedAtIso: lineage.sourceExperimentUpdatedAtIso
    };
  } else if (sourceExperiment.updatedAtIso !== lineage.sourceExperimentUpdatedAtIso) {
    analysis = {
      status: 'source-changed',
      expectedSha256: lineage.analysisSha256,
      sourceExperimentId: lineage.sourceExperimentId,
      sourceExperimentUpdatedAtIso: lineage.sourceExperimentUpdatedAtIso,
      availableSourceUpdatedAtIso: sourceExperiment.updatedAtIso
    };
  } else {
    const reconstructed = createAiAnalysisPackage(
      sourceExperiment,
      lineage.analysisGeneratedAtIso
    );
    const actualAnalysisSha256 = await sha256Utf8(reconstructed);
    analysis = {
      status: actualAnalysisSha256 === lineage.analysisSha256 ? 'verified' : 'mismatch',
      expectedSha256: lineage.analysisSha256,
      actualSha256: actualAnalysisSha256,
      sourceExperimentId: lineage.sourceExperimentId,
      sourceExperimentUpdatedAtIso: lineage.sourceExperimentUpdatedAtIso,
      availableSourceUpdatedAtIso: sourceExperiment.updatedAtIso
    };
  }

  const status: AiLineageVerificationStatus = canonicalStatus === 'mismatch' || analysis.status === 'mismatch'
    ? 'mismatch'
    : analysis.status === 'verified'
      ? 'verified'
      : 'partial';

  return {
    historyIndex,
    status,
    canonicalTest: {
      status: canonicalStatus,
      expectedSha256: lineage.canonicalTestSha256,
      actualSha256: actualCanonicalTestSha256
    },
    analysis
  };
}

export async function verifyExperimentAiLineage(
  experiment: SavedExperiment,
  availableExperiments: readonly SavedExperiment[]
): Promise<AiFollowUpVerification[]> {
  const history = experiment.textSetupHistory ?? [];
  const verifications = await Promise.all(history.map(async (provenance, historyIndex) => {
    if (provenance.sourceKind !== 'ai-follow-up' || !provenance.aiLineage) return undefined;
    return verifyAiFollowUpProvenance(provenance, availableExperiments, historyIndex);
  }));
  return verifications.filter((item): item is AiFollowUpVerification => item !== undefined);
}
