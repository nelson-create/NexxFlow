import React from 'react';
import { useParams } from 'react-router-dom';
import { publicGalleryApi } from '../services/gallery';

export const PublicGallery = () => {
  const { slug } = useParams();
  const [data, setData] = React.useState<{ gallery: any; photos: any[] } | null>(null);
  const [pin, setPin] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    const stored = sessionStorage.getItem('gallery');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.gallery?.slug === slug) {
          setData(parsed);
        }
      } catch {
        sessionStorage.removeItem('gallery');
      }
    }
    setLoading(false);
  }, [slug]);

  const submitPin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!slug) return;
    setSubmitting(true);
    setError('');
    try {
      const { data: verifiedGallery } = await publicGalleryApi.verify(slug, pin);
      sessionStorage.setItem('gallery', JSON.stringify(verifiedGallery));
      setData(verifiedGallery);
    } catch {
      setError('Invalid PIN or gallery unavailable');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading gallery...</div>;
  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <form onSubmit={submitPin} className="bg-white p-6 rounded-2xl shadow w-full max-w-sm space-y-4">
          <h1 className="text-xl font-semibold text-center">Private Gallery</h1>
          <p className="text-sm text-gray-500 text-center">Enter the PIN shared by the event team.</p>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <input
            className="w-full border rounded p-2"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="6-digit PIN"
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
            required
          />
          <button type="submit" disabled={submitting} className="w-full bg-black text-white rounded p-2 disabled:opacity-50">
            {submitting ? 'Checking...' : 'View Gallery'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{data.gallery.eventName}</h1>
            <p className="text-sm text-gray-500">Published gallery</p>
          </div>
          <span className="text-sm text-gray-500">{data.photos.length} photos</span>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {data.photos.map((photo) => (
            <div key={photo.id} className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
              <img src={photo.url} alt={photo.originalName} className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default PublicGallery;
