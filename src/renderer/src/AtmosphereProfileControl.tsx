import { useMemo } from 'react';
import type {
  AtmosphereExperimentState,
  AtmosphereMode,
  AtmosphereProfileSample
} from '../../shared/atmosphere';
import { validateAtmosphereProfile } from '../../simulation/atmosphere-profile';
import { buildOpticalAtmosphereProfile } from '../../simulation/optical-refraction';
import { DraftNumberInput } from './DraftNumberInput';
import { PanelHelpButton } from './HelpSystem';

interface AtmosphereProfileControlProps {
  state: AtmosphereExperimentState;
  standardRefractionCoefficient: number;
  onChange(state: AtmosphereExperimentState): void;
}

const formatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 });

function cloneState(state: AtmosphereExperimentState): AtmosphereExperimentState {
  return {
    ...state,
    profile: {
      ...state.profile,
      samples: state.profile.samples.map((sample) => ({ ...sample }))
    },
    opticalSettings: { ...state.opticalSettings }
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function AtmosphereProfileControl({
  state,
  standardRefractionCoefficient,
  onChange
}: AtmosphereProfileControlProps): React.JSX.Element {
  const profileErrors = useMemo(
    () => validateAtmosphereProfile(state.profile),
    [state.profile]
  );
  const optical = useMemo(() => {
    if (profileErrors.length > 0) return undefined;
    try {
      return buildOpticalAtmosphereProfile(state.profile, state.opticalSettings);
    } catch {
      return undefined;
    }
  }, [profileErrors.length, state.opticalSettings, state.profile]);

  const setMode = (mode: AtmosphereMode): void => {
    onChange({ ...cloneState(state), mode });
  };

  const updateSample = (
    sampleId: string,
    key: keyof Pick<AtmosphereProfileSample, 'altitudeM' | 'temperatureC' | 'pressureHpa' | 'relativeHumidityPercent'>,
    value: number
  ): void => {
    if (!Number.isFinite(value)) return;
    const next = cloneState(state);
    next.profile.samples = next.profile.samples.map((sample) => sample.id === sampleId
      ? {
          ...sample,
          [key]: key === 'relativeHumidityPercent'
            ? clamp(value, 0, 100)
            : value
        }
      : sample);
    onChange(next);
  };

  const addSample = (): void => {
    const next = cloneState(state);
    const last = next.profile.samples[next.profile.samples.length - 1];
    if (!last || next.profile.samples.length >= 1000) return;
    next.profile.samples.push({
      id: crypto.randomUUID(),
      altitudeM: last.altitudeM + 100,
      temperatureC: last.temperatureC - 0.65,
      pressureHpa: Math.max(1, last.pressureHpa - 12),
      relativeHumidityPercent: last.relativeHumidityPercent
    });
    onChange(next);
  };

  const removeSample = (sampleId: string): void => {
    if (state.profile.samples.length <= 2) return;
    const next = cloneState(state);
    next.profile.samples = next.profile.samples.filter((sample) => sample.id !== sampleId);
    onChange(next);
  };

  return (
    <section className={`atmosphere-panel panel mode-${state.mode}`}>
      <div className="atmosphere-heading">
        <div>
          <span className="eyebrow">Atmosfer ve optik kırılma</span>
          <strong>{state.mode === 'off'
            ? 'Atmosfer kapalı'
            : state.mode === 'standard'
              ? `Standart etkin yarıçap · k=${formatter.format(standardRefractionCoefficient)}`
              : `${state.profile.samples.length} örnekli katmanlı meteorolojik profil`}</strong>
        </div>
        <div className="atmosphere-mode-buttons">
          <PanelHelpButton panelId="atmosphere" />
          <button className={state.mode === 'off' ? 'selected' : ''} type="button" onClick={() => setMode('off')}>Kapalı</button>
          <button className={state.mode === 'standard' ? 'selected' : ''} type="button" onClick={() => setMode('standard')}>Standart k</button>
          <button className={state.mode === 'profile' ? 'selected' : ''} type="button" onClick={() => setMode('profile')}>Katmanlı profil</button>
        </div>
      </div>

      {state.mode === 'off' && (
        <p className="atmosphere-note">Işık yolu yalnız seçilen yüzey geometrisiyle değerlendirilir; atmosferik kırılma uygulanmaz.</p>
      )}

      {state.mode === 'standard' && (
        <p className="atmosphere-note">Mevcut hızlı yaklaşım korunur: İdeal Küre etkin yarıçapı <code>R/(1-k)</code> ile hesaplar. Katmanlı meteorolojik profil bu modda fiziksel sonuca karışmaz.</p>
      )}

      {state.mode === 'profile' && (
        <>
          <div className="atmosphere-settings-grid">
            <label className="input-field">
              <span>Profil kaynağı</span>
              <input
                type="text"
                value={state.profile.sourceLabel}
                onChange={(event) => {
                  const next = cloneState(state);
                  next.profile.sourceLabel = event.currentTarget.value;
                  onChange(next);
                }}
              />
            </label>
            <label className="input-field">
              <span>Vakum dalga boyu</span>
              <div><DraftNumberInput
                min={300}
                max={1690}
                step={1}
                value={state.opticalSettings.wavelengthNm}
                onCommit={(value) => {
                  const next = cloneState(state);
                  next.opticalSettings.wavelengthNm = value;
                  onChange(next);
                }}
              /><b>nm</b></div>
            </label>
            <label className="input-field">
              <span>CO₂</span>
              <div><DraftNumberInput
                min={0}
                max={2000}
                step={1}
                value={state.opticalSettings.carbonDioxidePpm}
                onCommit={(value) => {
                  const next = cloneState(state);
                  next.opticalSettings.carbonDioxidePpm = value;
                  onChange(next);
                }}
              /><b>ppm</b></div>
            </label>
            <label className="input-field">
              <span>Işın adımı</span>
              <div><DraftNumberInput
                min={1}
                max={5000}
                step={1}
                value={state.rayTraceStepM}
                onCommit={(value) => onChange({ ...cloneState(state), rayTraceStepM: value })}
              /><b>m</b></div>
            </label>
          </div>

          <div className="atmosphere-sample-table-wrap">
            <table className="atmosphere-sample-table">
              <thead><tr><th>Yükseklik</th><th>Sıcaklık</th><th>Basınç</th><th>Bağıl nem</th><th>Optik N</th><th /></tr></thead>
              <tbody>
                {state.profile.samples.map((sample, index) => {
                  const opticalSample = optical?.samples[index];
                  return (
                    <tr key={sample.id}>
                      <td><DraftNumberInput step={1} value={sample.altitudeM} onCommit={(value) => updateSample(sample.id, 'altitudeM', value)} /><span>m</span></td>
                      <td><DraftNumberInput step={0.1} value={sample.temperatureC} onCommit={(value) => updateSample(sample.id, 'temperatureC', value)} /><span>°C</span></td>
                      <td><DraftNumberInput step={0.1} value={sample.pressureHpa} onCommit={(value) => updateSample(sample.id, 'pressureHpa', value)} /><span>hPa</span></td>
                      <td><DraftNumberInput min={0} max={100} step={1} value={sample.relativeHumidityPercent} onCommit={(value) => updateSample(sample.id, 'relativeHumidityPercent', value)} /><span>%</span></td>
                      <td>{opticalSample ? formatter.format(opticalSample.refractivityN) : '—'}</td>
                      <td><button disabled={state.profile.samples.length <= 2} type="button" onClick={() => removeSample(sample.id)}>Sil</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="atmosphere-actions-row">
            <button type="button" onClick={addSample}>+ Katman örneği ekle</button>
            <span>{profileErrors.length === 0 ? 'Meteorolojik profil geçerli' : `${profileErrors.length} profil hatası`}</span>
          </div>

          {profileErrors.length > 0 ? (
            <div className="atmosphere-errors">{profileErrors.map((error) => <p key={error}>{error}</p>)}</div>
          ) : optical ? (
            <div className="atmosphere-layer-summary">
              {optical.layers.slice(0, 6).map((layer, index) => (
                <span key={`${layer.lower.id}-${layer.upper.id}`}>
                  Katman {index + 1}: dN/dh {formatter.format(layer.refractivityGradientNPerKm)} N/km · yerel k {formatter.format(layer.effectiveK)}
                </span>
              ))}
              {optical.layers.length > 6 && <span>+ {optical.layers.length - 6} katman</span>}
            </div>
          ) : (
            <p className="atmosphere-errors">Profil meteorolojik olarak geçerli, ancak seçilen değerler Ciddor optik çalışma aralığının dışında.</p>
          )}

          <p className="atmosphere-note important">Katman yükseklikleri deneydeki zemin/hedef kotlarıyla aynı düşey referansta yorumlanır. Profil ölçüm kapsamı dışında otomatik ekstrapolasyon yapılmaz. Bu sürümde profil modu kaydedilir ve optik tanıları üretir; İdeal Küre görünürlük sonucuna fiziksel bağlantı bir sonraki 4.4 adımında etkinleştirilecektir.</p>
        </>
      )}
    </section>
  );
}
