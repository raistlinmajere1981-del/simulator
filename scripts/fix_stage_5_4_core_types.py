from pathlib import Path

p = Path('src/shared/portable.ts')
s = p.read_text()
for name in ['horizontalFovDeg','verticalFovDeg','focalLengthMm','sensorWidthMm','sensorHeightMm','principalPointXPx','principalPointYPx','surfaceDistanceM','observerEyeHeightM','observerGroundElevationM','targetHeightM','targetGroundElevationM','refractionCoefficient']:
    s = s.replace(f"...({name} === undefined ? {{}} : {{ {name} }})", f"...(typeof {name} === 'number' ? {{ {name} }} : {{}})")
p.write_text(s)

p = Path('src/simulation/photo-calibration.ts')
s = p.read_text()
s = s.replace('  const markUncertainty = uncertaintyEnvelope(\n', '  const markEnvelope = uncertaintyEnvelope(\n', 1)
s = s.replace('    markUncertainty,\n    cameraUncertainty,\n', '    markEnvelope,\n    cameraUncertainty,\n', 1)
s = s.replace('    markUncertainty,\n    cameraUncertainty,\n    uncertainty\n  };', '    markUncertainty: markEnvelope,\n    cameraUncertainty,\n    uncertainty\n  };', 1)
p.write_text(s)

Path('scripts/fix_stage_5_4_core_types.py').unlink(missing_ok=True)
Path('.github/workflows/fix-stage-5-4-core-types.yml').unlink(missing_ok=True)
