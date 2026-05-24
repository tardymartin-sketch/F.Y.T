import { useState, useEffect, useRef } from 'react';

interface WeightInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Controlled input for weight values that supports decimal entry (e.g. 7.5 kg).
 *
 * Problem solved: a plain React controlled input driven by a numeric store value
 * resets the decimal separator the moment the user types "7," — because
 * Number("7.") = 7 → String(7) = "7", swallowing the comma before the user can
 * finish typing "7.5".  This component keeps an internal raw string during editing
 * and only commits to the store when a complete number is ready.
 */
export function WeightInput({
  value,
  onChange,
  placeholder = '0',
  className,
  disabled,
}: WeightInputProps) {
  const isFocused = useRef(false);
  const [raw, setRaw] = useState<string>(() =>
    typeof value === 'number' ? String(value) : ''
  );

  // Sync display when the external value changes while the input is not focused
  // (e.g. prefill from last session, or another component changes the same set)
  useEffect(() => {
    if (!isFocused.current) {
      setRaw(typeof value === 'number' ? String(value) : '');
    }
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setRaw(v);
    const normalized = v.replace(',', '.');
    if (normalized === '') {
      onChange(null);
    } else if (!normalized.endsWith('.')) {
      // Only commit complete numbers; skip "7." so the dot isn't dropped
      const n = Number(normalized);
      if (Number.isFinite(n)) onChange(n);
    }
  }

  function handleBlur() {
    isFocused.current = false;
    const normalized = raw.replace(',', '.');
    if (raw === '') {
      onChange(null);
    } else {
      const n = Number(normalized);
      if (Number.isFinite(n)) {
        onChange(n);
        // Normalize display: "7,50" → "7.5", "100." → "100"
        setRaw(String(n));
      } else {
        // Invalid — reset to the last committed value
        setRaw(typeof value === 'number' ? String(value) : '');
      }
    }
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      value={raw}
      disabled={disabled}
      className={className}
      onFocus={() => { isFocused.current = true; }}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
