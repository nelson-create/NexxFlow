import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { errorMessage } from '../services/api';
import { photoApi } from '../services/gallery';
import { plural } from '../lib/format';
import type { Photo } from '../lib/types';
import { Icon } from './Icon';
import { useOverlay } from './overlays';
import { Button, Spinner, cx } from './ui';

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const BATCH_FILES = 6;
const BATCH_BYTES = 40 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
export const ACCEPT_ATTR = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';

type UploadState = { total: number; done: number; progress: number };

/** Validates files, uploads them in size-bounded batches, and reports byte-level progress. */
export const useUploader = (eventId: string | undefined, onUploaded: (photos: Photo[]) => void) => {
  const { toast } = useOverlay();
  const [state, setState] = useState<UploadState | null>(null);

  const uploading = !!state;

  // Warn before closing the tab mid-upload.
  useEffect(() => {
    if (!uploading) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [uploading]);

  const upload = async (input: FileList | File[]) => {
    if (!eventId || state) return;
    const files = Array.from(input);
    const valid = files.filter((file) => ACCEPTED_TYPES.includes(file.type) && file.size <= MAX_FILE_BYTES);
    const wrongType = files.filter((file) => !ACCEPTED_TYPES.includes(file.type)).length;
    const tooBig = files.filter((file) => ACCEPTED_TYPES.includes(file.type) && file.size > MAX_FILE_BYTES).length;

    if (wrongType) toast(`Skipped ${plural(wrongType, 'file')}: only JPEG, PNG, WebP and HEIC images are supported.`, 'error');
    if (tooBig) toast(`Skipped ${plural(tooBig, 'file')} larger than 15 MB.`, 'error');
    if (!valid.length) return;

    const batches: File[][] = [];
    for (const file of valid) {
      const last = batches[batches.length - 1];
      const lastBytes = last?.reduce((sum, item) => sum + item.size, 0) ?? 0;
      if (!last || last.length >= BATCH_FILES || lastBytes + file.size > BATCH_BYTES) batches.push([file]);
      else last.push(file);
    }

    const totalBytes = valid.reduce((sum, file) => sum + file.size, 0) || 1;
    let sentBytes = 0;
    let done = 0;
    let failed = 0;
    let lastError = '';
    setState({ total: valid.length, done: 0, progress: 0 });

    for (const batch of batches) {
      const batchBytes = batch.reduce((sum, file) => sum + file.size, 0);
      try {
        const { data } = await photoApi.upload(eventId, batch, (event) => {
          const fraction = event.total ? Math.min(event.loaded / event.total, 1) : 0;
          setState({ total: valid.length, done, progress: (sentBytes + fraction * batchBytes) / totalBytes });
        });
        done += data.length;
        onUploaded(data);
      } catch (error) {
        failed += batch.length;
        lastError = errorMessage(error, 'Upload failed.');
      }
      sentBytes += batchBytes;
      setState({ total: valid.length, done, progress: sentBytes / totalBytes });
    }

    setState(null);
    if (done) toast(`Uploaded ${plural(done, 'photo')}.`);
    if (failed) toast(`${plural(failed, 'photo')} failed to upload. ${lastError}`, 'error');
  };

  return { upload, state, uploading };
};

export const UploadButton = ({
  onFiles,
  disabled,
  loading,
  variant = 'brand',
  label = 'Upload photos',
}: {
  onFiles: (files: FileList) => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'brand' | 'primary' | 'secondary';
  label?: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button variant={variant} icon="upload" loading={loading} disabled={disabled} onClick={() => inputRef.current?.click()}>
        {label}
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) onFiles(event.target.files);
          event.target.value = '';
        }}
      />
    </>
  );
};

/** Wraps content in a drop target; shows an overlay while files are dragged over it. */
export const DropArea = ({ onFiles, disabled, children, className }: { onFiles: (files: FileList) => void; disabled?: boolean; children: React.ReactNode; className?: string }) => {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const hasFiles = (event: React.DragEvent) => event.dataTransfer.types.includes('Files');

  return (
    <div
      className={cx('relative', className)}
      onDragEnter={(event) => {
        if (disabled || !hasFiles(event)) return;
        event.preventDefault();
        depth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => {
        if (disabled || !hasFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (!depth.current) setDragging(false);
      }}
      onDrop={(event) => {
        if (disabled || !hasFiles(event)) return;
        event.preventDefault();
        depth.current = 0;
        setDragging(false);
        if (event.dataTransfer.files.length) onFiles(event.dataTransfer.files);
      }}
    >
      {children}
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-20 flex animate-fade-in items-center justify-center rounded-2xl border-2 border-dashed border-brand-500 bg-brand-50/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-brand-700">
            <Icon name="cloudUpload" className="h-10 w-10" strokeWidth={1.5} />
            <p className="text-sm font-semibold">Drop photos to upload</p>
          </div>
        </div>
      )}
    </div>
  );
};

export const UploadProgress = ({ state }: { state: UploadState | null }) => {
  if (!state) return null;
  const percent = Math.round(state.progress * 100);
  return createPortal(
    <div className="fixed bottom-4 left-4 right-4 z-40 animate-slide-in sm:left-auto sm:w-80" role="status" aria-live="polite">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-lift">
        <div className="flex items-center gap-3">
          <Spinner className="h-4 w-4 text-brand-600" />
          <p className="flex-1 text-sm font-medium text-zinc-900">
            Uploading {state.done} of {plural(state.total, 'photo')}
          </p>
          <span className="text-xs font-semibold tabular-nums text-zinc-500">{percent}%</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div className="h-full rounded-full bg-brand-600 transition-[width] duration-300" style={{ width: `${Math.max(percent, 3)}%` }} />
        </div>
        <p className="mt-2 text-xs text-zinc-500">Keep this tab open until the upload finishes.</p>
      </div>
    </div>,
    document.body,
  );
};
