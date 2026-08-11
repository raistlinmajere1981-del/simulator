import type { AtmosphereMode } from '../../../shared/atmosphere';
import type { SimulatorInputs } from '../../../shared/simulator';
import { datumLabels } from './app-config';
import { formatMetres, numberFormatter } from './app-formatters';

export function ObservationPanel({ inputs }: { inputs: SimulatorInputs }): React.JSX.Element {
  return (
    <section className="observation panel">
      <div className="observation-heading">
        <span className="eyebrow">Gözlem referansı</span>
        <span className="reference-mode">SAYISAL GİRDİ</span>
      </div>
      <div className="observation-image">
        <div className="reticle">＋</div>
        <div className="ship"><span /><i /><b /></div>
        <div className="scale">5°<br />2,5°<br />0°<br />−2,5°</div>
      </div>
      <div className="observation-meta">
        <span>Gözlenen: %{numberFormatter.format(inputs.observedVisiblePercent)}</span>
        <span>Belirsizlik: ±%{numberFormatter.format(inputs.observationUncertaintyPercent)}</span>
        <span>Fotoğraf ölçümü aşağıdaki kalibrasyon panelinden eklenebilir.</span>
      </div>
      <p className="engine-note">
        Görsel açıklayıcıdır. Karşılaştırma, sayısal görünürlük ve belirsizlik girdileriyle yapılır.
      </p>
    </section>
  );
}

export function HorizonReferencePanel({
  inputs,
  atmosphereMode
}: {
  inputs: SimulatorInputs;
  atmosphereMode: AtmosphereMode;
}): React.JSX.Element {
  const observerTotalElevationM = inputs.observerGroundElevationM +
    inputs.verticalDatumOffsetM + inputs.observerHeightM;
  return (
    <section className="observation panel horizon-reference-panel">
      <div className="observation-heading">
        <span className="eyebrow">Ufuk deney özeti</span>
        <span className="reference-mode">GEOMETRİK HESAP</span>
      </div>
      <div className="horizon-reference-visual">
        <span className="horizon-reference-observer" />
        <span className="horizon-reference-tangent" />
        <span className="horizon-reference-arc" />
      </div>
      <div className="horizon-reference-metrics">
        <div><small>Toplam gözlemci kotu</small><strong>{formatMetres(observerTotalElevationM)}</strong></div>
        <div><small>Düşey datum</small><strong>{datumLabels[inputs.verticalDatumKind]}</strong></div>
        <div><small>Atmosfer</small><strong>{atmosphereMode === 'standard' ? `Standart k=${numberFormatter.format(inputs.refractionCoefficient)}` : atmosphereMode === 'profile' ? 'Katmanlı profil' : 'Kapalı'}</strong></div>
      </div>
      <p className="engine-note">Bu senaryoda hedef görünürlük yüzdesi ölçümü yapılmaz; modellerin geometrik ufuk tanımları karşılaştırılır.</p>
    </section>
  );
}
