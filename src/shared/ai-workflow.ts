import { GGL_AI_TEST_END, GGL_AI_TEST_HEADER } from './ai-contracts';

export { GGL_AI_TEST_END, GGL_AI_TEST_HEADER } from './ai-contracts';

export type AiTestExtractionReason =
  | 'empty'
  | 'missing-header'
  | 'multiple-headers'
  | 'missing-end'
  | 'multiple-ends'
  | 'found';

export type AiTestExtraction =
  | { status: 'empty'; reason: 'empty'; block?: undefined; message: string }
  | {
      status: 'missing';
      reason: 'missing-header' | 'missing-end';
      block?: undefined;
      message: string;
    }
  | {
      status: 'ambiguous';
      reason: 'multiple-headers' | 'multiple-ends';
      block?: undefined;
      message: string;
    }
  | { status: 'found'; reason: 'found'; block: string; message: string };

/**
 * Extract exactly one canonical GGL-AI-TEST v1 block from a free-form AI reply.
 *
 * The reply may contain prose before or after the block. Multiple canonical blocks
 * are rejected so the application never has to guess which proposed test the user
 * intended to import.
 *
 * `message` is retained for backward compatibility. Renderer localization should
 * use the stable, language-invariant `reason` code instead.
 */
export function extractCanonicalAiTestBlock(text: string): AiTestExtraction {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return {
      status: 'empty',
      reason: 'empty',
      message: 'AI yanıtı henüz yapıştırılmadı.'
    };
  }

  const headerIndexes: number[] = [];
  let searchFrom = 0;
  while (searchFrom < text.length) {
    const index = text.indexOf(GGL_AI_TEST_HEADER, searchFrom);
    if (index < 0) break;
    headerIndexes.push(index);
    searchFrom = index + GGL_AI_TEST_HEADER.length;
  }

  if (headerIndexes.length === 0) {
    return {
      status: 'missing',
      reason: 'missing-header',
      message: '`GGL-AI-TEST v1` başlangıcı bulunamadı. AI’den kanonik test bloğu üretmesini iste.'
    };
  }
  if (headerIndexes.length > 1) {
    return {
      status: 'ambiguous',
      reason: 'multiple-headers',
      message: 'Birden fazla `GGL-AI-TEST v1` bloğu bulundu. Tek bir testi seçip yeniden yapıştır.'
    };
  }

  const start = headerIndexes[0]!;
  const end = text.indexOf(GGL_AI_TEST_END, start + GGL_AI_TEST_HEADER.length);
  if (end < 0) {
    return {
      status: 'missing',
      reason: 'missing-end',
      message: '`END GGL-AI-TEST` kapanışı bulunamadı; eksik blok içe aktarılmaz.'
    };
  }

  const secondEnd = text.indexOf(GGL_AI_TEST_END, end + GGL_AI_TEST_END.length);
  if (secondEnd >= 0) {
    return {
      status: 'ambiguous',
      reason: 'multiple-ends',
      message: 'Birden fazla test kapanışı bulundu. Yanıtta yalnız tek kanonik test bloğu bırak.'
    };
  }

  const block = text.slice(start, end + GGL_AI_TEST_END.length).trim();
  return {
    status: 'found',
    reason: 'found',
    block,
    message: 'Tek GGL-AI-TEST v1 bloğu bulundu; kontrollü Metinden Hazırla önizlemesine aktarılabilir.'
  };
}
