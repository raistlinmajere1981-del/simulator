#!/usr/bin/env python3
"""Repair one repeated-button assumption in the temporary helper, then run it.

Temporary runner. Remove before merge.
"""
from pathlib import Path
import runpy

ROOT = Path(__file__).resolve().parents[1]
HELPER = ROOT / 'scripts/apply-i18n-stellar-source-controls.py'

text = HELPER.read_text(encoding='utf-8')
old = "    ('>Geri al</button>', \">{t('stellar.motion.revert')}</button>\"),\n"
new = "    ('className=\"stellar-motion-revert\"\\n              disabled={!motionSourceDirty}\\n              type=\"button\"\\n              onClick={() => { setDraftMotionSource(cloneMotionSource(stellarMotionSource)); setMotionImportMessage(\'\'); }}\\n            >Geri al</button>', 'className=\"stellar-motion-revert\"\\n              disabled={!motionSourceDirty}\\n              type=\"button\"\\n              onClick={() => { setDraftMotionSource(cloneMotionSource(stellarMotionSource)); setMotionImportMessage(\'\'); }}\\n            >{t(\'stellar.motion.revert\')}</button>'),\n"
if text.count(old) != 1:
    raise SystemExit('Expected the temporary helper revert-button replacement exactly once.')
HELPER.write_text(text.replace(old, new, 1), encoding='utf-8')
runpy.run_path(str(HELPER), run_name='__main__')
