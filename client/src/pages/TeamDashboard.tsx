import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { eventApi, photoApi } from '../services/gallery';

export const TeamDashboard = () => {
  const { user, logout } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [error, setError] = useState('');

  const loadEvents = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await eventApi.list();
      setEvents(data);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'Unable to load assigned events.');
    } finally {
      setLoading(false);
    }
  };

  const loadEventPhotos = async () => {
    setLoadingPhotos(true);
    try {
      const { data } = await photoApi.list({});
      setPhotos(data);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'Unable to load your photos.');
      setPhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  };

  useEffect(() => {
    loadEvents();
    loadEventPhotos();
  }, []);

  const selectEvent = async (eventId: string) => {
    setSelectedEvent(eventId);
    setLoadingPhotos(true);
    setError('');
    try {
      const { data } = await photoApi.list({ eventId });
      setPhotos(data);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'Unable to load your photos.');
      setPhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const uploadPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !selectedEvent) return;
    try {
      await photoApi.upload(selectedEvent, files);
      await selectEvent(selectedEvent);
      await loadEvents();
    } catch (requestError: any) {
      alert(requestError.response?.data?.message || 'Photo upload failed. Please try again.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto p-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Team Member Dashboard</h1>
            <p className="text-sm text-gray-500">{user?.name}</p>
          </div>
          <button onClick={logout} className="text-sm border rounded px-3 py-1">Logout</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 grid gap-4">
        <section className="bg-white rounded-xl shadow p-4">
          <h2 className="font-semibold mb-2">Assigned Events</h2>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          {loading ? <p className="text-sm text-gray-500">Loading assigned events...</p> : events.length === 0 ? <p className="text-sm text-gray-500">No events have been assigned to you yet.</p> : <div className="grid gap-2 md:grid-cols-3">
            {events.map((evt) => (
              <div key={evt.id} onClick={() => selectEvent(evt.id)} className={`border rounded p-3 cursor-pointer ${selectedEvent === evt.id ? 'border-black' : ''}`}>
                <p className="font-medium">{evt.name}</p>
                <p className="text-sm text-gray-500">{evt._count?.photos ?? 0} photos</p>
              </div>
            ))}
          </div>}
        </section>

        <section className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-semibold">Event Photos</h2>
                <p className="text-sm text-gray-500">Showing photos uploaded to the selected event.</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedEvent && <button type="button" onClick={() => { setSelectedEvent(''); loadEventPhotos(); }} className="text-sm border rounded px-2 py-1">All Photos</button>}
                <label className={`text-sm border rounded px-2 py-1 ${selectedEvent ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                  Upload Photos
                  <input type="file" multiple accept="image/*" className="hidden" onChange={uploadPhotos} disabled={!selectedEvent} />
                </label>
              </div>
            </div>
            {loadingPhotos ? <p className="text-sm text-gray-500">Loading event photos...</p> : photos.length === 0 ? <p className="text-sm text-gray-500">No photos have been uploaded for this event yet.</p> : <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {photos.map((photo) => (
                <div key={photo.id} className="border rounded overflow-hidden">
                  <img src={photo.thumbnailUrl || photo.url} alt={photo.originalName} className="w-full aspect-square object-cover" />
                  <div className="p-2">
                    <p className="text-xs truncate">{photo.originalName}</p>
                  </div>
                </div>
              ))}
            </div>}
          </section>
      </main>
    </div>
  );
};

export default TeamDashboard;
