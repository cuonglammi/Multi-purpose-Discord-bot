import { useEffect, useState } from 'react';
import { Card, CardTitle } from '../components/Card';
import { api } from '../lib/api';
import type { ActivityItem, Guild, ModerationAction } from '../lib/types';

export default function Moderation({ guild }: { guild?: Guild }) {
  const [actions, setActions] = useState<ModerationAction[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    if (!guild) return;
    let active = true;
    async function load() {
      const [nextActions, nextActivity] = await Promise.all([
        api<ModerationAction[]>(`/api/guilds/${guild!.id}/moderation`),
        api<ActivityItem[]>(`/api/guilds/${guild!.id}/activity`)
      ]);
      if (active) {
        setActions(nextActions);
        setActivity(nextActivity);
      }
    }
    void load();
    const interval = window.setInterval(load, 10_000);
    return () => { active = false; window.clearInterval(interval); };
  }, [guild]);

  if (!guild) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div><p className="text-sm uppercase tracking-wide text-indigo-300">{guild.name}</p><h1 className="text-3xl font-black text-white">Moderation</h1></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Recent moderation actions</CardTitle>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-slate-400"><tr><th className="p-3">Type</th><th className="p-3">Target</th><th className="p-3">Reason</th><th className="p-3">Date</th></tr></thead>
              <tbody>
                {actions.map((action) => (
                  <tr className="border-t border-white/10" key={action.id}>
                    <td className="p-3 font-bold text-indigo-300">{action.type}</td>
                    <td className="p-3">{action.targetId}</td>
                    <td className="p-3 text-slate-300">{action.reason}</td>
                    <td className="p-3 text-slate-400">{new Date(action.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardTitle>Live activity feed</CardTitle>
          <div className="space-y-3">
            {activity.map((event, index) => (
              <div key={`${event.kind}-${index}`} className="rounded-xl bg-slate-950/60 p-3">
                <p className="font-semibold capitalize text-white">{event.kind}</p>
                <p className="text-sm text-slate-400">{new Date(event.at).toLocaleString()}</p>
                <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-2 text-xs text-slate-300">{JSON.stringify(event.item, null, 2)}</pre>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
