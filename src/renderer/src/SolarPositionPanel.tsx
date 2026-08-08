import type { SolarPositionResult } from '../../simulation/solar-position';
import { PanelHelpButton } from './HelpSystem';
import './solar-position-panel.css';

const angleFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 });
const minuteFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });

function angle(value: number): string {
  return `${angleFormatter.format(value)}°`;
}

export function SolarPositionPanel({
  result,
  onShowTrace
}: {
  result: SolarPositionResult;
  onShowTrace(): void;
}): React.JSX.Element {
  const aboveHorizon = result.elevationDeg >= 0;
  const altitudePercent = Math.max(4, Math.min(96, 50 - result.elevationDeg / 1.8));
  const azimuthPercent = Math.max(4, Math.min(96, result.azimuthDeg / 360 * 100));

  return (
    <section className="solar-position-panel panel">
      <div className="panel-title-row">
        <div>
          <span className="eyebrow">Astronomik referans · Güneş</span>
          <h2>Geometrik yerel konum</h2>
        </div>
        <div className="title-actions">
          <PanelHelpButton panelId="solar-position" />
          <span className={`solar-horizon-badge ${aboveHorizon ? 'above' : 'below'}`}>
            {aboveHorizon ? 'UFUK ÜSTÜNDE' : 'UFUK ALTINDA'}
          </span>
          <button type="button" onClick={onShowTrace}>Hesap izi</button>
        </div>
      </div>

      <div className="solar-sky-reference" aria-hidden="true">
        <span className="solar-sky-horizon" />
        <span className="solar-sky-sun" style={{ left: `${azimuthPercent}%`, top: `${altitudePercent}%` }} />
        <span className="solar-sky-label north">K</span>
        <span className="solar-sky-label east">D</span>
        <span className="solar-sky-label south">G</span>
        <span className="solar-sky-label west">B</span>
      </div>

      <div className="solar-position-metrics">
        <div><small>Geometrik yükseklik</small><strong>{angle(result.elevationDeg)}</strong></div>
        <div><small>Azimut · kuzeyden</small><strong>{angle(result.azimuthDeg)}</strong></div>
        <div><small>Deklinasyon</small><strong>{angle(result.declinationDeg)}</strong></div>
        <div><small>Saat açısı</small><strong>{angle(result.hourAngleDeg)}</strong></div>
        <div><small>Zenit açısı</small><strong>{angle(result.zenithDeg)}</strong></div>
        <div><small>Zaman denklemi</small><strong>{minuteFormatter.format(result.equationOfTimeMinutes)} dk</strong></div>
      </div>

      <p className="solar-position-note">
        Bu sonuç geometrik astronomik referanstır. Atmosferik kırılma, yerel topoğrafik ufuk ve Güneş diskinin görünür kenarı bu 6.1 sonucuna eklenmez.
      </p>
    </section>
  );
}
