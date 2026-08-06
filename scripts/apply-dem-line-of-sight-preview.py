from pathlib import Path
from runpy import run_path

run_path('scripts/apply-geoid-ui.py', run_name='__main__')

for temporary in (
    Path('scripts/apply-geoid-ui.py'),
    Path('.github/workflows/apply-geoid-ui.yml')
):
    temporary.unlink(missing_ok=True)
