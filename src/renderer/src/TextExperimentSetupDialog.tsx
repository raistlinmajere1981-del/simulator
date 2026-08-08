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
  'sun-moon-observation': 'Güneş ve Ay Gözlemleri'
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
  return (
    <article className={`text-setup-candidate ${candidate.status}`}>
      <div className="text-setup-candidate-select">
        {candidate.status === 'found' ? (
          <input
            aria-label={`${candidate.label} alanını uygula`}
            type="checkbox"
            checked={checked}
            onChange={(event) => onChecked(event.currentTarget.checked)}
          />
        ) : <span />}
        <span className="text-setup-status">{candidate.status === 'found' ? 'BULUNDU' : candidate.status === 'review' ? 'KONTROL GEREKLİ' : 'KULLANILAMADI'}</span>
      </div>
      <div className="text-setup-current">
        <strong>{candidate.label}</strong>
        <span>{currentValue(candidate.fieldId, current)}</span>
        <small>Kaynak: “{candidate.sourceExcerpt}”</small>
      </div>
      <b className="text-setup-arrow">→</b>
      <div className="text-setup-proposed">
        <strong>{candidate.displayValue}</strong>
        {candidate.message && <small>{candidate.message}</small>}
      </div>
    </article>
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
  const [candidates, setCandidates] = useState<ExperimentSetupCandidate[]>([]);
  const [selected, setSelected] = useState<Set<ExperimentSetupFieldId>>(new Set());

  useEffect(() => {
    if (!open) return;
    setText('');
    setCandidates([]);
    setSelected(new Set());
  }, [open]);

  const counts = useMemo(() => ({
    found: candidates.filter((candidate) => candidate.status === 'found').length,
    review: candidates.filter((candidate) => candidate.status === 'review').length,
    unavailable: candidates.filter((candidate) => candidate.status === 'unavailable').length
  }), [candidates]);

  if (!open) return null;

  const current = { scenarioId, inputs, atmosphereMode, modelUncertainty };
  const createDraft = (): void => {
    const parsed = parseExperimentSetupText(text);
    setCandidates(parsed.candidates);
    setSelected(new Set(
      parsed.candidates
        .filter((candidate) => candidate.status === 'found')
        .map((candidate) => candidate.fieldId)
    ));
  };
  const applySelected = (): void => {
    const application = buildExperimentSetupApplication(text, candidates, selected);
    if (application.provenance.appliedFields.length === 0) return;
    onApply(application);
    onClose();
  };

  return (
    <div className="dialog-backdrop text-setup-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <section className="text-setup-dialog" role="dialog" aria-modal="true" aria-labelledby="text-setup-title">
        <header>
          <div>
            <span className="eyebrow">Kontrollü deney hazırlama</span>
            <h2 id="text-setup-title">Metinden deney hazırla</h2>
          </div>
          <button aria-label="Metinden deney hazırlamayı kapat" type="button" onClick={onClose}>×</button>
        </header>
        <div className="text-setup-body">
          <p className="text-setup-intro">
            Gözlem notunu normal cümlelerle yaz. Sistem yalnız güvenle eşleyebildiği değerleri taslağa çıkarır;
            <b> hiçbir alan önizleme ve onay olmadan değişmez.</b>
          </p>
          <textarea
            autoFocus
            maxLength={10_000}
            placeholder="Örnek: Gözlemci deniz seviyesinden 12 m yüksekte, kamera yerden 1,7 m. Hedef 34,2 km uzakta ve 42 m yüksekliğinde. Standart kırılma k=0,13 kullan."
            value={text}
            onChange={(event) => setText(event.currentTarget.value)}
          />
          <div className="text-setup-compose-footer">
            <small>{text.length.toLocaleString('tr-TR')} / 10.000 karakter</small>
            <button type="button" disabled={text.trim().length === 0} onClick={createDraft}>Taslak oluştur</button>
          </div>

          {candidates.length > 0 && <>
            <div className="text-setup-counts">
              <span className="found">{counts.found} bulundu</span>
              <span className="review">{counts.review} kontrol gerekli</span>
              <span className="unavailable">{counts.unavailable} kullanılamadı</span>
            </div>
            <div className="text-setup-candidates">
              {candidates.map((candidate, index) => (
                <CandidateRow
                  key={`${candidate.fieldId}-${index}`}
                  candidate={candidate}
                  checked={selected.has(candidate.fieldId)}
                  current={current}
                  onChecked={(checked) => {
                    setSelected((previous) => {
                      const next = new Set(previous);
                      if (checked) next.add(candidate.fieldId);
                      else next.delete(candidate.fieldId);
                      return next;
                    });
                  }}
                />
              ))}
            </div>
          </>}
        </div>
        <footer>
          <button className="secondary" type="button" onClick={onClose}>Vazgeç</button>
          <button
            className="primary"
            type="button"
            disabled={selected.size === 0}
            onClick={applySelected}
          >
            Seçili alanları uygula ({selected.size})
          </button>
        </footer>
      </section>
    </div>
  );
}
