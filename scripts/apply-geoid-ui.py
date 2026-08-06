from pathlib import Path

APP = Path('src/renderer/src/AppNext.tsx')
text = APP.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly one match, found {count}')
    text = text.replace(old, new, 1)


replace_once(
    "import {\n  MultiPointTerrainEditor,\n  type TerrainProfileImportOptions\n} from './MultiPointTerrainEditor';\n",
    "import {\n  MultiPointTerrainEditor,\n  type TerrainProfileImportOptions\n} from './MultiPointTerrainEditor';\nimport { GeoidConversionControl } from './GeoidConversionControl';\n",
    'component import'
)

replace_once(
    "  onNumberChange,\n  onPointsChange,\n  onApplyImport\n}: {",
    "  onNumberChange,\n  onPointsChange,\n  onApplyGeoidConversion,\n  onApplyImport\n}: {",
    'TerrainPanel destructuring'
)

replace_once(
    "  onNumberChange(key: NumericInputKey, value: number): void;\n  onPointsChange(points: ManualTerrainPoint[]): void;\n  onApplyImport(\n",
    "  onNumberChange(key: NumericInputKey, value: number): void;\n  onPointsChange(points: ManualTerrainPoint[]): void;\n  onApplyGeoidConversion(\n    targetDatum: VerticalDatumKind,\n    observerGroundElevationM: number,\n    targetGroundElevationM: number,\n    points: ManualTerrainPoint[]\n  ): void;\n  onApplyImport(\n",
    'TerrainPanel callback type'
)

replace_once(
    "      <p className=\"terrain-summary\">\n        {datumLabels[inputs.verticalDatumKind]} · ofset {numberFormatter.format(inputs.verticalDatumOffsetM)} m · gözlemci mutlak göz kotu {numberFormatter.format(inputs.observerGroundElevationM + inputs.verticalDatumOffsetM + inputs.observerHeightM)} m · hedef tepe kotu {numberFormatter.format(inputs.targetGroundElevationM + inputs.verticalDatumOffsetM + inputs.targetHeightM)} m\n        {terrainEnabled && ` · ${points.length} ara nokta · ${numberFormatter.format(effectiveDistanceKm)} km rota`}\n      </p>\n\n      {source && (",
    "      <p className=\"terrain-summary\">\n        {datumLabels[inputs.verticalDatumKind]} · ofset {numberFormatter.format(inputs.verticalDatumOffsetM)} m · gözlemci mutlak göz kotu {numberFormatter.format(inputs.observerGroundElevationM + inputs.verticalDatumOffsetM + inputs.observerHeightM)} m · hedef tepe kotu {numberFormatter.format(inputs.targetGroundElevationM + inputs.verticalDatumOffsetM + inputs.targetHeightM)} m\n        {terrainEnabled && ` · ${points.length} ara nokta · ${numberFormatter.format(effectiveDistanceKm)} km rota`}\n      </p>\n\n      <GeoidConversionControl\n        currentDatum={inputs.verticalDatumKind}\n        observerGroundElevationM={inputs.observerGroundElevationM}\n        targetGroundElevationM={inputs.targetGroundElevationM}\n        points={points}\n        onApply={onApplyGeoidConversion}\n      />\n\n      {source && (",
    'control render'
)

replace_once(
    "  const updateTerrainPoints = (points: ManualTerrainPoint[]): void => {\n    setManualTerrainPoints(points);\n    markTerrainSourceModified();\n    setIsDirty(true);\n  };\n\n  const handleNumberChange",
    "  const updateTerrainPoints = (points: ManualTerrainPoint[]): void => {\n    setManualTerrainPoints(points);\n    markTerrainSourceModified();\n    setIsDirty(true);\n  };\n\n  const applyGeoidConversion = (\n    targetDatum: VerticalDatumKind,\n    observerGroundElevationM: number,\n    targetGroundElevationM: number,\n    points: ManualTerrainPoint[]\n  ): void => {\n    setInputs((current) => ({\n      ...current,\n      verticalDatumKind: targetDatum,\n      observerGroundElevationM,\n      targetGroundElevationM\n    }));\n    setManualTerrainPoints(points);\n    markTerrainSourceModified();\n    setIsDirty(true);\n    setStorageMessage(\n      `Bütün zemin ve arazi kotları ${datumLabels[targetDatum]} datumuna dönüştürüldü.`\n    );\n  };\n\n  const handleNumberChange",
    'application handler'
)

replace_once(
    "            onNumberChange={handleNumberChange}\n            onPointsChange={updateTerrainPoints}\n            onApplyImport={applyTerrainImport}\n",
    "            onNumberChange={handleNumberChange}\n            onPointsChange={updateTerrainPoints}\n            onApplyGeoidConversion={applyGeoidConversion}\n            onApplyImport={applyTerrainImport}\n",
    'TerrainPanel callback prop'
)

APP.write_text(text, encoding='utf-8')
print('AppNext.tsx geoid conversion wiring applied successfully.')
