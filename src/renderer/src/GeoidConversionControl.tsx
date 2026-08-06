import { useMemo, useState } from 'react';
import type { ManualTerrainPoint, VerticalDatumKind } from '../../shared/terrain';
import type { GeoidHeightDatum } from '../../simulation/geoid-height-conversion';
import { convertGeoidTerrainProfile } from '../../simulation/geoid-profile-conversion';
import {
  createGeoidConversionApplication,
  type GeoidConversionApplication
} from '../../simulation/geoid-conversion-provenance';
import './geoid-conversion-control.css';

interface GeoidConversionControlProps {
  experimentId: string;
  currentDatum: VerticalDatumKind;
  observerGroundElevationM: number;
  targetGroundElevationM: number;
  points: ManualTerrainPoint[];
  onApply(application: GeoidConversionApplication): void;
}

const numberFormatter = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 3
});

function datumLabel(datum: GeoidHeightDatum): string {
  return datum === 'ellipsoidal-wgs84'
    ? 'WGS84 elipsoidal yükseklik'
    : 'Ortometrik / deniz seviyesi yüksekliği';
}

function isConvertibleDatum(
  datum: VerticalDatumKind
): datum is GeoidHeightDatum {
  return datum === 'ellipsoidal-wgs84' || datum === 'orthometric-msl';
}

export function GeoidConversionControl({
  experimentId,
  currentDatum,
  observerGroundElevationM,
  targetGroundElevationM,
  points,
  onApply
}: GeoidConversionControlProps): React.JSX.Element {
  const [geoidUndulationM, setGeoidUndulationM] = useState(0);
  const [geoidUncertaintyM, setGeoidUncertaintyM] = useState(0);
  const [includeUncertainty, setIncludeUncertainty] = useState(false);
  const [sourceLabel, setSourceLabel] = useState('');
  const [sourceModelVersion, setSourceModelVersion] = useState('');
  const [sourceEpoch, setSourceEpoch] = useState('');
  const [message, setMessage] = useState('');
  const targetDatum: GeoidHeightDatum | null = isConvertibleDatum(currentDatum)
    ? currentDatum === 'ellipsoidal-wgs84'
      ? 'orthometric-msl'
      : 'ellipsoidal-wgs84'
    : null;

  const preview = useMemo(() => {
    if (!targetDatum || !isConvertibleDatum(currentDatum)) return undefined;
    try {
      return {
        status: 'success' as const,
        result: convertGeoidTerrainProfile({
          from: currentDatum,
          to: targetDatum,
          geoidUndulationM,
          ...(includeUncertainty
            ? { geoidUndulationUncertaintyM: geoidUncertaintyM }
            : {}),
          observerGroundElevationM,
          targetGroundElevationM,
          points
        })
      };
    } catch (error) {
      return {
        status: 'error' as const,
        error: error instanceof Error
          ? error.message
          : 'Jeoit yüksekliği dönüşümü hesaplanamadı.'
      };
    }
  }, [
    currentDatum,
    geoidUndulationM,
    geoidUncertaintyM,
    includeUncertainty,
    observerGroundElevationM,
    points,
    targetDatum,
    targetGroundElevationM
  ]);

  if (!targetDatum || !isConvertibleDatum(currentDatum)) {
    return (
      <section className="geoid-conversion-control unavailable">
        <div>
          <small>JEOİT YÜKSEKLİĞİ DÖNÜŞÜMÜ</small>
          <strong>Yerel datum otomatik dönüştürülemez</strong>
        </div>
        <p>
          Dönüşüm için düşey datum alanından WGS84 elipsoidal veya ortometrik
          deniz seviyesi datumunu seçin. Yerel datum açık bir jeodezik bağ olmadan
          değiştirilmez.
        </p>
      </section>
    );
  }

  const canApply = preview?.status === 'success' &&
    sourceLabel.trim().length > 0;

  return (
    <section className="geoid-conversion-control">
      <header>
        <div>
          <small>JEOİT YÜKSEKLİĞİ DÖNÜŞÜMÜ</small>
          <strong>{datumLabel(currentDatum)} → {datumLabel(targetDatum)}</strong>
        </div>
        <b>N = h − H</b>
      </header>

      <div className="geoid-conversion-fields">
        <label>
          <span>Jeoit ondülasyonu N</span>
          <div><input
            max={1_000}
            min={-1_000}
            step={0.01}
            type="number"
            value={geoidUndulationM}
            onChange={(event) => {
              setGeoidUndulationM(event.currentTarget.valueAsNumber);
              setMessage('');
            }}
          /><b>m</b></div>
        </label>
        <label>
          <span>Değerin kaynağı / model etiketi</span>
          <input
            maxLength={120}
            placeholder="Örn. EGM2008 veya kurum grid servisi"
            type="text"
            value={sourceLabel}
            onChange={(event) => {
              setSourceLabel(event.currentTarget.value);
              setMessage('');
            }}
          />
        </label>
        <label>
          <span>Model sürümü / çözünürlüğü</span>
          <input
            maxLength={80}
            placeholder="İsteğe bağlı"
            type="text"
            value={sourceModelVersion}
            onChange={(event) => setSourceModelVersion(event.currentTarget.value)}
          />
        </label>
        <label>
          <span>Model epoku</span>
          <input
            maxLength={80}
            placeholder="İsteğe bağlı, örn. 2008.0"
            type="text"
            value={sourceEpoch}
            onChange={(event) => setSourceEpoch(event.currentTarget.value)}
          />
        </label>
        <label className="geoid-uncertainty-toggle">
          <span>Ondülasyon belirsizliği</span>
          <div>
            <input
              checked={includeUncertainty}
              type="checkbox"
              onChange={(event) => setIncludeUncertainty(event.currentTarget.checked)}
            />
            <input
              disabled={!includeUncertainty}
              max={10_000}
              min={0}
              step={0.01}
              type="number"
              value={geoidUncertaintyM}
              onChange={(event) => setGeoidUncertaintyM(event.currentTarget.valueAsNumber)}
            />
            <b>m</b>
          </div>
        </label>
      </div>

      {preview?.status === 'error' ? (
        <div className="geoid-conversion-error" role="alert">{preview.error}</div>
      ) : preview?.status === 'success' ? (
        <div className="geoid-conversion-preview">
          <span>
            Gözlemci zemin kotu
            <b>{numberFormatter.format(observerGroundElevationM)} → {numberFormatter.format(preview.result.observerGroundElevationM)} m</b>
          </span>
          <span>
            Hedef zemin kotu
            <b>{numberFormatter.format(targetGroundElevationM)} → {numberFormatter.format(preview.result.targetGroundElevationM)} m</b>
          </span>
          <span>
            Arazi örnekleri
            <b>{points.length} nokta · düzeltme {numberFormatter.format(preview.result.correctionM)} m</b>
          </span>
          <span>
            Sonuç belirsizliği
            <b>{preview.result.uncertaintyM === null
              ? 'Hesaplanmadı'
              : `±${numberFormatter.format(preview.result.uncertaintyM)} m`}</b>
          </span>
        </div>
      ) : null}

      <p>
        Aynı N değeri gözlemci, hedef ve bütün arazi örneklerine uygulanır. Değerin
        iki uç ve rota boyunca geçerli olduğunu doğrulayın. Otomatik jeoit modeli
        sorgulanmaz; mevcut datum / gelgit ofseti ayrı tutulur. Kaynak, sürüm,
        epok, N, belirsizlik, yön ve hesap izi deney kaydında korunur.
      </p>
      <div className="geoid-conversion-actions">
        {message && <span role="status">{message}</span>}
        <button
          disabled={!canApply}
          type="button"
          onClick={() => {
            if (!targetDatum || preview?.status !== 'success') return;
            try {
              const application = createGeoidConversionApplication({
                experimentId,
                sourceLabel,
                ...(sourceModelVersion.trim().length === 0
                  ? {}
                  : { sourceModelVersion }),
                ...(sourceEpoch.trim().length === 0 ? {} : { sourceEpoch }),
                appliedAtIso: new Date().toISOString(),
                geoidUndulationM,
                ...(includeUncertainty
                  ? { geoidUndulationUncertaintyM: geoidUncertaintyM }
                  : {}),
                result: preview.result
              });
              onApply(application);
              setMessage(`Dönüşüm ve provenans kaydedildi · ${sourceLabel.trim()}`);
            } catch (error) {
              setMessage(
                error instanceof Error
                  ? error.message
                  : 'Jeoit provenansı oluşturulamadı.'
              );
            }
          }}
        >
          Bütün kotları dönüştür ve provenansı kaydet
        </button>
      </div>
    </section>
  );
}
