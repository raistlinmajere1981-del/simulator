from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    Path(path).write_text(content, encoding='utf-8')


def replace_once(path: str, old: str, new: str, label: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected one match, found {count}')
    write(path, text.replace(old, new, 1))


write('src/simulation/terrain-profile-drag.ts', """import type { ManualTerrainPoint } from '../shared/terrain';
import { sortManualTerrainPoints } from './manual-terrain-profile';

export const MIN_TERRAIN_POINT_DISTANCE_PERCENT = 0.001;
export const MIN_TERRAIN_POINT_ELEVATION_M = -12_000;
export const MAX_TERRAIN_POINT_ELEVATION_M = 100_000;

export interface TerrainPointDragBounds {
  minimumDistancePercent: number;
  maximumDistancePercent: number;
}

export interface TerrainPointDragDeltaInput extends TerrainPointDragBounds {
  startDistancePercent: number;
  startElevationM: number;
  deltaXpx: number;
  deltaYpx: number;
  viewportWidthPx: number;
  viewportHeightPx: number;
  elevationSpanM: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function rounded(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function getTerrainPointDragBounds(
  points: readonly ManualTerrainPoint[],
  pointId: string
): TerrainPointDragBounds {
  const sorted = sortManualTerrainPoints(points);
  const index = sorted.findIndex((point) => point.id === pointId);
  if (index < 0) throw new RangeError(`Arazi noktası bulunamadı: ${pointId}.`);

  const previous = sorted[index - 1];
  const next = sorted[index + 1];
  const minimumDistancePercent = previous
    ? previous.distancePercent + MIN_TERRAIN_POINT_DISTANCE_PERCENT
    : MIN_TERRAIN_POINT_DISTANCE_PERCENT;
  const maximumDistancePercent = next
    ? next.distancePercent - MIN_TERRAIN_POINT_DISTANCE_PERCENT
    : 100 - MIN_TERRAIN_POINT_DISTANCE_PERCENT;

  if (minimumDistancePercent > maximumDistancePercent) {
    throw new RangeError('Arazi noktası komşuları arasında sürükleme alanı kalmadı.');
  }

  return { minimumDistancePercent, maximumDistancePercent };
}

export function terrainPointFromDragDelta(
  input: TerrainPointDragDeltaInput
): Pick<ManualTerrainPoint, 'distancePercent' | 'elevationM'> {
  if (!Number.isFinite(input.viewportWidthPx) || input.viewportWidthPx <= 0 ||
    !Number.isFinite(input.viewportHeightPx) || input.viewportHeightPx <= 0) {
    throw new RangeError('Profil grafiği boyutları sürükleme için geçerli değil.');
  }
  if (!Number.isFinite(input.elevationSpanM) || input.elevationSpanM <= 0) {
    throw new RangeError('Profil yükseklik aralığı sürükleme için geçerli değil.');
  }

  const distanceDeltaPercent = input.deltaXpx / (input.viewportWidthPx * 0.92) * 100;
  const elevationDeltaM = -input.deltaYpx / (input.viewportHeightPx * 0.72) *
    input.elevationSpanM;

  return {
    distancePercent: rounded(clamp(
      input.startDistancePercent + distanceDeltaPercent,
      input.minimumDistancePercent,
      input.maximumDistancePercent
    )),
    elevationM: rounded(clamp(
      input.startElevationM + elevationDeltaM,
      MIN_TERRAIN_POINT_ELEVATION_M,
      MAX_TERRAIN_POINT_ELEVATION_M
    ))
  };
}
""")

write('tests/terrain-profile-drag.test.ts', """import { describe, expect, it } from 'vitest';
import {
  getTerrainPointDragBounds,
  terrainPointFromDragDelta
} from '../src/simulation/terrain-profile-drag';

const points = [
  { id: 'a', distancePercent: 20, elevationM: 5 },
  { id: 'b', distancePercent: 50, elevationM: 10 },
  { id: 'c', distancePercent: 80, elevationM: 15 }
];

describe('terrain profile point dragging', () => {
  it('limits horizontal movement to neighbouring points', () => {
    expect(getTerrainPointDragBounds(points, 'b')).toEqual({
      minimumDistancePercent: 20.001,
      maximumDistancePercent: 79.999
    });
  });

  it('converts pointer movement into distance and elevation changes', () => {
    const result = terrainPointFromDragDelta({
      startDistancePercent: 50,
      startElevationM: 10,
      deltaXpx: 92,
      deltaYpx: -72,
      viewportWidthPx: 1_000,
      viewportHeightPx: 1_000,
      elevationSpanM: 100,
      minimumDistancePercent: 20.001,
      maximumDistancePercent: 79.999
    });

    expect(result.distancePercent).toBe(60);
    expect(result.elevationM).toBe(20);
  });

  it('clamps movement at neighbour and elevation limits', () => {
    const result = terrainPointFromDragDelta({
      startDistancePercent: 50,
      startElevationM: 0,
      deltaXpx: 10_000,
      deltaYpx: -10_000,
      viewportWidthPx: 100,
      viewportHeightPx: 100,
      elevationSpanM: 100_000,
      minimumDistancePercent: 20.001,
      maximumDistancePercent: 79.999
    });

    expect(result.distancePercent).toBe(79.999);
    expect(result.elevationM).toBe(100_000);
  });

  it('rejects missing points and invalid viewport sizes', () => {
    expect(() => getTerrainPointDragBounds(points, 'missing')).toThrow('bulunamadı');
    expect(() => terrainPointFromDragDelta({
      startDistancePercent: 50,
      startElevationM: 0,
      deltaXpx: 0,
      deltaYpx: 0,
      viewportWidthPx: 0,
      viewportHeightPx: 100,
      elevationSpanM: 10,
      minimumDistancePercent: 0.001,
      maximumDistancePercent: 99.999
    })).toThrow('boyutları');
  });
});
""")

editor_path = 'src/renderer/src/MultiPointTerrainEditor.tsx'
replace_once(
    editor_path,
    "import { useMemo, useState } from 'react';",
    "import { useMemo, useRef, useState } from 'react';",
    'React useRef import'
)
replace_once(
    editor_path,
    """import {
  insertManualTerrainPoint,
  removeManualTerrainPoint,
  sortManualTerrainPoints,
  updateManualTerrainPoint,
  validateManualTerrainPoints
} from '../../simulation/manual-terrain-profile';
""",
    """import {
  insertManualTerrainPoint,
  removeManualTerrainPoint,
  sortManualTerrainPoints,
  updateManualTerrainPoint,
  validateManualTerrainPoints
} from '../../simulation/manual-terrain-profile';
import {
  getTerrainPointDragBounds,
  terrainPointFromDragDelta
} from '../../simulation/terrain-profile-drag';
""",
    'drag helper import'
)
replace_once(
    editor_path,
    """interface PreviewPoint {
  id: string;
  distancePercent: number;
  elevationM: number;
  endpoint: boolean;
}
""",
    """interface PreviewPoint {
  id: string;
  distancePercent: number;
  elevationM: number;
  endpoint: boolean;
}

interface TerrainPointDragState {
  pointerId: number;
  pointId: string;
  startClientX: number;
  startClientY: number;
  startDistancePercent: number;
  startElevationM: number;
  minimumDistancePercent: number;
  maximumDistancePercent: number;
  elevationSpanM: number;
}
""",
    'drag state interface'
)
replace_once(
    editor_path,
    """  const [importMessage, setImportMessage] = useState('');
  const [isImporting, setIsImporting] = useState(false);
""",
    """  const [importMessage, setImportMessage] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const dragState = useRef<TerrainPointDragState>();
""",
    'drag state ref'
)
replace_once(
    editor_path,
    """  const apply = (operation: () => ManualTerrainPoint[]): void => {
""",
    """  const beginTerrainPointDrag = (
    event: React.PointerEvent<SVGCircleElement>,
    point: PreviewPoint
  ): void => {
    if (disabled || point.endpoint) return;
    const bounds = getTerrainPointDragBounds(sortedPoints, point.id);
    const elevationSpanM = Math.max(
      10,
      preview.maximumElevationM - preview.minimumElevationM
    ) * 1.5;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = {
      pointerId: event.pointerId,
      pointId: point.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startDistancePercent: point.distancePercent,
      startElevationM: point.elevationM,
      minimumDistancePercent: bounds.minimumDistancePercent,
      maximumDistancePercent: bounds.maximumDistancePercent,
      elevationSpanM
    };
  };

  const moveTerrainPointDrag = (
    event: React.PointerEvent<SVGCircleElement>
  ): void => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;
    const viewport = svg.getBoundingClientRect();
    const patch = terrainPointFromDragDelta({
      startDistancePercent: drag.startDistancePercent,
      startElevationM: drag.startElevationM,
      deltaXpx: event.clientX - drag.startClientX,
      deltaYpx: event.clientY - drag.startClientY,
      viewportWidthPx: viewport.width,
      viewportHeightPx: viewport.height,
      elevationSpanM: drag.elevationSpanM,
      minimumDistancePercent: drag.minimumDistancePercent,
      maximumDistancePercent: drag.maximumDistancePercent
    });
    event.preventDefault();
    apply(() => updateManualTerrainPoint(sortedPoints, drag.pointId, patch));
  };

  const endTerrainPointDrag = (
    event: React.PointerEvent<SVGCircleElement>
  ): void => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragState.current = undefined;
  };

  const apply = (operation: () => ManualTerrainPoint[]): void => {
""",
    'pointer drag handlers'
)
old_circle = """              <circle
                className={point.endpoint ? 'preview-endpoint' : 'preview-interior-point'}
                cx={x}
                cy={y}
                key={point.id}
                r={point.endpoint ? 1.8 : 1.45}
              />
"""
new_circle = """              <circle
                aria-label={point.endpoint ? undefined : `Arazi noktası: rota yüzde ${numberFormatter.format(point.distancePercent)}, yükseklik ${numberFormatter.format(point.elevationM)} metre`}
                className={point.endpoint ? 'preview-endpoint' : 'preview-interior-point draggable'}
                cx={x}
                cy={y}
                key={point.id}
                onPointerCancel={point.endpoint ? undefined : endTerrainPointDrag}
                onPointerDown={point.endpoint ? undefined : (event) => beginTerrainPointDrag(event, point)}
                onPointerMove={point.endpoint ? undefined : moveTerrainPointDrag}
                onPointerUp={point.endpoint ? undefined : endTerrainPointDrag}
                r={point.endpoint ? 1.8 : 1.8}
                role={point.endpoint ? undefined : 'slider'}
                style={point.endpoint ? undefined : { cursor: 'grab', touchAction: 'none' }}
              />
"""
replace_once(editor_path, old_circle, new_circle, 'draggable preview circles')

replace_once('package.json', '"version": "0.9.1"', '"version": "0.9.2"', 'package version')
replace_once(
    'src/preload/index.ts',
    "version: '0.9.1'",
    "version: '0.9.2'",
    'desktop API version'
)
replace_once(
    'docs/terrain-profile.md',
    """## Sınırlar
""",
    """## Grafik üzerinde düzenleme

Manuel ara noktalar profil grafiğindeki işaretlerinden sürüklenebilir. Yatay hareket
rota yüzdesini, düşey hareket zemin yüksekliğini değiştirir. Noktalar komşularını
geçemez; başlangıç ve bitiş uçları sürüklenemez. Her hareket aynı manuel profil
doğrulamasından geçer ve içe aktarılmış bir kaynağı değiştirilmiş olarak işaretler.

## Sınırlar
""",
    'terrain profile drag documentation'
)
replace_once(
    'docs/roadmap.md',
    """## Sonraki gerçek arazi işleri
- Noktaları grafik üzerinde sürükleme
""",
    """## Aşama 3.9 — Profil noktalarını grafik üzerinde sürükleme

Durum: tamamlandı

- Ara noktaların SVG profil grafiğinde pointer ile sürüklenmesi
- Yatay hareketten rota yüzdesi üretimi
- Düşey hareketten zemin yüksekliği üretimi
- Komşu noktaları geçmeyi engelleyen dinamik sınırlar
- Başlangıç ve bitiş uçlarının sabit kalması
- Dokunmatik pointer desteği ve pointer capture
- Aynı manuel profil doğrulama kurallarının kullanılması
- İçe aktarılan kaynakta otomatik değişiklik işareti
- Saf koordinat dönüşümü ve sınır testleri
- Uygulama sürümü `0.9.2`

## Sonraki gerçek arazi işleri
""",
    'roadmap drag stage'
)
