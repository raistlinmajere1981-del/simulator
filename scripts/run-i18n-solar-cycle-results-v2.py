#!/usr/bin/env python3
"""Repair the temporary solar-cycle localization helper anchor, then run it.

Temporary helper: remove before merge.
"""
from pathlib import Path
import runpy

ROOT = Path(__file__).resolve().parents[1]
HELPER = ROOT / 'scripts/apply-i18n-solar-cycle-results.py'
RUNNER = ROOT / 'scripts/run-i18n-solar-cycle-results.py'

old = (
    'These times are not official C1–C4 contacts. A 5-minute coarse scan is followed by '
    'approximately 1-second numerical boundary refinement. Besselian elements, lunar-limb '
    'topography, atmospheric refraction and high-precision JPL ephemerides are not applied.'
)
new = (
    'These times are not official C1–C4 contacts. A 5-minute coarse scan is followed by '
    'numerical boundary refinement to about 1 second. Besselian elements, lunar-limb topography, '
    'atmospheric refraction and high-precision JPL ephemerides are not applied.'
)

text = HELPER.read_text(encoding='utf-8')
count = text.count(old)
if count != 2:
    raise SystemExit(f'Expected the stale English eclipse anchor twice in helper, found {count}.')
HELPER.write_text(text.replace(old, new), encoding='utf-8')

runpy.run_path(str(RUNNER), run_name='__main__')
