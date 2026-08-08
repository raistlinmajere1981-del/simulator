import { useEffect, useMemo, useState } from 'react';
import type { VerticalDatumKind } from '../../shared/terrain';
import {
  applyWaterSurfaceToEndpoints,
  WATER_SURFACE_APPLICATION_MODEL_ID,
  type WaterSurfaceApplicationResult,
  type WaterSurfaceApplicationTarget,
  type WaterSurfaceScenario
} from '../../simulation/water-surface-application';
import {
  createWaterSurfaceObservationRecord,
  WATER_SURFACE_OBSERVATION_MODEL_ID,
  type TidePhase,
  type WaterLevelSourceKind,
  type WaterSurfaceObservationRecord,
  type WaterUncertaintyCombination
} from '../../simulation/water-surface-observation';
import { decodeWaterSurfaceObservationSnapshot } from '../../simulation/water-surface-snapshot';
import type { StoredWaterSurfaceRecord } from '../../simulation/water-surface-ui-state';
import { PanelHelpButton } from './HelpSystem';

interface WaterSurfaceControlProps {
  experimentId: string;
  experimentObservedAtIso: string;
  verticalDatumKind: VerticalDatumKind;
  observerGroundElevationM: number;
  targetGroundElevationM: number;
  observationRecord?: StoredWaterSurfaceRecord;
  applicationRecord?: StoredWaterSurfaceRecord;
  onRecord(record: WaterSurfaceObservationRecord): void;
  onApply(result: WaterSurfaceApplicationResult): void;
  onShowTrace(modelId: string): void;
}

const datumLabels: Record<VerticalDatumKind, string> = {
  'orthometric-msl': 'Ortalama deniz seviyesi',
  'ellipsoidal-wgs84': 'WGS84 elipsoidal yükseklik',
  local: 'Yerel düşey referans'
};

const sourceLabels: Record<WaterLevelSourceKind, string> = {
  'manual-observation': 'Manuel gözlem',
  'tide-gauge': 'Gelgit ölçer',
  'tide-prediction': 'Gelgit tahmini',
  survey: 'Ölçme / nivelman'
};

const phaseLabels: Record<TidePhase, string> = {
  rising: 'Yükseliyor',
  falling: 'Alçalıyor',
  'high-water': 'Yüksek su',
  'low-water': 'Alçak su',
  slack: 'Durgun geçiş',
  unknown: 'Bilinmiyor'
};

const targetLabels: Record<WaterSurfaceApplicationTarget, string> = {
  'observer-ground': 'Yalnız gözlemci zemini',
  'target-ground': 'Yalnız hedef tabanı',
  'both-endpoints': 'İki uç kotu'
};

const scenarioLabels: Record<WaterSurfaceScenario, string> = {
  mean: 'Anlık / ortalama su seviyesi',
  'lower-bound': 'Alt belirsizlik sınırı',
  'upper-bound': 'Üst belirsizlik sınırı'
};

const metres = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 });
const minutes = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });

function optionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  const parsed = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(parsed)) throw new RangeError('Sayısal alan geçerli bir sayı olmalı.');
  return parsed;
}

function requiredNumber(value: string, label: string): number {
  const parsed = optionalNumber(value);
  if (parsed === undefined) throw new RangeError(`${label} zorunludur.`);
  return parsed;
}

function formatIso(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('tr-TR');
}

export function WaterSurfaceControl({
  experimentId,
  experimentObservedAtIso,
  verticalDatumKind,
  observerGroundElevationM,
  targetGroundElevationM,
  observationRecord,
  applicationRecord,
  onRecord,
  onApply,
  onShowTrace
}: WaterSurfaceControlProps): React.JSX.Element {
  const [sourceKind, setSourceKind] = useState<WaterLevelSourceKind>('manual-observation');
  const [sourceLabel, setSourceLabel] = useState('Manuel su seviyesi');
  const [stationLabel, setStationLabel] = useState('');
  const [observedAtIso, setObservedAtIso] = useState(experimentObservedAtIso);
  const [sourceIssuedAtIso, setSourceIssuedAtIso] = useState('');
  const [waterLevel, setWaterLevel] = useState('0');
  const [waterUncertainty, setWaterUncertainty] = useState('');
  const [waveUncertainty, setWaveUncertainty] = useState('');
  const [significantWaveHeight, setSignificantWaveHeight] = useState('');
  const [tidePhase, setTidePhase] = useState<TidePhase>('unknown');
  const [combination, setCombination] = useState<WaterUncertaintyCombination>('linear-conservative');
  const [notes, setNotes] = useState('');
  const [target, setTarget] = useState<WaterSurfaceApplicationTarget>('both-endpoints');
  const [scenario, setScenario] = useState<WaterSurfaceScenario>('mean');
  const [maximumTimeDifference, setMaximumTimeDifference] = useState('180');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!observationRecord) setObservedAtIso(experimentObservedAtIso);
  }, [experimentObservedAtIso, observationRecord]);

  const snapshotResult = useMemo(() => {
    if (!observationRecord) return { snapshot: undefined, error: '' };
    try {
      return {
        snapshot: decodeWaterSurfaceObservationSnapshot(observationRecord.prediction),
        error: ''
      };
    } catch (error) {
      return {
        snapshot: undefined,
        error: error instanceof Error ? error.message : 'Su yüzeyi kaydı çözülemedi.'
      };
    }
  }, [observationRecord]);

  const snapshot = snapshotResult.snapshot;
  const applicationSurface = applicationRecord?.prediction.metrics.find(
    (metric) => metric.key === 'appliedWaterSurfaceM'
  )?.value ?? null;
  const applicationTimeDifference = applicationRecord?.prediction.metrics.find(
    (metric) => metric.key === 'waterObservationTimeDifferenceMinutes'
  )?.value ?? null;

  const createRecord = (): void => {
    try {
      const record = createWaterSurfaceObservationRecord({
        experimentId,
        sourceLabel,
        sourceKind,
        observedAtIso,
        recordedAtIso: new Date().toISOString(),
        verticalDatumKind,
        waterLevelM: requiredNumber(waterLevel, 'Su seviyesi'),
        waterLevelUncertaintyM: optionalNumber(waterUncertainty),
        waveVerticalUncertaintyM: optionalNumber(waveUncertainty),
        significantWaveHeightM: optionalNumber(significantWaveHeight),
        uncertaintyCombination: combination,
        tidePhase,
        ...(stationLabel.trim() ? { stationLabel: stationLabel.trim() } : {}),
        ...(sourceIssuedAtIso.trim() ? { sourceIssuedAtIso: sourceIssuedAtIso.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {})
      });
      onRecord(record);
      setMessage('Su yüzeyi kaydı deneye eklendi. Uygulamadan önce özet ve belirsizlik sınırlarını kontrol edin.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Su yüzeyi kaydı oluşturulamadı.');
    }
  };

  const applyRecord = (): void => {
    if (!snapshot) {
      setMessage(snapshotResult.error || 'Önce geçerli bir su yüzeyi kaydı oluşturun.');
      return;
    }
    try {
      const result = applyWaterSurfaceToEndpoints({
        experimentId,
        experimentObservedAtIso,
        experimentVerticalDatumKind: verticalDatumKind,
        observerGroundElevationM,
        targetGroundElevationM,
        snapshot,
        target,
        scenario,
        appliedAtIso: new Date().toISOString(),
        maximumTimeDifferenceMinutes: optionalNumber(maximumTimeDifference)
      });
      onApply(result);
      setMessage(
        `${scenarioLabels[scenario]} ${targetLabels[target].toLocaleLowerCase('tr-TR')} alanına ${metres.format(result.appliedWaterSurfaceM)} m olarak uygulandı.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Su yüzeyi uygulanamadı.');
    }
  };

  return (
    <section className="water-surface-panel panel">
      <div className="water-surface-heading">
        <div>
          <span className="eyebrow">Su seviyesi, gelgit ve dalga</span>
          <strong>Kontrollü su yüzeyi kaydı</strong>
        </div>
        <div className="water-heading-actions"><PanelHelpButton panelId="water-surface" /><span className="water-datum-badge">{datumLabels[verticalDatumKind]}</span></div>
      </div>

      <p className="water-surface-intro">
        Su seviyesi otomatik geometri düzeltmesi değildir. Önce kaynak ve belirsizlik kaydedilir;
        ardından yalnız seçilen uç kotlarına açık bir işlem olarak uygulanır.
      </p>

      <div className="water-surface-grid">
        <div className="water-form-card">
          <div className="water-form-title">
            <strong>1. Su yüzeyi gözlemi</strong>
            <span>Deney referans zamanı: {formatIso(experimentObservedAtIso)}</span>
          </div>

          <div className="water-fields">
            <label>
              <span>Kaynak türü</span>
              <select value={sourceKind} onChange={(event) => setSourceKind(event.currentTarget.value as WaterLevelSourceKind)}>
                {Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              <span>Kaynak etiketi</span>
              <input value={sourceLabel} onChange={(event) => setSourceLabel(event.currentTarget.value)} />
            </label>
            <label>
              <span>İstasyon / ölçüm noktası</span>
              <input placeholder="İsteğe bağlı" value={stationLabel} onChange={(event) => setStationLabel(event.currentTarget.value)} />
            </label>
            <label>
              <span>Gözlem zamanı (ISO + saat dilimi)</span>
              <input value={observedAtIso} onChange={(event) => setObservedAtIso(event.currentTarget.value)} />
            </label>
            <label>
              <span>Su seviyesi</span>
              <div className="water-number"><input value={waterLevel} onChange={(event) => setWaterLevel(event.currentTarget.value)} /><b>m</b></div>
            </label>
            <label>
              <span>Su seviyesi belirsizliği</span>
              <div className="water-number"><input placeholder="boş bırakılabilir" value={waterUncertainty} onChange={(event) => setWaterUncertainty(event.currentTarget.value)} /><b>m</b></div>
            </label>
            <label>
              <span>Dalga düşey belirsizliği</span>
              <div className="water-number"><input placeholder="boş bırakılabilir" value={waveUncertainty} onChange={(event) => setWaveUncertainty(event.currentTarget.value)} /><b>m</b></div>
            </label>
            <label>
              <span>Anlamlı dalga yüksekliği Hs</span>
              <div className="water-number"><input placeholder="yalnız provenans" value={significantWaveHeight} onChange={(event) => setSignificantWaveHeight(event.currentTarget.value)} /><b>m</b></div>
            </label>
            <label>
              <span>Gelgit evresi</span>
              <select value={tidePhase} onChange={(event) => setTidePhase(event.currentTarget.value as TidePhase)}>
                {Object.entries(phaseLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              <span>Belirsizlik birleşimi</span>
              <select value={combination} onChange={(event) => setCombination(event.currentTarget.value as WaterUncertaintyCombination)}>
                <option value="linear-conservative">Koruyucu doğrusal toplam</option>
                <option value="rss-independent">RSS · bağımsız bileşenler</option>
              </select>
            </label>
            {sourceKind === 'tide-prediction' && (
              <label>
                <span>Tahmin yayın zamanı (ISO)</span>
                <input placeholder="İsteğe bağlı" value={sourceIssuedAtIso} onChange={(event) => setSourceIssuedAtIso(event.currentTarget.value)} />
              </label>
            )}
            <label className="water-notes-field">
              <span>Not</span>
              <input placeholder="Kaynak, koşul veya ölçüm notu" value={notes} onChange={(event) => setNotes(event.currentTarget.value)} />
            </label>
          </div>

          <button className="water-primary-button" type="button" onClick={createRecord}>Su yüzeyi kaydını oluştur</button>
        </div>

        <div className="water-apply-card">
          <div className="water-form-title">
            <strong>2. Fiziksel uygulama</strong>
            <span>Yalnız seçilen uç kotları değişir.</span>
          </div>

          {snapshot ? (
            <div className="water-record-summary">
              <div><small>Kaydedilen yüzey</small><strong>{metres.format(snapshot.waterLevelM)} m</strong></div>
              <div><small>Birleşik belirsizlik</small><strong>{snapshot.combinedUncertaintyM === null ? '—' : `±${metres.format(snapshot.combinedUncertaintyM)} m`}</strong></div>
              <div><small>Alt sınır</small><strong>{snapshot.lowerWaterSurfaceM === null ? '—' : `${metres.format(snapshot.lowerWaterSurfaceM)} m`}</strong></div>
              <div><small>Üst sınır</small><strong>{snapshot.upperWaterSurfaceM === null ? '—' : `${metres.format(snapshot.upperWaterSurfaceM)} m`}</strong></div>
              <div className="wide"><small>Kaynak</small><strong>{sourceLabels[snapshot.sourceKind]} · {snapshot.sourceLabel}</strong></div>
              <div className="wide"><small>Gözlem zamanı</small><strong>{formatIso(snapshot.observedAtIso)}</strong></div>
            </div>
          ) : (
            <div className="water-empty-record">{snapshotResult.error || 'Henüz kayıtlı su yüzeyi gözlemi yok.'}</div>
          )}

          <div className="water-application-fields">
            <label>
              <span>Uygulama hedefi</span>
              <select value={target} onChange={(event) => setTarget(event.currentTarget.value as WaterSurfaceApplicationTarget)}>
                {Object.entries(targetLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              <span>Su yüzeyi senaryosu</span>
              <select value={scenario} onChange={(event) => setScenario(event.currentTarget.value as WaterSurfaceScenario)}>
                {Object.entries(scenarioLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              <span>Azami zaman farkı</span>
              <div className="water-number"><input value={maximumTimeDifference} onChange={(event) => setMaximumTimeDifference(event.currentTarget.value)} /><b>dk</b></div>
            </label>
          </div>

          <button className="water-apply-button" disabled={!snapshot} type="button" onClick={applyRecord}>Seçilen su yüzeyini uygula</button>

          <div className="water-trace-actions">
            <button disabled={!observationRecord} type="button" onClick={() => onShowTrace(WATER_SURFACE_OBSERVATION_MODEL_ID)}>Gözlem hesap izi</button>
            <button disabled={!applicationRecord} type="button" onClick={() => onShowTrace(WATER_SURFACE_APPLICATION_MODEL_ID)}>Uygulama hesap izi</button>
          </div>
        </div>
      </div>

      {applicationRecord && (
        <div className={`water-application-strip ${applicationRecord.prediction.status === 'indeterminate' ? 'historical' : ''}`}>
          <div>
            <strong>{applicationRecord.prediction.status === 'indeterminate' ? 'Tarihsel su uygulaması' : 'Etkin su uygulaması'}</strong>
            <span>
              {applicationSurface === null ? '—' : `${metres.format(applicationSurface)} m`}
              {applicationTimeDifference === null ? '' : ` · zaman farkı ${minutes.format(applicationTimeDifference)} dk`}
            </span>
          </div>
          <span>{applicationRecord.prediction.status === 'indeterminate' ? 'SONRADAN DEĞİŞTİRİLDİ' : 'DENEY DURUMUYLA EŞLEŞİYOR'}</span>
        </div>
      )}

      {message && <div className="water-message">{message}</div>}
    </section>
  );
}
