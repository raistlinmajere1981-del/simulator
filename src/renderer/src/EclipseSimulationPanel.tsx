import type { LunarPositionResult } from '../../simulation/lunar-position';
import { calculateSolarEclipseOverlap } from '../../simulation/solar-eclipse-overlap';
import type { SolarEclipseEventSearchSnapshot } from '../../simulation/solar-eclipse-event-search-prediction';
import type { SolarPositionResult } from '../../simulation/solar-position';
import { EclipseEventSearchPanel } from './EclipseEventSearchPanel';
import { EclipseOverlapPanel } from './EclipseOverlapPanel';

export function EclipseSimulationPanel({
  solarPosition,
  lunarPosition,
  eventSearchSnapshot,
  eventSearchHalfWindowHours,
  onEventSearchHalfWindowHoursChange,
  onEventSearchSnapshotChange,
  onShowOverlapTrace,
  onShowEventSearchTrace
}: {
  solarPosition: SolarPositionResult;
  lunarPosition: LunarPositionResult;
  eventSearchSnapshot?: SolarEclipseEventSearchSnapshot;
  eventSearchHalfWindowHours: number;
  onEventSearchHalfWindowHoursChange(hours: number): void;
  onEventSearchSnapshotChange(snapshot: SolarEclipseEventSearchSnapshot | undefined): void;
  onShowOverlapTrace(): void;
  onShowEventSearchTrace(): void;
}): React.JSX.Element {
  const overlap = calculateSolarEclipseOverlap({ solarPosition, lunarPosition });

  return (
    <div className="celestial-reference-stack">
      <EclipseOverlapPanel result={overlap} onShowTrace={onShowOverlapTrace} />
      <EclipseEventSearchPanel
        anchorObservedAtIso={solarPosition.observedAtIso}
        latitudeDeg={solarPosition.latitudeDeg}
        longitudeDeg={solarPosition.longitudeDeg}
        initialSnapshot={eventSearchSnapshot}
        halfWindowHours={eventSearchHalfWindowHours}
        onHalfWindowHoursChange={onEventSearchHalfWindowHoursChange}
        onSnapshotChange={onEventSearchSnapshotChange}
        onShowTrace={eventSearchSnapshot ? onShowEventSearchTrace : undefined}
      />
    </div>
  );
}
