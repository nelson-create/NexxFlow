import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorMessage } from '../services/api';
import { publicGalleryApi } from '../services/gallery';
import { parseGallerySlug, saveGalleryAccess } from '../lib/galleryAccess';
import { Icon } from '../components/Icon';
import { PinInput } from '../components/PinInput';
import { Button, Logo } from '../components/ui';

export const PublicGalleryGate = () => {
  const navigate = useNavigate();
  const [link, setLink] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const slug = parseGallerySlug(link);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!slug || pin.length !== 6) return;
    setSubmitting(true);
    setError('');
    try {
      const { data } = await publicGalleryApi.verify(slug, pin);
      saveGalleryAccess(data);
      navigate(`/gallery/${data.gallery.slug}`);
    } catch (err) {
      setError(errorMessage(err, 'That link or PIN is incorrect.'));
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-950 px-4 text-white">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600/25 blur-3xl" />
      <div className="relative py-6">
        <Logo to="/login" light />
      </div>
      <form onSubmit={submit} className="relative mx-auto flex w-full max-w-sm flex-1 flex-col justify-center pb-24">
        <div className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <Icon name="images" className="h-6 w-6 text-brand-300" />
          </span>
          <h1 className="mt-6 font-display text-3xl font-medium tracking-tight">Open your gallery</h1>
          <p className="mt-2 text-sm text-white/60">Paste the gallery link and enter the PIN you received.</p>
        </div>

        <label htmlFor="gallery-link" className="mt-8 block text-sm font-medium text-white/80">
          Gallery link or code
        </label>
        <input
          id="gallery-link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://…/gallery/your-event-abc123"
          autoFocus
          className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/50 focus:ring-4 focus:ring-white/10"
        />

        <span className="mt-6 block text-sm font-medium text-white/80">PIN</span>
        <div className="mt-1.5">
          <PinInput value={pin} onChange={setPin} invalid={!!error} disabled={submitting} dark />
        </div>

        {error && (
          <p role="alert" className="mt-4 text-center text-sm text-red-300">
            {error}
          </p>
        )}

        <Button type="submit" variant="brand" size="lg" className="mt-8 w-full" loading={submitting} disabled={!slug || pin.length !== 6}>
          View photos
        </Button>
      </form>
    </div>
  );
};

export default PublicGalleryGate;
