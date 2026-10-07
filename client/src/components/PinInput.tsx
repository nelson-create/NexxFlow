import { useRef } from 'react';
import { cx } from './ui';

const LENGTH = 6;

/** Six single-digit boxes that behave like one input: typing advances, backspace retreats, paste fills. */
export const PinInput = ({
  value,
  onChange,
  onComplete,
  invalid,
  disabled,
  autoFocus,
  dark,
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  dark?: boolean;
}) => {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: LENGTH }, (_, index) => value[index] ?? '');

  const update = (next: string) => {
    const clean = next.replace(/\D/g, '').slice(0, LENGTH);
    onChange(clean);
    if (clean.length === LENGTH) onComplete?.(clean);
    return clean;
  };

  const focus = (index: number) => refs.current[Math.max(0, Math.min(LENGTH - 1, index))]?.focus();

  return (
    <div className="flex justify-center gap-2 sm:gap-2.5" role="group" aria-label="6-digit PIN">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={LENGTH}
          aria-label={`Digit ${index + 1}`}
          autoFocus={autoFocus && index === 0}
          disabled={disabled}
          value={digit}
          onFocus={(event) => event.target.select()}
          onChange={(event) => {
            const typed = event.target.value.replace(/\D/g, '');
            if (!typed) return;
            // Multi-character input comes from paste or autofill: spread it from this box onward.
            const next = update(value.slice(0, index) + typed + value.slice(index + typed.length));
            focus(Math.min(index + typed.length, next.length));
          }}
          onKeyDown={(event) => {
            if (event.key === 'Backspace') {
              event.preventDefault();
              if (digit) update(value.slice(0, index) + value.slice(index + 1));
              else if (index > 0) {
                update(value.slice(0, index - 1) + value.slice(index));
                focus(index - 1);
              }
            } else if (event.key === 'ArrowLeft') focus(index - 1);
            else if (event.key === 'ArrowRight') focus(index + 1);
          }}
          onPaste={(event) => {
            event.preventDefault();
            const next = update(event.clipboardData.getData('text'));
            focus(next.length);
          }}
          className={cx(
            'h-14 w-11 rounded-xl border text-center text-xl font-semibold tabular-nums shadow-sm outline-none transition sm:h-16 sm:w-12',
            'focus:ring-4 disabled:opacity-60',
            dark
              ? 'border-white/15 bg-white/5 text-white focus:border-white/60 focus:ring-white/10'
              : 'border-zinc-300 bg-white text-zinc-900 focus:border-brand-500 focus:ring-brand-500/15',
            invalid && 'border-red-400 focus:border-red-400',
          )}
        />
      ))}
    </div>
  );
};
