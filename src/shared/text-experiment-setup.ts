import { parseAiTestSpec } from './ai-test-spec';
import { addManualFreeTextCandidates } from './text-experiment-setup-manual-parser';
import { collapseConflicts, normalizeText } from './text-experiment-setup-parser-core';
import type { RawCandidate } from './text-experiment-setup-parser-core';
import { TEXT_EXPERIMENT_SETUP_PARSER_VERSION } from './text-experiment-setup-types';
import type { ExperimentSetupDraft } from './text-experiment-setup-types';

export * from './text-experiment-setup-types';
export { buildExperimentSetupApplication } from './text-experiment-setup-application';

export function parseExperimentSetupText(sourceText: string): ExperimentSetupDraft {
  const text = normalizeText(sourceText);
  const lower = text.toLocaleLowerCase('tr-TR');
  const raw: RawCandidate[] = [];
  const notes: string[] = [];
  const aiSpec = parseAiTestSpec(text);
  raw.push(...aiSpec.candidates);
  notes.push(...aiSpec.notes);

  addManualFreeTextCandidates(raw, text, lower);

  const candidates = collapseConflicts(raw);
  const foundCoordinates = candidates.some((candidate) => candidate.status === 'found' &&
    (candidate.fieldId === 'observerCoordinates' || candidate.fieldId === 'targetCoordinates'));
  if (foundCoordinates) notes.push('Koordinat alanı uygulanırsa mesafe kaynağı otomatik olarak WGS84 koordinat moduna alınır.');
  if (candidates.length === 0 && sourceText.trim() !== '') {
    notes.push('Mevcut deterministik ayrıştırıcı bu metinde güvenle eşleyebileceği bir deney alanı bulamadı.');
  }

  return {
    sourceText,
    parserVersion: TEXT_EXPERIMENT_SETUP_PARSER_VERSION,
    candidates,
    notes
  };
}
