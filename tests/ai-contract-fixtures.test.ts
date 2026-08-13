import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseAiTestSpec } from '../src/shared/ai-test-spec';
import { extractCanonicalAiTestBlock } from '../src/shared/ai-workflow';

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'ai-contracts');

function fixture(name: string): string {
  return readFileSync(join(fixtureDir, name), 'utf-8');
}

describe('GGL AI contract fixture corpus', () => {
  for (const name of ['valid-target-visibility.txt', 'valid-shadow.txt', 'valid-stellar.txt']) {
    it(`accepts canonical valid fixture: ${name}`, () => {
      const extraction = extractCanonicalAiTestBlock(fixture(name));
      expect(extraction.status).toBe('found');
      if (extraction.status !== 'found') return;
      const parsed = parseAiTestSpec(extraction.block);
      expect(parsed.detected).toBe(true);
      expect(parsed.candidates.length).toBeGreaterThan(0);
      expect(parsed.candidates.every((candidate) => candidate.status === 'found')).toBe(true);
    });
  }

  it('rejects multiple canonical blocks instead of choosing one', () => {
    expect(extractCanonicalAiTestBlock(fixture('invalid-multiple-blocks.txt')).status).toBe('ambiguous');
  });

  it('rejects a block with no end marker', () => {
    expect(extractCanonicalAiTestBlock(fixture('invalid-missing-end.txt')).status).toBe('missing');
  });

  it('marks unsupported or out-of-range values for review instead of applying them', () => {
    const extraction = extractCanonicalAiTestBlock(fixture('invalid-values.txt'));
    expect(extraction.status).toBe('found');
    if (extraction.status !== 'found') return;
    const parsed = parseAiTestSpec(extraction.block);
    expect(parsed.detected).toBe(true);
    expect(parsed.candidates.some((candidate) => candidate.status === 'review')).toBe(true);
    expect(parsed.candidates.filter((candidate) => candidate.status === 'review').length).toBeGreaterThanOrEqual(4);
  });

  it('does not silently map an unknown key into an application field', () => {
    const extraction = extractCanonicalAiTestBlock(fixture('invalid-unknown-key.txt'));
    expect(extraction.status).toBe('found');
    if (extraction.status !== 'found') return;
    const parsed = parseAiTestSpec(extraction.block);
    expect(parsed.candidates.map((candidate) => candidate.fieldId)).toEqual(['scenarioId']);
    expect(parsed.notes.some((note) => note.includes('tanınmıyor'))).toBe(true);
  });
});
