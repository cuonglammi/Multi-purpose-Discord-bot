import { useEffect, useState } from 'react';
import { Card, CardTitle } from '../components/Card';
import { Button, Input, Label, Select, Textarea } from '../components/Field';
import { api } from '../lib/api';
import type { Channel, Guild } from '../lib/types';

type Announcement = {
  id: string;
  channelId: string;
  message: string;
  sendAt: string;
  intervalMinutes?: number | null;
  enabled: boolean;
};

export default function Announcements({ guild }: { guild?: Guild }) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [channelId, setChannelId] = useState('');
  const [message, setMessage] = useState('Remember to check the rules and be respectful.');
  const [sendAt, setSendAt] = useState(() => new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16));
  const [intervalMinutes, setIntervalMinutes] = useState('');
  const [status, setStatus] = useState('');

  async function load(guildId: string) {
    const [nextChannels, nextAnnouncements] = await Promise.all([
      api<Channel[]>(`/api/guilds/${guildId}/channels`),
      api<Announcement[]>(`/api/guilds/${guildId}/announcements`)
    ]);
    setChannels(nextChannels);
    setAnnouncements(nextAnnouncements);
    setChannelId((current) => current || nextChannels[0]?.id || '');
  }

  useEffect(() => {
    if (!guild) return;
    void load(guild.id);
  }, [guild]);

  async function create() {
    if (!guild || !channelId) return;
    setStatus('Scheduling...');
    await api(`/api/guilds/${guild.id}/announcements`, {
      method: 'POST',
      body: JSON.stringify({
        channelId,
        message,
        sendAt: new Date(sendAt).toISOString(),
        intervalMinutes: intervalMinutes ? Number(intervalMinutes) : null
      })
    });
    await load(guild.id);
    setStatus('Scheduled.');
  }

  if (!guild) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div><p className="text-sm uppercase tracking-wide text-indigo-300">{guild.name}</p><h1 className="text-3xl font-black text-white">Scheduled Announcements</h1></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Create announcement</CardTitle>
          <div className="space-y-4">
            <div><Label>Channel</Label><Select value={channelId} onChange={(event) => setChannelId(event.target.value)}>{channels.map((channel) => <option value={channel.id} key={channel.id}>#{channel.name}</option>)}</Select></div>
            <div><Label>Message</Label><Textarea rows={6} value={message} onChange={(event) => setMessage(event.target.value)} /></div>
            <div><Label>Send at</Label><Input type="datetime-local" value={sendAt} onChange={(event) => setSendAt(event.target.value)} /></div>
            <div><Label>Repeat every N minutes (optional)</Label><Input type="number" value={intervalMinutes} onChange={(event) => setIntervalMinutes(event.target.value)} placeholder="Leave blank for one-time" /></div>
            <div className="flex items-center gap-3"><Button onClick={create}>Schedule</Button><span className="text-sm text-slate-400">{status}</span></div>
          </div>
        </Card>
        <Card>
          <CardTitle>Upcoming</CardTitle>
          <div className="space-y-3">
            {announcements.map((item) => (
              <div key={item.id} className="rounded-xl bg-slate-950/60 p-4">
                <p className="font-semibold">#{channels.find((channel) => channel.id === item.channelId)?.name ?? item.channelId}</p>
                <p className="mt-1 text-sm text-slate-400">{new Date(item.sendAt).toLocaleString()} {item.intervalMinutes ? `• repeats every ${item.intervalMinutes} min` : ''}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{item.message}</p>
              </div>
            ))}
            {!announcements.length && <p className="text-slate-400">No scheduled announcements yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
