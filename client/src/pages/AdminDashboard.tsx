import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { eventApi, photoApi } from '../services/gallery';

export const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [users, setUsers] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any>(null);
  const [accessPin, setAccessPin] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', description: '', memberIds: [] as string[] });

  const load = async () => {
    setLoading(true);
    const [{ data: evts }, usersData] = await Promise.all([eventApi.list(), fetchUsers()]);
    setEvents(evts);
    setUsers(usersData);
    setLoading(false);
  };

  const fetchUsers = async (): Promise<any[]> => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Failed');
    return res.json();
  };

  useEffect(() => {
    load();
  }, []);

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    await eventApi.create(form);
    setForm({ name: '', description: '', memberIds: [] });
    load();
  };

  const selectEvent = async (eventId: string) => {
    setSelectedEvent(eventId);
    const galleryRequest = eventApi.getByEvent(eventId).catch((error: { response?: { status?: number } }) => {
      if (error.response?.status === 404) {
        return { data: null };
      }
      throw error;
    });
    const [{ data: evt }, { data: galleryData }, { data: photosData }] = await Promise.all([
      eventApi.get(eventId),
      galleryRequest,
      photoApi.list({ eventId, uploadedByMe: false }),
    ]);
    setPhotos(photosData);
    setGallery(galleryData);
    if (!galleryData) setAccessPin('');
  };

  const publish = async () => {
    const pin = prompt('Enter 6-digit PIN for this gallery:');
    if (!pin || pin.length !== 6) return alert('PIN must be 6 digits');
    const { data: publishedGallery } = await eventApi.publish({ eventId: selectedEvent, pin });
    setAccessPin(publishedGallery.accessPin);
    alert('Gallery published');
    selectEvent(selectedEvent);
  };

  const uploadPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !selectedEvent) return;
    try {
      await photoApi.upload(selectedEvent, files);
      await selectEvent(selectedEvent);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Photo upload failed. Please try again.');
    } finally {
      e.target.value = '';
    }
  };

  const toggleSelect = async (id: string, selected: boolean) => {
    await photoApi.update(id, { selected: !selected });
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, selected: !selected } : p)));
  };

  const deletePhoto = async (id: string) => {
    if (!window.confirm('Delete this photo permanently?')) return;
    await photoApi.remove(id);
    setPhotos((prev) => prev.filter((photo) => photo.id !== id));
    setEvents((prev) => prev.map((event) => event.id === selectedEvent
      ? { ...event, _count: { ...event._count, photos: Math.max((event._count?.photos ?? 1) - 1, 0) } }
      : event));
  };

  const deleteEvent = async (eventId: string) => {
    if (!window.confirm('Delete this event and all of its photos permanently?')) return;
    await eventApi.remove(eventId);
    setEvents((prev) => prev.filter((event) => event.id !== eventId));
    if (selectedEvent === eventId) {
      setSelectedEvent('');
      setPhotos([]);
      setGallery(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto p-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Admin Dashboard</h1>
            <p className="text-sm text-gray-500">{user?.name}</p>
          </div>
          <button onClick={logout} className="text-sm border rounded px-3 py-1">Logout</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 grid gap-4">
        <section className="bg-white rounded-xl shadow p-4">
          <h2 className="font-semibold mb-2">Create Event</h2>
          <form onSubmit={createEvent} className="grid gap-2 md:grid-cols-3">
            <input className="border rounded p-2" placeholder="Event name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className="border rounded p-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <select className="border rounded p-2" multiple value={form.memberIds} onChange={(e) => setForm({ ...form, memberIds: Array.from(e.target.selectedOptions).map((o) => o.value) })}>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <button type="submit" className="bg-black text-white rounded p-2">Create</button>
          </form>
        </section>

        <section className="bg-white rounded-xl shadow p-4">
          <h2 className="font-semibold mb-2">Your Events</h2>
          {loading ? <p>Loading...</p> : (
            <div className="grid gap-2 md:grid-cols-3">
              {events.map((evt) => (
                <div key={evt.id} onClick={() => selectEvent(evt.id)} className={`border rounded p-3 cursor-pointer ${selectedEvent === evt.id ? 'border-black' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{evt.name}</p>
                      <p className="text-sm text-gray-500">{evt._count?.photos ?? 0} photos</p>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => { event.stopPropagation(); deleteEvent(evt.id); }}
                      className="text-xs border border-red-300 text-red-700 rounded px-2 py-1"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {selectedEvent && (
          <section className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Photos</h2>
              <div className="space-x-2">
                <label className="text-sm border rounded px-2 py-1 cursor-pointer">
                  Upload Photos
                  <input type="file" multiple accept="image/*" className="hidden" onChange={uploadPhotos} />
                </label>
                <button onClick={publish} className="text-sm bg-black text-white rounded px-3 py-1">Publish Gallery</button>
              </div>
            </div>
            {gallery && (
              <div className="text-sm text-gray-600 mb-2 space-y-1">
                <p>
                  Shareable link:{' '}
                  <a
                    href={`${window.location.origin}/gallery/${gallery.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-700 underline hover:text-blue-900"
                  >
                    {window.location.origin}/gallery/{gallery.slug}
                  </a>
                </p>
                {accessPin && <p>Access PIN: {accessPin}</p>}
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {photos.map((photo) => (
                <div key={photo.id} className={`border rounded overflow-hidden ${photo.selected ? 'border-black' : ''}`}>
                  <img src={photo.thumbnailUrl || photo.url} alt={photo.originalName} className="w-full aspect-square object-cover" />
                  <div className="p-2 flex items-center justify-between">
                    <p className="text-xs truncate flex-1">{photo.originalName}</p>
                    <button onClick={() => toggleSelect(photo.id, photo.selected)} className="text-xs border rounded px-2 py-1">
                      {photo.selected ? 'Deselect' : 'Select'}
                    </button>
                    <button onClick={() => deletePhoto(photo.id)} className="text-xs border border-red-300 text-red-700 rounded px-2 py-1">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
