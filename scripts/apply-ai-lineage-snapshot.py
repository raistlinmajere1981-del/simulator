#!/usr/bin/env python3
"""Stage 8.9: persist deterministic GGL-AI-ANALYSIS snapshot evidence in AI lineage.

The external AI prose response is still never persisted. The stored snapshot is the
exact deterministic GGL package that the application generated before copy/paste.
This helper is temporary and must be removed before merge.
"""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    if text.count(old) != 1:
        fail(f"expected exactly one marker in {path.relative_to(ROOT)}: {old[:80]!r}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


LINEAGE = ROOT / "src/shared/ai-lineage.ts"
LINEAGE.write_text("""import type { SavedExperiment } from './simulator';
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
  const lines = candidate.packageText.split(/\\r?\\n/u);
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
""", encoding="utf-8")

VERIFICATION = ROOT / "src/shared/ai-lineage-verification.ts"
VERIFICATION.write_text("""import { createAiAnalysisPackage } from './ai-analysis-package';
import { isAiAnalysisSnapshotEvidence, sha256Utf8 } from './ai-lineage';
import type { SavedExperiment } from './simulator';
import type { TextExperimentSetupProvenance } from './text-experiment-setup';

export type AiLineageVerificationStatus = 'verified' | 'partial' | 'mismatch';
export type AiLineageAnalysisVerificationStatus =
  | 'verified'
  | 'source-missing'
  | 'source-changed'
  | 'mismatch';
export type AiLineageAnalysisVerificationMethod = 'snapshot' | 'reconstructed-source';

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
    verificationMethod: AiLineageAnalysisVerificationMethod;
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
  if (lineage.analysisSnapshot) {
    const structurallyValid = isAiAnalysisSnapshotEvidence(
      lineage.analysisSnapshot,
      lineage.analysisPackageVersion,
      lineage.analysisGeneratedAtIso
    );
    const actualAnalysisSha256 = await sha256Utf8(lineage.analysisSnapshot.packageText);
    analysis = {
      status: structurallyValid && actualAnalysisSha256 === lineage.analysisSha256
        ? 'verified'
        : 'mismatch',
      verificationMethod: 'snapshot',
      expectedSha256: lineage.analysisSha256,
      actualSha256: actualAnalysisSha256,
      sourceExperimentId: lineage.sourceExperimentId,
      sourceExperimentUpdatedAtIso: lineage.sourceExperimentUpdatedAtIso,
      ...(sourceExperiment ? { availableSourceUpdatedAtIso: sourceExperiment.updatedAtIso } : {})
    };
  } else if (!sourceExperiment) {
    analysis = {
      status: 'source-missing',
      verificationMethod: 'reconstructed-source',
      expectedSha256: lineage.analysisSha256,
      sourceExperimentId: lineage.sourceExperimentId,
      sourceExperimentUpdatedAtIso: lineage.sourceExperimentUpdatedAtIso
    };
  } else {
    const reconstructed = createAiAnalysisPackage(
      sourceExperiment,
      lineage.analysisGeneratedAtIso
    );
    const actualAnalysisSha256 = await sha256Utf8(reconstructed);
    const hashMatches = actualAnalysisSha256 === lineage.analysisSha256;
    const snapshotTimeMatches = sourceExperiment.updatedAtIso === lineage.sourceExperimentUpdatedAtIso;
    analysis = {
      status: hashMatches
        ? 'verified'
        : snapshotTimeMatches
          ? 'mismatch'
          : 'source-changed',
      verificationMethod: 'reconstructed-source',
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
""", encoding="utf-8")

PORTABLE = ROOT / "src/shared/portable-sources.ts"
replace_once(
    PORTABLE,
    "import { AI_FOLLOW_UP_LINEAGE_VERSION, isSha256Hex } from './ai-lineage';",
    "import {\n  AI_FOLLOW_UP_LINEAGE_VERSION,\n  isAiAnalysisSnapshotEvidence,\n  isSha256Hex\n} from './ai-lineage';"
)
replace_once(
    PORTABLE,
    """      aiLineage = {
        version: AI_FOLLOW_UP_LINEAGE_VERSION,
        analysisPackageVersion: lineage.analysisPackageVersion.trim(),
        analysisGeneratedAtIso: lineage.analysisGeneratedAtIso,
        sourceExperimentId: lineage.sourceExperimentId.trim(),
        sourceExperimentUpdatedAtIso: lineage.sourceExperimentUpdatedAtIso,
        analysisSha256: lineage.analysisSha256,
        canonicalTestSha256: lineage.canonicalTestSha256
      };""",
    """      const analysisPackageVersion = lineage.analysisPackageVersion.trim();
      const analysisSnapshot = lineage.analysisSnapshot === undefined
        ? undefined
        : isAiAnalysisSnapshotEvidence(
            lineage.analysisSnapshot,
            analysisPackageVersion,
            lineage.analysisGeneratedAtIso
          )
          ? {
              format: lineage.analysisSnapshot.format,
              packageText: lineage.analysisSnapshot.packageText
            }
          : null;
      if (analysisSnapshot === null) return null;
      aiLineage = {
        version: AI_FOLLOW_UP_LINEAGE_VERSION,
        analysisPackageVersion,
        analysisGeneratedAtIso: lineage.analysisGeneratedAtIso,
        sourceExperimentId: lineage.sourceExperimentId.trim(),
        sourceExperimentUpdatedAtIso: lineage.sourceExperimentUpdatedAtIso,
        analysisSha256: lineage.analysisSha256,
        canonicalTestSha256: lineage.canonicalTestSha256,
        ...(analysisSnapshot ? { analysisSnapshot } : {})
      };"""
)

WORKFLOW = ROOT / "src/renderer/src/AiWorkflowDialog.tsx"
replace_once(WORKFLOW, "AŞAMA 8.7 · AI TAKİP SOY AĞACI", "AŞAMA 8.9 · TARİHSEL ANALİZ KANITI")
replace_once(
    WORKFLOW,
    "Bu anlık görüntü cihazdaki kayıt listesine yazılmaz. Mevcut girdiler ve şu anda hesaplanmış sonuçlar yalnız AI analiz paketi üretmek için kullanılır.",
    "Bu deterministik GGL-AI-ANALYSIS paketi dış AI'ye gönderilecek anlık görüntüdür. Yalnız bir takip testi kullanıcı tarafından uygulanırsa bu exact paket lineage snapshot kanıtı olarak saklanır; dış AI'nin serbest yanıtı kaydedilmez."
)
replace_once(
    WORKFLOW,
    "AI hiçbir alanı doğrudan değiştirmez. Serbest AI yanıtı kaydedilmez; yalnız kanonik test bloğu ve SHA-256 soy ağacı kontrollü önizlemeye taşınır.",
    "AI hiçbir alanı doğrudan değiştirmez. Serbest AI yanıtı kaydedilmez; kanonik test bloğu, hashler ve GGL'nin kendi deterministik analiz snapshot kanıtı kontrollü provenansa taşınır."
)

DIALOG = ROOT / "src/renderer/src/AiLineageDialog.tsx"
replace_once(
    DIALOG,
    """const analysisLabel: Record<AiFollowUpVerification['analysis']['status'], string> = {
  verified: 'Kaynak analiz yeniden üretildi ve hash eşleşti.',
  'source-missing': 'Kaynak deney kayıt listesinde yok; analiz hash’i yeniden üretilemedi.',
  'source-changed': 'Aynı deney kimliği bulundu ancak mevcut içerik tarihsel analiz hash’ini üretmiyor; kaynak kayıt sonradan değişmiş olabilir.',
  mismatch: 'Aynı snapshot zamanı bulundu ancak yeniden üretilen analiz SHA-256 eşleşmedi.'
};""",
    """function analysisLabel(analysis: AiFollowUpVerification['analysis']): string {
  if (analysis.status === 'verified') {
    return analysis.verificationMethod === 'snapshot'
      ? 'Kayıtlı tarihsel GGL-AI-ANALYSIS snapshot kanıtının SHA-256 özeti eşleşti.'
      : 'Kaynak analiz yeniden üretildi ve hash eşleşti.';
  }
  if (analysis.status === 'source-missing') {
    return 'Eski lineage kaydında snapshot kanıtı yok ve kaynak deney kayıt listesinde bulunamadı.';
  }
  if (analysis.status === 'source-changed') {
    return 'Eski lineage kaydında snapshot kanıtı yok; aynı deney kimliği bulundu ancak mevcut içerik tarihsel analiz hash’ini üretmiyor.';
  }
  return analysis.verificationMethod === 'snapshot'
    ? 'Kayıtlı tarihsel analiz snapshot kanıtı veya SHA-256 özeti uyuşmuyor.'
    : 'Aynı snapshot zamanı bulundu ancak yeniden üretilen analiz SHA-256 eşleşmedi.';
}"""
)
replace_once(DIALOG, "AŞAMA 8.8 · HASH DOĞRULAMA", "AŞAMA 8.9 · SNAPSHOT + HASH DOĞRULAMA")
replace_once(
    DIALOG,
    "Kanonik GGL-AI-TEST bloğunun SHA-256 özeti her zaman yeniden hesaplanır. Kaynak deney aynı kimlikle hâlâ kayıt listesinde bulunuyorsa GGL-AI-ANALYSIS paketi kayıtlı üretim zamanı ile yeniden oluşturulur ve hash doğrudan karşılaştırılır. updatedAt farkı tek başına uyuşmazlık sayılmaz.",
    "Kanonik GGL-AI-TEST bloğunun SHA-256 özeti her zaman yeniden hesaplanır. Yeni AI takip kayıtlarında GGL'nin dış AI'ye gönderdiği deterministik GGL-AI-ANALYSIS paketi immutable snapshot kanıtı olarak saklanır ve kaynak deney sonradan değişse veya silinse bile kendi hash'iyle doğrulanır. Eski kayıtlarda snapshot yoksa Aşama 8.8 yeniden-üretim yöntemi geriye uyumlu olarak kullanılır."
)
replace_once(
    DIALOG,
    """                <tr><td>Kaynak analiz</td><td>{analysisLabel[result.analysis.status]}</td></tr>""",
    """                <tr><td>Analiz doğrulama yöntemi</td><td>{result.analysis.verificationMethod === 'snapshot' ? 'Tarihsel snapshot kanıtı' : 'Kaynak deneyden yeniden üretim'}</td></tr>
                <tr><td>Kaynak analiz</td><td>{analysisLabel(result.analysis)}</td></tr>"""
)
replace_once(
    DIALOG,
    "Kısmi doğrulama bir hata değildir: tarihsel kaynak kayıt artık yoksa veya aynı kimlikteki kayıt sonradan değişmişse özgün analiz paketi tam olarak yeniden üretilemeyebilir. Kanonik test bloğunun bütünlüğü yine bağımsız olarak doğrulanır.",
    "Kısmi doğrulama yalnız snapshot kanıtı eklenmeden önce oluşturulmuş eski lineage kayıtlarında beklenebilir: tarihsel kaynak artık yoksa veya değişmişse özgün analiz paketi yeniden üretilemeyebilir. Kanonik test bloğunun bütünlüğü yine bağımsız olarak doğrulanır."
)

TEST_LINEAGE = ROOT / "tests/ai-lineage.test.ts"
replace_once(
    TEST_LINEAGE,
    """    expect(lineage.analysisSha256).toHaveLength(64);
    expect(lineage.canonicalTestSha256).toBe(await sha256Utf8(canonicalTest));""",
    """    expect(lineage.analysisSha256).toHaveLength(64);
    expect(lineage.canonicalTestSha256).toBe(await sha256Utf8(canonicalTest));
    expect(lineage.analysisSnapshot).toEqual({
      format: 'GGL-AI-ANALYSIS',
      packageText: analysisPackage
    });"""
)

TEST_VERIFY = ROOT / "tests/ai-lineage-verification.test.ts"
replace_once(
    TEST_VERIFY,
    """async function provenance(): Promise<TextExperimentSetupProvenance> {
  const source = sourceExperiment();
  return {
""",
    """async function provenance(): Promise<TextExperimentSetupProvenance> {
  const source = sourceExperiment();
  return {
"""
)
# Insert a snapshot helper immediately before the describe block.
replace_once(
    TEST_VERIFY,
    """}

describe('AI lineage verification', () => {""",
    """}

async function provenanceWithSnapshot(): Promise<TextExperimentSetupProvenance> {
  const entry = await provenance();
  const source = sourceExperiment();
  entry.aiLineage!.analysisSnapshot = {
    format: 'GGL-AI-ANALYSIS',
    packageText: createAiAnalysisPackage(source, generatedAtIso)
  };
  return entry;
}

describe('AI lineage verification', () => {"""
)
replace_once(
    TEST_VERIFY,
    """  it('reports partial verification when source snapshot is missing or its content changed', async () => {
    const entry = await provenance();
    const missing = await verifyAiFollowUpProvenance(entry, []);
    expect(missing.status).toBe('partial');
    expect(missing.analysis.status).toBe('source-missing');

    const changed = sourceExperiment();
    changed.updatedAtIso = '2026-08-12T14:05:00.000Z';
    changed.inputs = { ...changed.inputs, surfaceDistanceKm: 41 };
    const changedResult = await verifyAiFollowUpProvenance(entry, [changed]);
    expect(changedResult.status).toBe('partial');
    expect(changedResult.analysis.status).toBe('source-changed');
  });""",
    """  it('reports partial verification for legacy lineage when source snapshot is missing or its content changed', async () => {
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
    entry.aiLineage!.analysisSnapshot!.packageText += '\\ntampered';
    const result = await verifyAiFollowUpProvenance(entry, [sourceExperiment()]);
    expect(result.status).toBe('mismatch');
    expect(result.analysis.status).toBe('mismatch');
    expect(result.analysis.verificationMethod).toBe('snapshot');
  });"""
)

TEST_PERSIST = ROOT / "tests/ai-lineage-persistence.test.ts"
replace_once(
    TEST_PERSIST,
    """}

describe('AI lineage persistence', () => {""",
    """}

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

describe('AI lineage persistence', () => {"""
)
replace_once(
    TEST_PERSIST,
    """  it('rejects malformed hashes or AI lineage without ai-follow-up source kind', () => {""",
    """  it('round-trips optional deterministic analysis snapshot evidence through portable JSON', () => {
    const source = experimentWithSnapshot();
    const portable = createPortableExperimentFile(source, '1.34.1', '2026-08-12T13:10:00.000Z');
    const parsed = parsePortableExperimentFile(portable).experiment;
    expect(parsed.textSetupHistory).toEqual(source.textSetupHistory);
  });

  it('rejects malformed hashes, malformed snapshot metadata or AI lineage without ai-follow-up source kind', () => {"""
)
replace_once(
    TEST_PERSIST,
    """    const wrongKind = structuredClone(malformed) as any;
    wrongKind.experiment.textSetupHistory[0].sourceKind = 'manual-text';
    expect(() => parsePortableExperimentFile(wrongKind)).toThrow();""",
    """    const badSnapshot = createPortableExperimentFile(experimentWithSnapshot(), '1.34.1');
    (badSnapshot as any).experiment.textSetupHistory[0].aiLineage.analysisSnapshot.packageText = [
      'GGL-AI-ANALYSIS v1',
      'generated_at_utc: 2026-08-12T13:09:00.000Z',
      'END GGL-AI-ANALYSIS'
    ].join('\\n');
    expect(() => parsePortableExperimentFile(badSnapshot)).toThrow();

    const wrongKind = structuredClone(malformed) as any;
    wrongKind.experiment.textSetupHistory[0].sourceKind = 'manual-text';
    expect(() => parsePortableExperimentFile(wrongKind)).toThrow();"""
)
replace_once(
    TEST_PERSIST,
    """  it('exposes hash-only lineage summary in the next AI analysis package', () => {
    const packageText = createAiAnalysisPackage(experiment(), '2026-08-12T13:10:00.000Z');""",
    """  it('exposes hash-only lineage summary in the next AI analysis package', () => {
    const packageText = createAiAnalysisPackage(experimentWithSnapshot(), '2026-08-12T13:10:00.000Z');"""
)
replace_once(
    TEST_PERSIST,
    """    expect(packageText).not.toContain('GGL-AI-TEST v1');
    expect(packageText).not.toContain('END GGL-AI-TEST');""",
    """    expect(packageText).not.toContain('GGL-AI-TEST v1');
    expect(packageText).not.toContain('END GGL-AI-TEST');
    expect(packageText).not.toContain('HISTORICAL-SNAPSHOT-EVIDENCE-ONLY');"""
)

DOC = ROOT / "docs/ai-lineage-v1.md"
replace_once(
    DOC,
    "Aşama 8.7, dış AI ile yapılan kontrollü çalışma döngüsünün hangi deterministik GGL anlık görüntüsünden hangi kanonik test önerisine ve hangi kullanıcı-onaylı alan uygulamasına geçtiğini izler.",
    "Aşama 8.7, dış AI ile yapılan kontrollü çalışma döngüsünün hangi deterministik GGL anlık görüntüsünden hangi kanonik test önerisine ve hangi kullanıcı-onaylı alan uygulamasına geçtiğini izler. Aşama 8.9 aynı v1 lineage kaydına geriye uyumlu, opsiyonel deterministik analiz snapshot kanıtı ekler."
)
replace_once(
    DOC,
    "- `canonicalTestSha256`: kontrollü önizlemeye aktarılan kanonik test bloğunun SHA-256 özeti",
    "- `canonicalTestSha256`: kontrollü önizlemeye aktarılan kanonik test bloğunun SHA-256 özeti\n- `analysisSnapshot` *(Aşama 8.9, opsiyonel)*: dış AI yanıtı değil, GGL'nin kendisinin ürettiği exact `GGL-AI-ANALYSIS` paket metni. Eski v1 kayıtlarında bulunmayabilir."
)
replace_once(
    DOC,
    "Çevrimdışı HTML raporu AI takip kaydının kaynak deney kimliğini ve iki SHA-256 özetini gösterir. Sonraki `GGL-AI-ANALYSIS` paketinde yalnız hash tabanlı lineage özeti bulunur; önceki dış AI yanıtı veya kanonik test metni pakete tekrar gömülmez.",
    "Çevrimdışı HTML raporu AI takip kaydının kaynak deney kimliğini ve iki SHA-256 özetini gösterir. Sonraki `GGL-AI-ANALYSIS` paketinde yalnız hash tabanlı lineage özeti bulunur; tarihsel analiz snapshot metni, önceki dış AI yanıtı veya kanonik test metni pakete tekrar gömülmez. Snapshot yalnız yerel/portable provenance kanıtıdır."
)
DOC.write_text(DOC.read_text(encoding="utf-8") + """

## Aşama 8.9 · immutable deterministik analiz snapshot kanıtı

Yeni `ai-follow-up` kayıtlarında, GGL'nin dış AI'ye kopyalanmak üzere kendisinin ürettiği exact `GGL-AI-ANALYSIS` paketi `analysisSnapshot` içinde saklanır. Aynı exact metnin SHA-256 özeti zaten `analysisSha256` alanındadır. Böylece kaynak deney daha sonra değişse veya silinse bile tarihsel analiz paketi bağımsız olarak doğrulanabilir.

- Snapshot dış AI'nin cevabı değildir ve AI tarafından üretilmiş prose saklanmaz.
- Snapshot paket header'ı, paket sürümü, `generated_at_utc` zamanı ve kapanış satırı fail-closed persistence parserında doğrulanır.
- Snapshot boyutu savunmacı olarak sınırlandırılır.
- Snapshot varsa doğrulayıcı önce onu kullanır; hash veya yapısal bağ uyuşmazsa sonuç `UYUŞMAZLIK` olur.
- Snapshot bulunmayan eski v1 lineage kayıtları Aşama 8.8 kaynak-deneyi-yeniden-üretme davranışını aynen sürdürür ve kaynak kaybolmuş/değişmişse `KISMİ DOĞRULAMA` gösterebilir.
- Sonraki AI paketlerine snapshot metni taşınmaz; yalnız mevcut hash/provenans özeti aktarılır.

Bu genişletme lineage `v1` için geriye uyumludur: yeni alan opsiyoneldir ve eski portable/local kayıtlar okunmaya devam eder.
""", encoding="utf-8")

PLAYBOOK = ROOT / "docs/ai-development.md"
replace_once(
    PLAYBOOK,
    """  → yeni deney
  → SHA-256 lineage
  → yerel lineage doğrulama""",
    """  → yeni deney
  → SHA-256 lineage + deterministik GGL-AI-ANALYSIS snapshot kanıtı
  → yerel lineage doğrulama"""
)

print("AI lineage Stage 8.9 snapshot evidence applied successfully.")
print("Updated:")
for path in (
    LINEAGE,
    VERIFICATION,
    PORTABLE,
    WORKFLOW,
    DIALOG,
    TEST_LINEAGE,
    TEST_VERIFY,
    TEST_PERSIST,
    DOC,
    PLAYBOOK,
):
    print(f"  - {path.relative_to(ROOT)}")
