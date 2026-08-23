import { motion } from 'motion/react';
import { useId, type ReactNode } from 'react';

interface PaneHeadProps {
  title: string;
  hint: string;
  aside?: ReactNode;
}

export function PaneHead({ title, hint, aside }: PaneHeadProps) {
  return (
    <header className="pane-head span">
      <h2>{title}</h2>
      {aside ?? <p>{hint}</p>}
    </header>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  decimals?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  decimals = 0,
  disabled = false,
  onChange,
}: SliderProps) {
  const id = useId();
  const fill = ((value - min) / (max - min)) * 100;

  return (
    <div className="field" style={disabled ? { opacity: 0.4 } : undefined}>
      <label className="field-label" htmlFor={id}>
        {label}
        <span className="field-value">
          {value.toFixed(decimals)}
          {suffix}
        </span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        style={{ ['--fill' as string]: `${fill}%` }}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

interface ChoicesProps<T extends string> {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}

/**
 * Pills rather than a segmented control: the options here vary in count and
 * word length, and a fixed-width segmented track squeezes them badly.
 */
export function Choices<T extends string>({
  label,
  value,
  options,
  onChange,
}: ChoicesProps<T>) {
  const groupId = useId();

  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="choices" role="group" aria-label={label}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              className="choice"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
            >
              {active && (
                <motion.span
                  className="pill"
                  layoutId={`choice-${groupId}`}
                  transition={{ type: 'spring', stiffness: 460, damping: 38 }}
                />
              )}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
