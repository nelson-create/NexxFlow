import { useState } from 'react';
import { errorMessage } from '../services/api';
import { galleryApi } from '../services/gallery';
import { formatRelative, galleryUrl, plural, randomPin } from '../lib/format';
import type { EventItem, GallerySummary } from '../lib/types';
import { CopyField, copyText } from './CopyField';
import { Icon } from './Icon';
import { Modal, useOverlay } from './overlays';
import { PinInput } from './PinInput';
import { Alert, Button, buttonClass } from './ui';

type Step = { kind: 'pin'; mode: 'publish' | 'change' } | { kind: 'share'; pin: string } | null;

/** Admin card for publishing, sharing, re-keying and unpublishing an event's client gallery. */
export const GalleryPanel = ({
  event,
  gallery,
  selectedCount,
  onChange,
}: {
  event: EventItem;
  gallery: GallerySummary | null;
  selectedCount: number;
  onChange: (gallery: GallerySummary) => void;
}) => {
  const { toast, confirm } = useOverlay();
  const [step, setStep] = useState<Step>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [busy, setBusy] = useState(false);

  const live = !!gallery?.publishedAt;
  const link = gallery ? galleryUrl(gallery.slug) : '';

  const openPinStep = (mode: 'publish' | 'change') => {
    setPin(randomPin());
    setPinError('');
    setStep({ kind: 'pin', mode });
  };

  const publish = async (newPin?: string) => {
    setBusy(true);
    setPinError('');
    try {
      const { data } = await galleryApi.publish(event.id, newPin);
      onChange(data);
      if (newPin) setStep({ kind: 'share', pin: newPin });
      else toast('Gallery is live again.');
    } catch (err) {
      const message = errorMessage(err, 'Unable to publish the gallery.');
      if (step) setPinError(message);
      else toast(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const unpublish = async () => {
    const ok = await confirm({
      title: 'Take the gallery offline?',
      description: 'The link and PIN will stop working until you publish again. Your photo selection is kept.',
      confirmLabel: 'Unpublish',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const { data } = await galleryApi.unpublish(event.id);
      onChange(data);
      toast('Gallery unpublished.');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const shareMessage = (sharePin: string) =>
    `Your photos from ${event.name} are ready!\n\nView them here: ${link}\nAccess PIN: ${sharePin}`;

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-zinc-900">Client gallery</h2>
        {live ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        ) : (
          <span className="text-xs font-medium text-zinc-500">{gallery ? 'Offline' : 'Not published'}</span>
        )}
      </div>

      {live ? (
        <div className="mt-4 space-y-3">
          <CopyField label="gallery link" value={link} />
          <p className="text-xs text-zinc-500">
            Showing {plural(selectedCount, 'selected photo')} · published {formatRelative(gallery!.publishedAt!)}. Selection changes go live
            immediately.
          </p>
          {selectedCount === 0 && <Alert tone="info">No photos are selected, so your client will see an empty gallery.</Alert>}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <a href={link} target="_blank" rel="noreferrer" className={buttonClass('secondary', 'sm')}>
              <Icon name="external" className="h-3.5 w-3.5" /> Preview
            </a>
            <Button variant="secondary" size="sm" icon="key" onClick={() => openPinStep('change')}>
              Change PIN
            </Button>
          </div>
          <Button variant="ghost" size="sm" icon="eyeOff" className="w-full text-red-600 hover:bg-red-50 hover:text-red-700" onClick={unpublish} disabled={busy}>
            Unpublish
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          <p className="text-sm text-zinc-500">
            {gallery
              ? 'This gallery is offline. Republish it to make the existing link and PIN work again.'
              : 'Select the best shots, then publish a private gallery your client can open with a 6-digit PIN.'}
          </p>
          <div className="rounded-xl bg-zinc-50 px-3.5 py-3 text-sm">
            <span className="font-semibold tabular-nums text-zinc-900">{selectedCount}</span>{' '}
            <span className="text-zinc-500">{selectedCount === 1 ? 'photo' : 'photos'} selected for the client</span>
          </div>
          {gallery ? (
            <div className="grid gap-2">
              <Button variant="brand" icon="globe" className="w-full" onClick={() => publish()} loading={busy} disabled={!selectedCount}>
                Republish
              </Button>
              <Button variant="secondary" size="sm" icon="key" onClick={() => openPinStep('publish')} disabled={!selectedCount}>
                Republish with a new PIN
              </Button>
            </div>
          ) : (
            <Button variant="brand" icon="globe" className="w-full" onClick={() => openPinStep('publish')} disabled={!selectedCount}>
              Publish gallery
            </Button>
          )}
          {!selectedCount && <p className="text-center text-xs text-zinc-500">Tick at least one photo to publish.</p>}
        </div>
      )}

      <Modal
        open={step?.kind === 'pin'}
        onClose={() => setStep(null)}
        title={step?.kind === 'pin' && step.mode === 'change' ? 'Set a new PIN' : 'Publish gallery'}
        description={
          step?.kind === 'pin' && step.mode === 'change'
            ? 'The old PIN will stop working immediately. The link stays the same.'
            : 'Your client will need this PIN to open the gallery. We generated one for you. Change it if you like.'
        }
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setStep(null)}>
              Cancel
            </Button>
            <Button variant="brand" onClick={() => publish(pin)} loading={busy} disabled={pin.length !== 6}>
              {step?.kind === 'pin' && step.mode === 'change' ? 'Save PIN' : 'Publish'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <PinInput value={pin} onChange={setPin} invalid={!!pinError} />
          <div className="text-center">
            <button type="button" onClick={() => setPin(randomPin())} className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800">
              <Icon name="refresh" className="h-3.5 w-3.5" /> Generate another
            </button>
          </div>
          {pinError && <Alert>{pinError}</Alert>}
        </div>
      </Modal>

      <Modal
        open={step?.kind === 'share'}
        onClose={() => setStep(null)}
        title="Your gallery is live 🎉"
        description="Send your client the link and PIN. For security, the PIN is only shown now. Save it or copy the message."
        footer={
          <>
            <Button
              variant="secondary"
              icon="copy"
              onClick={async () => {
                if (step?.kind !== 'share') return;
                await copyText(shareMessage(step.pin));
                toast('Message copied. Paste it into an email or text.');
              }}
            >
              Copy message
            </Button>
            <Button onClick={() => setStep(null)}>Done</Button>
          </>
        }
      >
        {step?.kind === 'share' && (
          <div className="space-y-4">
            <div>
              <span className="label">Gallery link</span>
              <CopyField label="gallery link" value={link} />
            </div>
            <div>
              <span className="label">Access PIN</span>
              <CopyField label="PIN" value={step.pin} mono />
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
};
