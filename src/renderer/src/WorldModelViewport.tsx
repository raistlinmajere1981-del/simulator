import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
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

function pin(
  position: THREE.Vector3,
  color: number,
  surfaceNormal?: THREE.Vector3
): THREE.Group {
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

  if (surfaceNormal && surfaceNormal.lengthSq() > 0) {
    group.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      surfaceNormal.clone().normalize()
    );
  }

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
    const opposite = points.map((point) => new THREE.Vector3(-point.x, point.y, -point.z)).reverse();
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

function disposeScene(scene: THREE.Scene): void {
  scene.traverse((object) => {
    const renderable = object as THREE.Mesh & { material?: THREE.Material | THREE.Material[] };
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
  if (kind === 'plane') return 'Yerel düzlem şeması · küresel harita projeksiyonu uygulanmaz';
  return 'Kuzey kutup merkezli azimutal kartografik referans';
}

export function WorldModelViewport({
  kind,
  observerLatitudeDeg,
  observerLongitudeDeg,
  targetLatitudeDeg,
  targetLongitudeDeg
}: WorldModelViewportProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');

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
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.className = 'world-model-canvas';
      container.appendChild(renderer.domElement);

      const world = new THREE.Group();
      scene.add(world);
      scene.add(new THREE.HemisphereLight(0xbfe8ff, 0x17212b, 1.5));
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.7);
      keyLight.position.set(3, 4, 5);
      scene.add(keyLight);

      const observerCoordinate = { latitudeDeg: observerLatitudeDeg, longitudeDeg: observerLongitudeDeg };
      const targetCoordinate = { latitudeDeg: targetLatitudeDeg, longitudeDeg: targetLongitudeDeg };

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
        addGlobeGrid(world, radius * 1.004);

        const observerPosition = vector(latitudeLongitudeToSpherePoint(observerCoordinate, radius * 1.02));
        const targetPosition = vector(latitudeLongitudeToSpherePoint(targetCoordinate, radius * 1.02));
        world.add(
          pin(observerPosition, 0xffa94d, observerPosition),
          pin(targetPosition, 0x58d6ff, targetPosition)
        );

        try {
          const route = buildWgs84VisualizationRoute(observerCoordinate, targetCoordinate, 72)
            .map((coordinate) => vector(latitudeLongitudeToSpherePoint(coordinate, radius * 1.025)));
          world.add(line(route, 0xf2dc72, 0.96));
        } catch {
          world.add(line([observerPosition, targetPosition], 0xf2dc72, 0.75));
        }

        const routeFacing = observerPosition.clone().normalize()
          .add(targetPosition.clone().normalize());
        if (routeFacing.lengthSq() < 1e-8) {
          routeFacing.set(0.8, 0.5, 1);
        }
        routeFacing.normalize();
        camera.position.copy(routeFacing.multiplyScalar(5.35));
        camera.lookAt(0, 0, 0);
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
        addDiskGrid(world, radius, kind === 'plane' ? 0xb79a59 : 0x977cc8);

        if (kind === 'plane') {
          const observerPosition = new THREE.Vector3(-0.92, 0.025, 0);
          const targetPosition = new THREE.Vector3(0.92, 0.025, 0);
          world.add(pin(observerPosition, 0xffa94d), pin(targetPosition, 0x58d6ff));
          world.add(line([
            new THREE.Vector3(-0.92, 0.035, 0),
            new THREE.Vector3(0.92, 0.035, 0)
          ], 0xf2dc72, 0.96));
        } else {
          const observerPosition = vector(latitudeLongitudeToNorthPolarAzimuthalPoint(observerCoordinate, radius * 0.94));
          const targetPosition = vector(latitudeLongitudeToNorthPolarAzimuthalPoint(targetCoordinate, radius * 0.94));
          observerPosition.y = 0.025;
          targetPosition.y = 0.025;
          world.add(pin(observerPosition, 0xffa94d), pin(targetPosition, 0x58d6ff));
          try {
            const route = buildWgs84VisualizationRoute(observerCoordinate, targetCoordinate, 72)
              .map((coordinate) => {
                const point = vector(latitudeLongitudeToNorthPolarAzimuthalPoint(coordinate, radius * 0.94));
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
      controls.target.set(0, 0, 0);
      controls.minDistance = kind === 'globe' ? 3.3 : 2.8;
      controls.maxDistance = kind === 'globe' ? 9 : 7;
      controls.zoomToCursor = true;
      if (kind !== 'globe') {
        controls.minPolarAngle = 0.18;
        controls.maxPolarAngle = Math.PI / 2.15;
      }
      controls.update();

      const render = (): void => {
        if (!renderer || !scene) return;
        renderer.render(scene, camera);
      };
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
        if (scene) disposeScene(scene);
        renderer?.dispose();
        renderer?.domElement.remove();
      };
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'WebGL sahnesi başlatılamadı.';
      setError(message);
      resizeObserver?.disconnect();
      controls?.dispose();
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
    targetLongitudeDeg
  ]);

  return (
    <div className={`world-model-viewport ${kind}`}>
      <div className="world-model-stage" ref={containerRef} />
      <div className="world-model-legend">
        <span><i className="observer" /> Gözlemci</span>
        <span><i className="target" /> Hedef</span>
        <span className="world-model-mode">{labelForKind(kind)}</span>
      </div>
      {error && <div className="world-model-error">WebGL görünümü kullanılamadı: {error}</div>}
    </div>
  );
}
