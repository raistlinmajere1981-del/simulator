from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        if new in text:
            return text
        raise SystemExit(f'{label} anchor not found')
    return text.replace(old, new, 1)


# AppNext.tsx
path = Path('src/renderer/src/AppNext.tsx')
text = path.read_text()

text = replace_once(
    text,
    """interface VisualLayerState {
  geographicBoundaries: boolean;
  grid: boolean;
}""",
    """interface VisualLayerState {
  geographicBoundaries: boolean;
  terrain: boolean;
  grid: boolean;
}""",
    'visual layer interface'
)

old_layers = """      <section className=\"side-section compact grow\">
        <div className=\"section-heading\">
          <span>Görsel katmanlar</span>
          <span className=\"section-state\">2 / 5 hazır</span>
        </div>
        <label className=\"switch-row\">
          <span>Kıta / Ülke Sınırları</span>
          <input
            type=\"checkbox\"
            checked={visualLayers.geographicBoundaries}
            onChange={(event) => onVisualLayerChange('geographicBoundaries', event.currentTarget.checked)}
          />
          <span className=\"switch\" />
        </label>
        {['Topografya Görselleştirme', 'Gece Işıkları', 'Atmosfer Profili'].map((item) => (
          <label className=\"switch-row unavailable-layer\" key={item}>
            <span>{item}</span><input type=\"checkbox\" disabled /><span className=\"switch\" />
          </label>
        ))}
        <label className=\"switch-row\">
          <span>Izgara</span>
          <input
            type=\"checkbox\"
            checked={visualLayers.grid}
            onChange={(event) => onVisualLayerChange('grid', event.currentTarget.checked)}
          />
          <span className=\"switch\" />
        </label>
      </section>"""
new_layers = """      <section className=\"side-section compact grow\">
        <div className=\"section-heading\">
          <span>Görsel katmanlar</span>
          <span className=\"section-state\">3 / 5 hazır</span>
        </div>
        <label className=\"switch-row\">
          <span>Kıta / Ülke Sınırları</span>
          <input
            type=\"checkbox\"
            checked={visualLayers.geographicBoundaries}
            onChange={(event) => onVisualLayerChange('geographicBoundaries', event.currentTarget.checked)}
          />
          <span className=\"switch\" />
        </label>
        <label className=\"switch-row\" title=\"Arazi profili etkin olduğunda rota boyunca göreli yükselti şeridini gösterir\">
          <span>Topografya Görselleştirme</span>
          <input
            type=\"checkbox\"
            checked={visualLayers.terrain}
            onChange={(event) => onVisualLayerChange('terrain', event.currentTarget.checked)}
          />
          <span className=\"switch\" />
        </label>
        {['Gece Işıkları', 'Atmosfer Profili'].map((item) => (
          <label className=\"switch-row unavailable-layer\" key={item}>
            <span>{item}</span><input type=\"checkbox\" disabled /><span className=\"switch\" />
          </label>
        ))}
        <label className=\"switch-row\">
          <span>Izgara</span>
          <input
            type=\"checkbox\"
            checked={visualLayers.grid}
            onChange={(event) => onVisualLayerChange('grid', event.currentTarget.checked)}
          />
          <span className=\"switch\" />
        </label>
      </section>"""
text = replace_once(text, old_layers, new_layers, 'visual layer controls')

helper_anchor = """function isCsvTerrainProfileSource(
  source: TerrainProfileSource
): source is Extract<TerrainProfileSource, { kind: 'csv' }> {
  return source.kind === 'csv';
}
"""
helper_new = helper_anchor + """
function terrainVisualizationSourceLabel(source: TerrainProfileSource | undefined): string {
  if (!source) return 'Manuel profil';
  if (source.kind === 'dem') return `DEM · ${source.fileName}`;
  if (source.kind === 'geojson') return `GeoJSON · ${source.fileName}`;
  return `CSV · ${source.fileName}`;
}
"""
text = replace_once(text, helper_anchor, helper_new, 'terrain source label helper')

text = replace_once(
    text,
    """function ModelCard({
  metadata,
  run,
  inputs,
  visualLayers,
  onShowTrace
}: {
  metadata: ModelMetadata;
  run: ModelRun | undefined;
  inputs: SimulatorInputs;
  visualLayers: VisualLayerState;
  onShowTrace(): void;
}): React.JSX.Element {""",
    """function ModelCard({
  metadata,
  run,
  inputs,
  terrainProfile,
  terrainSourceLabel,
  visualLayers,
  onShowTrace
}: {
  metadata: ModelMetadata;
  run: ModelRun | undefined;
  inputs: SimulatorInputs;
  terrainProfile: TerrainProfile | undefined;
  terrainSourceLabel: string;
  visualLayers: VisualLayerState;
  onShowTrace(): void;
}): React.JSX.Element {""",
    'ModelCard props'
)

text = replace_once(
    text,
    """  showGeographicBoundaries={visualLayers.geographicBoundaries}
  showGrid={visualLayers.grid}
/>""",
    """  showGeographicBoundaries={visualLayers.geographicBoundaries}
  showTerrain={visualLayers.terrain}
  showGrid={visualLayers.grid}
  terrainProfile={terrainProfile}
  terrainSourceLabel={terrainSourceLabel}
/>""",
    'viewport terrain props'
)

text = replace_once(
    text,
    """  const [visualLayers, setVisualLayers] = useState<VisualLayerState>({
    geographicBoundaries: true,
    grid: true
  });""",
    """  const [visualLayers, setVisualLayers] = useState<VisualLayerState>({
    geographicBoundaries: true,
    terrain: false,
    grid: true
  });""",
    'visual layer state'
)

text = replace_once(
    text,
    """                run={runs.find((candidate) => candidate.metadata.id === model.metadata.id)}
                inputs={effectiveInputs}
                visualLayers={visualLayers}""",
    """                run={runs.find((candidate) => candidate.metadata.id === model.metadata.id)}
                inputs={effectiveInputs}
                terrainProfile={terrainProfile}
                terrainSourceLabel={terrainVisualizationSourceLabel(terrainProfileSource)}
                visualLayers={visualLayers}""",
    'ModelCard terrain call'
)

path.write_text(text)


# WorldModelViewport.tsx
path = Path('src/renderer/src/WorldModelViewport.tsx')
text = path.read_text()

text = replace_once(
    text,
    """import worldAtlas from 'world-atlas/countries-110m.json';
import { extractGeographicLineStrings } from '../../simulation/geographic-visualization';""",
    """import worldAtlas from 'world-atlas/countries-110m.json';
import type { TerrainProfile } from '../../shared/terrain';
import {
  coordinateAtWgs84PathFraction,
  createWgs84GeodesicPath
} from '../../simulation/geodesic-path';
import { extractGeographicLineStrings } from '../../simulation/geographic-visualization';
import { buildTerrainVisualizationProfile } from '../../simulation/terrain-visualization';""",
    'viewport imports'
)

text = replace_once(
    text,
    """  targetLongitudeDeg: number;
  showGeographicBoundaries: boolean;
  showGrid: boolean;
}""",
    """  targetLongitudeDeg: number;
  showGeographicBoundaries: boolean;
  showTerrain: boolean;
  showGrid: boolean;
  terrainProfile?: TerrainProfile;
  terrainSourceLabel?: string;
}""",
    'viewport props interface'
)

insert_anchor = """function disposeScene(scene: THREE.Scene): void {"""
terrain_helpers = """function terrainRibbon(
  basePoints: THREE.Vector3[],
  ridgePoints: THREE.Vector3[],
  color: number
): THREE.Mesh {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let index = 0; index < basePoints.length; index += 1) {
    positions.push(...basePoints[index].toArray(), ...ridgePoints[index].toArray());
    if (index < basePoints.length - 1) {
      const baseIndex = index * 2;
      indices.push(
        baseIndex, baseIndex + 1, baseIndex + 2,
        baseIndex + 1, baseIndex + 3, baseIndex + 2
      );
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  return new THREE.Mesh(geometry, material);
}

function addTerrainVisualization(
  group: THREE.Group,
  kind: WorldVisualizationKind,
  profile: TerrainProfile,
  observerCoordinate: { latitudeDeg: number; longitudeDeg: number },
  targetCoordinate: { latitudeDeg: number; longitudeDeg: number },
  radius: number
): void {
  const visualProfile = buildTerrainVisualizationProfile(profile);
  const basePoints: THREE.Vector3[] = [];
  const ridgePoints: THREE.Vector3[] = [];

  if (kind === 'plane') {
    for (const sample of visualProfile.samples) {
      const x = -0.92 + sample.distanceFraction * 1.84;
      basePoints.push(new THREE.Vector3(x, 0.04, 0.018));
      ridgePoints.push(new THREE.Vector3(
        x,
        0.13 + sample.normalizedRelief * 0.09,
        0.018
      ));
    }
  } else {
    const path = createWgs84GeodesicPath(observerCoordinate, targetCoordinate);
    for (const sample of visualProfile.samples) {
      const coordinate = coordinateAtWgs84PathFraction(
        path,
        sample.distanceFraction
      ).coordinate;
      if (kind === 'globe') {
        const base = vector(latitudeLongitudeToSpherePoint(coordinate, radius * 1.03));
        const ridge = base.clone().normalize().multiplyScalar(
          radius * 1.03 + 0.045 + sample.normalizedRelief * 0.035
        );
        basePoints.push(base);
        ridgePoints.push(ridge);
      } else {
        const base = vector(latitudeLongitudeToNorthPolarAzimuthalPoint(
          coordinate,
          radius * 0.94
        ));
        base.y = 0.04;
        const ridge = base.clone();
        ridge.y = 0.10 + sample.normalizedRelief * 0.065;
        basePoints.push(base);
        ridgePoints.push(ridge);
      }
    }
  }

  if (basePoints.length < 2) return;
  group.add(terrainRibbon(basePoints, ridgePoints, 0x68d8b5));
  group.add(line(ridgePoints, 0x8ff0cf, 0.98));
}

""" + insert_anchor
text = replace_once(text, insert_anchor, terrain_helpers, 'terrain helper insertion')

text = replace_once(
    text,
    """  targetLongitudeDeg,
  showGeographicBoundaries,
  showGrid
}: WorldModelViewportProps): React.JSX.Element {""",
    """  targetLongitudeDeg,
  showGeographicBoundaries,
  showTerrain,
  showGrid,
  terrainProfile,
  terrainSourceLabel
}: WorldModelViewportProps): React.JSX.Element {""",
    'viewport destructuring'
)

text = replace_once(
    text,
    """  const gridGroupRef = useRef<THREE.Group | null>(null);
  const boundaryGroupRef = useRef<THREE.Group | null>(null);""",
    """  const gridGroupRef = useRef<THREE.Group | null>(null);
  const boundaryGroupRef = useRef<THREE.Group | null>(null);
  const terrainGroupRef = useRef<THREE.Group | null>(null);""",
    'terrain ref'
)

text = replace_once(
    text,
    """  useEffect(() => {
    if (boundaryGroupRef.current) boundaryGroupRef.current.visible = showGeographicBoundaries;
    renderRef.current();
  }, [showGeographicBoundaries]);

  useEffect(() => {""",
    """  useEffect(() => {
    if (boundaryGroupRef.current) boundaryGroupRef.current.visible = showGeographicBoundaries;
    renderRef.current();
  }, [showGeographicBoundaries]);

  useEffect(() => {
    if (terrainGroupRef.current) terrainGroupRef.current.visible = showTerrain;
    renderRef.current();
  }, [showTerrain]);

  useEffect(() => {""",
    'terrain visibility effect'
)

text = replace_once(
    text,
    """      const gridGroup = new THREE.Group();
      const boundaryGroup = new THREE.Group();
      gridGroup.visible = showGrid;
      boundaryGroup.visible = showGeographicBoundaries;
      gridGroupRef.current = gridGroup;
      boundaryGroupRef.current = boundaryGroup;
      world.add(gridGroup, boundaryGroup);""",
    """      const gridGroup = new THREE.Group();
      const boundaryGroup = new THREE.Group();
      const terrainGroup = new THREE.Group();
      gridGroup.visible = showGrid;
      boundaryGroup.visible = showGeographicBoundaries;
      terrainGroup.visible = showTerrain;
      gridGroupRef.current = gridGroup;
      boundaryGroupRef.current = boundaryGroup;
      terrainGroupRef.current = terrainGroup;
      world.add(gridGroup, boundaryGroup, terrainGroup);""",
    'terrain group creation'
)

text = replace_once(
    text,
    """        addGlobeGrid(gridGroup, radius * 1.004);
        addGeographicBoundaries(boundaryGroup, 'globe', radius);

        const observerPosition""",
    """        addGlobeGrid(gridGroup, radius * 1.004);
        addGeographicBoundaries(boundaryGroup, 'globe', radius);
        if (terrainProfile) {
          addTerrainVisualization(
            terrainGroup,
            'globe',
            terrainProfile,
            observerCoordinate,
            targetCoordinate,
            radius
          );
        }

        const observerPosition""",
    'globe terrain layer'
)

text = replace_once(
    text,
    """        if (kind === 'plane') {
          const observerPosition""",
    """        if (kind === 'plane') {
          if (terrainProfile) {
            addTerrainVisualization(
              terrainGroup,
              'plane',
              terrainProfile,
              observerCoordinate,
              targetCoordinate,
              radius
            );
          }
          const observerPosition""",
    'plane terrain layer'
)

text = replace_once(
    text,
    """        } else {
          addGeographicBoundaries(boundaryGroup, 'gleason', radius);
          const observerPosition""",
    """        } else {
          addGeographicBoundaries(boundaryGroup, 'gleason', radius);
          if (terrainProfile) {
            addTerrainVisualization(
              terrainGroup,
              'gleason',
              terrainProfile,
              observerCoordinate,
              targetCoordinate,
              radius
            );
          }
          const observerPosition""",
    'azimuthal terrain layer'
)

text = text.replace(
    """        boundaryGroupRef.current = null;
        renderRef.current = () => undefined;""",
    """        boundaryGroupRef.current = null;
        terrainGroupRef.current = null;
        renderRef.current = () => undefined;"""
)

text = replace_once(
    text,
    """    targetLatitudeDeg,
    targetLongitudeDeg
  ]);""",
    """    targetLatitudeDeg,
    targetLongitudeDeg,
    terrainProfile
  ]);""",
    'viewport scene dependencies'
)

text = replace_once(
    text,
    """        <span><i className=\"target\" /> Hedef</span>
        {showGeographicBoundaries && kind !== 'plane' && <span className=\"boundary-state\">Sınırlar açık</span>}
        <span className=\"world-model-mode\">{labelForKind(kind)}</span>""",
    """        <span><i className=\"target\" /> Hedef</span>
        {showTerrain && terrainProfile && (
          <span
            className=\"terrain-state\"
            title={`${terrainSourceLabel ?? terrainProfile.label} · kotlar hesap motorunda metre olarak korunur; sahne yüksekliği yalnız görsel olarak ölçeklenir`}
          >
            <i className=\"terrain\" /> Arazi · görsel yükseltme
          </span>
        )}
        {showGeographicBoundaries && kind !== 'plane' && <span className=\"boundary-state\">Sınırlar açık</span>}
        <span className=\"world-model-mode\">{labelForKind(kind)}</span>""",
    'terrain legend'
)

path.write_text(text)


# CSS append
path = Path('src/renderer/src/world-model-viewport.css')
text = path.read_text()
css = """

.world-model-legend i.terrain {
  border-radius: 2px;
  color: #8ff0cf;
  background: #8ff0cf;
}

.world-model-legend .terrain-state {
  max-width: 150px;
  overflow: hidden;
  color: #90cdbb;
  text-overflow: ellipsis;
}
"""
if '.world-model-legend i.terrain' not in text:
    text += css
path.write_text(text)
