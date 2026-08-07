from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        if new in text:
            return text
        raise SystemExit(f'{label}: anchor not found')
    return text.replace(old, new, 1)


path = Path('src/renderer/src/AppNext.tsx')
text = path.read_text()

text = replace_once(
    text,
    """        <label className=\"switch-row\" title=\"Arazi profili etkin olduğunda rota boyunca göreli yükselti şeridini gösterir\">
          <span>Topografya Görselleştirme</span>
          <input
            type=\"checkbox\"
            checked={visualLayers.terrain}
            onChange={(event) => onVisualLayerChange('terrain', event.currentTarget.checked)}
          />
          <span className=\"switch\" />
        </label>""",
    """        <label
          className={`switch-row ${activeScenarioId === 'horizon' ? 'unavailable-layer' : ''}`}
          title={activeScenarioId === 'horizon'
            ? 'Ufuk Analizi yerel arazi profilini kullanmaz'
            : 'Arazi profili etkin olduğunda rota boyunca göreli yükselti şeridini gösterir'}
        >
          <span>Topografya Görselleştirme</span>
          <input
            type=\"checkbox\"
            disabled={activeScenarioId === 'horizon'}
            checked={activeScenarioId !== 'horizon' && visualLayers.terrain}
            onChange={(event) => onVisualLayerChange('terrain', event.currentTarget.checked)}
          />
          <span className=\"switch\" />
        </label>""",
    'horizon terrain layer state'
)

old_experiment = """  const experiment = useMemo<ExperimentDefinition>(() => {
    const scenario = getSimulationScenario(activeScenarioId);
    const isHorizon = activeScenarioId === 'horizon';
    return {
      id: activeExperimentId,
      title: activeExperimentName || `Etkileşimli ${scenario.label.toLocaleLowerCase('tr-TR')} deneyi`,
      type: scenario.experimentType,
      observer: {
        latitudeDeg: inputs.observerLatitudeDeg,
        longitudeDeg: inputs.observerLongitudeDeg,
        elevationM: inputs.observerGroundElevationM + inputs.verticalDatumOffsetM,
        eyeHeightM: inputs.observerHeightM
      },
      ...(!isHorizon ? {
        target: {
          label: 'Hedef',
          latitudeDeg: inputs.targetLatitudeDeg,
          longitudeDeg: inputs.targetLongitudeDeg,
          elevationM: inputs.targetGroundElevationM + inputs.verticalDatumOffsetM,
          heightM: inputs.targetHeightM
        },
        terrainProfile,
        measurements: {
          surfaceDistanceM: { value: effectiveDistanceKm * 1_000, uncertainty: inputs.distanceSource === 'coordinates' ? 0.01 : 20, unit: 'm' },
          visibleFraction: { value: inputs.observedVisiblePercent / 100, uncertainty: inputs.observationUncertaintyPercent / 100, unit: 'fraction' }
        }
      } : { measurements: {} }),
      observedAtIso: experimentObservedAtIso
    };
  }, [activeExperimentId, activeExperimentName, activeScenarioId, effectiveDistanceKm, experimentObservedAtIso, inputs, terrainProfile]);"""
new_experiment = """  const experiment = useMemo<ExperimentDefinition>(() => {
    const scenario = getSimulationScenario(activeScenarioId);
    const observer = {
      latitudeDeg: inputs.observerLatitudeDeg,
      longitudeDeg: inputs.observerLongitudeDeg,
      elevationM: inputs.observerGroundElevationM + inputs.verticalDatumOffsetM,
      eyeHeightM: inputs.observerHeightM
    };

    if (activeScenarioId === 'horizon') {
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
    };
  }, [activeExperimentId, activeExperimentName, activeScenarioId, effectiveDistanceKm, experimentObservedAtIso, inputs, terrainProfile]);"""
text = replace_once(text, old_experiment, new_experiment, 'scenario experiment typing')

path.write_text(text)
