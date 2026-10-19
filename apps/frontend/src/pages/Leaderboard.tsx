import { useEffect, useState } from 'react';
import { Card, CardTitle } from '../components/Card';
import { api } from '../lib/api';
import type { Guild, Member } from '../lib/types';

export default function Leaderboard({ guild }: { guild?: Guild }) {
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!guild) return;
    void api<Member[]>(`/api/guilds/${guild.id}/leaderboard`).then(setMembers);
  }, [guild]);

  if (!guild) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div><p className="text-sm uppercase tracking-wide text-indigo-300">{guild.name}</p><h1 className="text-3xl font-black text-white">XP Leaderboard</h1></div>
      <Card>
        <CardTitle>Top members</CardTitle>
        <div className="space-y-3">
          {members.map((member, index) => (
            <div key={member.id} className="flex items-center justify-between rounded-xl bg-slate-950/60 p-4">
              <div><p className="font-bold">#{index + 1} {member.username ?? member.userId}</p><p className="text-sm text-slate-400">{member.messages} tracked messages</p></div>
              <div className="text-right"><p className="font-black text-indigo-300">Level {member.level}</p><p className="text-sm text-slate-400">{member.xp} XP</p></div>
            </div>
          ))}
          {!members.length && <p className="text-slate-400">No XP yet. Members earn XP when they chat.</p>}
        </div>
      </Card>
    </div>
  );
}
