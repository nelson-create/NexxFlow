import { useState } from 'react';
import { Icon } from './Icon';
import { cx } from './ui';

export const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Clipboard API is unavailable on plain-http origins; fall back to a hidden textarea.
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
};

export const CopyField = ({ value, label, mono }: { value: string; label: string; mono?: boolean }) => {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1 pl-3">
      <span className={cx('min-w-0 flex-1 truncate text-sm text-zinc-700', mono && 'font-mono tracking-wider')} title={value}>
        {value}
      </span>
      <button
        type="button"
        aria-label={`Copy ${label}`}
        onClick={async () => {
          await copyText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        className={cx(
          'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition',
          copied ? 'bg-emerald-50 text-emerald-700' : 'bg-white text-zinc-700 shadow-sm ring-1 ring-zinc-200 hover:bg-zinc-100',
        )}
      >
        <Icon name={copied ? 'check' : 'copy'} className="h-3.5 w-3.5" />
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
};
