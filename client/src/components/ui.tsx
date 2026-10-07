import { forwardRef, useId } from 'react';
import { Link } from 'react-router-dom';
import { Icon, IconName } from './Icon';
import { initials } from '../lib/format';

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'brand';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 active:bg-zinc-950',
  brand: 'bg-brand-600 text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700 active:bg-brand-800',
  secondary: 'border border-zinc-300 bg-white text-zinc-800 shadow-sm hover:bg-zinc-50 hover:border-zinc-400',
  ghost: 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-xs',
  md: 'h-10 gap-2 rounded-xl px-4 text-sm',
  lg: 'h-12 gap-2 rounded-xl px-5 text-sm',
};

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', className?: string) =>
  cx(
    'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-semibold transition-all duration-150',
    'disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  );

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', icon, loading, className, children, disabled, type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} disabled={disabled || loading} className={buttonClass(variant, size, className)} {...props}>
      {loading ? <Spinner className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} /> : icon && <Icon name={icon} className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';

export const IconButton = ({
  icon,
  label,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    className={cx('inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40', className)}
    {...props}
  >
    <Icon name={icon} />
  </button>
);

export const Spinner = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={cx('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
    <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const FullPageSpinner = ({ label = 'Loading' }: { label?: string }) => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-zinc-500" role="status">
    <Spinner className="h-6 w-6 text-brand-600" />
    <span className="text-sm">{label}…</span>
  </div>
);

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string };

export const Field = forwardRef<HTMLInputElement, FieldProps>(({ label, hint, error, className, id, ...props }, ref) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="label">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={error || hint ? `${inputId}-help` : undefined}
        className={cx('input', error && 'input-error')}
        {...props}
      />
      {(error || hint) && (
        <p id={`${inputId}-help`} className={cx('mt-1.5 text-xs', error ? 'text-red-600' : 'text-zinc-500')}>
          {error || hint}
        </p>
      )}
    </div>
  );
});
Field.displayName = 'Field';

export const TextArea = ({ label, className, id, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="label">
        {label}
      </label>
      <textarea id={inputId} className="input min-h-[88px] resize-y" {...props} />
    </div>
  );
};

export const Alert = ({ tone = 'error', children }: { tone?: 'error' | 'info' | 'success'; children: React.ReactNode }) => (
  <div
    role={tone === 'error' ? 'alert' : 'status'}
    className={cx(
      'flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm',
      tone === 'error' && 'border-red-200 bg-red-50 text-red-800',
      tone === 'info' && 'border-brand-200 bg-brand-50 text-brand-900',
      tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
    )}
  >
    <Icon name={tone === 'success' ? 'checkCircle' : tone === 'info' ? 'info' : 'alert'} className="mt-0.5 h-4 w-4 shrink-0" />
    <div className="min-w-0">{children}</div>
  </div>
);

const avatarColors = ['bg-brand-100 text-brand-800', 'bg-amber-100 text-amber-800', 'bg-emerald-100 text-emerald-800', 'bg-sky-100 text-sky-800', 'bg-rose-100 text-rose-800'];

export const Avatar = ({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md'; className?: string }) => {
  const color = avatarColors[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % avatarColors.length];
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-2 ring-white',
        size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs',
        color,
        className,
      )}
      title={name}
    >
      {initials(name) || '?'}
    </span>
  );
};

export const Badge = ({ tone = 'neutral', children, className }: { tone?: 'neutral' | 'success' | 'brand' | 'warning'; children: React.ReactNode; className?: string }) => (
  <span
    className={cx(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
      tone === 'neutral' && 'bg-zinc-100 text-zinc-700',
      tone === 'success' && 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
      tone === 'brand' && 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/20',
      tone === 'warning' && 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20',
      className,
    )}
  >
    {children}
  </span>
);

export const EmptyState = ({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: IconName;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) => (
  <div className={cx('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
      <Icon name={icon} className="h-6 w-6" />
    </div>
    <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
    {description && <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const Logo = ({ to = '/', light = false }: { to?: string; light?: boolean }) => (
  <Link to={to} className="inline-flex items-center gap-2.5 rounded-lg">
    <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill={light ? '#fff' : '#18181b'} />
      <path d="M10 22V10l12 12V10" fill="none" stroke={light ? '#6b04fd' : '#bea6ff'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span className={cx('text-[17px] font-bold tracking-tight', light ? 'text-white' : 'text-zinc-900')}>Nexxflow</span>
  </Link>
);
