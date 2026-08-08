from pathlib import Path

path = Path('src/renderer/src/PhotoCalibrationControl.tsx')
text = path.read_text()
anchor = """    const principalPointXPx = finiteDraftNumber(draft.principalPointXPx);\n    const principalPointYPx = finiteDraftNumber(draft.principalPointYPx);\n    const calibration = draft.calibrationSource === 'field-of-view'"""
replacement = """    const principalPointXPx = finiteDraftNumber(draft.principalPointXPx);\n    const principalPointYPx = finiteDraftNumber(draft.principalPointYPx);\n    const cameraUncertainty = cameraUncertaintyFromDraft(draft);\n    const calibration = draft.calibrationSource === 'field-of-view'"""
if anchor not in text:
    raise RuntimeError('saveCalibration anchor missing')
path.write_text(text.replace(anchor, replacement, 1))
Path('scripts/fix_stage_5_4_camera_save.py').unlink(missing_ok=True)
Path('.github/workflows/fix-stage-5-4-camera-save.yml').unlink(missing_ok=True)
