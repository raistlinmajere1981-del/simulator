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

const scenarioLabels: Record<SimulationScenarioId, string> = {
  'target-visibility': 'Hedef Görünürlüğü',
  horizon: 'Ufuk Analizi',
  'long-distance-visibility': 'Uzun Mesafe Görüş',
  'sun-moon-observation': 'Güneş ve Ay Gözlemleri',
  'shadow-observation': 'Gölge Deneyi'
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
    inputs: SimulatorInputs;
    atmosphereMode: AtmosphereMode;
    modelUncertainty: ModelInputUncertaintySettings;
  }
): string {
  const { inputs, modelUncertainty } = current;
  switch (fieldId) {
    case 'scenarioId': return scenarioLabels[current.scenarioId];
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
  const canApply = candidate.status === 'found';
  const targetValue = candidate.value.kind === 'scenario'
    ? scenarioLabels[candidate.value.value]
    : candidate.value.kind === 'coordinates'
      ? `${trNumber.format(candidate.value.latitudeDeg)}°, ${trNumber.format(candidate.value.longitudeDeg)}°`
      : candidate.value.kind === 'datum'
        ? candidate.value.value === 'orthometric-msl'
          ? 'Ortalama deniz seviyesi'
          : candidate.value.value === 'ellipsoidal-wgs84'
            ? 'WGS84 elipsoidal'
            : 'Yerel düşey referans'
        : candidate.value.kind === 'atmosphere-mode'
          ? atmosphereLabels[candidate.value.value]
          : candidate.value.kind === 'number'
            ? `${candidate.value.prefix ?? ''}${trNumber.format(candidate.value.value)}${candidate.value.unit ? ` ${candidate.value.unit}` : ''}`
            : candidate.value.label;

  return (
    <label className={`setup-candidate ${candidate.status}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={!canApply}
        onChange={(event) => onChecked(event.currentTarget.checked)}
      />
      <div className="setup-candidate-status">{candidate.status === 'found' ? 'BULUNDU' : candidate.status === 'review' ? 'KONTROL GEREKLİ' : 'KULLANILAMADI'}</div>
      <div className="setup-candidate-copy">
        <strong>{candidate.label}</strong>
        <div className="setup-value-comparison">
          <span>{currentValue(candidate.fieldId, current)}</span>
          <b>→</b>
          <span>{targetValue}</span>
        </div>
        <small>Kaynak: “{candidate.sourceText}”</small>
        {candidate.reason && <small className="setup-candidate-reason">{candidate.reason}</small>}
      </div>
    </label>
  );
}

export function TextExperimentSetupDialog({
  open,
  scenarioId,
  inputs,
  atmosphereMode,
  modelUncertainty,
  onClose,
  onApply
}: {
  open: boolean;
  scenarioId: SimulationScenarioId;
  inputs: SimulatorInputs;
  atmosphereMode: AtmosphereMode;
  modelUncertainty: ModelInputUncertaintySettings;
  onClose(): void;
  onApply(application: ExperimentSetupApplication): void;
}): React.JSX.Element | null {
  const [text, setText] = useState('');
  const [draftRequested, setDraftRequested] = useState(false);
  const draft = useMemo(() => draftRequested ? parseExperimentSetupText(text) : undefined, [draftRequested, text]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!draft) return;
    setSelected(Object.fromEntries(draft.candidates.map((candidate) => [candidate.id, candidate.status === 'found'])));
  }, [draft]);

  useEffect(() => {
    if (!open) {
      setDraftRequested(false);
      setSelected({});
    }
  }, [open]);

  if (!open) return null;

  const current = { scenarioId, inputs, atmosphereMode, modelUncertainty };
  const selectedIds = draft?.candidates.filter((candidate) => selected[candidate.id] && candidate.status === 'found').map((candidate) => candidate.id) ?? [];

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="dialog setup-dialog" role="dialog" aria-modal="true" aria-label="Metinden deney hazırla">
        <header>
          <div><span className="eyebrow">Kontrollü deney hazırlama</span><h2>Metinden deney hazırla</h2></div>
          <button type="button" onClick={onClose}>×</button>
        </header>
        <div className="setup-dialog-body">
          <p>Gözlem notunu normal cümlelerle yaz. Sistem yalnız güvenle eşleyebildiği değerleri taslağa çıkarır; hiçbir alan önizleme ve onay olmadan değişmez.</p>
          <textarea
            maxLength={10_000}
            value={text}
            onChange={(event) => { setText(event.currentTarget.value); setDraftRequested(false); }}
            placeholder="Örnek: Gözlemci deniz seviyesinden 12 m yüksekte, kamera yerden 1,7 m. Hedef 34,2 km uzakta ve 42 m yüksekliğinde. Standart kırılma k=0,13 kullan."
          />
          <div className="setup-text-actions">
            <small>{text.length.toLocaleString('tr-TR')} / 10.000 karakter</small>
            <button type="button" onClick={() => setDraftRequested(true)} disabled={text.trim().length === 0}>Taslak oluştur</button>
          </div>
          {draft && <>
            <div className="setup-summary-badges">
              <span>{draft.candidates.filter((item) => item.status === 'found').length} bulundu</span>
              <span>{draft.candidates.filter((item) => item.status === 'review').length} kontrol gerekli</span>
              <span>{draft.candidates.filter((item) => item.status === 'unsupported').length} kullanılamadı</span>
            </div>
            <div className="setup-candidate-list">
              {draft.candidates.map((candidate) => (
                <CandidateRow
                  key={candidate.id}
                  candidate={candidate}
                  checked={Boolean(selected[candidate.id])}
                  current={current}
                  onChecked={(checked) => setSelected((state) => ({ ...state, [candidate.id]: checked }))}
                />
              ))}
            </div>
          </>}
        </div>
        <footer>
          <button type="button" onClick={onClose}>Vazgeç</button>
          <button
            className="primary"
            disabled={!draft || selectedIds.length === 0}
            type="button"
            onClick={() => {
              if (!draft) return;
              onApply(buildExperimentSetupApplication(draft, selectedIds));
              onClose();
            }}
          >Seçili alanları uygula ({selectedIds.length})</button>
        </footer>
      </section>
    </div>
  );
}
