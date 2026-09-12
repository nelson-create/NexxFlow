import React from 'react';

export const PublicGalleryGate = () => {
  const [slug, setSlug] = React.useState('');
  const [pin, setPin] = React.useState('');
  const [error, setError] = React.useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { publicGalleryApi } = await import('../services/gallery');
      const { data } = await publicGalleryApi.verify(slug, pin);
      sessionStorage.setItem('gallery', JSON.stringify(data));
      window.location.href = `/gallery/${slug}`;
    } catch {
      setError('Invalid PIN or gallery');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <form onSubmit={submit} className="bg-white p-6 rounded-2xl shadow w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold text-center">Access Gallery</h1>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <input className="w-full border rounded p-2" placeholder="Gallery link code" value={slug} onChange={(e) => setSlug(e.target.value)} />
        <input className="w-full border rounded p-2" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
        <button type="submit" className="w-full bg-black text-white rounded p-2">Enter Gallery</button>
      </form>
    </div>
  );
};

export default PublicGalleryGate;
