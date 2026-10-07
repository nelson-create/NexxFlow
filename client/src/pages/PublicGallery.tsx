import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { errorMessage } from '../services/api';
import { publicGalleryApi } from '../services/gallery';
import { clearGalleryAccess, loadGalleryAccess, saveGalleryAccess, sizedUrl } from '../lib/galleryAccess';
import { downloadFile, formatDate, plural } from '../lib/format';
import type { PublicGalleryData } from '../lib/types';
import { Icon } from '../components/Icon';
import { Lightbox, lightboxActionClass } from '../components/Lightbox';
import { PinInput } from '../components/PinInput';
import { Button, EmptyState, Logo } from '../components/ui';

const PinGate = ({ slug, onUnlocked }: { slug: string; onUnlocked: (data: PublicGalleryData) => void }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (value = pin) => {
    if (value.length !== 6 || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const { data } = await publicGalleryApi.verify(slug, value);
      saveGalleryAccess(data);
      onUnlocked(data);
    } catch (err) {
      setError(errorMessage(err, 'That PIN is incorrect or this gallery is no longer available.'));
      setPin('');
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-950 px-4 text-white">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600/25 blur-3xl" />
      <div className="relative py-6">
        <Logo to="/gallery/access" light />
      </div>
      <form
        className="relative mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center pb-24 text-center"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
          <Icon name="lock" className="h-6 w-6 text-brand-300" />
        </span>
        <h1 className="mt-6 font-display text-3xl font-medium tracking-tight">Your private gallery</h1>
        <p className="mt-2 text-sm text-white/60">Enter the 6-digit PIN your photographer shared with you.</p>
        <div className="mt-8">
          <PinInput value={pin} onChange={setPin} onComplete={submit} invalid={!!error} disabled={submitting} autoFocus dark />
        </div>
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-300">
            {error}
          </p>
        )}
        <Button type="submit" variant="brand" size="lg" className="mt-8 w-full" loading={submitting} disabled={pin.length !== 6}>
          View photos
        </Button>
      </form>
    </div>
  );
};

export const PublicGallery = () => {
  const { slug = '' } = useParams();
  const [data, setData] = useState<PublicGalleryData | null>(() => loadGalleryAccess(slug));
  const [viewer, setViewer] = useState<number | null>(null);

  useEffect(() => {
    setData(loadGalleryAccess(slug));
  }, [slug]);

  useEffect(() => {
    document.title = data ? `${data.gallery.eventName} · Nexxflow` : 'Private gallery · Nexxflow';
    return () => {
      document.title = 'Nexxflow';
    };
  }, [data]);

  if (!data) return <PinGate slug={slug} onUnlocked={setData} />;

  const { gallery, photos } = data;

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-[#fafaf9]/85 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo to="/gallery/access" />
          <button
            type="button"
            onClick={() => {
              clearGalleryAccess(slug);
              setData(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <Icon name="lock" className="h-4 w-4" /> Lock
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 pb-10 pt-14 text-center sm:pt-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">{plural(photos.length, 'photo')}</p>
        <h1 className="mt-3 font-display text-4xl font-medium tracking-tight text-zinc-900 sm:text-5xl">{gallery.eventName}</h1>
        {gallery.description && <p className="mx-auto mt-4 max-w-xl whitespace-pre-line text-zinc-600">{gallery.description}</p>}
        <p className="mt-4 text-sm text-zinc-400">Delivered {formatDate(gallery.publishedAt)}</p>
      </section>

      <main className="mx-auto max-w-7xl px-2 pb-20 sm:px-6 lg:px-8">
        {photos.length ? (
          <div className="columns-2 gap-2 sm:gap-3 md:columns-3 xl:columns-4">
            {photos.map((photo, index) => (
              <figure key={photo.id} className="group relative mb-2 break-inside-avoid overflow-hidden rounded-lg bg-zinc-200 sm:mb-3">
                <button type="button" onClick={() => setViewer(index)} className="block w-full" aria-label={`View ${photo.originalName}`}>
                  <img
                    src={sizedUrl(photo.url, 900)}
                    alt={photo.originalName}
                    loading="lazy"
                    className="w-full transition duration-500 group-hover:scale-[1.02]"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => downloadFile(photo.url, photo.originalName)}
                  aria-label={`Download ${photo.originalName}`}
                  className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-zinc-800 opacity-100 shadow transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                >
                  <Icon name="download" className="h-4 w-4" />
                </button>
              </figure>
            ))}
          </div>
        ) : (
          <EmptyState icon="images" title="Photos are on their way" description="Your photographer hasn't added any photos to this gallery yet. Check back soon." />
        )}
      </main>

      <footer className="border-t border-zinc-200 py-8 text-center text-xs text-zinc-400">
        Delivered with{' '}
        <Link to="/gallery/access" className="font-semibold text-zinc-600 hover:text-zinc-900">
          Nexxflow
        </Link>
      </footer>

      {viewer !== null && (
        <Lightbox
          photos={photos}
          index={viewer}
          onIndexChange={setViewer}
          onClose={() => setViewer(null)}
          actions={(photo) => (
            <button type="button" onClick={() => downloadFile(photo.url, photo.originalName)} className={lightboxActionClass}>
              <Icon name="download" className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
          )}
        />
      )}
    </div>
  );
};

export default PublicGallery;
