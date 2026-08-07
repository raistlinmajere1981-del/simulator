from pathlib import Path

path = Path('src/shared/portable.ts')
text = path.read_text()
old = """  const atmosphere = value.atmosphere === undefined
    ? undefined
    : parseAtmosphereExperimentState(value.atmosphere);
  if (value.atmosphere !== undefined && !atmosphere) return null;
"""
new = """  const atmosphere = value.atmosphere === undefined
    ? undefined
    : parseAtmosphereExperimentState(value.atmosphere);
  if (atmosphere === null) return null;
"""
if old not in text:
    if new in text:
        raise SystemExit(0)
    raise SystemExit('atmosphere narrowing anchor not found')
path.write_text(text.replace(old, new, 1))
