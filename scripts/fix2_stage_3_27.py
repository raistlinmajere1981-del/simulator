from pathlib import Path

path = Path('src/renderer/src/AppNext.tsx')
text = path.read_text()
old = """    if (activeScenarioId === 'horizon') {
      return {
        id: activeExperimentId,
        title: activeExperimentName || `Etkileşimli ${scenario.label.toLocaleLowerCase('tr-TR')} deneyi`,
        type: 'horizon',
        observer,
        observedAtIso: experimentObservedAtIso,
        measurements: {}
      };
    }

    return {
      id: activeExperimentId,
      title: activeExperimentName || `Etkileşimli ${scenario.label.toLocaleLowerCase('tr-TR')} deneyi`,
      type: 'target-visibility',
      observer,
      target: {
        label: 'Hedef',
        latitudeDeg: inputs.targetLatitudeDeg,
        longitudeDeg: inputs.targetLongitudeDeg,
        elevationM: inputs.targetGroundElevationM + inputs.verticalDatumOffsetM,
        heightM: inputs.targetHeightM
      },
      terrainProfile,
      observedAtIso: experimentObservedAtIso,
      measurements: {
        surfaceDistanceM: { value: effectiveDistanceKm * 1_000, uncertainty: inputs.distanceSource === 'coordinates' ? 0.01 : 20, unit: 'm' },
        visibleFraction: { value: inputs.observedVisiblePercent / 100, uncertainty: inputs.observationUncertaintyPercent / 100, unit: 'fraction' }
      }
    };"""
new = """    if (activeScenarioId === 'horizon') {
      const horizonExperiment: ExperimentDefinition = {
        id: activeExperimentId,
        title: activeExperimentName || `Etkileşimli ${scenario.label.toLocaleLowerCase('tr-TR')} deneyi`,
        type: 'horizon',
        observer,
        observedAtIso: experimentObservedAtIso,
        measurements: {}
      };
      return horizonExperiment;
    }

    const targetExperiment: ExperimentDefinition = {
      id: activeExperimentId,
      title: activeExperimentName || `Etkileşimli ${scenario.label.toLocaleLowerCase('tr-TR')} deneyi`,
      type: 'target-visibility',
      observer,
      target: {
        label: 'Hedef',
        latitudeDeg: inputs.targetLatitudeDeg,
        longitudeDeg: inputs.targetLongitudeDeg,
        elevationM: inputs.targetGroundElevationM + inputs.verticalDatumOffsetM,
        heightM: inputs.targetHeightM
      },
      terrainProfile,
      observedAtIso: experimentObservedAtIso,
      measurements: {
        surfaceDistanceM: { value: effectiveDistanceKm * 1_000, uncertainty: inputs.distanceSource === 'coordinates' ? 0.01 : 20, unit: 'm' },
        visibleFraction: { value: inputs.observedVisiblePercent / 100, uncertainty: inputs.observationUncertaintyPercent / 100, unit: 'fraction' }
      }
    };
    return targetExperiment;"""
if old not in text:
    if new in text:
        raise SystemExit(0)
    raise SystemExit('scenario experiment branch anchor not found')
path.write_text(text.replace(old, new, 1))
