import {
  STELLAR_LOCAL_HORIZON_DIRECTIONS,
  type StellarObservationResult,
  type StellarObservationSettings
} from '../../simulation/stellar-observation';
import type { SavedStellarLocalHorizonSource } from '../../shared/stellar-local-horizon-import';
import type { SavedStellarMotionSource } from '../../shared/stellar-motion-source';

export const angleFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });
export const preciseFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 5 });

export type LocalHorizonDirectionKey = (typeof STELLAR_LOCAL_HORIZON_DIRECTIONS)[number]['key'];
export type LocalHorizonDraft = Pick<
  StellarObservationSettings,
  'localHorizonEnabled' | 'localHorizonSourceMode' | LocalHorizonDirectionKey
>;

export const horizonClassLabels: Record<StellarObservationResult['position']['horizonClass'], string> = {
  'circumpolar-above': 'Çevresel · ufkun üstünde',
  'rises-and-sets': 'Doğar ve batar',
  'never-rises': 'Bu enlemde doğmaz',
  'grazes-horizon': 'Ufka teğet / sınır'
};

export function formatAngle(value: number | null): string {
  return value === null ? 'Tanımsız' : `${angleFormatter.format(value)}°`;
}

export function formatDuration(minutes: number | null): string {
  if (minutes === null) return 'Tanımsız';
  if (minutes < 60) return `${angleFormatter.format(minutes)} dk`;
  return `${angleFormatter.format(minutes / 60)} sa`;
}

export function formatClock(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZone: 'UTC'
  }).format(new Date(iso));
}

export function formatImportedAt(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'medium',
    hourCycle: 'h23'
  }).format(new Date(iso));
}

function graphY(altitudeDeg: number): number {
  return Math.max(4, Math.min(96, 50 - (altitudeDeg / 90) * 44));
}

export function trailPolyline(result: StellarObservationResult): string {
  const samples = result.trail.samples;
  if (samples.length < 2) return '';
  const duration = Math.max(result.trail.durationMinutes, 1);
  return samples.map((sample) => {
    const x = 4 + (sample.elapsedMinutes / duration) * 92;
    return `${x.toFixed(2)},${graphY(sample.elevationDeg).toFixed(2)}`;
  }).join(' ');
}

export function apparentTrailPolyline(result: StellarObservationResult): string {
  const samples = result.apparentTrailSamples;
  if (samples.length < 2) return '';
  const duration = Math.max(result.trail.durationMinutes, 1);
  return samples.map((sample) => {
    const x = 4 + (sample.elapsedMinutes / duration) * 92;
    return `${x.toFixed(2)},${graphY(sample.apparentAltitudeDeg).toFixed(2)}`;
  }).join(' ');
}

export function localHorizonPolyline(result: StellarObservationResult): string {
  const localTrail = result.localHorizonTrail;
  if (!localTrail || localTrail.samples.length < 2) return '';
  const duration = Math.max(localTrail.durationMinutes, 1);
  return localTrail.samples
    .filter((sample) => sample.localHorizonAltitudeDeg !== null)
    .map((sample) => {
      const x = 4 + (sample.elapsedMinutes / duration) * 92;
      return `${x.toFixed(2)},${graphY(sample.localHorizonAltitudeDeg!).toFixed(2)}`;
    })
    .join(' ');
}

export function currentLocalHorizonState(result: StellarObservationResult): {
  label: string;
  className: string;
} | null {
  const sample = result.localHorizonTrail?.samples[0];
  if (!sample) return null;
  if (sample.status === 'undefined-azimuth') {
    return { label: 'YEREL UFUK AZİMUTU TANIMSIZ', className: 'stellar-state neutral' };
  }
  if (sample.status === 'below') {
    return { label: 'YEREL UFKUN ALTINDA', className: 'stellar-state below' };
  }
  if (sample.status === 'on-horizon') {
    return { label: 'YEREL UFUK SINIRINDA', className: 'stellar-state neutral' };
  }
  return { label: 'YEREL UFKUN ÜSTÜNDE', className: 'stellar-state visible' };
}

export function localHorizonDraftFromSettings(settings: StellarObservationSettings): LocalHorizonDraft {
  const draft = {
    localHorizonEnabled: settings.localHorizonEnabled,
    localHorizonSourceMode: settings.localHorizonSourceMode
  } as LocalHorizonDraft;
  for (const direction of STELLAR_LOCAL_HORIZON_DIRECTIONS) {
    draft[direction.key] = settings[direction.key];
  }
  return draft;
}

export function localHorizonSignature(settings: StellarObservationSettings): string {
  return [
    settings.localHorizonEnabled ? '1' : '0',
    settings.localHorizonSourceMode,
    ...STELLAR_LOCAL_HORIZON_DIRECTIONS.map((direction) => String(settings[direction.key]))
  ].join('|');
}

export function localHorizonDraftMatchesSettings(
  draft: LocalHorizonDraft,
  settings: StellarObservationSettings
): boolean {
  return draft.localHorizonEnabled === settings.localHorizonEnabled &&
    draft.localHorizonSourceMode === settings.localHorizonSourceMode &&
    STELLAR_LOCAL_HORIZON_DIRECTIONS.every((direction) => draft[direction.key] === settings[direction.key]);
}

export function cloneExternalSource(
  source: SavedStellarLocalHorizonSource | undefined
): SavedStellarLocalHorizonSource | undefined {
  return source
    ? {
        ...source,
        points: source.points.map((point) => ({ ...point })),
        warnings: [...source.warnings],
        ...(source.demDerivation ? { demDerivation: { ...source.demDerivation } } : {}),
        ...(source.panoramaDerivation
          ? { panoramaDerivation: {
              ...source.panoramaDerivation,
              geometry: { ...source.panoramaDerivation.geometry },
              marks: source.panoramaDerivation.marks.map((mark) => ({ ...mark }))
            } }
          : {})
      }
    : undefined;
}

export function externalSourceSignature(source: SavedStellarLocalHorizonSource | undefined): string {
  return source ? `${source.sha256}|${source.fileName}|${source.importedAtIso}` : '';
}

export function cloneMotionSource(source: SavedStellarMotionSource | undefined): SavedStellarMotionSource | undefined {
  return source ? { ...source, entries: source.entries.map((entry) => ({ ...entry })) } : undefined;
}

export function motionSourceSignature(source: SavedStellarMotionSource | undefined): string {
  return source ? `${source.sha256}|${source.fileName}|${source.importedAtIso}|${source.entryCount}` : '';
}
