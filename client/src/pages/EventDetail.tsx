import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { errorMessage } from '../services/api';
import { eventApi, photoApi } from '../services/gallery';
import { downloadFile, formatDate, formatRelative, plural } from '../lib/format';
import type { EventItem, Photo } from '../lib/types';
import { EventFormModal } from '../components/EventFormModal';
import { GalleryPanel } from '../components/GalleryPanel';
import { Icon } from '../components/Icon';
import { Lightbox, lightboxActionClass } from '../components/Lightbox';
import { useOverlay } from '../components/overlays';
import { PhotoTile } from '../components/PhotoTile';
import { TeamPanel } from '../components/TeamPanel';
import { DropArea, UploadButton, UploadProgress, useUploader } from '../components/Upload';
import { Alert, Badge, Button, EmptyState, FullPageSpinner, cx } from '../components/ui';

type Filter = 'all' | 'selected' | 'unselected' | 'mine';

export const EventDetail = () => {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast, confirm } = useOverlay();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'not-found' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [viewer, setViewer] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const isOwner = !!event && event.createdById === user?.id;

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [{ data: eventData }, { data: photoData }] = await Promise.all([eventApi.get(id), photoApi.list({ eventId: id })]);
      setEvent(eventData);
      setPhotos(photoData);
      setStatus('ready');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) setStatus('not-found');
      else {
        setLoadError(errorMessage(err, 'Unable to load this event.'));
        setStatus('error');
      }
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const uploader = useUploader(event?.id, (uploaded) => setPhotos((current) => [...uploaded, ...current]));

  const counts = useMemo(
    () => ({
      all: photos.length,
      selected: photos.filter((photo) => photo.selected).length,
      mine: photos.filter((photo) => photo.uploadedById === user?.id).length,
    }),
    [photos, user?.id],
  );

  const visible = useMemo(() => {
    if (filter === 'selected') return photos.filter((photo) => photo.selected);
    if (filter === 'unselected') return photos.filter((photo) => !photo.selected);
    if (filter === 'mine') return photos.filter((photo) => photo.uploadedById === user?.id);
    return photos;
  }, [photos, filter, user?.id]);

  // Keep the lightbox index valid when the visible list shrinks (e.g. after a delete).
  useEffect(() => {
    if (viewer !== null && viewer >= visible.length) setViewer(visible.length ? visible.length - 1 : null);
  }, [viewer, visible.length]);

  const toggleSelected = async (photo: Photo) => {
    const selected = !photo.selected;
    setPhotos((current) => current.map((item) => (item.id === photo.id ? { ...item, selected } : item)));
    try {
      await photoApi.update(photo.id, { selected });
    } catch (err) {
      setPhotos((current) => current.map((item) => (item.id === photo.id ? { ...item, selected: !selected } : item)));
      toast(errorMessage(err, 'Could not update the selection.'), 'error');
    }
  };

  const bulkSelect = async (selected: boolean) => {
    const targets = visible.filter((photo) => photo.selected !== selected).map((photo) => photo.id);
    if (!targets.length || !event) return;
    setBulkBusy(true);
    const ids = new Set(targets);
    setPhotos((current) => current.map((item) => (ids.has(item.id) ? { ...item, selected } : item)));
    try {
      await photoApi.bulkSelect(event.id, targets, selected);
      toast(selected ? `Added ${plural(targets.length, 'photo')} to the gallery.` : `Removed ${plural(targets.length, 'photo')} from the gallery.`);
    } catch (err) {
      setPhotos((current) => current.map((item) => (ids.has(item.id) ? { ...item, selected: !selected } : item)));
      toast(errorMessage(err), 'error');
    } finally {
      setBulkBusy(false);
    }
  };

  const deletePhoto = async (photo: Photo) => {
    const ok = await confirm({
      title: 'Delete this photo?',
      description: `“${photo.originalName}” will be permanently removed${photo.selected ? ' from the event and the client gallery' : ''}.`,
      confirmLabel: 'Delete photo',
    });
    if (!ok) return;
    try {
      await photoApi.remove(photo.id);
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
      toast('Photo deleted.');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const deleteEvent = async () => {
    if (!event) return;
    const ok = await confirm({
      title: `Delete “${event.name}”?`,
      description: `This permanently deletes the event, all ${plural(photos.length, 'photo')}, and its client gallery. This can't be undone.`,
      confirmLabel: 'Delete event',
    });
    if (!ok) return;
    try {
      await eventApi.remove(event.id);
      toast('Event deleted.');
      navigate('/events', { replace: true });
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  if (status === 'loading' && !event) return <FullPageSpinner label="Loading event" />;

  if (status === 'not-found') {
    return (
      <div className="card">
        <EmptyState
          icon="search"
          title="Event not found"
          description="It may have been deleted, or you no longer have access to it."
          action={
            <Link to="/events" className="text-sm font-semibold text-brand-700 hover:underline">
              Back to events
            </Link>
          }
        />
      </div>
    );
  }

  if (status === 'error' || !event) {
    return (
      <Alert>
        {loadError}{' '}
        <button type="button" onClick={load} className="font-semibold underline">
          Retry
        </button>
      </Alert>
    );
  }

  const canDelete = (photo: Photo) => isOwner || photo.uploadedById === user?.id;
  const filters: { key: Filter; label: string; count: number }[] = isOwner
    ? [
        { key: 'all', label: 'All', count: counts.all },
        { key: 'selected', label: 'Selected', count: counts.selected },
        { key: 'unselected', label: 'Not selected', count: counts.all - counts.selected },
      ]
    : [
        { key: 'all', label: 'All', count: counts.all },
        { key: 'mine', label: 'My uploads', count: counts.mine },
      ];
  const allVisibleSelected = visible.length > 0 && visible.every((photo) => photo.selected);

  return (
    <div className="space-y-6">
      <Link to="/events" className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900">
        <Icon name="arrowLeft" className="h-4 w-4" /> All events
      </Link>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">{event.name}</h1>
            {event.gallery?.publishedAt ? (
              <Badge tone="success">
                <Icon name="globe" className="h-3 w-3" /> Published
              </Badge>
            ) : (
              <Badge>Draft</Badge>
            )}
          </div>
          {event.description && <p className="mt-2 max-w-2xl whitespace-pre-line text-sm text-zinc-600">{event.description}</p>}
          <p className="mt-2 text-xs text-zinc-500">
            Created {formatDate(event.createdAt)} · {plural(counts.all, 'photo')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isOwner && (
            <>
              <Button variant="secondary" icon="pencil" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button variant="secondary" icon="trash" onClick={deleteEvent} className="hover:border-red-300 hover:bg-red-50 hover:text-red-700">
                Delete
              </Button>
            </>
          )}
          <UploadButton onFiles={uploader.upload} loading={uploader.uploading} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <DropArea onFiles={uploader.upload} disabled={uploader.uploading} className="card min-h-[320px] p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex rounded-xl bg-zinc-100 p-1" role="tablist" aria-label="Filter photos">
              {filters.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={filter === item.key}
                  onClick={() => setFilter(item.key)}
                  className={cx(
                    'rounded-lg px-3 py-1.5 text-sm font-medium transition',
                    filter === item.key ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800',
                  )}
                >
                  {item.label} <span className="tabular-nums text-zinc-400">{item.count}</span>
                </button>
              ))}
            </div>
            {isOwner && visible.length > 0 && (
              <Button variant="ghost" size="sm" icon={allVisibleSelected ? 'x' : 'checkCircle'} loading={bulkBusy} onClick={() => bulkSelect(!allVisibleSelected)}>
                {allVisibleSelected ? 'Deselect all' : 'Select all'}
                {filter !== 'all' && ' shown'}
              </Button>
            )}
          </div>

          {isOwner && photos.length > 0 && counts.selected === 0 && filter === 'all' && (
            <div className="mb-4">
              <Alert tone="info">Tick the circle on a photo to add it to the client gallery.</Alert>
            </div>
          )}

          {visible.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {visible.map((photo, index) => (
                <PhotoTile
                  key={photo.id}
                  photo={photo}
                  selectable={isOwner}
                  canDelete={canDelete(photo)}
                  onOpen={() => setViewer(index)}
                  onToggle={() => toggleSelected(photo)}
                  onDelete={() => deletePhoto(photo)}
                />
              ))}
            </div>
          ) : photos.length ? (
            <EmptyState icon="image" title="Nothing here" description="No photos match this filter." />
          ) : (
            <EmptyState
              icon="cloudUpload"
              title="Drop photos here"
              description="Drag images into this area, or use the upload button. JPEG, PNG, WebP and HEIC up to 15 MB each."
              action={<UploadButton onFiles={uploader.upload} loading={uploader.uploading} variant="secondary" label="Choose files" />}
            />
          )}
        </DropArea>

        <aside className="space-y-6">
          {isOwner && (
            <GalleryPanel
              event={event}
              gallery={event.gallery}
              selectedCount={counts.selected}
              onChange={(gallery) => setEvent((current) => current && { ...current, gallery })}
            />
          )}
          <TeamPanel
            eventId={event.id}
            members={event.members}
            editable={isOwner}
            onChange={(members) => setEvent((current) => current && { ...current, members, memberIds: members.map((member) => member.id) })}
          />
          {!isOwner && (
            <section className="card p-5 text-sm text-zinc-600">
              <h2 className="font-semibold text-zinc-900">Uploading tips</h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-4">
                <li>Drag a whole folder's worth of photos onto the grid.</li>
                <li>Up to 15 MB per image; large batches upload in chunks.</li>
                <li>You can delete photos you uploaded yourself.</li>
              </ul>
            </section>
          )}
        </aside>
      </div>

      {viewer !== null && visible[viewer] && (
        <Lightbox
          photos={visible}
          index={viewer}
          onIndexChange={setViewer}
          onClose={() => setViewer(null)}
          caption={(photo) => `by ${photo.uploadedBy.name}, ${formatRelative(photo.createdAt)}`}
          actions={(photo) => (
            <>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => toggleSelected(photo)}
                  className={cx(lightboxActionClass, photo.selected && 'bg-brand-600 hover:bg-brand-500')}
                  aria-pressed={photo.selected}
                >
                  <Icon name={photo.selected ? 'checkCircle' : 'plus'} className="h-4 w-4" />
                  <span className="hidden sm:inline">{photo.selected ? 'In gallery' : 'Add to gallery'}</span>
                </button>
              )}
              <button type="button" onClick={() => downloadFile(photo.url, photo.originalName)} className={lightboxActionClass} aria-label="Download">
                <Icon name="download" className="h-4 w-4" />
              </button>
              {canDelete(photo) && (
                <button type="button" onClick={() => deletePhoto(photo)} className={cx(lightboxActionClass, 'hover:bg-red-600')} aria-label="Delete">
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        />
      )}

      <UploadProgress state={uploader.state} />

      {isOwner && <EventFormModal open={editing} onClose={() => setEditing(false)} event={event} onSaved={(updated) => setEvent(updated)} />}
    </div>
  );
};

export default EventDetail;
