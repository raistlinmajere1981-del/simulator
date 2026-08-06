from pathlib import Path

portable_path = Path('src/shared/portable.ts')
portable = portable_path.read_text(encoding='utf-8')
old = "  if (value.kind === 'csv') {"
new = "  if (value.kind === 'csv' || value.kind === undefined) {"
if portable.count(old) != 1:
    raise RuntimeError(f'Expected one CSV source discriminator, found {portable.count(old)}')
portable_path.write_text(portable.replace(old, new, 1), encoding='utf-8')

test_path = Path('tests/portable.test.ts')
test = test_path.read_text(encoding='utf-8')
old_setup = """    const legacySource = { ...savedExperimentFixture.terrainProfileSource } as Record<string, unknown>;
    delete legacySource.appliedRouteDistance;
"""
new_setup = """    const legacySource = { ...savedExperimentFixture.terrainProfileSource } as Record<string, unknown>;
    delete legacySource.kind;
    delete legacySource.appliedRouteDistance;
"""
if test.count(old_setup) != 1:
    raise RuntimeError(f'Expected one v5 legacy source setup, found {test.count(old_setup)}')
test = test.replace(old_setup, new_setup, 1)
old_assertion = """    expect(parsed.sourceVersion).toBe(5);
    expect(parsed.experiment.terrainProfileSource?.appliedRouteDistance).toBe(false);
"""
new_assertion = """    expect(parsed.sourceVersion).toBe(5);
    expect(parsed.experiment.terrainProfileSource?.kind).toBe('csv');
    expect(parsed.experiment.terrainProfileSource?.appliedRouteDistance).toBe(false);
"""
if test.count(old_assertion) != 1:
    raise RuntimeError(f'Expected one v5 migration assertion block, found {test.count(old_assertion)}')
test_path.write_text(test.replace(old_assertion, new_assertion, 1), encoding='utf-8')
