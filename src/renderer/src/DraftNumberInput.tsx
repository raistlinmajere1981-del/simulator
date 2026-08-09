import { useEffect, useRef, useState } from 'react';

export interface DraftNumberInputProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  title?: string;
  ariaLabel?: string;
  onCommit(value: number): void;
  onValidDraftChange?(value: number): void;
}

function clamp(value: number, min: number | undefined, max: number | undefined): number {
  let next = value;
  if (min !== undefined) next = Math.max(min, next);
  if (max !== undefined) next = Math.min(max, next);
  return next;
}

function toDraft(value: number): string {
  return Number.isFinite(value) ? String(value) : '';
}

function parseDraft(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (normalized === '' || normalized === '-' || normalized === '+' || normalized === '.' || normalized === '-.' || normalized === '+.') {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function isEditableDraft(raw: string): boolean {
  if (raw === '' || raw === '-' || raw === '+') return true;
  return /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d*)$/.test(raw);
}

export function DraftNumberInput({
  value,
  min,
  max,
  step = 1,
  disabled,
  className,
  title,
  ariaLabel,
  onCommit,
  onValidDraftChange
}: DraftNumberInputProps): React.JSX.Element {
  const [draft, setDraft] = useState(() => toDraft(value));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) setDraft(toDraft(value));
  }, [value]);

  const commitDraft = (): void => {
    const parsed = parseDraft(draft);
    if (parsed === null) {
      setDraft(toDraft(value));
      return;
    }
    const next = clamp(parsed, min, max);
    setDraft(toDraft(next));
    if (next !== value) onCommit(next);
  };

  const nudge = (direction: 1 | -1): void => {
    const parsed = parseDraft(draft);
    const base = parsed ?? value;
    const next = clamp(base + direction * step, min, max);
    setDraft(toDraft(next));
    onValidDraftChange?.(next);
    if (next !== value) onCommit(next);
  };

  return (
    <input
      aria-label={ariaLabel}
      className={className}
      disabled={disabled}
      inputMode="decimal"
      title={title}
      type="text"
      value={draft}
      onFocus={(event) => {
        focusedRef.current = true;
        event.currentTarget.select();
      }}
      onChange={(event) => {
        const nextDraft = event.currentTarget.value;
        if (!isEditableDraft(nextDraft)) return;
        setDraft(nextDraft);
        const parsed = parseDraft(nextDraft);
        if (parsed !== null) onValidDraftChange?.(clamp(parsed, min, max));
      }}
      onBlur={() => {
        focusedRef.current = false;
        commitDraft();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commitDraft();
          event.currentTarget.blur();
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          setDraft(toDraft(value));
          event.currentTarget.blur();
          return;
        }
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          event.preventDefault();
          nudge(event.key === 'ArrowUp' ? 1 : -1);
        }
      }}
    />
  );
}
