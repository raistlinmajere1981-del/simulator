from pathlib import Path

viewport_path = Path('src/renderer/src/WorldModelViewport.tsx')
viewport = viewport_path.read_text()

old = """function line(\n  points: THREE.Vector3[],\n  color: number,\n  opacity = 1\n): THREE.Line {\n  const geometry = new THREE.BufferGeometry().setFromPoints(points);\n  const material = new THREE.LineBasicMaterial({\n    color,\n    transparent: opacity < 1,\n    opacity\n  });\n  return new THREE.Line(geometry, material);\n}\n"""
new = old + """\nfunction dashedLine(\n  points: THREE.Vector3[],\n  color: number,\n  opacity = 1,\n  dashSize = 0.05,\n  gapSize = 0.035\n): THREE.Line {\n  const geometry = new THREE.BufferGeometry().setFromPoints(points);\n  const material = new THREE.LineDashedMaterial({\n    color,\n    transparent: opacity < 1,\n    opacity,\n    dashSize,\n    gapSize,\n    depthWrite: false\n  });\n  const result = new THREE.Line(geometry, material);\n  result.computeLineDistances();\n  return result;\n}\n\nfunction rayPoints(\n  points: THREE.Vector3[],\n  color: number,\n  opacity = 0.95\n): THREE.Points {\n  const geometry = new THREE.BufferGeometry().setFromPoints(points);\n  const material = new THREE.PointsMaterial({\n    color,\n    size: 0.035,\n    sizeAttenuation: true,\n    transparent: opacity < 1,\n    opacity,\n    depthWrite: false\n  });\n  return new THREE.Points(geometry, material);\n}\n\nfunction globeCameraPosition(\n  observerCoordinate: { latitudeDeg: number; longitudeDeg: number },\n  targetCoordinate: { latitudeDeg: number; longitudeDeg: number },\n  showTarget: boolean,\n  distance = 4.55\n): THREE.Vector3 {\n  const observerDirection = vector(\n    latitudeLongitudeToSpherePoint(observerCoordinate, 1)\n  ).normalize();\n  if (!showTarget) return observerDirection.multiplyScalar(distance);\n\n  const targetDirection = vector(\n    latitudeLongitudeToSpherePoint(targetCoordinate, 1)\n  ).normalize();\n  const focusDirection = observerDirection.clone().add(targetDirection);\n  if (focusDirection.lengthSq() < 1e-8) focusDirection.copy(observerDirection);\n  return focusDirection.normalize().multiplyScalar(distance);\n}\n"""
if old not in viewport:
    raise SystemExit('line helper anchor not found')
viewport = viewport.replace(old, new, 1)

old = """  const shellStride = Math.max(1, Math.ceil(samples.length / 6));\n  samples.forEach((sample, index) => {\n    if (index !== 0 && index !== samples.length - 1 && index % shellStride !== 0) return;\n    const shellRadius = radius * atmosphereVisualRadiusScale(\n      sample.altitudeM,\n      first.altitudeM,\n      last.altitudeM\n    );\n    const shell = new THREE.Mesh(\n      new THREE.SphereGeometry(shellRadius, 32, 18),\n      new THREE.MeshBasicMaterial({\n        color: 0x69d9ee,\n        wireframe: true,\n        transparent: true,\n        opacity: index === samples.length - 1 ? 0.075 : 0.032,\n        depthWrite: false\n      })\n    );\n    group.add(shell);\n  });\n"""
new = """  const lastSampleIndex = samples.length - 1;\n  const shellIndices = Array.from(new Set([\n    0,\n    Math.round(lastSampleIndex / 3),\n    Math.round(lastSampleIndex * 2 / 3),\n    lastSampleIndex\n  ]));\n  shellIndices.forEach((index) => {\n    const sample = samples[index]!;\n    const shellRadius = radius * atmosphereVisualRadiusScale(\n      sample.altitudeM,\n      first.altitudeM,\n      last.altitudeM\n    );\n    const shell = new THREE.Mesh(\n      new THREE.SphereGeometry(shellRadius, 20, 12),\n      new THREE.MeshBasicMaterial({\n        color: 0x69d9ee,\n        wireframe: true,\n        transparent: true,\n        opacity: index === lastSampleIndex ? 0.05 : 0.018,\n        depthWrite: false\n      })\n    );\n    shell.renderOrder = 1;\n    group.add(shell);\n  });\n"""
if old not in viewport:
    raise SystemExit('shell block anchor not found')
viewport = viewport.replace(old, new, 1)

old = """    const opticalPoints = visual.points.map((sample) =>\n      vector(sample.point).multiplyScalar(radius)\n    );\n    group.add(line(opticalPoints, 0x64f1df, 0.98));\n\n    if (showTarget) {\n"""
new = """    const opticalPoints = visual.points.map((sample) =>\n      vector(sample.point).multiplyScalar(radius)\n    );\n    const opticalLine = line(opticalPoints, 0x70ffe3, 1);\n    opticalLine.renderOrder = 4;\n    group.add(opticalLine);\n\n    const markerStride = Math.max(1, Math.ceil(opticalPoints.length / 34));\n    const opticalMarkers = opticalPoints.filter((_, index) =>\n      index === 0 || index === opticalPoints.length - 1 || index % markerStride === 0\n    );\n    const markerCloud = rayPoints(opticalMarkers, 0x70ffe3, 0.92);\n    markerCloud.renderOrder = 5;\n    group.add(markerCloud);\n\n    if (showTarget) {\n"""
if old not in viewport:
    raise SystemExit('optical line anchor not found')
viewport = viewport.replace(old, new, 1)

old = """      group.add(line([observerPoint, targetPoint], 0xe9f2f5, 0.62));\n"""
new = """      const geometricLine = dashedLine(\n        [observerPoint, targetPoint],\n        0xf2fbff,\n        0.9,\n        0.055,\n        0.032\n      );\n      geometricLine.renderOrder = 3;\n      group.add(geometricLine);\n"""
if old not in viewport:
    raise SystemExit('geometric line anchor not found')
viewport = viewport.replace(old, new, 1)

old = """        camera.position.set(0.8, 1.25, 4.3);\n"""
new = """        camera.position.copy(globeCameraPosition(\n          observerCoordinate,\n          targetCoordinate,\n          showTarget\n        ));\n        camera.lookAt(0, 0, 0);\n"""
if old not in viewport:
    raise SystemExit('globe camera anchor not found')
viewport = viewport.replace(old, new, 1)

viewport_path.write_text(viewport)

css_path = Path('src/renderer/src/world-model-viewport.css')
css = css_path.read_text()
old = """.world-model-legend i.geometric-ray {\n  width: 12px;\n  height: 2px;\n  border-radius: 2px;\n  color: #e9f2f5;\n  background: #e9f2f5;\n}\n"""
new = """.world-model-legend i.geometric-ray {\n  width: 12px;\n  height: 2px;\n  border-radius: 2px;\n  color: #e9f2f5;\n  background: repeating-linear-gradient(\n    90deg,\n    #e9f2f5 0 4px,\n    transparent 4px 6px\n  );\n  box-shadow: none;\n}\n"""
if old not in css:
    raise SystemExit('geometric legend anchor not found')
css_path.write_text(css.replace(old, new, 1))
