import { useEffect, useState } from 'react';

/**
 * The three numbers that set the home page's proportions.
 *
 * Each one is a custom property the stylesheet already reads, so the panel is
 * not a parallel set of controls that drift from the real values — dragging a
 * slider writes exactly the declaration you would have edited by hand, and
 * Copy CSS hands it back in that form.
 *
 * `read` is how the starting position is recovered from the live page rather
 * than from a number repeated here, which would go stale the moment the
 * stylesheet changed.
 */
interface Knob {
  prop: string;
  label: string;
  unit: 'px' | 'rem';
  min: number;
  max: number;
  step: number;
  read: () => number;
}

const rem = (value: string) => parseFloat(value) / 16;

const KNOBS: Knob[] = [
  {
    prop: '--stack-card',
    label: 'Card size',
    unit: 'px',
    min: 220,
    max: 760,
    step: 5,
    read: () =>
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--stack-card')) || 390,
  },
  {
    prop: '--stack-gap',
    label: 'Between cards',
    unit: 'rem',
    min: 0,
    max: 6,
    step: 0.25,
    read: () => {
      const track = document.querySelector('.stack-track');
      return track ? rem(getComputedStyle(track).rowGap) : 1.75;
    },
  },
  {
    prop: '--stage-gap',
    label: 'Text to column',
    unit: 'rem',
    min: 0,
    max: 12,
    step: 0.25,
    read: () => {
      const stage = document.querySelector('.stage');
      return stage ? rem(getComputedStyle(stage).columnGap) : 4.5;
    },
  },
];

const STORE = 'lenticard.tune';

function write(prop: string, value: number, unit: string) {
  document.documentElement.style.setProperty(prop, `${value}${unit}`);
}

export function Tuner() {
  const [values, setValues] = useState<number[]>(() => KNOBS.map(() => 0));
  const [copied, setCopied] = useState(false);

  // Read the page's own numbers on mount, then let anything saved from a
  // previous session win. Measuring first means the panel is honest even when
  // nothing has been saved yet.
  useEffect(() => {
    const measured = KNOBS.map((knob) => knob.read());
    let saved: number[] | null = null;
    try {
      const raw = window.localStorage.getItem(STORE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === KNOBS.length) saved = parsed;
      }
    } catch {
      saved = null;
    }
    const next = saved ?? measured;
    if (saved) saved.forEach((value, i) => write(KNOBS[i].prop, value, KNOBS[i].unit));
    setValues(next);
  }, []);

  function set(index: number, value: number) {
    const next = values.map((v, i) => (i === index ? value : v));
    setValues(next);
    write(KNOBS[index].prop, value, KNOBS[index].unit);
    setCopied(false);
    try {
      window.localStorage.setItem(STORE, JSON.stringify(next));
    } catch {
      /* a private window is not a reason to stop tuning */
    }
  }

  function reset() {
    try {
      window.localStorage.removeItem(STORE);
    } catch {
      /* nothing to clear */
    }
    KNOBS.forEach((knob) => document.documentElement.style.removeProperty(knob.prop));
    setValues(KNOBS.map((knob) => knob.read()));
    setCopied(false);
  }

  const css = KNOBS.map((knob, i) => `  ${knob.prop}: ${values[i]}${knob.unit};`).join('\n');

  async function copy() {
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <aside className="tuner" aria-label="Home page proportions">
      <div className="tuner-head">
        <b>Proportions</b>
        <span>?tune</span>
      </div>

      {KNOBS.map((knob, i) => (
        <div className="tuner-knob" key={knob.prop}>
          <header>
            <label htmlFor={knob.prop}>{knob.label}</label>
            <output htmlFor={knob.prop}>
              {values[i]}
              {knob.unit}
            </output>
          </header>
          <input
            id={knob.prop}
            type="range"
            min={knob.min}
            max={knob.max}
            step={knob.step}
            value={values[i]}
            style={{
              ['--fill' as string]: `${((values[i] - knob.min) / (knob.max - knob.min)) * 100}%`,
            }}
            onChange={(event) => set(i, Number(event.target.value))}
          />
        </div>
      ))}

      <div className="tuner-foot">
        <button className="btn" onClick={copy}>
          {copied ? 'Copied' : 'Copy CSS'}
        </button>
        <button className="btn btn-outline" onClick={reset}>
          Reset
        </button>
      </div>
    </aside>
  );
}
