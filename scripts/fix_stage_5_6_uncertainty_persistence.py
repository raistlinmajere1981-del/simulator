from pathlib import Path

path = Path('src/renderer/src/AppNext.tsx')
text = path.read_text()
old = """  const modelUncertaintyReady = !modelInputUncertaintyDefined || (\n    !isAngularUncertaintyCalculating &&"""
new = """  const modelUncertaintyReady = !photoCalibrationRecord || !modelInputUncertaintyDefined || (\n    !isAngularUncertaintyCalculating &&"""
if old not in text:
    raise RuntimeError('modelUncertaintyReady anchor missing')
text = text.replace(old, new, 1)
old = """      ...(photoCalibration && modelInputUncertaintyDefined ? { photoModelUncertainty } : {}),"""
new = """      ...(modelInputUncertaintyDefined ? { photoModelUncertainty } : {}),"""
if old not in text:
    raise RuntimeError('save uncertainty anchor missing')
text = text.replace(old, new, 1)
path.write_text(text)

Path('scripts/fix_stage_5_6_uncertainty_persistence.py').unlink(missing_ok=True)
Path('.github/workflows/fix-stage-5-6-uncertainty-persistence.yml').unlink(missing_ok=True)
