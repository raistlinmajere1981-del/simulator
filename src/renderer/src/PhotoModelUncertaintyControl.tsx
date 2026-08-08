import type { AtmosphereMode } from '../../shared/atmosphere';
import type { ModelInputUncertaintySettings } from '../../shared/uncertainty';
import './photo-model-uncertainty-control.css';

type NumericKey = Exclude<keyof ModelInputUncertaintySettings, 'combination'>;

const fields: Array<{
  key: NumericKey;
  label: string;
  unit: string;
  step: number;
  standardOnly?: boolean;
}> = [
  { key: 'surfaceDistanceM', label: 'Etkin yüzey mesafesi ±', unit: 'm', step: 0.1 },
  { key: 'observerEyeHeightM', label: 'Göz yüksekliği ±', unit: 'm', step: 0.01 },
  { key: 'observerGroundElevationM', label: 'Gözlemci zemin kotu ±', unit: 'm', step: 0.01 },
  { key: 'targetHeightM', label: 'Hedef yüksekliği ±', unit: 'm', step: 0.01 },
  { key: 'targetGroundElevationM', label: 'Hedef taban kotu ±', unit: 'm', step: 0.01 },
  { key: 'refractionCoefficient', label: 'Kırılma katsayısı k ±', unit: 'k', step: 0.001, standardOnly: true }
];

function definedCount(settings: ModelInputUncertaintySettings): number {
  return fields.filter(({ key }) => {
    const value = settings[key];
    return value !== undefined && Number.isFinite(value) && value > 0;
  }).length;
}

export function PhotoModelUncertaintyControl({
  settings,
  atmosphereMode,
  isCalculating,
  error,
  onChange
}: {
  settings: ModelInputUncertaintySettings;
  atmosphereMode: AtmosphereMode;
  isCalculating: boolean;
  error?: string;
  onChange(settings: ModelInputUncertaintySettings): void;
}): React.JSX.Element {
  const count = definedCount(settings);

  const updateNumber = (key: NumericKey, raw: string): void => {
    const trimmed = raw.trim();
    if (trimmed === '') {
      const next = { ...settings };
      delete next[key];
      onChange(next);
      return;
    }
    const value = Number(trimmed);
    if (!Number.isFinite(value) || value < 0) return;
    onChange({ ...settings, [key]: value });
  };

  return (
    <section className="photo-model-uncertainty panel">
      <div className="photo-model-uncertainty-heading">
        <div>
          <span className="eyebrow">Model girdi belirsizliği</span>
          <strong>Fotoğraf karşılaştırması için hassasiyet zarfı</strong>
        </div>
        <span className={`photo-model-uncertainty-state ${isCalculating ? 'busy' : count > 0 ? 'active' : ''}`}>
          {isCalculating ? 'HESAPLANIYOR…' : count > 0 ? `${count} BİLEŞEN` : 'TANIMLANMADI'}
        </span>
      </div>

      <p className="photo-model-uncertainty-note">
        Bu alanlar modelin nominal girdilerini değiştirmez. Her tanımlı ± aralık için model ayrıca
        alt/üst uçlarda çözülür ve açı hassasiyeti fotoğraf belirsizliğiyle sonradan birleştirilir.
        Boş alan <b>±0</b> anlamına gelmez; “belirsizlik tanımlanmadı” olarak korunur.
      </p>

      <div className="photo-model-uncertainty-grid">
        <label>
          <span>Birleştirme</span>
          <select
            value={settings.combination}
            onChange={(event) => onChange({
              ...settings,
              combination: event.currentTarget.value as ModelInputUncertaintySettings['combination']
            })}
          >
            <option value="linear-conservative">Koruyucu doğrusal toplam</option>
            <option value="rss-independent">RSS · bağımsız bileşenler</option>
          </select>
        </label>
        {fields.map((field) => {
          const disabled = field.standardOnly && atmosphereMode !== 'standard';
          return (
            <label className={disabled ? 'disabled' : ''} key={field.key}>
              <span>{field.label}</span>
              <div>
                <input
                  disabled={disabled}
                  min={0}
                  step={field.step}
                  type="number"
                  placeholder="tanımsız"
                  value={settings[field.key] ?? ''}
                  onChange={(event) => updateNumber(field.key, event.currentTarget.value)}
                />
                <em>{field.unit}</em>
              </div>
            </label>
          );
        })}
      </div>

      {settings.combination === 'rss-independent' && (
        <p className="photo-model-uncertainty-warning">
          RSS yalnız bu belirsizlik bileşenlerinin birbirinden bağımsız olduğu savunulabiliyorsa kullanılmalı.
        </p>
      )}
      {atmosphereMode !== 'standard' && settings.refractionCoefficient !== undefined && (
        <p className="photo-model-uncertainty-warning">
          k belirsizliği kayıtlı olsa bile yalnız Standart k atmosfer modunda fiziksel hesaba yayılır.
        </p>
      )}
      {atmosphereMode === 'profile' && (
        <p className="photo-model-uncertainty-warning">
          Katmanlı atmosferde sıcaklık, basınç ve nem ölçüm belirsizlikleri henüz ayrı veri alanlarına sahip değil;
          bu panel yalnız geometri girdilerini yayar.
        </p>
      )}
      {error && <p className="photo-model-uncertainty-error">{error}</p>}
    </section>
  );
}
