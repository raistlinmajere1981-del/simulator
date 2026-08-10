import type { SimulatorInputs } from '../../shared/simulator';
import { DraftNumberInput } from './DraftNumberInput';
import { PanelHelpButton } from './HelpSystem';
import './solar-scenario-summary.css';

export function EclipseScenarioSummary({
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
          <h2>{activeName || 'Tutulma Simülasyonları'}</h2>
        </div>
        <div className="title-actions">
          <PanelHelpButton panelId="scenario-summary" />
          {isDirty && <span className="dirty-badge">KAYDEDİLMEDİ</span>}
          <button className="save-button" onClick={onSave} type="button">Deneyi Kaydet</button>
          <button className="reset-button" onClick={onReset} type="button">Yeni / Varsayılan</button>
          <span className="calculation-badge">ANLIK GEOMETRİ</span>
        </div>
      </div>

      <div className="solar-location-grid">
        <label className="input-field">
          <span>Gözlemci enlemi</span>
          <div><DraftNumberInput min={-90} max={90} step={0.000001} value={inputs.observerLatitudeDeg} onCommit={(value) => onCoordinateChange('observerLatitudeDeg', value)} /><b>°</b></div>
        </label>
        <label className="input-field">
          <span>Gözlemci boylamı</span>
          <div><DraftNumberInput min={-180} max={180} step={0.000001} value={inputs.observerLongitudeDeg} onCommit={(value) => onCoordinateChange('observerLongitudeDeg', value)} /><b>°</b></div>
        </label>
      </div>

      <p className="scenario-scope-note">
        Tarih/saat sol alttaki Zaman ve tarih kartından yönetilir. Bu ilk tutulma dilimi seçili anda Güneş ve Ay disklerinin yerel açısal örtüşmesini hesaplar. Temas zamanları, Dünya üzerindeki gölge yolu ve resmi yüksek hassasiyetli tutulma efemerisi henüz üretilmez.
      </p>
    </section>
  );
}
