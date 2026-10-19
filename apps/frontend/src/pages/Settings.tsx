import { useEffect, useState } from 'react';
import { Card, CardTitle } from '../components/Card';
import { Button, Input, Label, Select, Textarea } from '../components/Field';
import { api } from '../lib/api';
import type { Channel, Guild, GuildConfig, Role } from '../lib/types';

export default function Settings({ guild }: { guild?: Guild }) {
  const [config, setConfig] = useState<GuildConfig | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!guild) return;
    setStatus('');
    void Promise.all([
      api<GuildConfig>(`/api/guilds/${guild.id}/config`),
      api<Channel[]>(`/api/guilds/${guild.id}/channels`),
      api<Role[]>(`/api/guilds/${guild.id}/roles`)
    ]).then(([nextConfig, nextChannels, nextRoles]) => {
      setConfig(nextConfig);
      setChannels(nextChannels);
      setRoles(nextRoles);
    });
  }, [guild]);

  async function save() {
    if (!guild || !config) return;
    setStatus('Saving...');
    const updated = await api<GuildConfig>(`/api/guilds/${guild.id}/config`, {
      method: 'PATCH',
      body: JSON.stringify({
        welcomeChannelId: config.welcomeChannelId || null,
        welcomeMessage: config.welcomeMessage,
        goodbyeChannelId: config.goodbyeChannelId || null,
        goodbyeMessage: config.goodbyeMessage,
        autoRoleId: config.autoRoleId || null,
        logChannelId: config.logChannelId || null,
        antiSpamEnabled: config.antiSpamEnabled,
        antiSpamMaxMessages: Number(config.antiSpamMaxMessages),
        antiSpamWindowSeconds: Number(config.antiSpamWindowSeconds),
        antiSpamTimeoutSeconds: Number(config.antiSpamTimeoutSeconds),
        xpEnabled: config.xpEnabled,
        xpCooldownSeconds: Number(config.xpCooldownSeconds),
        xpMin: Number(config.xpMin),
        xpMax: Number(config.xpMax)
      })
    });
    setConfig(updated);
    setStatus('Saved.');
  }

  if (!guild) return <EmptyState />;
  if (!config) return <div className="text-white">Loading settings...</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm uppercase tracking-wide text-indigo-300">{guild.name}</p>
        <h1 className="text-3xl font-black text-white">Server Settings</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Welcome / Goodbye</CardTitle>
          <div className="space-y-4">
            <div><Label>Welcome channel</Label><ChannelSelect channels={channels} value={config.welcomeChannelId ?? ''} onChange={(value) => setConfig({ ...config, welcomeChannelId: value })} /></div>
            <div><Label>Welcome message</Label><Textarea rows={3} value={config.welcomeMessage} onChange={(event) => setConfig({ ...config, welcomeMessage: event.target.value })} /></div>
            <div><Label>Goodbye channel</Label><ChannelSelect channels={channels} value={config.goodbyeChannelId ?? ''} onChange={(value) => setConfig({ ...config, goodbyeChannelId: value })} /></div>
            <div><Label>Goodbye message</Label><Textarea rows={3} value={config.goodbyeMessage} onChange={(event) => setConfig({ ...config, goodbyeMessage: event.target.value })} /></div>
            <p className="text-sm text-slate-400">Template variables: {'{user}'}, {'{server}'}, {'{memberCount}'}</p>
          </div>
        </Card>

        <Card>
          <CardTitle>Roles and logging</CardTitle>
          <div className="space-y-4">
            <div><Label>Auto-role on join</Label><Select value={config.autoRoleId ?? ''} onChange={(event) => setConfig({ ...config, autoRoleId: event.target.value })}><option value="">None</option>{roles.map((role) => <option value={role.id} key={role.id}>{role.name}</option>)}</Select></div>
            <div><Label>Log channel</Label><ChannelSelect channels={channels} value={config.logChannelId ?? ''} onChange={(value) => setConfig({ ...config, logChannelId: value })} /></div>
          </div>
        </Card>

        <Card>
          <CardTitle>Anti-spam</CardTitle>
          <div className="space-y-4">
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={config.antiSpamEnabled} onChange={(event) => setConfig({ ...config, antiSpamEnabled: event.target.checked })} /> Enable anti-spam</label>
            <div><Label>Max messages</Label><Input type="number" value={config.antiSpamMaxMessages} onChange={(event) => setConfig({ ...config, antiSpamMaxMessages: Number(event.target.value) })} /></div>
            <div><Label>Window seconds</Label><Input type="number" value={config.antiSpamWindowSeconds} onChange={(event) => setConfig({ ...config, antiSpamWindowSeconds: Number(event.target.value) })} /></div>
            <div><Label>Timeout seconds</Label><Input type="number" value={config.antiSpamTimeoutSeconds} onChange={(event) => setConfig({ ...config, antiSpamTimeoutSeconds: Number(event.target.value) })} /></div>
          </div>
        </Card>

        <Card>
          <CardTitle>XP / leveling</CardTitle>
          <div className="space-y-4">
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={config.xpEnabled} onChange={(event) => setConfig({ ...config, xpEnabled: event.target.checked })} /> Enable XP</label>
            <div><Label>Cooldown seconds</Label><Input type="number" value={config.xpCooldownSeconds} onChange={(event) => setConfig({ ...config, xpCooldownSeconds: Number(event.target.value) })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>XP min</Label><Input type="number" value={config.xpMin} onChange={(event) => setConfig({ ...config, xpMin: Number(event.target.value) })} /></div>
              <div><Label>XP max</Label><Input type="number" value={config.xpMax} onChange={(event) => setConfig({ ...config, xpMax: Number(event.target.value) })} /></div>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save}>Save settings</Button>
        <span className="text-sm text-slate-400">{status}</span>
      </div>
    </div>
  );
}

function ChannelSelect({ channels, value, onChange }: { channels: Channel[]; value: string; onChange: (value: string) => void }) {
  return <Select value={value} onChange={(event) => onChange(event.target.value)}><option value="">None</option>{channels.map((channel) => <option value={channel.id} key={channel.id}>#{channel.name}</option>)}</Select>;
}

function EmptyState() {
  return <Card><CardTitle>No server available</CardTitle><p className="text-slate-400">Invite the bot to a server where you have Administrator permission, then reload.</p></Card>;
}
