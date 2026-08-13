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
  type TextSetupProvenanceContext
} from '../../shared/text-experiment-setup';
import { useI18n } from './I18nProvider';
import { appLocaleTag } from './i18n';
import {
  textSetupCandidateDisplayValue,
  textSetupCandidateReason,
  textSetupCurrentValue,
  textSetupFieldLabel,
  textSetupNote,
  textSetupStatusLabel,
  type TextSetupCurrentState
} from './text-experiment-setup-presentation';
import './text-experiment-setup.css';

function CandidateRow({
  candidate,
  checked,
  current,
  onChecked
}: {
  candidate: ExperimentSetupCandidate;
  checked: boolean;
  current: TextSetupCurrentState;
  onChecked(checked: boolean): void;
}): React.JSX.Element {
  const { locale, t } = useI18n();
  const selectable = candidate.status === 'found';
  const reason = textSetupCandidateReason(locale, candidate.reason);
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
          {textSetupStatusLabel(locale, candidate.status)}
        </span>
      </label>
      <div className="text-setup-field">
        <strong>{textSetupFieldLabel(locale, candidate.fieldId)}</strong>
        <div className="text-setup-diff">
          <span>{textSetupCurrentValue(locale, candidate.fieldId, current)}</span>
          <b>→</b>
          <span>{textSetupCandidateDisplayValue(locale, candidate)}</span>
        </div>
        <small>{t('textSetup.source', { source: candidate.sourceExcerpt })}</small>
        {reason && <p>{reason}</p>}
      </div>
    </div>
  );
}

export function TextExperimentSetupDialog({
  open,
  initialText,
  scenarioId,
  experimentName,
  observedAtIso,
  utcOffsetMinutes,
  inputs,
  atmosphereMode,
  modelUncertainty,
  provenanceContext,
  onClose,
  onApply
}: {
  open: boolean;
  initialText?: string;
  scenarioId: SimulationScenarioId;
  experimentName: string;
  observedAtIso: string;
  utcOffsetMinutes: number;
  inputs: SimulatorInputs;
  atmosphereMode: AtmosphereMode;
  modelUncertainty: ModelInputUncertaintySettings;
  provenanceContext?: TextSetupProvenanceContext;
  onClose(): void;
  onApply(application: ExperimentSetupApplication): void;
}): React.JSX.Element | null {
  const { locale, t } = useI18n();
  const [text, setText] = useState('');
  const [draftText, setDraftText] = useState<string>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const draft = useMemo(() => draftText === undefined ? undefined : parseExperimentSetupText(draftText), [draftText]);

  useEffect(() => {
    if (!open) return;
    const nextText = initialText ?? '';
    setText(nextText);
    if (nextText.trim().length === 0) {
      setDraftText(undefined);
      setSelected(new Set());
      return;
    }
    const next = parseExperimentSetupText(nextText);
    setDraftText(nextText);
    setSelected(new Set(next.candidates
      .filter((candidate) => candidate.status === 'found')
      .map((candidate) => candidate.id)));
  }, [initialText, open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, open]);

  if (!open) return null;

  const current: TextSetupCurrentState = {
    scenarioId,
    experimentName,
    observedAtIso,
    utcOffsetMinutes,
    inputs,
    atmosphereMode,
    modelUncertainty
  };
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
      <section className="text-setup-dialog" role="dialog" aria-modal="true" aria-label={t('textSetup.aria')}>
        <header>
          <div>
            <span className="eyebrow">{t('textSetup.eyebrow')}</span>
            <h2>{t('textSetup.title')}</h2>
          </div>
          <button type="button" aria-label={t('textSetup.close')} onClick={onClose}>×</button>
        </header>

        <div className="text-setup-body">
          <p className="text-setup-intro">
            {t('textSetup.intro.before')} <code>GGL-AI-TEST v1</code> {t('textSetup.intro.after')}
            <b>{t('textSetup.intro.bold')}</b>
          </p>
          {provenanceContext?.sourceKind === 'ai-follow-up' && (
            <p className="text-setup-note">
              {t('textSetup.lineageNote')}
            </p>
          )}
          <textarea
            autoFocus
            readOnly={provenanceContext?.sourceKind === 'ai-follow-up'}
            maxLength={10_000}
            value={text}
            placeholder={t('textSetup.placeholder')}
            onChange={(event) => {
              setText(event.currentTarget.value);
              if (draftText !== undefined) setDraftText(undefined);
            }}
          />
          <div className="text-setup-editor-actions">
            <span>{t('textSetup.characterCount', { count: text.length.toLocaleString(appLocaleTag(locale)) })}</span>
            <button type="button" disabled={text.trim().length === 0} onClick={prepare}>{t('textSetup.prepare')}</button>
          </div>

          {draft && (
            <>
              <div className="text-setup-summary">
                <span className="found">{t('textSetup.summary.found', { count: foundCount })}</span>
                <span className="review">{t('textSetup.summary.review', { count: reviewCount })}</span>
                <span className="unavailable">{t('textSetup.summary.unavailable', { count: unavailableCount })}</span>
              </div>

              {draft.notes.map((note) => <p className="text-setup-note" key={note}>{textSetupNote(locale, note)}</p>)}

              <div className="text-setup-candidates">
                {draft.candidates.length === 0 && <div className="text-setup-empty">{t('textSetup.empty')}</div>}
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
          <button type="button" onClick={onClose}>{t('textSetup.cancel')}</button>
          <button
            className="primary"
            type="button"
            disabled={!draft || selected.size === 0}
            onClick={() => {
              if (!draft) return;
              onApply(buildExperimentSetupApplication(draft, [...selected], undefined, provenanceContext));
              onClose();
            }}
          >
            {t('textSetup.apply', { count: selected.size })}
          </button>
        </footer>
      </section>
    </div>
  );
}
