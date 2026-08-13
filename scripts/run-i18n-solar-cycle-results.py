#!/usr/bin/env python3
"""Run the temporary solar-cycle localization helper and normalize local TS helper types."""
from pathlib import Path
import runpy

ROOT = Path(__file__).resolve().parents[1]
runpy.run_path(str(ROOT / 'scripts/apply-i18n-solar-cycle-results.py'), run_name='__main__')

for relative in (
    'src/renderer/src/SolarDayEventsPanel.tsx',
    'src/renderer/src/SolarTimeOffsetPanel.tsx',
):
    path = ROOT / relative
    text = path.read_text(encoding='utf-8')
    old = "import type { AppLocale, TranslationFunction } from './i18n';"
    if old not in text:
        raise SystemExit(f'{relative}: expected temporary TranslationFunction import not found')
    new = "import type { AppLocale, TranslationKey, TranslationValues } from './i18n';\n\ntype TranslationFunction = (key: TranslationKey, values?: TranslationValues) => string;"
    path.write_text(text.replace(old, new, 1), encoding='utf-8')

print('Solar-cycle localization TypeScript helper types normalized.')
