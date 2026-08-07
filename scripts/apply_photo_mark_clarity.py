from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    text = file_path.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'expected text not found in {path}: {old[:80]!r}')
    file_path.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once(
    'src/renderer/src/PhotoCalibrationControl.tsx',
    "const markShortLabels: Record<MarkKey, string> = {\n  horizonStart: 'U1',\n  horizonEnd: 'U2',\n  targetBase: 'T',\n  targetTop: 'Ü'\n};",
    "const markShortLabels: Record<MarkKey, string> = {\n  horizonStart: 'U1',\n  horizonEnd: 'U2',\n  targetBase: 'TABAN',\n  targetTop: 'TEPE'\n};"
)
replace_once(
    'src/renderer/src/PhotoCalibrationControl.tsx',
    "  const markerLabelSize = source ? Math.max(16, source.imageWidthPx * 0.024) : 24;",
    "  const markerLabelSize = source ? Math.max(14, source.imageWidthPx * 0.018) : 20;"
)
replace_once(
    'src/renderer/src/PhotoCalibrationControl.tsx',
    "      {preview ? (\n        <div",
    "      {preview && (\n        <p className=\"photo-calibration-note\">\n          Sıradaki işaret: <strong>{markLabels[selectedMark]}</strong>. Fotoğraf üzerinde ilgili noktaya tıkla;\n          seçim otomatik olarak sonraki işarete geçer.\n        </p>\n      )}\n\n      {preview ? (\n        <div"
)

replace_once(
    'src/simulation/photo-calibration.ts',
    "export const PHOTO_CALIBRATION_MODEL_VERSION = '0.1.0';",
    "export const PHOTO_CALIBRATION_MODEL_VERSION = '0.1.1';"
)
replace_once(
    'src/simulation/photo-calibration.ts',
    "  const metrics = evaluateMarks(intrinsics, input.marks);\n  const uncertainty = uncertaintyEnvelope(\n    intrinsics,\n    input.marks,\n    defaultMarkUncertaintyPx\n  );",
    "  const metrics = evaluateMarks(intrinsics, input.marks);\n  if (metrics.targetAngularHeightDeg <= 0) {\n    throw new RangeError(\n      'Hedef tepesi kalibre edilmiş referansa göre tabanın üstünde olmalı. TABAN ve TEPE işaretlerini kontrol et.'\n    );\n  }\n  const uncertainty = uncertaintyEnvelope(\n    intrinsics,\n    input.marks,\n    defaultMarkUncertaintyPx\n  );"
)
replace_once(
    'src/simulation/photo-calibration.ts',
    "  if (metrics.targetAngularHeightDeg <= 0) {\n    warnings.push('İşaretlenen hedef tepesi, kalibre edilmiş referansa göre tabandan daha yukarıda görünmüyor.');\n  }\n",
    ""
)

comparison_path = Path('src/simulation/photo-angular-comparison.ts')
comparison = comparison_path.read_text(encoding='utf-8')
comparison = comparison.replace(
    "  const observedAngularHeight = observedMetric(input.photoPrediction, 'targetAngularHeightDeg');\n  const observedBase = observedMetric(input.photoPrediction, 'targetBaseRelativeElevationDeg');",
    "  const observedAngularHeightCandidate = observedMetric(input.photoPrediction, 'targetAngularHeightDeg');\n  const photoTargetGeometryValid = observedAngularHeightCandidate === null || observedAngularHeightCandidate.value > 0;\n  const observedAngularHeight = photoTargetGeometryValid ? observedAngularHeightCandidate : null;\n  const observedBase = observedMetric(input.photoPrediction, 'targetBaseRelativeElevationDeg');"
)
comparison = comparison.replace(
    "  if (input.modelPrediction.status === 'unsupported') {\n    warnings.push(`${input.sourceModelName} bu deney için fiziksel açısal tahmin üretmedi.`);\n  } else {",
    "  if (!photoTargetGeometryValid) {\n    warnings.push('Fotoğraf hedef açısal yüksekliği pozitif değil; TABAN/TEPE işaretleri düzeltilmeden model karşılaştırması yapılmadı.');\n  } else if (input.modelPrediction.status === 'unsupported') {\n    warnings.push(`${input.sourceModelName} bu deney için fiziksel açısal tahmin üretmedi.`);\n  } else {"
)
comparison = comparison.replace(
    "  if (input.modelPrediction.status === 'unsupported') status = 'unsupported';\n  else if (channels.length === 0) status = 'indeterminate';",
    "  if (!photoTargetGeometryValid) status = 'indeterminate';\n  else if (input.modelPrediction.status === 'unsupported') status = 'unsupported';\n  else if (channels.length === 0) status = 'indeterminate';"
)
comparison_path.write_text(comparison, encoding='utf-8')

photo_test_path = Path('tests/photo-calibration.test.ts')
photo_tests = photo_test_path.read_text(encoding='utf-8')
needle = "  it('does not assume the marked line is a physical astronomical horizon', () => {"
addition = "  it('rejects inverted target base/top marks instead of persisting a negative angular height', () => {\n    const input = baseInput();\n    input.marks = {\n      ...input.marks,\n      targetBase: { xPx: 500, yPx: 400 },\n      targetTop: { xPx: 500, yPx: 600 }\n    };\n\n    expect(() => createPhotoCalibrationRecord(input)).toThrow(/TABAN ve TEPE/);\n  });\n\n"
if needle not in photo_tests:
    raise SystemExit('photo calibration test insertion point missing')
photo_test_path.write_text(photo_tests.replace(needle, addition + needle, 1), encoding='utf-8')

comparison_test_path = Path('tests/photo-angular-comparison.test.ts')
comparison_tests = comparison_test_path.read_text(encoding='utf-8')
needle = "  it('keeps unsupported cartographic predictions unsupported', () => {"
addition = "  it('does not compare a legacy photo record with non-positive target angular height', () => {\n    const invertedPhoto = prediction('photo-calibration', [\n      { key: 'targetBaseRelativeElevationDeg', value: 1.2, uncertainty: 0.1 },\n      { key: 'targetTopRelativeElevationDeg', value: -0.3, uncertainty: 0.1 },\n      { key: 'targetAngularHeightDeg', value: -1.5, uncertainty: 0.15 }\n    ]);\n    const model = prediction('defined-plane', [\n      { key: 'targetBaseElevationDeg', value: 0 },\n      { key: 'targetTopElevationDeg', value: 1.5 },\n      { key: 'targetAngularHeightDeg', value: 1.5 },\n      { key: 'hiddenHeightM', value: 0 },\n      { key: 'visibleFraction', value: 1 }\n    ]);\n\n    const result = comparePhotoAngularObservation({\n      experimentId: 'exp-1',\n      sourceModelId: 'defined-plane',\n      sourceModelName: 'Tanımlı Düzlem',\n      modelPrediction: model,\n      photoPrediction: invertedPhoto,\n      referenceKind: 'local-horizontal'\n    });\n\n    expect(result.channels).toHaveLength(0);\n    expect(result.prediction.status).toBe('indeterminate');\n    expect(result.prediction.warnings.join(' ')).toContain('TABAN/TEPE');\n  });\n\n"
if needle not in comparison_tests:
    raise SystemExit('comparison test insertion point missing')
comparison_test_path.write_text(comparison_tests.replace(needle, addition + needle, 1), encoding='utf-8')

replace_once('package.json', '"version": "1.4.1"', '"version": "1.4.2"')
replace_once("src/preload/index.ts", "version: '1.4.1'", "version: '1.4.2'")
replace_once(
    'README.md',
    "Aktif geliştirme sürümü `1.4.1`dir.",
    "Aktif geliştirme sürümü `1.4.2`dir. Fotoğraf işaretleri artık overlay üzerinde `TABAN` / `TEPE` olarak açıkça adlandırılır; tepe tabanın üstünde değilse kayıt ve model karşılaştırması engellenir."
)

# Remove the one-shot patch machinery before committing the product change.
Path('scripts/apply_photo_mark_clarity.py').unlink(missing_ok=True)
Path('.github/workflows/apply-photo-mark-clarity.yml').unlink(missing_ok=True)
