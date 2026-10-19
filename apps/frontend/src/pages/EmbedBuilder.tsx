import { useEffect, useState } from 'react';
import { Card, CardTitle } from '../components/Card';
import { Button, Input, Label, Select, Textarea } from '../components/Field';
import { api } from '../lib/api';
import type { Channel, Guild } from '../lib/types';

export default function EmbedBuilder({ guild }: { guild?: Guild }) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelId, setChannelId] = useState('');
  const [title, setTitle] = useState('Server announcement');
  const [description, setDescription] = useState('Write your embed content here.');
  const [color, setColor] = useState('#5865F2');
  const [footer, setFooter] = useState('Sent from the dashboard');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!guild) return;
    void api<Channel[]>(`/api/guilds/${guild.id}/channels`).then((items) => {
      setChannels(items);
      setChannelId((current) => current || items[0]?.id || '');
    });
  }, [guild]);

  async function send() {
    if (!guild || !channelId) return;
    setStatus('Sending...');
    await api(`/api/guilds/${guild.id}/send-embed`, {
      method: 'POST',
      body: JSON.stringify({ channelId, title, description, color, footer })
    });
    setStatus('Sent.');
  }

  if (!guild) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div><p className="text-sm uppercase tracking-wide text-indigo-300">{guild.name}</p><h1 className="text-3xl font-black text-white">Embed Builder</h1></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Compose</CardTitle>
          <div className="space-y-4">
            <div><Label>Channel</Label><Select value={channelId} onChange={(event) => setChannelId(event.target.value)}>{channels.map((channel) => <option value={channel.id} key={channel.id}>#{channel.name}</option>)}</Select></div>
            <div><Label>Title</Label><Input value={title} onChange={(event) => setTitle(event.target.value)} /></div>
            <div><Label>Description</Label><Textarea rows={8} value={description} onChange={(event) => setDescription(event.target.value)} /></div>
            <div><Label>Color</Label><Input value={color} onChange={(event) => setColor(event.target.value)} /></div>
            <div><Label>Footer</Label><Input value={footer} onChange={(event) => setFooter(event.target.value)} /></div>
            <div className="flex items-center gap-3"><Button onClick={send}>Send embed</Button><span className="text-sm text-slate-400">{status}</span></div>
          </div>
        </Card>
        <Card>
          <CardTitle>Preview</CardTitle>
          <div className="rounded-xl bg-slate-950 p-4">
            <div className="border-l-4 p-4" style={{ borderColor: color }}>
              <h2 className="font-bold text-white">{title || 'Untitled embed'}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{description}</p>
              {footer && <p className="mt-4 text-xs text-slate-500">{footer}</p>}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
