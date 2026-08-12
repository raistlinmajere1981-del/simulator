#!/usr/bin/env python3
"""Run the photo calibration refactor helper with corrected post-import indices."""

from pathlib import Path

helper = Path(__file__).with_name("apply-photo-calibration-refactor.py")
source = helper.read_text(encoding="utf-8")
old = """# Remove moved helper definitions.\ntext = text[:helper_start] + text[status_start:]\n"""
new = """# Remove moved helper definitions. Import rewrites above change source offsets,\n# so refresh the section boundaries before slicing.\nhelper_start = text.index(\"type MarkKey = keyof PhotoCalibrationMarks;\")\nstatus_start = text.index(\"interface PhotoSessionStatus {\")\ntext = text[:helper_start] + text[status_start:]\n"""
if source.count(old) != 1:
    raise SystemExit("ERROR: helper patch marker changed")
patched = source.replace(old, new, 1)
namespace = {
    "__name__": "__main__",
    "__file__": str(helper),
}
exec(compile(patched, str(helper), "exec"), namespace)
