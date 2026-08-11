import { describe, expect, it } from 'vitest';
import { extractCanonicalAiTestBlock } from '../src/shared/ai-workflow';

describe('AI workflow canonical GGL-AI-TEST extraction', () => {
  it('extracts one canonical block from surrounding prose', () => {
    const result = extractCanonicalAiTestBlock(`Önce kısa analiz.\n\nGGL-AI-TEST v1\nscenario: sun-moon-observation\nname: Dallas tekrar testi\nEND GGL-AI-TEST\n\nSon not.`);
    expect(result.status).toBe('found');
    if (result.status !== 'found') throw new Error('expected found');
    expect(result.block).toBe([
      'GGL-AI-TEST v1',
      'scenario: sun-moon-observation',
      'name: Dallas tekrar testi',
      'END GGL-AI-TEST'
    ].join('\n'));
  });

  it('fails closed when the end marker is missing', () => {
    const result = extractCanonicalAiTestBlock('GGL-AI-TEST v1\nscenario: stellar-observation');
    expect(result.status).toBe('missing');
  });

  it('fails closed when more than one test block is present', () => {
    const result = extractCanonicalAiTestBlock([
      'GGL-AI-TEST v1',
      'name: one',
      'END GGL-AI-TEST',
      'GGL-AI-TEST v1',
      'name: two',
      'END GGL-AI-TEST'
    ].join('\n'));
    expect(result.status).toBe('ambiguous');
  });

  it('reports empty replies without inventing a test', () => {
    expect(extractCanonicalAiTestBlock('   ').status).toBe('empty');
  });
});
