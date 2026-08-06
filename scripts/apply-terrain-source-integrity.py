from pathlib import Path
from runpy import run_path

run_path('scripts/apply-geoid-ui.py', run_name='__main__')

Path('scripts/apply-geoid-ui.py').unlink(missing_ok=True)
Path('.github/workflows/apply-geoid-ui.yml').unlink(missing_ok=True)
