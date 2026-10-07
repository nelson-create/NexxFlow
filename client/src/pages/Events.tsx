import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { errorMessage } from '../services/api';
import { eventApi } from '../services/gallery';
import { formatDate, plural } from '../lib/format';
import type { EventItem } from '../lib/types';
import { EventFormModal } from '../components/EventFormModal';
import { Icon, IconName } from '../components/Icon';
import { Alert, Avatar, Badge, Button, EmptyState } from '../components/ui';

const StatCard = ({ icon, label, value }: { icon: IconName; label: string; value: number }) => (
  <div className="card flex items-center gap-4 p-5">
    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
      <Icon name={icon} className="h-5 w-5" />
    </span>
    <div>
      <p className="text-2xl font-semibold tabular-nums tracking-tight text-zinc-900">{value.toLocaleString()}</p>
      <p className="text-sm text-zinc-500">{label}</p>
    </div>
  </div>
);

const EventCard = ({ event }: { event: EventItem }) => {
  const published = !!event.gallery?.publishedAt;
  return (
    <Link to={`/events/${event.id}`} className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-zinc-100 to-zinc-200">
        {event.coverUrl ? (
          <img src={event.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-400">
            <Icon name="images" className="h-10 w-10" strokeWidth={1.25} />
          </div>
        )}
        <div className="absolute left-3 top-3">
          {published ? (
            <Badge tone="success" className="bg-white/95 shadow-sm">
              <Icon name="globe" className="h-3 w-3" /> Published
            </Badge>
          ) : (
            <Badge className="bg-white/95 shadow-sm">Draft</Badge>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate font-semibold text-zinc-900 group-hover:text-brand-700">{event.name}</h3>
        <p className="mt-0.5 text-xs text-zinc-500">Created {formatDate(event.createdAt)}</p>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-zinc-600">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="image" className="h-4 w-4 text-zinc-400" />
              {event._count.photos}
            </span>
            {event._count.selected > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="checkCircle" className="h-4 w-4 text-brand-500" />
                {event._count.selected}
              </span>
            )}
          </div>
          <div className="flex -space-x-2">
            {event.members.slice(0, 4).map((member) => (
              <Avatar key={member.id} name={member.name} size="sm" />
            ))}
            {event.members.length > 4 && (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-600 ring-2 ring-white">
                +{event.members.length - 4}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

const SkeletonCard = () => (
  <div className="card overflow-hidden">
    <div className="skeleton aspect-[16/10]" />
    <div className="space-y-2 p-4">
      <div className="skeleton h-4 w-2/3 rounded" />
      <div className="skeleton h-3 w-1/3 rounded" />
    </div>
  </div>
);

export const Events = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);

  const load = () => {
    setError('');
    eventApi
      .list()
      .then(({ data }) => setEvents(data))
      .catch((err) => setError(errorMessage(err, 'Unable to load events.')));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return !events || !q ? events : events.filter((event) => event.name.toLowerCase().includes(q));
  }, [events, query]);

  const stats = useMemo(
    () => ({
      events: events?.length ?? 0,
      photos: events?.reduce((sum, event) => sum + event._count.photos, 0) ?? 0,
      published: events?.filter((event) => event.gallery?.publishedAt).length ?? 0,
    }),
    [events],
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            {isAdmin ? 'Your events' : 'Assigned events'}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {isAdmin ? 'Create events, invite your team, and deliver galleries to clients.' : 'Open an event to upload the photos you shot.'}
          </p>
        </div>
        {isAdmin && (
          <Button icon="plus" onClick={() => setCreating(true)}>
            New event
          </Button>
        )}
      </div>

      {error && (
        <Alert>
          {error}{' '}
          <button type="button" onClick={load} className="font-semibold underline">
            Retry
          </button>
        </Alert>
      )}

      {isAdmin && events && events.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon="calendar" label={stats.events === 1 ? 'Event' : 'Events'} value={stats.events} />
          <StatCard icon="images" label="Photos uploaded" value={stats.photos} />
          <StatCard icon="globe" label="Live galleries" value={stats.published} />
        </div>
      )}

      {events && events.length > 6 && (
        <div className="relative max-w-xs">
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search events" aria-label="Search events" className="input pl-10" />
        </div>
      )}

      {!events && !error ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <SkeletonCard key={key} />
          ))}
        </div>
      ) : events && events.length === 0 ? (
        <div className="card">
          {isAdmin ? (
            <EmptyState
              icon="calendar"
              title="Create your first event"
              description="Events hold the photos your team uploads. When you're ready, publish a PIN-protected gallery for your client."
              action={
                <Button icon="plus" onClick={() => setCreating(true)}>
                  New event
                </Button>
              }
            />
          ) : (
            <EmptyState icon="users" title="No events yet" description="When an admin adds you to an event, it will show up here." />
          )}
        </div>
      ) : (
        filtered && (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
            {!filtered.length && <p className="py-10 text-center text-sm text-zinc-500">No events match “{query}”.</p>}
            {filtered.length > 0 && query && <p className="text-xs text-zinc-500">{plural(filtered.length, 'event')} found</p>}
          </>
        )
      )}

      {isAdmin && (
        <EventFormModal open={creating} onClose={() => setCreating(false)} onSaved={(event) => navigate(`/events/${event.id}`)} />
      )}
    </div>
  );
};

export default Events;
