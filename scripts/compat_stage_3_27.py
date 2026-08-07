from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        if new in text:
            return text
        raise SystemExit(f'{label}: anchor not found')
    return text.replace(old, new, 1)


path = Path('src/shared/portable.ts')
text = path.read_text()
text = replace_once(
    text,
    """    updatedAtIso: value.updatedAtIso,
    scenarioId: normalizeSimulationScenarioId(value.scenarioId),
    inputs,""",
    """    updatedAtIso: value.updatedAtIso,
    ...(value.scenarioId === undefined
      ? {}
      : { scenarioId: normalizeSimulationScenarioId(value.scenarioId) }),
    inputs,""",
    'portable optional scenario field'
)
path.write_text(text)

path = Path('tests/scenario-workflows.test.ts')
text = path.read_text()
text = replace_once(
    text,
    """    const legacy = { ...saved } as Record<string, unknown>;
    delete legacy.scenarioId;
    expect(parsePortableExperimentFile(legacy).experiment.scenarioId).toBe('target-visibility');""",
    """    const legacy = { ...saved } as Record<string, unknown>;
    delete legacy.scenarioId;
    const parsedLegacy = parsePortableExperimentFile(legacy).experiment;
    expect(parsedLegacy.scenarioId).toBeUndefined();
    expect(normalizeSimulationScenarioId(parsedLegacy.scenarioId)).toBe('target-visibility');""",
    'legacy scenario test'
)
path.write_text(text)

path = Path('docs/roadmap-stage-3.27.md')
text = path.read_text()
text = text.replace(
    '- Eski kayıtlarda `scenarioId` yoksa kayıt güvenli biçimde `target-visibility` olarak yorumlanır.\n',
    '- Eski kayıtlarda olmayan `scenarioId` alanı parse sırasında uydurulmaz; uygulama açarken eksik değer güvenli biçimde `target-visibility` olarak yorumlanır.\n',
    1
)
path.write_text(text)
