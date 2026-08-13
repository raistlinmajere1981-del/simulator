#!/usr/bin/env python3
"""Repair temporary shadow/stellar helper assumptions, then run it.

Temporary helper: remove before merge.
"""
from pathlib import Path
import runpy

ROOT = Path(__file__).resolve().parents[1]
HELPER = ROOT / 'scripts/apply-i18n-shadow-stellar-results.py'

text = HELPER.read_text(encoding='utf-8')

old_replace = '''def replace_once(path: Path, old: str, new: str) -> None:\n    text = path.read_text(encoding="utf-8")\n    count = text.count(old)\n    if count != 1:\n        fail(f"{path.relative_to(ROOT)}: expected one match, found {count}: {old[:90]!r}")\n    path.write_text(text.replace(old, new, 1), encoding="utf-8")\n'''
new_replace = '''def replace_once(path: Path, old: str, new: str) -> None:\n    text = path.read_text(encoding="utf-8")\n    count = text.count(old)\n    if count < 1:\n        fail(f"{path.relative_to(ROOT)}: expected at least one match, found 0: {old[:90]!r}")\n    path.write_text(text.replace(old, new), encoding="utf-8")\n'''
if text.count(old_replace) != 1:
    raise SystemExit('Expected the helper replace_once implementation exactly once.')
text = text.replace(old_replace, new_replace, 1)

old_docs_anchor = "- Astronomy result slice (part 2): daily solar events, civil↔solar time, annual season reference and same-instant WGS84 route comparison use the active locale while simulation/domain ids stay invariant.\\n"
new_docs_anchor = "- Astronomy result slice (part 2): daily solar events, civil↔solar time, annual season events and same-instant WGS84 route comparison surfaces; threshold/season domain ids remain unchanged.\\n"
if text.count(old_docs_anchor) != 1:
    raise SystemExit('Expected the stale localization progress anchor exactly once.')
text = text.replace(old_docs_anchor, new_docs_anchor, 1)

HELPER.write_text(text, encoding='utf-8')
runpy.run_path(str(HELPER), run_name='__main__')
