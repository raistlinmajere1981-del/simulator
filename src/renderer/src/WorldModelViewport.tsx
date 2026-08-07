import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mesh } from 'topojson-client';
import worldAtlas from 'world-atlas/countries-110m.json';
import type { TerrainProfile } from '../../shared/terrain';
import {
  coordinateAtWgs84PathFraction,
  createWgs84GeodesicPath
} from '../../simulation/geodesic-path';
import { extractGeographicLineStrings } from '../../simulation/geographic-visualization';
import { buildTerrainVisualizationProfile } from '../../simulation/terrain-visualization';
import {
  buildWgs84VisualizationRoute,
  latitudeLongitudeToNorthPolarAzimuthalPoint,
  latitudeLongitudeToSpherePoint,
  type VisualizationPoint3
} from '../../simulation/model-visualization';

export type WorldVisualizationKind = 'globe' | 'plane' | 'gleason';

export interface WorldModelViewportProps {
  kind: WorldVisualizationKind;
  observerLatitudeDeg: number;
  observerLongitudeDeg: number;
  targetLatitudeDeg: number;
  targetLongitudeDeg: number;
  showGeographicBoundaries: boolean;
  showTerrain: boolean;
  showGrid: boolean;
  terrainProfile?: TerrainProfile;
  terrainSourceLabel?: string;
}

function vector(point: VisualizationPoint3): THREE.Vector3 {
  return new THREE.Vector3(point[0], point[1], point[2]);
}

function line(
  points: THREE.Vector3[],
  color: number,
  opacity = 1
): THREE.Line {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity
  });
  return new THREE.Line(geometry, material);
}

function pin(position: THREE.Vector3, color: number): THREE.Group {
  const group = new THREE.Group();
  const stemGeometry = new THREE.CylinderGeometry(0.012, 0.012, 0.16, 10);
  const stemMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
  const stem = new THREE.Mesh(stemGeometry, stemMaterial);
  stem.position.y = 0.08;
  const headGeometry = new THREE.SphereGeometry(0.045, 16, 12);
  const headMaterial = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.18,
    roughness: 0.4
  });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.y = 0.18;
  group.add(stem, head);
  group.position.copy(position);
  return group;
}

function addGlobeGrid(group: THREE.Group, radius: number): void {
  const gridColor = 0x4b7784;
  for (const latitudeDeg of [-60, -30, 0, 30, 60]) {
    const latitude = latitudeDeg * Math.PI / 180;
    const y = radius * Math.sin(latitude);
    const ringRadius = radius * Math.cos(latitude);
    const points = Array.from({ length: 97 }, (_, index) => {
      const angle = index / 96 * Math.PI * 2;
      return new THREE.Vector3(
        ringRadius * Math.cos(angle),
        y,
        ringRadius * Math.sin(angle)
      );
    });
    group.add(line(points, gridColor, latitudeDeg === 0 ? 0.72 : 0.36));
  }

  for (let longitudeDeg = 0; longitudeDeg < 180; longitudeDeg += 30) {
    const longitude = longitudeDeg * Math.PI / 180;
    const points = Array.from({ length: 65 }, (_, index) => {
      const latitude = -Math.PI / 2 + index / 64 * Math.PI;
      const cosLatitude = Math.cos(latitude);
      return new THREE.Vector3(
        radius * cosLatitude * Math.cos(longitude),
        radius * Math.sin(latitude),
        radius * cosLatitude * Math.sin(longitude)
      );
    });
    const opposite = points
      .map((point) => new THREE.Vector3(-point.x, point.y, -point.z))
      .reverse();
    group.add(line([...points, ...opposite], gridColor, 0.34));
  }
}

function addDiskGrid(group: THREE.Group, radius: number, color: number): void {
  for (const fraction of [0.25, 0.5, 0.75, 1]) {
    const points = Array.from({ length: 97 }, (_, index) => {
      const angle = index / 96 * Math.PI * 2;
      return new THREE.Vector3(
        radius * fraction * Math.cos(angle),
        0.012,
        radius * fraction * Math.sin(angle)
      );
    });
    group.add(line(points, color, fraction === 1 ? 0.72 : 0.32));
  }
  for (let angleIndex = 0; angleIndex < 12; angleIndex += 1) {
    const angle = angleIndex / 12 * Math.PI * 2;
    group.add(line([
      new THREE.Vector3(0, 0.013, 0),
      new THREE.Vector3(radius * Math.cos(angle), 0.013, radius * Math.sin(angle))
    ], color, 0.28));
  }
}

function countryBoundaryGeometry(): unknown {
  const topology = worldAtlas as unknown as Parameters<typeof mesh>[0];
  const countries = topology.objects.countries as Parameters<typeof mesh>[1];
  return mesh(topology, countries);
}

const geographicBoundaryLines = extractGeographicLineStrings(countryBoundaryGeometry());

function addGeographicBoundaries(
  group: THREE.Group,
  kind: Exclude<WorldVisualizationKind, 'plane'>,
  radius: number
): void {
  for (const geographicLine of geographicBoundaryLines) {
    const points = geographicLine.map(([longitudeDeg, latitudeDeg]) => {
      if (kind === 'globe') {
        return vector(latitudeLongitudeToSpherePoint(
          { latitudeDeg, longitudeDeg },
          radius * 1.008
        ));
      }
      const point = vector(latitudeLongitudeToNorthPolarAzimuthalPoint(
        { latitudeDeg, longitudeDeg },
        radius * 0.94
      ));
      point.y = 0.022;
      return point;
    });
    if (points.length >= 2) {
      group.add(line(points, 0x8ab5c3, kind === 'globe' ? 0.62 : 0.5));
    }
  }
}

function terrainRibbon(
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
  let visualProfile: ReturnType<typeof buildTerrainVisualizationProfile>;
  try {
    visualProfile = buildTerrainVisualizationProfile(profile);
  } catch {
    return;
  }

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
    let path: ReturnType<typeof createWgs84GeodesicPath>;
    try {
      path = createWgs84GeodesicPath(observerCoordinate, targetCoordinate);
    } catch {
      return;
    }

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

function disposeScene(scene: THREE.Scene): void {
  scene.traverse((object) => {
    const renderable = object as THREE.Mesh & {
      material?: THREE.Material | THREE.Material[];
    };
    if (renderable.geometry instanceof THREE.BufferGeometry) {
      renderable.geometry.dispose();
    }
    const materials = Array.isArray(renderable.material)
      ? renderable.material
      : renderable.material
        ? [renderable.material]
        : [];
    for (const material of materials) material.dispose();
  });
}

function labelForKind(kind: WorldVisualizationKind): string {
  if (kind === 'globe') return 'WGS84 konumlu küresel sahne';
  if (kind === 'plane') {
    return 'Yerel düzlem şeması · küresel harita projeksiyonu uygulanmaz';
  }
  return 'Kuzey kutup merkezli azimutal kartografik referans';
}

export function WorldModelViewport({
  kind,
  observerLatitudeDeg,
  observerLongitudeDeg,
  targetLatitudeDeg,
  targetLongitudeDeg,
  showGeographicBoundaries,
  showTerrain,
  showGrid,
  terrainProfile,
  terrainSourceLabel
}: WorldModelViewportProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const gridGroupRef = useRef<THREE.Group | null>(null);
  const boundaryGroupRef = useRef<THREE.Group | null>(null);
  const terrainGroupRef = useRef<THREE.Group | null>(null);
  const renderRef = useRef<() => void>(() => undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    if (gridGroupRef.current) gridGroupRef.current.visible = showGrid;
    renderRef.current();
  }, [showGrid]);

  useEffect(() => {
    if (boundaryGroupRef.current) {
      boundaryGroupRef.current.visible = showGeographicBoundaries;
    }
    renderRef.current();
  }, [showGeographicBoundaries]);

  useEffect(() => {
    if (terrainGroupRef.current) terrainGroupRef.current.visible = showTerrain;
    renderRef.current();
  }, [showTerrain]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let renderer: THREE.WebGLRenderer | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let controls: OrbitControls | undefined;
    let scene: THREE.Scene | undefined;

    try {
      setError('');
      scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.className = 'world-model-canvas';
      container.appendChild(renderer.domElement);

      const world = new THREE.Group();
      const gridGroup = new THREE.Group();
      const boundaryGroup = new THREE.Group();
      const terrainGroup = new THREE.Group();
      gridGroup.visible = showGrid;
      boundaryGroup.visible = showGeographicBoundaries;
      terrainGroup.visible = showTerrain;
      gridGroupRef.current = gridGroup;
      boundaryGroupRef.current = boundaryGroup;
      terrainGroupRef.current = terrainGroup;
      world.add(gridGroup, boundaryGroup, terrainGroup);
      scene.add(world);

      scene.add(new THREE.HemisphereLight(0xbfe8ff, 0x17212b, 1.5));
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.7);
      keyLight.position.set(3, 4, 5);
      scene.add(keyLight);

      const observerCoordinate = {
        latitudeDeg: observerLatitudeDeg,
        longitudeDeg: observerLongitudeDeg
      };
      const targetCoordinate = {
        latitudeDeg: targetLatitudeDeg,
        longitudeDeg: targetLongitudeDeg
      };

      if (kind === 'globe') {
        const radius = 1.42;
        const globe = new THREE.Mesh(
          new THREE.SphereGeometry(radius, 64, 36),
          new THREE.MeshStandardMaterial({
            color: 0x153944,
            roughness: 0.82,
            metalness: 0.06,
            transparent: true,
            opacity: 0.96
          })
        );
        world.add(globe);
        addGlobeGrid(gridGroup, radius * 1.004);
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

        const observerPosition = vector(latitudeLongitudeToSpherePoint(
          observerCoordinate,
          radius * 1.02
        ));
        const targetPosition = vector(latitudeLongitudeToSpherePoint(
          targetCoordinate,
          radius * 1.02
        ));
        world.add(
          pin(observerPosition, 0xffa94d),
          pin(targetPosition, 0x58d6ff)
        );

        try {
          const route = buildWgs84VisualizationRoute(
            observerCoordinate,
            targetCoordinate,
            72
          ).map((coordinate) => vector(latitudeLongitudeToSpherePoint(
            coordinate,
            radius * 1.025
          )));
          world.add(line(route, 0xf2dc72, 0.96));
        } catch {
          world.add(line([observerPosition, targetPosition], 0xf2dc72, 0.75));
        }
        camera.position.set(0.8, 1.25, 4.3);
      } else {
        const radius = 1.46;
        const disk = new THREE.Mesh(
          new THREE.CircleGeometry(radius, 96),
          new THREE.MeshStandardMaterial({
            color: kind === 'plane' ? 0x473a1f : 0x34284e,
            roughness: 0.9,
            metalness: 0.02,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.96
          })
        );
        disk.rotation.x = -Math.PI / 2;
        world.add(disk);
        addDiskGrid(
          gridGroup,
          radius,
          kind === 'plane' ? 0xb79a59 : 0x977cc8
        );

        if (kind === 'plane') {
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
          const observerPosition = new THREE.Vector3(-0.92, 0.025, 0);
          const targetPosition = new THREE.Vector3(0.92, 0.025, 0);
          world.add(
            pin(observerPosition, 0xffa94d),
            pin(targetPosition, 0x58d6ff)
          );
          world.add(line([
            new THREE.Vector3(-0.92, 0.035, 0),
            new THREE.Vector3(0.92, 0.035, 0)
          ], 0xf2dc72, 0.96));
        } else {
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

          const observerPosition = vector(
            latitudeLongitudeToNorthPolarAzimuthalPoint(
              observerCoordinate,
              radius * 0.94
            )
          );
          const targetPosition = vector(
            latitudeLongitudeToNorthPolarAzimuthalPoint(
              targetCoordinate,
              radius * 0.94
            )
          );
          observerPosition.y = 0.025;
          targetPosition.y = 0.025;
          world.add(
            pin(observerPosition, 0xffa94d),
            pin(targetPosition, 0x58d6ff)
          );

          try {
            const route = buildWgs84VisualizationRoute(
              observerCoordinate,
              targetCoordinate,
              72
            ).map((coordinate) => {
              const point = vector(
                latitudeLongitudeToNorthPolarAzimuthalPoint(
                  coordinate,
                  radius * 0.94
                )
              );
              point.y = 0.035;
              return point;
            });
            world.add(line(route, 0xf2dc72, 0.96));
          } catch {
            world.add(line([observerPosition, targetPosition], 0xf2dc72, 0.75));
          }
        }

        camera.position.set(0, 3.8, 3.4);
        camera.lookAt(0, 0, 0);
      }

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = false;
      controls.enablePan = false;
      controls.minDistance = kind === 'globe' ? 2.6 : 2.8;
      controls.maxDistance = 7;
      controls.zoomToCursor = true;
      controls.target.set(0, 0, 0);
      if (kind !== 'globe') {
        controls.minPolarAngle = 0.18;
        controls.maxPolarAngle = Math.PI / 2.15;
      }
      controls.update();
      controls.saveState();
      controlsRef.current = controls;

      const render = (): void => {
        if (!renderer || !scene) return;
        renderer.render(scene, camera);
      };
      renderRef.current = render;

      const resize = (): void => {
        if (!renderer) return;
        const width = Math.max(1, container.clientWidth);
        const height = Math.max(1, container.clientHeight);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        render();
      };

      controls.addEventListener('change', render);
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
      resize();

      return () => {
        resizeObserver?.disconnect();
        controls?.removeEventListener('change', render);
        controls?.dispose();
        controlsRef.current = null;
        gridGroupRef.current = null;
        boundaryGroupRef.current = null;
        terrainGroupRef.current = null;
        renderRef.current = () => undefined;
        if (scene) disposeScene(scene);
        renderer?.dispose();
        renderer?.domElement.remove();
      };
    } catch (caught) {
      const message = caught instanceof Error
        ? caught.message
        : 'WebGL sahnesi başlatılamadı.';
      setError(message);
      resizeObserver?.disconnect();
      controls?.dispose();
      controlsRef.current = null;
      gridGroupRef.current = null;
      boundaryGroupRef.current = null;
      terrainGroupRef.current = null;
      renderRef.current = () => undefined;
      if (scene) disposeScene(scene);
      renderer?.dispose();
      renderer?.domElement.remove();
      return undefined;
    }
  }, [
    kind,
    observerLatitudeDeg,
    observerLongitudeDeg,
    targetLatitudeDeg,
    targetLongitudeDeg,
    terrainProfile
  ]);

  return (
    <div className={`world-model-viewport ${kind}`}>
      <div className="world-model-stage" ref={containerRef} />
      <button
        className="world-model-reset"
        type="button"
        title="Başlangıç kamera açısına dön"
        onClick={() => controlsRef.current?.reset()}
      >
        ↺ Görünümü sıfırla
      </button>
      <div className="world-model-legend">
        <span><i className="observer" /> Gözlemci</span>
        <span><i className="target" /> Hedef</span>
        {showTerrain && terrainProfile && (
          <span
            className="terrain-state"
            title={`${terrainSourceLabel ?? terrainProfile.label} · kotlar hesap motorunda metre olarak korunur; sahne yüksekliği yalnız görsel olarak ölçeklenir`}
          >
            <i className="terrain" /> Arazi · görsel yükseltme
          </span>
        )}
        {showGeographicBoundaries && kind !== 'plane' && (
          <span className="boundary-state">Sınırlar açık</span>
        )}
        <span className="world-model-mode">{labelForKind(kind)}</span>
      </div>
      {error && (
        <div className="world-model-error">
          WebGL görünümü kullanılamadı: {error}
        </div>
      )}
    </div>
  );
}
