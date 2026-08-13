import { describe, expect, it } from 'vitest';
import { translate } from '../src/renderer/src/i18n';
import {
  extractCanonicalAiTestBlock,
  GGL_AI_TEST_HEADER,
  type AiTestExtractionReason
} from '../src/shared/ai-workflow';

describe('AI dialogs and help-shell localization', () => {
  it('localizes AI workflow and help chrome', () => {
    expect(translate('tr', 'ai.workflow.title')).toBe('AI Çalışma Döngüsü');
    expect(translate('en', 'ai.workflow.title')).toBe('AI Workflow');
    expect(translate('en', 'ai.lineage.status.verified')).toBe('FULLY VERIFIED');
    expect(translate('en', 'help.panelButton')).toBe('Help for this panel');
    expect(translate('en', 'help.section.assumptions')).toBe('Assumptions and limits');
  });

  it('localizes extraction feedback through stable reason codes', () => {
    const cases: Array<[string, AiTestExtractionReason]> = [
      ['', 'empty'],
      ['plain prose', 'missing-header'],
      ['GGL-AI-TEST v1\nname: one', 'missing-end'],
      [
        'GGL-AI-TEST v1\nname: one\nEND GGL-AI-TEST\n' +
          'GGL-AI-TEST v1\nname: two\nEND GGL-AI-TEST',
        'multiple-headers'
      ],
      [
        'GGL-AI-TEST v1\nname: one\nEND GGL-AI-TEST\nEND GGL-AI-TEST',
        'multiple-ends'
      ],
      ['GGL-AI-TEST v1\nname: one\nEND GGL-AI-TEST', 'found']
    ];

    for (const [text, reason] of cases) {
      expect(extractCanonicalAiTestBlock(text).reason).toBe(reason);
    }

    expect(translate('en', 'ai.workflow.extraction.missingEnd'))
      .toContain('END GGL-AI-TEST');
  });

  it('keeps canonical AI protocol markers language-invariant', () => {
    expect(GGL_AI_TEST_HEADER).toBe('GGL-AI-TEST v1');

    const block = 'GGL-AI-TEST v1\nname: invariant\nEND GGL-AI-TEST';
    const result = extractCanonicalAiTestBlock(block);
    expect(result.status).toBe('found');
    if (result.status !== 'found') throw new Error('expected found');
    expect(result.block).toBe(block);
  });
});
