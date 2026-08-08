import type { SimulatorInputs } from '../../shared/simulator';
import { PanelHelpButton } from './HelpSystem';
import './solar-scenario-summary.css';

export function SolarScenarioSummary({
  activeName,
  inputs,
  isDirty,
  onCoordinateChange,
  onReset,
  onSave
}: {
  activeName: string;
  inputs: SimulatorInputs;
  isDirty: boolean;
  onCoordinateChange(key: 'observerLatitudeDeg' | 'observerLongitudeDeg', value: number): void;
  onReset(): void;
  onSave(): void;
}): React.JSX.Element {
  return (
    <section className="scenario-summary panel solar-scenario-summary">
      <div className="panel-title-row">
        <div>
          <span className="eyebrow">Aktif senaryo</span>
          <h2>{activeName || 'Güneş ve Ay Gözlemleri'}</h2>
        </div>
        <div className="title-actions">
          <PanelHelpButton panelId="scenario-summary" />
          {isDirty && <span className="dirty-badge">KAYDEDİLMEDİ</span>}
          <button className="save-button" onClick={onSave} type="button">Deneyi Kaydet</button>
          <button className="reset-button" onClick={onReset} type="button">Yeni / Varsayılan</button>
          <span className="calculation-badge">CANLI HESAPLAMA</span>
        </div>
      </div>

      <div className="solar-location-grid">
        <label className="input-field">
          <span>Gözlemci enlemi</span>
          <div><input min={-90} max={90} step={0.000001} type="number" value={inputs.observerLatitudeDeg} onChange={(event) => onCoordinateChange('observerLatitudeDeg', event.currentTarget.valueAsNumber)} /><b>°</b></div>
        </label>
        <label className="input-field">
          <span>Gözlemci boylamı</span>
          <div><input min={-180} max={180} step={0.000001} type="number" value={inputs.observerLongitudeDeg} onChange={(event) => onCoordinateChange('observerLongitudeDeg', event.currentTarget.valueAsNumber)} /><b>°</b></div>
        </label>
      </div>

      <p className="scenario-scope-note">
        Aşama 6.1 yalnız Güneşin geometrik yerel konumunu hesaplar. Tarih/saat sol alttaki Zaman ve tarih kartından yönetilir. Hedef, rota, arazi, su yüzeyi, fotoğraf görünürlük hesabı ve atmosferik kırılma bu referans hesabına katılmaz. Ay hesabı 6.2’de eklenecektir.
      </p>
    </section>
  );
}
