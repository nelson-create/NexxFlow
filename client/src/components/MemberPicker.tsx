import { useMemo, useState } from 'react';
import type { Member } from '../lib/types';
import { Icon } from './Icon';
import { Avatar, Spinner, cx } from './ui';

/** Searchable checkbox list of users. */
export const MemberPicker = ({
  users,
  selected,
  onChange,
  loading,
  emptyText = 'No team members have signed up yet. Ask them to create an account first.',
}: {
  users: Member[];
  selected: string[];
  onChange: (ids: string[]) => void;
  loading?: boolean;
  emptyText?: string;
}) => {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? users.filter((user) => user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q)) : users;
  }, [users, query]);

  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-zinc-200 py-8 text-zinc-400">
        <Spinner />
      </div>
    );
  }

  if (!users.length) {
    return <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500">{emptyText}</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200">
      {users.length > 5 && (
        <div className="relative border-b border-zinc-200">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or email"
            aria-label="Search team members"
            className="w-full bg-transparent py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-zinc-400"
          />
        </div>
      )}
      <ul className="max-h-60 divide-y divide-zinc-100 overflow-y-auto">
        {filtered.map((user) => {
          const checked = selected.includes(user.id);
          return (
            <li key={user.id}>
              <label className={cx('flex cursor-pointer items-center gap-3 px-3 py-2.5 transition', checked ? 'bg-brand-50/60' : 'hover:bg-zinc-50')}>
                <input type="checkbox" checked={checked} onChange={() => toggle(user.id)} className="h-4 w-4 rounded border-zinc-300 text-brand-600 accent-brand-600" />
                <Avatar name={user.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-zinc-900">{user.name}</span>
                  <span className="block truncate text-xs text-zinc-500">{user.email}</span>
                </span>
              </label>
            </li>
          );
        })}
        {!filtered.length && <li className="px-3 py-6 text-center text-sm text-zinc-500">No one matches “{query}”.</li>}
      </ul>
    </div>
  );
};
