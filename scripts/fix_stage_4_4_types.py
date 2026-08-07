from pathlib import Path

path = Path('src/simulation/layered-sphere-visibility.ts')
text = path.read_text()
old = """      const middle = evaluateTargetRay(input, middleAngle, stepM, earthRadiusM, maxPathLengthM);\n      if (middle.status !== 'clear' || middle.endpointAltitudeM === null) {\n        low = { ...low, angleDeg: middleAngle };\n        continue;\n      }\n      const residual = middle.endpointAltitudeM - targetAltitudeM;\n      if (Math.abs(residual) <= 1e-5) return middle;\n      if ((low.endpointAltitudeM - targetAltitudeM) * residual <= 0) high = middle;\n      else low = middle;\n"""
new = """      const middle = evaluateTargetRay(input, middleAngle, stepM, earthRadiusM, maxPathLengthM);\n      if (middle.status !== 'clear' || middle.endpointAltitudeM === null) {\n        return null;\n      }\n      const clearMiddle = middle as RayEvaluation & { endpointAltitudeM: number };\n      const residual = clearMiddle.endpointAltitudeM - targetAltitudeM;\n      if (Math.abs(residual) <= 1e-5) return clearMiddle;\n      if ((low.endpointAltitudeM - targetAltitudeM) * residual <= 0) high = clearMiddle;\n      else low = clearMiddle;\n"""
if old not in text:
    raise SystemExit('target root block not found')
path.write_text(text.replace(old, new, 1))
