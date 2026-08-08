from pathlib import Path

path = Path('src/shared/text-experiment-setup.ts')
text = path.read_text()
old = r"regex: new RegExp(String.raw`(?:(?:yüzey\s+mesafesi|mesafe)\s*[:=]?\s*|hedef\s+(?:yaklaşık\s+)?)(?<value>${NUM})\s*(?<unit>${LENGTH_UNIT})(?:\s+(?:uzakta|mesafede))?`, 'giu'),"
new = r"regex: new RegExp(String.raw`(?:(?:yüzey\s+mesafesi|mesafe)\s*[:=]?\s*|hedef\s+(?:yaklaşık\s+)?(?=(?:${NUM})\s*${LENGTH_UNIT}\s+(?:uzakta|mesafede)))(?<value>${NUM})\s*(?<unit>${LENGTH_UNIT})(?:\s+(?:uzakta|mesafede))?`, 'giu'),"
if old not in text:
    raise RuntimeError('distance parser anchor missing')
path.write_text(text.replace(old, new, 1))
Path('scripts/fix_stage_5_6_target_distance.py').unlink(missing_ok=True)
Path('.github/workflows/fix-stage-5-6-target-distance.yml').unlink(missing_ok=True)
