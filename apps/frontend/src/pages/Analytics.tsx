import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardTitle } from '../components/Card';
import { api } from '../lib/api';
import type { AnalyticsPayload, Guild } from '../lib/types';

export default function Analytics({ guild }: { guild?: Guild }) {
  const [data, setData] = useState<AnalyticsPayload | null>(null);

  useEffect(() => {
    if (!guild) return;
    void api<AnalyticsPayload>(`/api/guilds/${guild.id}/analytics`).then((payload) => {
      setData({
        snapshots: payload.snapshots.map((item) => ({ ...item, createdAt: new Date(item.createdAt).toLocaleDateString() })),
        commandUsage: payload.commandUsage
      });
    });
  }, [guild]);

  if (!guild) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div><p className="text-sm uppercase tracking-wide text-indigo-300">{guild.name}</p><h1 className="text-3xl font-black text-white">Analytics</h1></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Member count snapshots</CardTitle>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={data?.snapshots ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="createdAt" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="memberCount" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardTitle>Command usage</CardTitle>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={data?.commandUsage ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="commandName" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
