from pathlib import Path

path = Path('src/shared/text-experiment-setup.ts')
text = path.read_text()

old = """    const found = candidates.filter((candidate) => candidate.status === 'found');
    const signatures = new Set(found.map((candidate) =>
      candidate.numericValue !== undefined
        ? `n:${candidate.numericValue}`
        : candidate.latitudeDeg !== undefined && candidate.longitudeDeg !== undefined
          ? `c:${candidate.latitudeDeg},${candidate.longitudeDeg}`
          : `s:${candidate.stringValue ?? candidate.displayValue}`
    ));
    if (signatures.size > 1) {
      collapsed.push({
        id: `${fieldId}-${sequence++}`,
        fieldId,
        label: candidates[0]?.label ?? fieldId,
        status: 'review',
        displayValue: found.map((candidate) => candidate.displayValue).join(' / '),
        sourceExcerpt: found.map((candidate) => candidate.sourceExcerpt).join(' | '),
        reason: 'Aynı alan için birbiriyle çelişen birden fazla değer bulundu.'
      });
      continue;
    }
    const best = found[0] ?? candidates[0];
"""
new = """    const found = candidates.filter((candidate) => candidate.status === 'found');
    const review = candidates.filter((candidate) => candidate.status === 'review');
    const signatures = new Set(found.map((candidate) =>
      candidate.numericValue !== undefined
        ? `n:${candidate.numericValue}`
        : candidate.latitudeDeg !== undefined && candidate.longitudeDeg !== undefined
          ? `c:${candidate.latitudeDeg},${candidate.longitudeDeg}`
          : `s:${candidate.stringValue ?? candidate.displayValue}`
    ));
    if (signatures.size > 1 || (found.length > 0 && review.length > 0)) {
      collapsed.push({
        id: `${fieldId}-${sequence++}`,
        fieldId,
        label: candidates[0]?.label ?? fieldId,
        status: 'review',
        displayValue: candidates.map((candidate) => candidate.displayValue).join(' / '),
        sourceExcerpt: candidates.map((candidate) => candidate.sourceExcerpt).join(' | '),
        reason: signatures.size > 1
          ? 'Aynı alan için birbiriyle çelişen birden fazla değer bulundu.'
          : 'Aynı alan için hem birimli hem de eksik/şüpheli bir ifade bulundu; kullanıcı kontrolü gerekli.'
      });
      continue;
    }
    const best = found[0] ?? review[0] ?? candidates[0];
"""
if old not in text:
    raise SystemExit('collapse anchor missing')
text = text.replace(old, new, 1)

old = """    regex: new RegExp(String.raw`(?:yüzey\\s+mesafesi|mesafe|hedef)[^\\n.!?]{0,25}?(?<value>${NUM})\\s*(?<unit>${LENGTH_UNIT})\\s*(?:uzakta|mesafede)?`, 'giu'),
"""
new = """    regex: new RegExp(String.raw`(?:(?:yüzey\\s+mesafesi|mesafe)\\s*[:=]?\\s*|hedef\\s+(?:yaklaşık\\s+)?)(?<value>${NUM})\\s*(?<unit>${LENGTH_UNIT})(?:\\s+(?:uzakta|mesafede))?`, 'giu'),
"""
if old not in text:
    raise SystemExit('distance regex anchor missing')
text = text.replace(old, new, 1)

text = text.replace("[^\\n.!?]{0,18}?(?<value>${NUM})", "[^\\n.!?]{0,60}?(?<value>${NUM})", 1)
text = text.replace("(?<ns>[NK])", "(?<ns>[NKG])", 1)
text = text.replace("(?<ew>[EDB])", "(?<ew>[EDBW])", 1)
text = text.replace("if (ew === 'B') lon *= -1;", "if (ew === 'B' || ew === 'W') lon *= -1;", 1)

path.write_text(text)
Path('scripts/fix_stage_5_6_parser.py').unlink(missing_ok=True)
Path('.github/workflows/fix-stage-5-6-parser.yml').unlink(missing_ok=True)
