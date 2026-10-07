import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { Spinner, cx } from './ui';

type LightboxPhoto = { id: string; url: string; originalName: string };

/** Full-screen photo viewer with keyboard (←/→/Esc) and swipe navigation. */
export const Lightbox = <T extends LightboxPhoto>({
  photos,
  index,
  onIndexChange,
  onClose,
  caption,
  actions,
}: {
  photos: T[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  caption?: (photo: T) => React.ReactNode;
  actions?: (photo: T) => React.ReactNode;
}) => {
  const photo = photos[index];
  const [loaded, setLoaded] = useState(false);
  const touchStart = useRef<number | null>(null);
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  useEffect(() => setLoaded(false), [photo?.url]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // A confirm dialog opened from the viewer owns the keyboard until it closes.
      if (document.querySelector('[role="dialog"][aria-modal="true"]:not([data-lightbox])')) return;
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && hasPrev) onIndexChange(index - 1);
      if (event.key === 'ArrowRight' && hasNext) onIndexChange(index + 1);
    };
    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [index, hasPrev, hasNext, onClose, onIndexChange]);

  // Warm the cache for the neighbours so arrowing through feels instant.
  useEffect(() => {
    [photos[index - 1], photos[index + 1]].forEach((neighbour) => {
      if (neighbour) new Image().src = neighbour.url;
    });
  }, [index, photos]);

  if (!photo) return null;

  const navButton = 'absolute top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:flex';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex animate-fade-in flex-col bg-zinc-950/95"
      role="dialog"
      aria-modal="true"
      data-lightbox
      aria-label={photo.originalName}
      onTouchStart={(event) => (touchStart.current = event.touches[0].clientX)}
      onTouchEnd={(event) => {
        if (touchStart.current === null) return;
        const delta = event.changedTouches[0].clientX - touchStart.current;
        if (delta > 50 && hasPrev) onIndexChange(index - 1);
        if (delta < -50 && hasNext) onIndexChange(index + 1);
        touchStart.current = null;
      }}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 text-white sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{photo.originalName}</p>
          <p className="text-xs text-white/50">
            {index + 1} of {photos.length}
            {caption && <> · {caption(photo)}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {actions?.(photo)}
          <button type="button" onClick={onClose} aria-label="Close viewer" className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white">
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-6 sm:px-20" onClick={(event) => event.target === event.currentTarget && onClose()}>
        {!loaded && <Spinner className="absolute h-8 w-8 text-white/60" />}
        <img
          key={photo.id}
          src={photo.url}
          alt={photo.originalName}
          onLoad={() => setLoaded(true)}
          className={cx('max-h-full max-w-full select-none rounded-md object-contain shadow-2xl transition-opacity duration-200', loaded ? 'opacity-100' : 'opacity-0')}
          draggable={false}
        />
        {hasPrev && (
          <button type="button" onClick={() => onIndexChange(index - 1)} className={cx(navButton, 'left-4')} aria-label="Previous photo">
            <Icon name="chevronLeft" className="h-6 w-6" />
          </button>
        )}
        {hasNext && (
          <button type="button" onClick={() => onIndexChange(index + 1)} className={cx(navButton, 'right-4')} aria-label="Next photo">
            <Icon name="chevronRight" className="h-6 w-6" />
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
};

export const lightboxActionClass =
  'inline-flex h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/20';
