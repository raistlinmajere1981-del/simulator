from pathlib import Path

path = Path('src/shared/portable.ts')
text = path.read_text()
old = """function parseSavedExperiment(value: unknown, allowLegacyInputs: boolean): SavedExperiment | null {\n  if (!isRecord(value)) return null;\n  const inputs = parseSimulatorInputs(value.inputs, allowLegacyInputs);\n  if (!inputs || !isNonEmptyString(value.id) || !isNonEmptyString(value.name) ||\n    !isIsoDate(value.createdAtIso) || !isIsoDate(value.updatedAtIso) ||\n    (value.observedAtIso !== undefined && !isIsoDate(value.observedAtIso)) ||\n    (value.observationUtcOffsetMinutes !== undefined &&\n      (!Number.isInteger(value.observationUtcOffsetMinutes) ||\n        value.observationUtcOffsetMinutes < -720 || value.observationUtcOffsetMinutes > 840)) ||\n    !isRecord(value.modelVersions) ||"""
new = """function parseSavedExperiment(value: unknown, allowLegacyInputs: boolean): SavedExperiment | null {\n  if (!isRecord(value)) return null;\n  let observationUtcOffsetMinutes: number | undefined;\n  if (value.observationUtcOffsetMinutes !== undefined) {\n    if (!isFiniteNumber(value.observationUtcOffsetMinutes) ||\n      !Number.isInteger(value.observationUtcOffsetMinutes) ||\n      value.observationUtcOffsetMinutes < -720 ||\n      value.observationUtcOffsetMinutes > 840) return null;\n    observationUtcOffsetMinutes = value.observationUtcOffsetMinutes;\n  }\n  const inputs = parseSimulatorInputs(value.inputs, allowLegacyInputs);\n  if (!inputs || !isNonEmptyString(value.id) || !isNonEmptyString(value.name) ||\n    !isIsoDate(value.createdAtIso) || !isIsoDate(value.updatedAtIso) ||\n    (value.observedAtIso !== undefined && !isIsoDate(value.observedAtIso)) ||\n    !isRecord(value.modelVersions) ||"""
if old not in text:
    raise RuntimeError('portable validation anchor missing')
text = text.replace(old, new, 1)
old = """    ...(value.observationUtcOffsetMinutes === undefined\n      ? {}\n      : { observationUtcOffsetMinutes: value.observationUtcOffsetMinutes }),"""
new = """    ...(observationUtcOffsetMinutes === undefined\n      ? {}\n      : { observationUtcOffsetMinutes }),"""
if old not in text:
    raise RuntimeError('portable normalized offset anchor missing')
path.write_text(text.replace(old, new, 1))
Path('scripts/fix_stage_6_1_portable.py').unlink(missing_ok=True)
Path('.github/workflows/fix-stage-6-1-portable.yml').unlink(missing_ok=True)
