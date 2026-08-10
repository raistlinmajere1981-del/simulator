import type { LunarPositionResult } from '../../simulation/lunar-position';
import { calculateSolarEclipseOverlap } from '../../simulation/solar-eclipse-overlap';
import { calculateSolarPosition } from '../../simulation/solar-position';
import { EclipseEventSearchPanel } from './EclipseEventSearchPanel';
import { EclipseOverlapPanel } from './EclipseOverlapPanel';
import { PanelHelpButton } from './HelpSystem';
import './lunar-position-panel.css';

const angleFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 });
const percentFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });
const distanceFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const ageFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });

function angle(value: number): string {
  return `${angleFormatter.format(value)}°`;
}

export function LunarPositionPanel({
  result,
  onShowTrace
}: {
  result: LunarPositionResult;
  onShowTrace(): void;
}): React.JSX.Element {
  const aboveHorizon = result.elevationDeg >= 0;
  const altitudePercent = Math.max(4, Math.min(96, 50 - result.elevationDeg / 1.8));
  const azimuthPercent = Math.max(4, Math.min(96, result.azimuthDeg / 360 * 100));
  const illuminationPercent = result.illuminatedFraction * 100;
  const solarForOverlap = calculateSolarPosition({
    observedAtIso: result.observedAtIso,
    latitudeDeg: result.latitudeDeg,
    longitudeDeg: result.longitudeDeg
  });
  const eclipseOverlap = calculateSolarEclipseOverlap({
    solarPosition: solarForOverlap,
    lunarPosition: result
  });

  return (
    <>
      <section className="lunar-position-panel panel">
        <div className="panel-title-row">
          <div>
            <span className="eyebrow">Astronomik referans · Ay</span>
            <h2>Topocentrik konum ve faz</h2>
          </div>
          <div className="title-actions">
            <PanelHelpButton panelId="lunar-position" />
            <span className={`lunar-horizon-badge ${aboveHorizon ? 'above' : 'below'}`}>
              {aboveHorizon ? 'UFUK ÜSTÜNDE' : 'UFUK ALTINDA'}
            </span>
            <button type="button" onClick={onShowTrace}>Hesap izi</button>
          </div>
        </div>

        <div className="lunar-sky-reference" aria-hidden="true">
          <span className="lunar-sky-horizon" />
          <span className="lunar-sky-moon" style={{ left: `${azimuthPercent}%`, top: `${altitudePercent}%` }}>
            <span style={{ opacity: Math.max(0.12, result.illuminatedFraction) }} />
          </span>
          <span className="lunar-sky-label north">K</span>
          <span className="lunar-sky-label east">D</span>
          <span className="lunar-sky-label south">G</span>
          <span className="lunar-sky-label west">B</span>
          <strong className="lunar-phase-label">{result.phaseName} · %{percentFormatter.format(illuminationPercent)}</strong>
        </div>

        <div className="lunar-position-metrics">
          <div><small>Geometrik yükseklik</small><strong>{angle(result.elevationDeg)}</strong></div>
          <div><small>Azimut · kuzeyden</small><strong>{angle(result.azimuthDeg)}</strong></div>
          <div><small>Aydınlık oranı</small><strong>%{percentFormatter.format(illuminationPercent)}</strong></div>
          <div><small>Faz / yaklaşık yaş</small><strong>{result.phaseName}</strong><em>{ageFormatter.format(result.phaseAgeDays)} gün</em></div>
          <div><small>Güneş-Ay uzanımı</small><strong>{angle(result.elongationDeg)}</strong></div>
          <div><small>Ay uzaklığı</small><strong>{distanceFormatter.format(result.distanceKm)} km</strong></div>
          <div><small>Deklinasyon</small><strong>{angle(result.declinationDeg)}</strong></div>
          <div><small>Yatay paralaks</small><strong>{angle(result.horizontalParallaxDeg)}</strong></div>
        </div>

        <p className="lunar-position-note">
          6.2 sonucu düşük hassasiyetli astronomik referanstır. Ay paralaksı topocentrik olarak uygulanır; atmosferik kırılma, yerel topoğrafik ufuk ve gözlemci rakımı bu sonuca dahil değildir. Güneş–Ay tutulma örtüşme geometrisi aşağıda ayrı Aşama 7.2 tanısı olarak gösterilir.
        </p>
      </section>

      <EclipseOverlapPanel result={eclipseOverlap} />
      <EclipseEventSearchPanel
        anchorObservedAtIso={result.observedAtIso}
        latitudeDeg={result.latitudeDeg}
        longitudeDeg={result.longitudeDeg}
      />
    </>
  );
}
