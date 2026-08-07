from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'{label}: target block not found')
    return text.replace(old, new, 1)


app_path = Path('src/renderer/src/AppNext.tsx')
app = app_path.read_text()
app = replace_once(app, """interface VisualLayerState {
  geographicBoundaries: boolean;
  terrain: boolean;
  grid: boolean;
}
""", """interface VisualLayerState {
  geographicBoundaries: boolean;
  terrain: boolean;
  atmosphere: boolean;
  grid: boolean;
}
""", 'visual layer interface')
app = replace_once(app, """function Sidebar({
  experiments,
  activeScenarioId,
  visualLayers,
""", """function Sidebar({
  experiments,
  activeScenarioId,
  atmosphereMode,
  visualLayers,
""", 'sidebar params')
app = replace_once(app, """  experiments: SavedExperiment[];
  activeScenarioId: SimulationScenarioId;
  visualLayers: VisualLayerState;
""", """  experiments: SavedExperiment[];
  activeScenarioId: SimulationScenarioId;
  atmosphereMode: AtmosphereMode;
  visualLayers: VisualLayerState;
""", 'sidebar types')
app = replace_once(app, '<span className="section-state">3 / 5 hazır</span>', '<span className="section-state">4 / 5 hazır</span>', 'layer count')
app = replace_once(app, """        {['Gece Işıkları', 'Atmosfer Profili'].map((item) => (
          <label className="switch-row unavailable-layer" key={item}>
            <span>{item}</span><input type="checkbox" disabled /><span className="switch" />
          </label>
        ))}
""", """        <label className="switch-row unavailable-layer">
          <span>Gece Işıkları</span><input type="checkbox" disabled /><span className="switch" />
        </label>
        <label
          className={`switch-row ${atmosphereMode !== 'profile' ? 'unavailable-layer' : ''}`}
          title={atmosphereMode === 'profile'
            ? 'Ölçülmüş atmosfer katmanlarını ve İdeal Küre optik ışın yolunu görselleştirir'
            : 'Atmosfer Profili görsel katmanı için Katmanlı profil modunu seçin'}
        >
          <span>Atmosfer Profili</span>
          <input
            type="checkbox"
            disabled={atmosphereMode !== 'profile'}
            checked={atmosphereMode === 'profile' && visualLayers.atmosphere}
            onChange={(event) => onVisualLayerChange('atmosphere', event.currentTarget.checked)}
          />
          <span className="switch" />
        </label>
""", 'atmosphere sidebar switch')
app = replace_once(app, """  inputs,
  terrainProfile,
  terrainSourceLabel,
  visualLayers,
""", """  inputs,
  atmosphereState,
  terrainProfile,
  terrainSourceLabel,
  visualLayers,
""", 'model card params')
app = replace_once(app, """  run: ModelRun | undefined;
  inputs: SimulatorInputs;
  terrainProfile: TerrainProfile | undefined;
""", """  run: ModelRun | undefined;
  inputs: SimulatorInputs;
  atmosphereState: AtmosphereExperimentState;
  terrainProfile: TerrainProfile | undefined;
""", 'model card types')
app = replace_once(app, """  showTerrain={!isHorizon && visualLayers.terrain}
  showGrid={visualLayers.grid}
  terrainProfile={isHorizon ? undefined : terrainProfile}
""", """  showTerrain={!isHorizon && visualLayers.terrain}
  showAtmosphere={visualLayers.atmosphere && atmosphereState.mode === 'profile' && metadata.id === 'ideal-sphere'}
  showGrid={visualLayers.grid}
  atmosphereState={atmosphereState}
  atmospherePrediction={prediction}
  observerAltitudeM={inputs.observerGroundElevationM + inputs.verticalDatumOffsetM + inputs.observerHeightM}
  targetTopAltitudeM={inputs.targetGroundElevationM + inputs.verticalDatumOffsetM + inputs.targetHeightM}
  targetSurfaceDistanceM={inputs.surfaceDistanceKm * 1_000}
  terrainProfile={isHorizon ? undefined : terrainProfile}
""", 'viewport props')
app = replace_once(app, """  const [visualLayers, setVisualLayers] = useState<VisualLayerState>({
    geographicBoundaries: true,
    terrain: false,
    grid: true
  });
""", """  const [visualLayers, setVisualLayers] = useState<VisualLayerState>({
    geographicBoundaries: true,
    terrain: false,
    atmosphere: false,
    grid: true
  });
""", 'visual layer state')
app = replace_once(app, """        <Sidebar
          experiments={savedExperiments}
          activeScenarioId={activeScenarioId}
          visualLayers={visualLayers}
""", """        <Sidebar
          experiments={savedExperiments}
          activeScenarioId={activeScenarioId}
          atmosphereMode={atmosphereState.mode}
          visualLayers={visualLayers}
""", 'sidebar call')
app = replace_once(app, """                run={runs.find((candidate) => candidate.metadata.id === model.metadata.id)}
                inputs={effectiveInputs}
                terrainProfile={terrainProfile}
""", """                run={runs.find((candidate) => candidate.metadata.id === model.metadata.id)}
                inputs={effectiveInputs}
                atmosphereState={atmosphereState}
                terrainProfile={terrainProfile}
""", 'model card call')
app_path.write_text(app)

viewport_path = Path('src/renderer/src/WorldModelViewport.tsx')
viewport = viewport_path.read_text()
viewport = replace_once(viewport, """import type { TerrainProfile } from '../../shared/terrain';
""", """import type { AtmosphereExperimentState } from '../../shared/atmosphere';
import type { ModelPrediction } from '../../shared/domain';
import type { TerrainProfile } from '../../shared/terrain';
""", 'viewport shared imports')
viewport = replace_once(viewport, """import { buildTerrainVisualizationProfile } from '../../simulation/terrain-visualization';
""", """import { buildTerrainVisualizationProfile } from '../../simulation/terrain-visualization';
import {
  atmosphereVisualRadiusScale,
  buildAtmosphereVisualizationPath
} from '../../simulation/atmosphere-visualization';
import { traceLayeredAtmosphereRay } from '../../simulation/layered-ray-tracing';
""", 'viewport simulation imports')
viewport = replace_once(viewport, """  showTarget: boolean;
  showTerrain: boolean;
  showGrid: boolean;
  terrainProfile?: TerrainProfile;
""", """  showTarget: boolean;
  showTerrain: boolean;
  showAtmosphere: boolean;
  showGrid: boolean;
  atmosphereState: AtmosphereExperimentState;
  atmospherePrediction?: ModelPrediction;
  observerAltitudeM: number;
  targetTopAltitudeM: number;
  targetSurfaceDistanceM: number;
  terrainProfile?: TerrainProfile;
""", 'viewport props interface')

atmosphere_helpers = r'''
function predictionMetric(
  prediction: ModelPrediction | undefined,
  key: string
): number | null {
  return prediction?.metrics.find((metric) => metric.key === key)?.value ?? null;
}

function addAtmosphereVisualization(
  group: THREE.Group,
  atmosphereState: AtmosphereExperimentState,
  prediction: ModelPrediction | undefined,
  observerCoordinate: { latitudeDeg: number; longitudeDeg: number },
  targetCoordinate: { latitudeDeg: number; longitudeDeg: number },
  showTarget: boolean,
  observerAltitudeM: number,
  targetTopAltitudeM: number,
  targetSurfaceDistanceM: number,
  radius: number
): void {
  if (atmosphereState.mode !== 'profile') return;
  const samples = atmosphereState.profile.samples;
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last || last.altitudeM <= first.altitudeM) return;

  const shellStride = Math.max(1, Math.ceil(samples.length / 6));
  samples.forEach((sample, index) => {
    if (index !== 0 && index !== samples.length - 1 && index % shellStride !== 0) return;
    const shellRadius = radius * atmosphereVisualRadiusScale(
      sample.altitudeM,
      first.altitudeM,
      last.altitudeM
    );
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(shellRadius, 32, 18),
      new THREE.MeshBasicMaterial({
        color: 0x69d9ee,
        wireframe: true,
        transparent: true,
        opacity: index === samples.length - 1 ? 0.075 : 0.032,
        depthWrite: false
      })
    );
    group.add(shell);
  });

  const initialElevationDeg = showTarget
    ? predictionMetric(prediction, 'targetTopElevationDeg') ??
      predictionMetric(prediction, 'profileGrazingElevationDeg')
    : predictionMetric(prediction, 'profileGrazingElevationDeg');
  const surfaceDistanceM = showTarget
    ? targetSurfaceDistanceM
    : predictionMetric(prediction, 'horizonSurfaceDistanceM');
  if (initialElevationDeg === null || surfaceDistanceM === null || surfaceDistanceM <= 0) return;

  try {
    const trace = traceLayeredAtmosphereRay(atmosphereState.profile, {
      settings: atmosphereState.opticalSettings,
      observerAltitudeM,
      initialElevationDeg,
      maxPathLengthM: Math.max(
        atmosphereState.rayTraceStepM * 4,
        surfaceDistanceM * 1.08 + atmosphereState.rayTraceStepM * 4
      ),
      stepM: atmosphereState.rayTraceStepM
    });
    const boundedSamples = showTarget
      ? trace.samples.filter((sample) =>
          sample.surfaceDistanceM <= surfaceDistanceM + atmosphereState.rayTraceStepM * 2
        )
      : trace.samples;
    if (boundedSamples.length < 2) return;

    const visual = buildAtmosphereVisualizationPath({
      samples: boundedSamples,
      observerCoordinate,
      ...(showTarget ? {
        targetCoordinate,
        targetSurfaceDistanceM: surfaceDistanceM
      } : {}),
      profileMinimumAltitudeM: first.altitudeM,
      profileMaximumAltitudeM: last.altitudeM,
      maxPoints: 420
    });
    const opticalPoints = visual.points.map((sample) =>
      vector(sample.point).multiplyScalar(radius)
    );
    group.add(line(opticalPoints, 0x64f1df, 0.98));

    if (showTarget) {
      const observerPoint = vector(latitudeLongitudeToSpherePoint(
        observerCoordinate,
        radius * atmosphereVisualRadiusScale(
          observerAltitudeM,
          first.altitudeM,
          last.altitudeM
        )
      ));
      const targetPoint = vector(latitudeLongitudeToSpherePoint(
        targetCoordinate,
        radius * atmosphereVisualRadiusScale(
          targetTopAltitudeM,
          first.altitudeM,
          last.altitudeM
        )
      ));
      group.add(line([observerPoint, targetPoint], 0xe9f2f5, 0.62));
    }
  } catch {
    // The physical model already reports profile/coverage errors. Visualization never invents a fallback ray.
  }
}

'''
viewport = replace_once(viewport, 'function disposeScene(scene: THREE.Scene): void {', atmosphere_helpers + 'function disposeScene(scene: THREE.Scene): void {', 'atmosphere helpers')
viewport = replace_once(viewport, """  showTarget,
  showTerrain,
  showGrid,
  terrainProfile,
""", """  showTarget,
  showTerrain,
  showAtmosphere,
  showGrid,
  atmosphereState,
  atmospherePrediction,
  observerAltitudeM,
  targetTopAltitudeM,
  targetSurfaceDistanceM,
  terrainProfile,
""", 'viewport destructuring')
viewport = replace_once(viewport, """  const boundaryGroupRef = useRef<THREE.Group | null>(null);
  const terrainGroupRef = useRef<THREE.Group | null>(null);
  const renderRef = useRef<() => void>(() => undefined);
""", """  const boundaryGroupRef = useRef<THREE.Group | null>(null);
  const terrainGroupRef = useRef<THREE.Group | null>(null);
  const atmosphereGroupRef = useRef<THREE.Group | null>(null);
  const renderRef = useRef<() => void>(() => undefined);
""", 'atmosphere ref')
viewport = replace_once(viewport, """  useEffect(() => {
    if (terrainGroupRef.current) terrainGroupRef.current.visible = showTerrain;
    renderRef.current();
  }, [showTerrain]);

  useEffect(() => {
""", """  useEffect(() => {
    if (terrainGroupRef.current) terrainGroupRef.current.visible = showTerrain;
    renderRef.current();
  }, [showTerrain]);

  useEffect(() => {
    if (atmosphereGroupRef.current) atmosphereGroupRef.current.visible = showAtmosphere;
    renderRef.current();
  }, [showAtmosphere]);

  useEffect(() => {
""", 'atmosphere visibility effect')
viewport = replace_once(viewport, """      const boundaryGroup = new THREE.Group();
      const terrainGroup = new THREE.Group();
      gridGroup.visible = showGrid;
      boundaryGroup.visible = showGeographicBoundaries;
      terrainGroup.visible = showTerrain;
      gridGroupRef.current = gridGroup;
      boundaryGroupRef.current = boundaryGroup;
      terrainGroupRef.current = terrainGroup;
      world.add(gridGroup, boundaryGroup, terrainGroup);
""", """      const boundaryGroup = new THREE.Group();
      const terrainGroup = new THREE.Group();
      const atmosphereGroup = new THREE.Group();
      gridGroup.visible = showGrid;
      boundaryGroup.visible = showGeographicBoundaries;
      terrainGroup.visible = showTerrain;
      atmosphereGroup.visible = showAtmosphere;
      gridGroupRef.current = gridGroup;
      boundaryGroupRef.current = boundaryGroup;
      terrainGroupRef.current = terrainGroup;
      atmosphereGroupRef.current = atmosphereGroup;
      world.add(gridGroup, boundaryGroup, terrainGroup, atmosphereGroup);
""", 'scene atmosphere group')
viewport = replace_once(viewport, """        if (terrainProfile) {
          addTerrainVisualization(
            terrainGroup,
            'globe',
            terrainProfile,
            observerCoordinate,
            targetCoordinate,
            radius
          );
        }

        const observerPosition = vector(latitudeLongitudeToSpherePoint(
""", """        if (terrainProfile) {
          addTerrainVisualization(
            terrainGroup,
            'globe',
            terrainProfile,
            observerCoordinate,
            targetCoordinate,
            radius
          );
        }
        addAtmosphereVisualization(
          atmosphereGroup,
          atmosphereState,
          atmospherePrediction,
          observerCoordinate,
          targetCoordinate,
          showTarget,
          observerAltitudeM,
          targetTopAltitudeM,
          targetSurfaceDistanceM,
          radius
        );

        const observerPosition = vector(latitudeLongitudeToSpherePoint(
""", 'globe atmosphere render')
viewport = viewport.replace('        terrainGroupRef.current = null;\n        renderRef.current = () => undefined;', '        terrainGroupRef.current = null;\n        atmosphereGroupRef.current = null;\n        renderRef.current = () => undefined;')
viewport = replace_once(viewport, """    showTarget,
    terrainProfile
  ]);
""", """    showTarget,
    terrainProfile,
    atmosphereState,
    atmospherePrediction,
    observerAltitudeM,
    targetTopAltitudeM,
    targetSurfaceDistanceM
  ]);
""", 'viewport dependencies')
viewport = replace_once(viewport, """        {showGeographicBoundaries && kind !== 'plane' && (
          <span className="boundary-state">Sınırlar açık</span>
        )}
""", """        {showAtmosphere && atmosphereState.mode === 'profile' && kind === 'globe' && (
          <>
            <span className="atmosphere-state" title="Atmosfer yükseklikleri okunabilirlik için sahnede abartılı ölçeklenir; hesap motorundaki metre değerleri değişmez">
              <i className="atmosphere" /> Atmosfer · görsel ölçek
            </span>
            <span className="optical-ray-state"><i className="optical-ray" /> Optik ışın</span>
            {showTarget && <span className="geometric-ray-state"><i className="geometric-ray" /> Geometrik LOS</span>}
          </>
        )}
        {showGeographicBoundaries && kind !== 'plane' && (
          <span className="boundary-state">Sınırlar açık</span>
        )}
""", 'atmosphere legend')
viewport_path.write_text(viewport)

css_path = Path('src/renderer/src/world-model-viewport.css')
css = css_path.read_text()
marker = '.world-model-legend i.atmosphere'
if marker not in css:
    css += r'''

.world-model-legend i.atmosphere {
  border-radius: 2px;
  color: #69d9ee;
  background: rgba(105, 217, 238, 0.52);
}

.world-model-legend i.optical-ray {
  width: 12px;
  height: 2px;
  border-radius: 2px;
  color: #64f1df;
  background: #64f1df;
}

.world-model-legend i.geometric-ray {
  width: 12px;
  height: 2px;
  border-radius: 2px;
  color: #e9f2f5;
  background: #e9f2f5;
}

.world-model-legend .atmosphere-state {
  color: #83dbea;
}

.world-model-legend .optical-ray-state {
  color: #8de9dd;
}

.world-model-legend .geometric-ray-state {
  color: #c6d4d9;
}
'''
css_path.write_text(css)

package_path = Path('package.json')
package_text = package_path.read_text()
package_text = replace_once(package_text, '"version": "1.3.1"', '"version": "1.3.2"', 'package version')
package_path.write_text(package_text)
