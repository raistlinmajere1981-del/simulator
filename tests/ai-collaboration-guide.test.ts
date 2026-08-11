import { describe, expect, it } from 'vitest';
import {
  GGL_AI_ANALYSIS_SYSTEM_PROMPT_V1,
  GGL_AI_TEST_AUTHORING_PROMPT_V1,
  createGglAiGuideBundle
} from '../src/shared/ai-collaboration-guide';

describe('GGL AI collaboration guide', () => {
  it('analysis prompt preserves status, scope and uncertainty rules', () => {
    expect(GGL_AI_ANALYSIS_SYSTEM_PROMPT_V1).toContain('scope.*');
    expect(GGL_AI_ANALYSIS_SYSTEM_PROMPT_V1).toContain('compatible, incompatible, indeterminate, unsupported');
    expect(GGL_AI_ANALYSIS_SYSTEM_PROMPT_V1).toContain('Eksik veriyi uydurma');
    expect(GGL_AI_ANALYSIS_SYSTEM_PROMPT_V1).toContain('GGL-AI-COMPARISON v1');
  });

  it('test authoring prompt requires exactly one canonical test block and supported keys', () => {
    expect(GGL_AI_TEST_AUTHORING_PROMPT_V1).toContain('tam olarak bir adet');
    expect(GGL_AI_TEST_AUTHORING_PROMPT_V1).toContain('GGL-AI-TEST v1');
    expect(GGL_AI_TEST_AUTHORING_PROMPT_V1).toContain('END GGL-AI-TEST');
    expect(GGL_AI_TEST_AUTHORING_PROMPT_V1).toContain('observer.coordinates');
    expect(GGL_AI_TEST_AUTHORING_PROMPT_V1).toContain('eclipse.search_half_window_hours');
  });

  it('combined guide keeps both roles and the controlled feedback loop', () => {
    const guide = createGglAiGuideBundle();
    expect(guide).toMatch(/^GGL-AI-COLLABORATION-GUIDE v1/m);
    expect(guide).toContain('ANALYSIS_ASSISTANT BEGIN');
    expect(guide).toContain('TEST_AUTHORING_ASSISTANT BEGIN');
    expect(guide).toContain('AI hiçbir zaman GGL hesap motorunun veya kullanıcı onayının yerine geçmez.');
    expect(guide).toContain('END GGL-AI-COLLABORATION-GUIDE');
  });
});
