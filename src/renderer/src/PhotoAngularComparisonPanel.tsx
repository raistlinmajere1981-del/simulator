import type { ResultStatus } from '../../shared/domain';
import type { PhotoReferenceKind } from '../../shared/photo-calibration';
import type { PhotoAngularComparisonResult } from '../../simulation/photo-angular-comparison';
import './photo-angular-comparison.css';
import { PanelHelpButton } from './HelpSystem';

const statusLabels: Record<ResultStatus, string> = {
  compatible: 'Uyumlu',
  incompatible: 'Uyumsuz',
  indeterminate: 'Karar verilemedi',
  unsupported: 'Desteklenmiyor'
};

function formatAngle(value: number): string {
  return `${value.toLocaleString('tr-TR', { maximumFractionDigits: 4 })}°`;
}

export function PhotoAngularComparisonPanel({
  comparisons,
  referenceKind
}: {
  comparisons: PhotoAngularComparisonResult[];
  referenceKind: PhotoReferenceKind;
}): React.JSX.Element | null {
  if (comparisons.length === 0) return null;

  const hasModelUncertainty = comparisons.some((comparison) =>
    comparison.channels.some((channel) => channel.modelUncertaintyDeg !== undefined)
  );

  return (
    <section className="photo-angular-comparison panel">
      <div className="photo-angular-comparison-heading">
        <div>
          <span className="eyebrow">Fotoğraf açısal gözlem karşılaştırması</span>
          <strong>
            {referenceKind === 'local-horizontal'
              ? 'U1–U2: fiziksel yerel yatay'
              : 'U1–U2: görsel referans'}
          </strong>
        </div>
        <div className="photo-angular-heading-actions"><PanelHelpButton panelId="photo-comparison" /><span className="photo-angular-independent">BAĞIMSIZ GÖZLEM KANALI</span></div>
      </div>

      <p className="photo-angular-note">
        Fotoğraf kalibrasyonu model hesabına girdi olmaz. Model açıları önce hesaplanır,
        ardından bağımsız fotoğraf gözlemiyle karşılaştırılır.
        {referenceKind === 'visual-reference'
          ? ' Referans çizgisi yerel yatay sayılmadığı için yalnız referans ofsetinden bağımsız açısal yükseklik karşılaştırılabilir.'
          : ' Yerel yatay açıkça beyan edildiği için görünür taban/tepe açıları da karşılaştırılabilir.'}
      </p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Model / gösterim</th>
              <th>Açı kanalı</th>
              <th>Fotoğraf</th>
              <th>Model</th>
              <th>Birleşik ±</th>
              <th>Mutlak fark</th>
              <th>Sonuç</th>
            </tr>
          </thead>
          <tbody>
            {comparisons.flatMap((comparison) => {
              if (comparison.channels.length === 0) {
                return [
                  <tr key={`${comparison.sourceModelId}:none`}>
                    <td>{comparison.sourceModelName}</td>
                    <td colSpan={5}>{comparison.prediction.warnings[0] ?? 'Karşılaştırılabilir açı kanalı yok.'}</td>
                    <td>
                      <span className={`photo-compare-status status-${comparison.prediction.status}`}>
                        {statusLabels[comparison.prediction.status]}
                      </span>
                    </td>
                  </tr>
                ];
              }

              return comparison.channels.map((channel, index) => (
                <tr key={`${comparison.sourceModelId}:${channel.key}`}>
                  <td>{index === 0 ? comparison.sourceModelName : ''}</td>
                  <td>{channel.label}</td>
                  <td>{formatAngle(channel.observedDeg)} ±{formatAngle(channel.photoUncertaintyDeg)}</td>
                  <td>
                    {formatAngle(channel.predictedDeg)}
                    {channel.modelUncertaintyDeg === undefined
                      ? ''
                      : ` ±${formatAngle(channel.modelUncertaintyDeg)}`}
                  </td>
                  <td>±{formatAngle(channel.combinedUncertaintyDeg)}</td>
                  <td>{formatAngle(channel.differenceDeg)}</td>
                  <td>
                    <span className={`photo-compare-status status-${channel.status}`}>
                      {channel.status === 'compatible' ? 'Uyumlu' : 'Uyumsuz'}
                    </span>
                  </td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>

      <p className="photo-angular-footnote">
        Uyum ölçütü |model − fotoğraf| ≤ birleşik belirsizliktir. Fotoğraf tarafı piksel işaret
        zarfını ve tanımlanmışsa kamera iç-parametre belirsizliğini içerir.
        {hasModelUncertainty
          ? ' Model tarafında kullanıcı tarafından açıkça tanımlanan girdi belirsizlikleri de hassasiyet hesabıyla zarfa katılmıştır.'
          : ' Model girdi belirsizliği tanımlanmadıysa model tarafına varsayımsal ± değer eklenmez.'}
      </p>
    </section>
  );
}
