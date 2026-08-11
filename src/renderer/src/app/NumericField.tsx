import type { SimulatorInputs } from '../../../shared/simulator';
import { DraftNumberInput } from '../DraftNumberInput';
import { inputRanges } from './app-formatters';
import type { NumericInputKey } from './app-types';

export function NumericField({
  inputKey,
  label,
  unit,
  step,
  inputs,
  disabled,
  onNumberChange
}: {
  inputKey: NumericInputKey;
  label: string;
  unit: string;
  step: number;
  inputs: SimulatorInputs;
  disabled?: boolean;
  onNumberChange(key: NumericInputKey, value: number): void;
}): React.JSX.Element {
  return (
    <label className="input-field">
      <span>{label}</span>
      <div>
        <DraftNumberInput
          disabled={disabled}
          min={inputRanges[inputKey].min}
          max={inputRanges[inputKey].max}
          step={step}
          value={inputs[inputKey]}
          onCommit={(value) => onNumberChange(inputKey, value)}
        />
        <b>{unit}</b>
      </div>
    </label>
  );
}
