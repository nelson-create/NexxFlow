import { useState } from 'react';
import { errorMessage } from '../services/api';
import { eventApi, userApi } from '../services/gallery';
import type { Member, User } from '../lib/types';
import { MemberPicker } from './MemberPicker';
import { Modal, useOverlay } from './overlays';
import { Avatar, Button, IconButton } from './ui';

export const TeamPanel = ({
  eventId,
  members,
  editable,
  onChange,
}: {
  eventId: string;
  members: Member[];
  editable: boolean;
  onChange: (members: Member[]) => void;
}) => {
  const { toast, confirm } = useOverlay();
  const [adding, setAdding] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setPicked([]);
    setAdding(true);
    setLoadingUsers(true);
    userApi
      .list('TEAM_MEMBER')
      .then(({ data }) => setUsers(data))
      .catch((err) => toast(errorMessage(err), 'error'))
      .finally(() => setLoadingUsers(false));
  };

  const add = async () => {
    setSaving(true);
    try {
      const { data } = await eventApi.addMembers(eventId, picked);
      onChange(data);
      toast(picked.length === 1 ? 'Team member added.' : `${picked.length} team members added.`);
      setAdding(false);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (member: Member) => {
    const ok = await confirm({
      title: `Remove ${member.name}?`,
      description: 'They will lose access to this event. Photos they already uploaded are kept.',
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    try {
      const { data } = await eventApi.removeMember(eventId, member.id);
      onChange(data);
      toast(`${member.name} removed from the event.`);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const memberIds = new Set(members.map((member) => member.id));
  const available = users.filter((user) => !memberIds.has(user.id));

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-zinc-900">
          Team <span className="font-normal text-zinc-400">· {members.length}</span>
        </h2>
        {editable && (
          <Button variant="ghost" size="sm" icon="userPlus" onClick={openAdd}>
            Add
          </Button>
        )}
      </div>

      {members.length ? (
        <ul className="mt-3 space-y-1">
          {members.map((member) => (
            <li key={member.id} className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-zinc-50">
              <Avatar name={member.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900">{member.name}</p>
                <p className="truncate text-xs text-zinc-500">{member.email}</p>
              </div>
              {editable && (
                <IconButton icon="x" label={`Remove ${member.name}`} onClick={() => remove(member)} className="h-8 w-8 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100" />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">
          {editable ? 'No one is assigned yet. Add the photographers who will upload to this event.' : 'No other team members are assigned.'}
        </p>
      )}

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add team members"
        description="They will be able to see this event and upload photos to it."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button onClick={add} loading={saving} disabled={!picked.length}>
              Add {picked.length > 0 && picked.length}
            </Button>
          </>
        }
      >
        <MemberPicker
          users={available}
          selected={picked}
          onChange={setPicked}
          loading={loadingUsers}
          emptyText={users.length ? 'Everyone is already on this event.' : 'No team members have signed up yet. Ask them to create an account first.'}
        />
      </Modal>
    </section>
  );
};
