import { useEffect, useMemo, useState } from 'react';
import type { AtmosphereMode } from '../../shared/atmosphere';
import type { SimulationScenarioId } from '../../shared/scenario';
import type { SimulatorInputs } from '../../shared/simulator';
import type { ModelInputUncertaintySettings } from '../../shared/uncertainty';
import {
  buildExperimentSetupApplication,
  parseExperimentSetupText,
  type ExperimentSetupApplication,
  type ExperimentSetupCandidate,
  type ExperimentSetupFieldId
} from '../../shared/text-experiment-setup';
import './text-experiment-setup.css';

const trNumber = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 6 });

function utcOffsetLabel(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? '-' : '+';
  const absolute = Math.abs(totalMinutes);
  return `${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`;
}

const scenarioLabels: Record<SimulationScenarioId, string> = {
  'target-visibility': 'Hedef Görünürlüğü',
  horizon: 'Ufuk Analizi',
  'long-distance-visibility': 'Uzun Mesafe Görüş',
  'sun-moon-observation': 'Güneş ve Ay Gözlemleri',
  'shadow-observation': 'Gölge Deneyi',
  'stellar-observation': 'Yıldız Gözlemleri',
  'eclipse-simulation': 'Güneş Tutulması Simülasyonu'
};

const atmosphereLabels: Record<AtmosphereMode, string> = {
  off: 'Kapalı',
  standard: 'Standart k',
  profile: 'Katmanlı profil'
};

function currentValue(
  fieldId: ExperimentSetupFieldId,
  current: {
    scenarioId: SimulationScenarioId;
    experimentName: string;
    observedAtIso: string;
    utcOffsetMinutes: number;
    inputs: SimulatorInputs;
    atmosphereMode: AtmosphereMode;
    modelUncertainty: ModelInputUncertaintySettings;
  }
): string {
  const { inputs, modelUncertainty } = current;
  switch (fieldId) {
    case 'scenarioId': return scenarioLabels[current.scenarioId];
    case 'experimentName': return current.experimentName || 'Adsız / yeni deney';
    case 'observedAtUtc': return new Date(current.observedAtIso).toISOString();
    case 'utcOffsetMinutes': return utcOffsetLabel(current.utcOffsetMinutes);
    case 'surfaceDistanceKm': return `${trNumber.format(inputs.surfaceDistanceKm)} km · ${inputs.distanceSource === 'coordinates' ? 'koordinat modu' : 'manuel'}`;
    case 'observerHeightM': return `${trNumber.format(inputs.observerHeightM)} m`;
    case 'targetHeightM': return `${trNumber.format(inputs.targetHeightM)} m`;
    case 'observerGroundElevationM': return `${trNumber.format(inputs.observerGroundElevationM)} m`;
    case 'targetGroundElevationM': return `${trNumber.format(inputs.targetGroundElevationM)} m`;
    case 'observerCoordinates': return `${trNumber.format(inputs.observerLatitudeDeg)}°, ${trNumber.format(inputs.observerLongitudeDeg)}°`;
    case 'targetCoordinates': return `${trNumber.format(inputs.targetLatitudeDeg)}°, ${trNumber.format(inputs.targetLongitudeDeg)}°`;
    case 'observedVisiblePercent': return `%${trNumber.format(inputs.observedVisiblePercent)}`;
    case 'observationUncertaintyPercent': return `±%${trNumber.format(inputs.observationUncertaintyPercent)}`;
    case 'verticalDatumKind':
      return inputs.verticalDatumKind === 'orthometric-msl'
        ? 'Ortalama deniz seviyesi'
        : inputs.verticalDatumKind === 'ellipsoidal-wgs84'
          ? 'WGS84 elipsoidal'
          : 'Yerel düşey referans';
    case 'verticalDatumOffsetM': return `${trNumber.format(inputs.verticalDatumOffsetM)} m`;
    case 'atmosphereMode': return atmosphereLabels[current.atmosphereMode];
    case 'refractionCoefficient': return `k=${trNumber.format(inputs.refractionCoefficient)}`;
    case 'surfaceDistanceUncertaintyM': return modelUncertainty.surfaceDistanceM === undefined ? 'tanımsız' : `±${trNumber.format(modelUncertainty.surfaceDistanceM)} m`;
    case 'observerEyeHeightUncertaintyM': return modelUncertainty.observerEyeHeightM === undefined ? 'tanımsız' : `±${trNumber.format(modelUncertainty.observerEyeHeightM)} m`;
    case 'observerGroundElevationUncertaintyM': return modelUncertainty.observerGroundElevationM === undefined ? 'tanımsız' : `±${trNumber.format(modelUncertainty.observerGroundElevationM)} m`;
    case 'targetHeightUncertaintyM': return modelUncertainty.targetHeightM === undefined ? 'tanımsız' : `±${trNumber.format(modelUncertainty.targetHeightM)} m`;
    case 'targetGroundElevationUncertaintyM': return modelUncertainty.targetGroundElevationM === undefined ? 'tanımsız' : `±${trNumber.format(modelUncertainty.targetGroundElevationM)} m`;
    case 'refractionCoefficientUncertainty': return modelUncertainty.refractionCoefficient === undefined ? 'tanımsız' : `±${trNumber.format(modelUncertainty.refractionCoefficient)}`;
    case 'shadowGnomonHeightM':
    case 'shadowObservedLengthM':
    case 'shadowObservedLengthUncertaintyM':
    case 'shadowObservedAzimuthDeg':
    case 'shadowObservedAzimuthUncertaintyDeg':
    case 'shadowStationBCoordinates':
    case 'shadowStationBGnomonHeightM':
    case 'shadowStationBObservedLengthM':
    case 'shadowStationBObservedLengthUncertaintyM':
    case 'shadowStationBObservedAzimuthDeg':
    case 'shadowStationBObservedAzimuthUncertaintyDeg':
    case 'stellarStarId':
    case 'stellarTrailDurationMinutes':
    case 'stellarSampleIntervalMinutes':
    case 'stellarLocalHorizonEnabled':
    case 'stellarLocalHorizonNorthDeg':
    case 'stellarLocalHorizonNorthEastDeg':
    case 'stellarLocalHorizonEastDeg':
    case 'stellarLocalHorizonSouthEastDeg':
    case 'stellarLocalHorizonSouthDeg':
    case 'stellarLocalHorizonSouthWestDeg':
    case 'stellarLocalHorizonWestDeg':
    case 'stellarLocalHorizonNorthWestDeg':
    case 'eclipseSearchHalfWindowHours': return 'Senaryo özel ayarı';
    case 'cameraCalibration': return 'Fotoğraf panelinden yönetilir';
    case 'waterSurface': return 'Su yüzeyi panelinden yönetilir';
  }
}

function CandidateRow({
  candidate,
  checked,
  current,
  onChecked
}: {
  candidate: ExperimentSetupCandidate;
  checked: boolean;
  current: Parameters<typeof currentValue>[1];
  onChecked(checked: boolean): void;
}): React.JSX.Element {
  const selectable = candidate.status === 'found';
  return (
    <div className={`text-setup-candidate ${candidate.status}`}>
      <label className="text-setup-select">
        <input
          type="checkbox"
          checked={selectable && checked}
          disabled={!selectable}
          onChange={(event) => onChecked(event.currentTarget.checked)}
        />
        <span className={`text-setup-status ${candidate.status}`}>
          {candidate.status === 'found' ? 'BULUNDU' : candidate.status === 'review' ? 'KONTROL GEREKLİ' : 'KULLANILAMADI'}
        </span>
      </label>
      <div className="text-setup-field">
        <strong>{candidate.label}</strong>
        <div className="text-setup-diff">
          <span>{currentValue(candidate.fieldId, current)}</span>
          <b>→</b>
          <span>{candidate.displayValue}</span>
        </div>
        <small>Kaynak: “{candidate.sourceExcerpt}”</small>
        {candidate.reason && <p>{candidate.reason}</p>}
      </div>
    </div>
  );
}

export function TextExperimentSetupDialog({
  open,
  scenarioId,
  experimentName,
  observedAtIso,
  utcOffsetMinutes,
  inputs,
  atmosphereMode,
  modelUncertainty,
  onClose,
  onApply
}: {
  open: boolean;
  scenarioId: SimulationScenarioId;
  experimentName: string;
  observedAtIso: string;
  utcOffsetMinutes: number;
  inputs: SimulatorInputs;
  atmosphereMode: AtmosphereMode;
  modelUncertainty: ModelInputUncertaintySettings;
  onClose(): void;
  onApply(application: ExperimentSetupApplication): void;
}): React.JSX.Element | null {
  const [text, setText] = useState('');
  const [draftText, setDraftText] = useState<string>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const draft = useMemo(() => draftText === undefined ? undefined : parseExperimentSetupText(draftText), [draftText]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, open]);

  if (!open) return null;

  const current = { scenarioId, experimentName, observedAtIso, utcOffsetMinutes, inputs, atmosphereMode, modelUncertainty };
  const foundCount = draft?.candidates.filter((candidate) => candidate.status === 'found').length ?? 0;
  const reviewCount = draft?.candidates.filter((candidate) => candidate.status === 'review').length ?? 0;
  const unavailableCount = draft?.candidates.filter((candidate) => candidate.status === 'unavailable').length ?? 0;

  const prepare = (): void => {
    const next = parseExperimentSetupText(text);
    setDraftText(text);
    setSelected(new Set(next.candidates.filter((candidate) => candidate.status === 'found').map((candidate) => candidate.id)));
  };

  return (
    <div className="text-setup-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="text-setup-dialog" role="dialog" aria-modal="true" aria-label="Metinden deney hazırla">
        <header>
          <div>
            <span className="eyebrow">Kontrollü deney hazırlama</span>
            <h2>Metinden deney hazırla</h2>
          </div>
          <button type="button" aria-label="Kapat" onClick={onClose}>×</button>
        </header>

        <div className="text-setup-body">
          <p className="text-setup-intro">
            Gözlem notunu normal cümlelerle yaz veya başka bir AI'nin ürettiği <code>GGL-AI-TEST v1</code> bloğunu doğrudan yapıştır. Sistem yalnız güvenle eşleyebildiği değerleri taslağa çıkarır;
            <b> hiçbir alan önizleme ve onay olmadan değişmez.</b>
          </p>
          <textarea
            autoFocus
            maxLength={10_000}
            value={text}
            placeholder="Örnek: Gözlemci deniz seviyesinden 12 m yüksekte, kamera yerden 1,7 m. Hedef 34,2 km uzakta ve 42 m yüksekliğinde. Standart kırılma k=0,13 kullan. Mesafe belirsizliği yaklaşık ±20 m."
            onChange={(event) => {
              setText(event.currentTarget.value);
              if (draftText !== undefined) setDraftText(undefined);
            }}
          />
          <div className="text-setup-editor-actions">
            <span>{text.length.toLocaleString('tr-TR')} / 10.000 karakter</span>
            <button type="button" disabled={text.trim().length === 0} onClick={prepare}>Taslak oluştur</button>
          </div>

          {draft && (
            <>
              <div className="text-setup-summary">
                <span className="found">{foundCount} bulundu</span>
                <span className="review">{reviewCount} kontrol gerekli</span>
                <span className="unavailable">{unavailableCount} kullanılamadı</span>
              </div>

              {draft.notes.map((note) => <p className="text-setup-note" key={note}>{note}</p>)}

              <div className="text-setup-candidates">
                {draft.candidates.length === 0 && <div className="text-setup-empty">Uygulanabilir alan bulunamadı.</div>}
                {draft.candidates.map((candidate) => (
                  <CandidateRow
                    key={candidate.id}
                    candidate={candidate}
                    current={current}
                    checked={selected.has(candidate.id)}
                    onChecked={(checked) => setSelected((previous) => {
                      const next = new Set(previous);
                      if (checked) next.add(candidate.id); else next.delete(candidate.id);
                      return next;
                    })}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <footer>
          <button type="button" onClick={onClose}>Vazgeç</button>
          <button
            className="primary"
            type="button"
            disabled={!draft || selected.size === 0}
            onClick={() => {
              if (!draft) return;
              onApply(buildExperimentSetupApplication(draft, [...selected]));
              onClose();
            }}
          >
            Seçili alanları uygula ({selected.size})
          </button>
        </footer>
      </section>
    </div>
  );
}
