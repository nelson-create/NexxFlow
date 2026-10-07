import { useEffect, useState } from 'react';
import { errorMessage } from '../services/api';
import { eventApi, userApi } from '../services/gallery';
import type { EventItem, User } from '../lib/types';
import { MemberPicker } from './MemberPicker';
import { Modal } from './overlays';
import { Alert, Button, Field, TextArea } from './ui';

/** Create a new event (with members) or edit an existing event's details. */
export const EventFormModal = ({
  open,
  onClose,
  event,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  event?: EventItem;
  onSaved: (event: EventItem) => void;
}) => {
  const editing = !!event;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(event?.name ?? '');
    setDescription(event?.description ?? '');
    setMemberIds([]);
    setError('');
    setSaving(false);
    if (!editing) {
      setLoadingUsers(true);
      userApi
        .list('TEAM_MEMBER')
        .then(({ data }) => setUsers(data))
        .catch(() => setUsers([]))
        .finally(() => setLoadingUsers(false));
    }
  }, [open, event, editing]);

  const submit = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault();
    if (name.trim().length < 2) {
      setError('Give the event a name of at least 2 characters.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data } = editing
        ? await eventApi.update(event.id, { name: name.trim(), description: description.trim() })
        : await eventApi.create({ name: name.trim(), description: description.trim() || undefined, memberIds });
      onSaved(data);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit event' : 'New event'}
      description={editing ? undefined : 'Create an event, then invite the photographers who will upload to it.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="event-form" loading={saving}>
            {editing ? 'Save changes' : 'Create event'}
          </Button>
        </>
      }
    >
      <form id="event-form" onSubmit={submit} className="space-y-5">
        {error && <Alert>{error}</Alert>}
        <Field label="Event name" placeholder="e.g. Sarah & James — Wedding" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
        <TextArea
          label="Description (optional)"
          placeholder="Date, venue, or a note your client will see on their gallery."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
        />
        {!editing && (
          <div>
            <span className="label">
              Team members <span className="font-normal text-zinc-400">({memberIds.length} selected)</span>
            </span>
            <MemberPicker users={users} selected={memberIds} onChange={setMemberIds} loading={loadingUsers} />
          </div>
        )}
      </form>
    </Modal>
  );
};
