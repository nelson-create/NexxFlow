import { useState } from 'react';
import type { Photo } from '../lib/types';
import { Icon } from './Icon';
import { cx } from './ui';

export const PhotoTile = ({
  photo,
  selectable,
  canDelete,
  onOpen,
  onToggle,
  onDelete,
}: {
  photo: Photo;
  selectable: boolean;
  canDelete: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={cx(
        'group relative aspect-square overflow-hidden rounded-xl bg-zinc-100 ring-offset-2 transition',
        photo.selected && selectable && 'ring-[3px] ring-brand-500',
      )}
    >
      <button type="button" onClick={onOpen} className="absolute inset-0 h-full w-full" aria-label={`View ${photo.originalName}`}>
        {failed ? (
          <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-zinc-400">
            <Icon name="image" className="h-6 w-6" />
            <span className="px-2 text-[11px]">Preview unavailable</span>
          </span>
        ) : (
          <img
            src={photo.thumbnailUrl || photo.url}
            alt={photo.originalName}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={cx('h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]', loaded ? 'opacity-100' : 'opacity-0')}
          />
        )}
        {!loaded && !failed && <span className="skeleton absolute inset-0" />}
      </button>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-2.5 pt-8 opacity-0 transition group-hover:opacity-100">
        <p className="truncate text-xs font-medium text-white">{photo.originalName}</p>
        <p className="truncate text-[11px] text-white/70">by {photo.uploadedBy.name}</p>
      </div>

      {selectable && (
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={photo.selected}
          aria-label={photo.selected ? 'Remove from client gallery' : 'Add to client gallery'}
          title={photo.selected ? 'Remove from client gallery' : 'Add to client gallery'}
          className={cx(
            'absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 transition',
            photo.selected
              ? 'border-brand-500 bg-brand-500 text-white shadow'
              : 'border-white/90 bg-black/20 text-transparent opacity-100 backdrop-blur-sm hover:bg-black/40 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100',
          )}
        >
          <Icon name="check" className="h-4 w-4" strokeWidth={3} />
        </button>
      )}

      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete photo"
          title="Delete photo"
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white opacity-100 backdrop-blur-sm transition hover:bg-red-600 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
        >
          <Icon name="trash" className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
