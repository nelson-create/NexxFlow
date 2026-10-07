import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { Button, IconButton, cx } from './ui';

/* ------------------------------------------------------------------ Modal */

export const Modal = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onCloseRef.current();
    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    // Focus the first form control (or the panel) so keyboard users land inside the dialog.
    requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector<HTMLElement>('input, textarea, select, [data-autofocus]') ?? panelRef.current;
      target?.focus();
    });

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-zinc-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cx(
          'relative flex max-h-[92vh] w-full animate-pop-in flex-col overflow-hidden rounded-t-2xl bg-white shadow-lift outline-none sm:rounded-2xl',
          size === 'sm' && 'sm:max-w-md',
          size === 'md' && 'sm:max-w-lg',
          size === 'lg' && 'sm:max-w-2xl',
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-5">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
            {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
          </div>
          <IconButton icon="x" label="Close" onClick={onClose} className="-mr-2 -mt-1" />
        </div>
        {children && <div className="overflow-y-auto px-6 py-4">{children}</div>}
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 bg-zinc-50/60 px-6 py-4 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
};

/* ------------------------------------------------------------------ Toasts */

type ToastTone = 'success' | 'error' | 'info';
type Toast = { id: number; tone: ToastTone; message: string };

type ConfirmOptions = {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
};

const OverlayContext = createContext<{
  toast: (message: string, tone?: ToastTone) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
} | null>(null);

export const OverlayProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (value: boolean) => void }) | null>(null);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

  const toast = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = ++nextId.current;
      setToasts((current) => [...current.slice(-3), { id, tone, message }]);
      setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3500);
    },
    [dismiss],
  );

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ ...options, resolve })), []);

  const closeDialog = (result: boolean) => {
    dialog?.resolve(result);
    setDialog(null);
  };

  return (
    <OverlayContext.Provider value={{ toast, confirm }}>
      {children}

      <Modal
        open={!!dialog}
        onClose={() => closeDialog(false)}
        title={dialog?.title ?? ''}
        description={dialog?.description}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => closeDialog(false)}>
              Cancel
            </Button>
            <Button variant={dialog?.tone === 'primary' ? 'primary' : 'danger'} onClick={() => closeDialog(true)} data-autofocus>
              {dialog?.confirmLabel ?? 'Confirm'}
            </Button>
          </>
        }
      />

      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:bottom-auto sm:left-auto sm:right-0 sm:top-0 sm:items-end" aria-live="polite">
          {toasts.map((item) => (
            <div
              key={item.id}
              role={item.tone === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto flex w-full max-w-sm animate-slide-in items-start gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-lift"
            >
              <Icon
                name={item.tone === 'error' ? 'alert' : item.tone === 'info' ? 'info' : 'checkCircle'}
                className={cx('mt-0.5 h-4 w-4 shrink-0', item.tone === 'error' ? 'text-red-600' : item.tone === 'info' ? 'text-brand-600' : 'text-emerald-600')}
              />
              <p className="flex-1 text-zinc-800">{item.message}</p>
              <button type="button" onClick={() => dismiss(item.id)} className="text-zinc-400 hover:text-zinc-700" aria-label="Dismiss">
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </OverlayContext.Provider>
  );
};

export const useOverlay = () => {
  const context = useContext(OverlayContext);
  if (!context) throw new Error('useOverlay must be used within OverlayProvider');
  return context;
};
